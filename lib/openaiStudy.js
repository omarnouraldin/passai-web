import OpenAI from 'openai';

export const OPENAI_ADMIN_MODELS = new Set([
  'gpt-5.4-mini',
  'gpt-5.4',
  'gpt-5.5',
]);

export function resolveOpenAIModel({ adminOverride, isPro }) {
  if (adminOverride && OPENAI_ADMIN_MODELS.has(adminOverride)) return adminOverride;
  return isPro ? 'gpt-5.4' : 'gpt-5.4-mini';
}

export const STUDY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    highlightStat: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            label: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
            magnitude: { type: 'string' },
          },
          required: ['label', 'from', 'to', 'magnitude'],
        },
        { type: 'null' },
      ],
    },
    simpleExplanation: { type: 'string' },
    thinkingQuestions: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: { type: 'string' },
    },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          incorrect: { type: 'string' },
          correct: { type: 'string' },
          because: { type: 'string' },
        },
        required: ['incorrect', 'correct', 'because'],
      },
    },
    illustrationQuery: {
      anyOf: [
        { type: 'string' },
        { type: 'null' },
      ],
    },
    keyTopics: {
      type: 'array',
      minItems: 3,
      items: { type: 'string' },
    },
    flashcards: {
      type: 'array',
      minItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
        },
        required: ['question', 'answer'],
      },
    },
    quiz: {
      type: 'array',
      minItems: 4,
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
          correctIndex: {
            type: 'integer',
            minimum: 0,
            maximum: 3,
          },
          explanation: { type: 'string' },
        },
        required: ['question', 'options', 'correctIndex', 'explanation'],
      },
    },
  },
  required: [
    'summary',
    'highlightStat',
    'simpleExplanation',
    'thinkingQuestions',
    'corrections',
    'illustrationQuery',
    'keyTopics',
    'flashcards',
    'quiz',
  ],
};

export function buildStudyPrompt({ language, furigana, hasImage, noteText }) {
  const languageInstruction = language === 'japanese'
    ? (furigana
      ? `IMPORTANT: Write ALL text values in Japanese (日本語).
This app is used by 留学生 so assume limited kanji knowledge.
Add furigana to EVERY kanji without exception — including common ones like 日、月、年、人、国.
Every single kanji MUST use markup: 【kanji|reading】 — use 【 and 】 exactly, NOT curly braces.`
      : 'IMPORTANT: All text values in the JSON MUST be written in Japanese (日本語). Write clearly for 留学生.')
    : 'All text values in the JSON must be written in English.';

  const contentDescription = hasImage
    ? 'A student has provided an image of their study material (notes, textbook page, or problem sheet).'
    : `A student has provided the following notes:\n\n${noteText}`;

  return `You are an expert study coach and tutor helping university students — including many international students. ${contentDescription}

${languageInstruction}

Use these color markup tags to make key content stand out:
- 《term》 → RED — the single most critical keyword per section (must-memorize terms)
- 〔concept〕 → ORANGE — important concepts and definitions
- ｛example｝ → BLUE — examples, numbers, or analogies
Apply markup to individual words or short phrases only — never full sentences. Use 2-4 highlights per section.

YOUR MISSION: Help students understand fast — before a quiz. Not a lecture.

Return valid JSON with EXACTLY these keys:
{
  "summary": "Simple one sentence hook.",
  "highlightStat": { "label": "...", "from": "...", "to": "...", "magnitude": "..." },
  "simpleExplanation": "Step 1｜Label\\nOne idea.",
  "thinkingQuestions": ["Short conversational question?", "Real-world framing question?"],
  "corrections": [],
  "illustrationQuery": "search term or null",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "flashcards": [{ "question": "...", "answer": "..." }],
  "quiz": [{ "question": "...", "options": ["a","b","c","d"], "correctIndex": 0, "explanation": "One sentence." }]
}

Rules:
- Keep the same markup support: 【漢字|かんじ】, 《term》, 〔concept〕, ｛example｝
- summary should be compact and clear
- simpleExplanation should be step-by-step
- thinkingQuestions should be casual and natural
- corrections should be empty if nothing is wrong
- illustrationQuery should be one short search term or null
- keyTopics should be concise
- flashcards should be at least 5
- quiz should be at least 4 questions with exactly 4 options each
- Return ONLY the JSON.`;
}

export async function generateStudyMaterial({ apiKey, model, prompt, onProgress }) {
  const openai = new OpenAI({ apiKey });
  const response = await openai.responses.create({
    model,
    input: [{ role: 'user', content: prompt }],
    text: {
      format: {
        type: 'json_schema',
        name: 'study_material',
        strict: true,
        schema: STUDY_SCHEMA,
      },
    },
  });

  onProgress?.(90);
  const outputText =
    response.output_text ??
    response.output?.find(item => item.type === 'message')?.content?.find(part => part.type === 'output_text' || part.type === 'text')?.text ??
    '';

  if (!outputText) throw new Error('OpenAI returned empty output.');
  return JSON.parse(String(outputText).trim());
}
