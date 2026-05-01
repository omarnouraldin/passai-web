import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const PORT = process.env.PORT || 3001;

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

// ── /api/generate — streaming SSE response ────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const {
    noteText, imageBase64, mediaType = 'image/jpeg',
    language = 'english', furigana = false,
  } = req.body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server.' });

  const hasImage = !!imageBase64;
  const hasText  = noteText && noteText.trim().length > 0;
  if (!hasImage && !hasText) return res.status(400).json({ error: 'No content provided.' });

  // Model selection based on pro status
  const isPro = await getIsPro(req.headers.authorization);
  const model = isPro ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

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

  const illustrationInstruction = `ILLUSTRATION: In "illustrationQuery", provide ONE specific search term in ${language === 'japanese' ? 'Japanese (日本語)' : 'English'} to find a helpful Wikipedia image. Be specific (e.g. "${language === 'japanese' ? '二次関数 グラフ' : 'quadratic function parabola'}"). Return null if no visual would help.`;

  const contentDescription = hasImage
    ? 'A student has provided an image of their study material.'
    : `A student has provided the following notes:\n\n${noteText}`;

  const prompt = `You are an expert study coach and tutor helping university students — including many international students. ${contentDescription}

${languageInstruction}

${keywordInstruction}

YOUR MISSION: Don't just summarize — TEACH. Structure your response carefully:

── SUMMARY (30-second version) ──
TIGHT. Max 50 words total. Every word must earn its place.
Format:
- 1 hook sentence (max 12 words — the core truth, concrete not academic)
- 3-5 lines starting with 👉 (max 8 words each — fragments are fine, no full sentences)
- Under a 👉 line, use ・ for sub-items (never nest 👉 inside 👉)
- Include the most dramatic number or contrast
- Language: ${language === 'japanese' ? 'Japanese (日本語)' : 'English'}

── HIGHLIGHT STAT ──
Find the single most dramatic number, contrast, or gap. Be specific and visual.
Return as: { "label": "short label", "from": "left side with emoji", "to": "right side with emoji", "magnitude": "the shocking % or number" }
Example: { "label": "価格格差", "from": "👨‍🌾 農家：約2ブル", "to": "☕ 消費者：約2000ブル", "magnitude": "+7000%" }
Return null if no dramatic contrast exists.

── SIMPLE EXPLANATION (step-by-step) ──
CRITICAL RULES:
- Each step = EXACTLY ONE idea. Split relentlessly — more steps is better than cramming.
- Format: "Step N｜Short Label\nOne sentence.\n👉 Section header (if needed)\n・sub-item\n・sub-item"
- Use 👉 ONLY for section headers (👉 なぜ？/ 👉 現実 / 👉 解決). Max 2-3 per step.
- Use ・ for bullet items under a 👉 header. NEVER 👉 for regular bullets.
- For 3+ mechanisms in one step: preview first ("次の3つ：① ② ③") then use 👉/・ structure
- Add ONE emotional/human impact line per explanation where it fits ("どれだけ働いても〇〇できない")
- Analogies: ${language === 'japanese' ? 'Use "たとえば：" + a Japanese everyday comparison. NEVER use English "Think of it like"' : 'Use "Think of it like..." + a concrete everyday comparison'}
- Math/science: show worked example, explain WHY each step is done

── THINKING QUESTIONS ──
2 conversational questions — not exam-style recall.
Make them feel like: "huh, I never thought about that"
Keep short: 1-2 lines max. Real-world framing.

CORRECTIONS: Check for errors. List as "Incorrect: X. Correct: Y because Z." Return [] if correct.

${illustrationInstruction}

Respond in valid JSON with EXACTLY these keys:
{
  "summary": "Hook (max 12 words)\\n👉 key point\\n・sub-item if needed\\n👉 contrast\\n👉 reason\\n👉 conclusion",
  "highlightStat": { "label": "...", "from": "...", "to": "...", "magnitude": "..." },
  "simpleExplanation": "Step 1｜Label\\nOne idea.\\n👉 Section header\\n・bullet\\n・bullet\\n\\nStep 2｜Label\\n...",
  "thinkingQuestions": ["Short conversational question?", "Real-world framing question?"],
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

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

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
    const EXPECTED_CHARS = 5000;
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
    // Sanitize — remove replacement characters and control chars that break rendering
    const sanitized = fullText
      .replace(/\uFFFD/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    // Robust JSON extraction
    const jsonStart = sanitized.indexOf('{');
    const jsonEnd   = sanitized.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON object found in response');
    const parsed = JSON.parse(sanitized.slice(jsonStart, jsonEnd + 1));
    send({ type: 'progress', value: 100 });
    send({ type: 'result', data: parsed });

  } catch (err) {
    console.error('Generate error:', err);
    send({ type: 'error', message: 'Something went wrong. Please try again.' });
  }
  res.end();
});

// ── /api/ocr ─────────────────────────────────────────────────────────────────
app.post('/api/ocr', async (req, res) => {
  const { image, mediaType } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });
  if (!image)  return res.status(400).json({ error: 'Image data required.' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-opus-4-6', max_tokens: 4096,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: image } },
          { type: 'text', text: 'Extract ALL text from this image exactly as written, preserving structure. Return only the extracted text.' },
        ]}],
      }),
    });
    if (!response.ok) return res.status(502).json({ error: 'OCR failed.' });
    const data = await response.json();
    res.json({ text: data.content?.[0]?.text ?? '' });
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: 'Could not read the image.' });
  }
});

app.listen(PORT, () => console.log(`✅  PassAI backend running at http://localhost:${PORT}`));
