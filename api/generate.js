import { createClient } from '@supabase/supabase-js';

// ── Resolve user's pro status from Supabase JWT ───────────────────────────────
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
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .single();

    return profile?.is_pro ?? false;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    noteText,
    imageBase64,
    mediaType = 'image/jpeg',
    language = 'english',
    furigana = false,
  } = req.body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server.' });

  const hasImage = !!imageBase64;
  const hasText  = noteText && noteText.trim().length > 0;
  if (!hasImage && !hasText) return res.status(400).json({ error: 'No content provided.' });

  // ── Model selection: pro → Sonnet, free → Haiku ──────────────────────────
  const isPro = await getIsPro(req.headers.authorization);
  const model = isPro ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

  // ── Language instructions ─────────────────────────────────────────────────
  let languageInstruction;
  if (language === 'japanese') {
    if (furigana) {
      languageInstruction = `IMPORTANT: Write ALL text values in Japanese (日本語).
This app is used by 留学生 so assume limited kanji knowledge.
Add furigana to ALL kanji EXCEPT the most basic: 一二三四五六七八九十百千万日月火水木金土年人口手足目耳山川田大小中上下左右本今何円時国.
Wrap every other kanji like this: 【漢字|かんじ】 — use 【 and 】 exactly, NOT curly braces.`;
    } else {
      languageInstruction = 'IMPORTANT: All text values in the JSON MUST be written in Japanese (日本語). Write clearly for 留学生.';
    }
  } else {
    languageInstruction = 'All text values in the JSON must be written in English.';
  }

  const keywordInstruction = `Use these color markup tags to make key content stand out:
- 《term》 → RED — the single most critical keyword per section (must-memorize terms)
- 〔concept〕 → ORANGE — important concepts and definitions
- ｛example｝ → BLUE — examples, numbers, or analogies
Apply markup to individual words or short phrases only — never full sentences. Use 2-4 highlights per section.`;

  const illustrationInstruction = `ILLUSTRATION: In "illustrationQuery", provide ONE specific search term in ${language === 'japanese' ? 'Japanese (日本語)' : 'English'} to find a helpful Wikipedia image for this topic. Be specific (e.g. "${language === 'japanese' ? '二次関数 グラフ' : 'quadratic function parabola'}"). Return null if no visual would help.`;

  const contentDescription = hasImage
    ? 'A student has provided an image of their study material (notes, textbook page, or problem sheet).'
    : `A student has provided the following notes:\n\n${noteText}`;

  const prompt = `You are an expert study coach and tutor helping university students — including many international students. ${contentDescription}

${languageInstruction}

${keywordInstruction}

YOUR MISSION: Don't just summarize — TEACH. Imagine a student sent you this right before an exam and asked you to explain everything so they can understand and remember it.

MATH & SCIENCE RULES:
- In simpleExplanation, show a complete worked example with clearly numbered steps (Step 1, Step 2...)
- Explain WHY each step is done
- Use plain language for formulas — write "x squared" or x²
- Use everyday analogies ("Think of it like...")

CORRECTIONS: Check for factual errors, wrong formulas, logical mistakes. List each as "Incorrect: X. Correct: Y because Z." Return [] if correct.

${illustrationInstruction}

Respond in valid JSON with EXACTLY these keys:
{
  "summary": "A clear 2-3 sentence overview",
  "simpleExplanation": "Thorough plain-language explanation with numbered steps for math/science, analogies, and the WHY.",
  "corrections": [],
  "illustrationQuery": "search term or null",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "flashcards": [{ "question": "...", "answer": "..." }],
  "quiz": [{ "question": "...", "options": ["a","b","c","d"], "correctIndex": 0, "explanation": "One sentence." }]
}

Rules: 5+ flashcards, 4 quiz questions, exactly 4 options each, vary correct answer position, return ONLY the JSON.`;

  const messageContent = hasImage
    ? [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: prompt },
      ]
    : prompt;

  // ── SSE headers ───────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  function send(obj) {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 5000,
        stream: true,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error('Anthropic error:', err);
      send({ type: 'error', message: 'AI service error. Try again.' });
      res.end();
      return;
    }

    const reader  = anthropicRes.body.getReader();
    const decoder = new TextDecoder();
    let fullText  = '';
    let charCount = 0;
    const EXPECTED_CHARS = 4000;
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
            const chunk = event.delta.text;
            fullText  += chunk;
            charCount += chunk.length;
            const pct = Math.min(90, 5 + Math.round((charCount / EXPECTED_CHARS) * 85));
            send({ type: 'progress', value: pct });
          }
        } catch { /* skip malformed lines */ }
      }
    }

    send({ type: 'progress', value: 96 });
    // Robust JSON extraction — find first { and last } to handle any extra text Haiku adds
    const jsonStart = fullText.indexOf('{');
    const jsonEnd   = fullText.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON object found in response');
    const parsed = JSON.parse(fullText.slice(jsonStart, jsonEnd + 1));
    send({ type: 'progress', value: 100 });
    send({ type: 'result', data: parsed });

  } catch (err) {
    console.error('Generate error:', err);
    send({ type: 'error', message: 'Something went wrong. Please try again.' });
  }

  res.end();
}
