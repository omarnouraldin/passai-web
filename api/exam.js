import OpenAI from 'openai';
import { rateLimit, rateLimitResponse, isPlainObject, normalizePayload, clampString, asStringArray } from '../lib/security.js';
import { getProStatus } from '../lib/serverAuth.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

function getEnv() {
  return {
    apiKey: process.env.OPENAI_API_KEY ?? '',
  };
}

async function getIsPro(authHeader) {
  try {
    const { user, isPro } = await getProStatus(authHeader);
    return !!user && !!isPro;
  } catch {
    return false;
  }
}

function examSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      examTitle: { type: 'string' },
      multipleChoice: {
        type: 'array',
        minItems: 5,
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            question: { type: 'string' },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: { type: 'string' },
            },
            correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
            explanation: { type: 'string' },
          },
          required: ['question', 'options', 'correctIndex', 'explanation'],
        },
      },
      shortAnswer: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            question: { type: 'string' },
            modelAnswer: { type: 'string' },
            keyPoints: { type: 'array', items: { type: 'string' } },
          },
          required: ['question', 'modelAnswer', 'keyPoints'],
        },
      },
      fillBlank: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            sentence: { type: 'string' },
            answer: { type: 'string' },
            hint: { type: 'string' },
          },
          required: ['sentence', 'answer', 'hint'],
        },
      },
    },
    required: ['examTitle', 'multipleChoice', 'shortAnswer', 'fillBlank'],
  };
}

async function createJsonResponse({ apiKey, model, prompt, schema }) {
  const openai = new OpenAI({ apiKey });
  const response = await openai.responses.create({
    model,
    input: [{ role: 'user', content: prompt }],
    text: {
      format: {
        type: 'json_schema',
        name: 'exam_material',
        strict: true,
        schema,
      },
    },
  });
  const text = response.output_text ?? '';
  if (!text) throw new Error('OpenAI returned empty output');
  return JSON.parse(text.trim());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const limited = rateLimit(req, 'exam');
  if (!limited.allowed) return rateLimitResponse(res, 'exam', limited.retryAfterSeconds);
  if (!isPlainObject(req.body)) return res.status(400).json({ error: 'Malformed JSON body.' });

  const { apiKey } = getEnv();
  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const isPro = await getIsPro(authHeader);
  if (!isPro) return res.status(403).json({ error: 'Exam Mode is a Pro feature.' });

  const normalized = normalizePayload(req.body, {
    mode: 'shortstring',
    noteText: 'longstring',
    imageBase64: 'longstring',
    mediaType: 'shortstring',
    language: 'shortstring',
  });
  const mode = normalized.mode || '';
  const noteText = clampString(normalized.noteText, 8000);
  const imageBase64 = clampString(normalized.imageBase64, 12_000_000);
  const mediaType = normalized.mediaType || 'image/jpeg';
  const language = normalized.language || 'english';
  const shortAnswers = Array.isArray(req.body.shortAnswers) ? req.body.shortAnswers.slice(0, 3).map(v => typeof v === 'string' ? v.slice(0, 1000) : '') : null;
  const questions = Array.isArray(req.body.questions)
    ? req.body.questions.slice(0, 3).map(q => isPlainObject(q) ? ({
        question: clampString(q.question, 500),
        modelAnswer: clampString(q.modelAnswer, 1000),
        keyPoints: asStringArray(q.keyPoints, 8, 200),
      }) : null)
    : null;

  if (mode === 'evaluate') {
    if (!questions?.every(Boolean)) return res.status(400).json({ error: 'Malformed evaluation data.' });
    if (!shortAnswers || !questions) return res.status(400).json({ error: 'Missing evaluation data.' });
    const prompt = `You are a fair and strict exam grader. Grade each student short answer.\n\nQuestions to grade:\n${questions.map((q, i) => `Q${i + 1}: ${q.question}\nModel answer: ${q.modelAnswer}\nKey points required: ${q.keyPoints.join('; ')}\nStudent answer: "${shortAnswers[i] || '(blank)'}"`).join('\n\n')}\n\nReturn ONLY valid JSON:\n{ "evaluations": [{ "score": 0, "maxScore": 3, "feedback": "One sentence of specific feedback." }] }`;
    try {
      const parsed = await createJsonResponse({
        apiKey,
        model: 'gpt-5.4',
        prompt,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            evaluations: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  score: { type: 'integer', minimum: 0, maximum: 3 },
                  maxScore: { type: 'integer', minimum: 3, maximum: 3 },
                  feedback: { type: 'string' },
                },
                required: ['score', 'maxScore', 'feedback'],
              },
            },
          },
          required: ['evaluations'],
        },
      });
      return res.json(parsed);
    } catch (err) {
      console.error('Exam evaluation error:', err);
      return res.status(500).json({ error: 'Could not evaluate answers.' });
    }
  }

  const hasImage = !!imageBase64;
  const hasText = noteText && noteText.trim().length > 0;
  if (!hasImage && !hasText) return res.status(400).json({ error: 'No content provided.' });

  const contentDescription = hasImage
    ? 'A student has provided an image of their study material.'
    : `A student has provided the following notes:\n\n${noteText}`;
  const langNote = language === 'japanese'
    ? 'Write ALL questions and answers in Japanese (日本語). Keep language clear for 留学生.'
    : 'Write all questions and answers in English.';
  const prompt = `You are a university exam writer. ${contentDescription}\n\n${langNote}\n\nCreate a comprehensive mock exam that tests UNDERSTANDING and APPLICATION — not just simple recall. Questions should be challenging but fair.\n\nReturn ONLY valid JSON with EXACTLY this structure:\n{\n  "examTitle": "Short descriptive title for this exam",\n  "multipleChoice": [\n    {\n      "question": "Question testing understanding or application",\n      "options": ["option A", "option B", "option C", "option D"],\n      "correctIndex": 0,\n      "explanation": "Why this answer is correct."\n    }\n  ],\n  "shortAnswer": [\n    {\n      "question": "Open-ended question requiring a few sentences",\n      "modelAnswer": "A complete model answer (2-3 sentences)",\n      "keyPoints": ["key point 1", "key point 2", "key point 3"]\n    }\n  ],\n  "fillBlank": [\n    {\n      "sentence": "The ___ is responsible for converting glucose into ATP.",\n      "answer": "mitochondria",\n      "hint": "sometimes called the powerhouse of the cell"\n    }\n  ]\n}\n\nRules:\n- Exactly 5 multipleChoice questions (vary the correctIndex positions — don't always use 0)\n- Exactly 3 shortAnswer questions (require understanding, not memorisation)\n- Exactly 3 fillBlank questions (remove the single most important term per sentence)\n- Return ONLY the JSON, no extra text.`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = obj => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    send({ type: 'progress', value: 8 });
    const parsed = await createJsonResponse({
      apiKey,
      model: 'gpt-5.4',
      prompt,
      schema: examSchema(),
    });
    send({ type: 'progress', value: 100 });
    send({ type: 'result', data: parsed });
  } catch (err) {
    console.error('Exam generate error:', err);
    send({ type: 'error', message: 'Something went wrong generating your exam.' });
  }

  res.end();
}
