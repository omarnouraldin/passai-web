import { createClient } from '@supabase/supabase-js';

async function getIsPro(authHeader) {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return false;
  const supabaseUrl  = process.env.VITE_SUPABASE_URL;
  const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) return false;
  try {
    const supabase = createClient(supabaseUrl, supabaseAnon);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return false;
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: profile } = await userClient
      .from('profiles').select('is_pro').eq('id', user.id).single();
    return profile?.is_pro ?? false;
  } catch { return false; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });

  // Pro gate — exam mode is pro only
  const isPro = await getIsPro(req.headers.authorization);
  if (!isPro) return res.status(403).json({ error: 'Exam Mode is a Pro feature.' });

  const { mode, noteText, imageBase64, mediaType = 'image/jpeg', language = 'english', shortAnswers, questions } = req.body;

  // ── MODE: evaluate — grade student's short answers ───────────────────────
  if (mode === 'evaluate') {
    if (!shortAnswers || !questions) return res.status(400).json({ error: 'Missing evaluation data.' });

    const evalPrompt = `You are a fair and strict exam grader. Grade each student short answer.

For each question, the student wrote a response. Score it 0–3:
- 3 = Complete and accurate — covers the key points well
- 2 = Mostly correct — captures the main idea but missing something
- 1 = Partially correct — shows some understanding but significant gaps
- 0 = Incorrect or blank

Questions to grade:
${questions.map((q, i) => `
Q${i + 1}: ${q.question}
Model answer: ${q.modelAnswer}
Key points required: ${q.keyPoints.join('; ')}
Student answer: "${shortAnswers[i] || '(blank)'}"
`).join('\n')}

Return ONLY valid JSON:
{
  "evaluations": [
    { "score": 0, "maxScore": 3, "feedback": "One sentence of specific feedback." }
  ]
}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          messages: [{ role: 'user', content: evalPrompt }],
        }),
      });

      if (!response.ok) return res.status(502).json({ error: 'Evaluation failed.' });
      const data = await response.json();
      const text = data.content?.[0]?.text ?? '';
      const clean = text.trim().replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim();
      const parsed = JSON.parse(clean);
      return res.json(parsed);
    } catch (err) {
      console.error('Eval error:', err);
      return res.status(500).json({ error: 'Could not evaluate answers.' });
    }
  }

  // ── MODE: generate — create the mock exam ────────────────────────────────
  const hasImage = !!imageBase64;
  const hasText  = noteText && noteText.trim().length > 0;
  if (!hasImage && !hasText) return res.status(400).json({ error: 'No content provided.' });

  const langNote = language === 'japanese'
    ? 'Write ALL questions and answers in Japanese (日本語). Keep language clear for 留学生.'
    : 'Write all questions and answers in English.';

  const contentDescription = hasImage
    ? 'A student has provided an image of their study material.'
    : `A student has provided the following notes:\n\n${noteText}`;

  const prompt = `You are a university exam writer. ${contentDescription}

${langNote}

Create a comprehensive mock exam that tests UNDERSTANDING and APPLICATION — not just simple recall. Questions should be challenging but fair.

Return ONLY valid JSON with EXACTLY this structure:
{
  "examTitle": "Short descriptive title for this exam",
  "multipleChoice": [
    {
      "question": "Question testing understanding or application",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct."
    }
  ],
  "shortAnswer": [
    {
      "question": "Open-ended question requiring a few sentences",
      "modelAnswer": "A complete model answer (2-3 sentences)",
      "keyPoints": ["key point 1", "key point 2", "key point 3"]
    }
  ],
  "fillBlank": [
    {
      "sentence": "The ___ is responsible for converting glucose into ATP.",
      "answer": "mitochondria",
      "hint": "sometimes called the powerhouse of the cell"
    }
  ]
}

Rules:
- Exactly 5 multipleChoice questions (vary the correctIndex positions — don't always use 0)
- Exactly 3 shortAnswer questions (require understanding, not memorisation)
- Exactly 3 fillBlank questions (remove the single most important term per sentence)
- Return ONLY the JSON, no extra text.`;

  const messageContent = hasImage
    ? [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: prompt },
      ]
    : prompt;

  // Exam generation uses Sonnet (pro feature — quality matters)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  function send(obj) { res.write(`data: ${JSON.stringify(obj)}\n\n`); }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        stream: true,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    if (!anthropicRes.ok) {
      send({ type: 'error', message: 'AI service error.' });
      res.end();
      return;
    }

    const reader  = anthropicRes.body.getReader();
    const decoder = new TextDecoder();
    let fullText  = '';
    let charCount = 0;
    const EXPECTED = 2500;
    let sseBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const event = JSON.parse(raw);
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            fullText  += event.delta.text;
            charCount += event.delta.text.length;
            send({ type: 'progress', value: Math.min(90, 5 + Math.round((charCount / EXPECTED) * 85)) });
          }
        } catch { /* skip */ }
      }
    }

    send({ type: 'progress', value: 96 });
    const clean = fullText.trim()
      .replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim();
    const parsed = JSON.parse(clean);
    send({ type: 'progress', value: 100 });
    send({ type: 'result', data: parsed });

  } catch (err) {
    console.error('Exam generate error:', err);
    send({ type: 'error', message: 'Something went wrong generating your exam.' });
  }

  res.end();
}
