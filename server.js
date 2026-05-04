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
Add furigana to EVERY kanji without exception — including common ones like 日、月、年、人、国.
Every single kanji MUST use markup: 【kanji|reading】 — use 【 and 】 exactly, NOT curly braces.`;
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

YOUR MISSION: Help students understand fast — before a quiz. Not a lecture.

── SUMMARY (30-second version) ──
GOAL: A tired student reads this in 10 seconds and gets it.
Rules:
- Line 1: ONE simple sentence. Everyday words only. No academic vocabulary.
  ${language === 'japanese' ? 'GOOD: "コーヒー農家は、ほとんど儲からない。"  BAD: "先物市場で搾取されている"' : 'GOOD: "Coffee farmers earn almost nothing."  BAD: "Farmers are exploited by futures markets"'}
- Line 2 (if highlightStat exists): Just the visual gap. Example: "👨‍🌾 2ブル → ☕ 2000ブル"
- Then 2 👉 sections with ・ bullets:
  👉 ${language === 'japanese' ? 'なぜ？' : 'Why?'}
  ・reason (max 7 words)
  ・reason (max 7 words)
  👉 ${language === 'japanese' ? '解決：' : 'Solution:'}
  ・one line
- ONE sticky line that sticks in the brain. Example: ${language === 'japanese' ? '"一番働いている人が、一番お金をもらえていない"' : '"The hardest workers earn the least"'}
- NO emojis before bullet points. ONLY 👉 and ・ as markers. No ❓⚠️🔸 etc.
- Language: ${language === 'japanese' ? 'Japanese (日本語)' : 'English'}

── HIGHLIGHT STAT ──
Find the single most dramatic number, contrast, or gap. Be specific and visual.
Return as: { "label": "short label", "from": "left side with emoji", "to": "right side with emoji", "magnitude": "the shocking % or number" }
Example: { "label": "価格格差", "from": "👨‍🌾 農家：約2ブル", "to": "☕ 消費者：約2000ブル", "magnitude": "+7000%" }
Return null if no dramatic contrast exists.

── SIMPLE EXPLANATION (step-by-step) ──
PURPOSE: Help a student understand the core concept in 1–2 minutes before a quiz. NOT a full lecture.
STRICT RULES:
- MAXIMUM 5–6 steps. Never more. Consolidate ruthlessly.
- Each step = EXACTLY ONE idea. One sentence + optional bullets. Nothing extra.
- Use SIMPLE everyday words. ${language === 'japanese' ? 'Avoid: 搾取、廃止、圧力、体制. Use: もらえない、なくなった、強くなった' : 'Avoid jargon. Use plain words.'}
- REMOVE: country statistics, detailed history, policy deep-dives, anything not needed to understand the core.
- FLOW: ① problem → ② why (simple) → ③ what changed → ④ solution → ⑤ reality
- Format per step:
  "Step N｜Short Label
  Short sentence.
  ・bullet (only if truly needed)"
- For 2-part ideas, break across lines for breathing room:
  "コーヒー豆の価格は、
  ニューヨークで決まる
  → 農家は決められない"
  👉 More vertical = easier to read
- Use 👉 ONLY for section headers (👉 ${language === 'japanese' ? 'なぜ？/ 👉 解決' : 'Why? / Solution'}). Max 1 per step. Only when it clearly helps.
- ・ bullets under 👉 only. Max 2 per 👉.
- ONE analogy for the WHOLE explanation (${language === 'japanese' ? 'たとえば：＋ simple Japanese comparison. Example on its own line. NEVER "Think of it like"' : '"Think of it like..." + one concrete everyday comparison. On its own line.'}).
- ONE emotional line for the WHOLE explanation — not every step.
- NO emojis as decorators. NO ❓⚠️🔸 before text. Only 👉 and ・.
- Goal: student feels "I get it now" — NOT "I learned everything".

── THINKING QUESTIONS ──
2 casual questions that spark natural curiosity — NOT exam-style.
${language === 'japanese' ? 'Style: "〇〇って、誰が一番〜だと思う？" — feels like a friend asking, not a teacher' : 'Style: "Who do you think actually profits here?" — feels like a friend asking, not a teacher'}
Short: max 1–2 lines. No setup needed.

CORRECTIONS: Check for errors. List as "Incorrect: X. Correct: Y because Z." Return [] if correct.

${illustrationInstruction}

Respond in valid JSON with EXACTLY these keys:
{
  "summary": "Simple one sentence hook.\\n👨‍🌾 X → ☕ Y\\n👉 なぜ？\\n・reason\\n・reason\\n👉 解決：\\n・solution\\n一番働く人が、一番もらえない。",
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
      .replace(/[\uD800-\uDFFF]/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .normalize('NFC');
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
