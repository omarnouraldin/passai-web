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

  // ── Language instructions ─────────────────────────────────────────────────
  let languageInstruction;
  if (language === 'japanese') {
    if (furigana) {
      languageInstruction = `IMPORTANT: Write ALL text values in Japanese (日本語).
This app is used by 留学生 (international students) so assume limited kanji knowledge.
Add furigana to ALL kanji EXCEPT the most basic: 一二三四五六七八九十百千万日月火水木金土年人口手足目耳山川田大小中上下左右本今何円時国.
Wrap every other kanji like this: 【漢字|かんじ】 — use 【 and 】 exactly, NOT curly braces.`;
    } else {
      languageInstruction = 'IMPORTANT: All text values in the JSON MUST be written in Japanese (日本語). Write clearly for 留学生.';
    }
  } else {
    languageInstruction = 'All text values in the JSON must be written in English.';
  }

  const keywordInstruction = `For the most critical keywords (3-5 per section), wrap them in 《》 like: 《mitochondria》 or 《二次関数》. These show in red in the app. Apply only to the single most important word or short phrase — never full sentences.`;

  const contentDescription = hasImage
    ? 'A student has provided an image of their study material (notes, textbook page, or problem sheet).'
    : `A student has provided the following notes:\n\n${noteText}`;

  const prompt = `You are an expert study coach and tutor helping university students — including many international students. ${contentDescription}

${languageInstruction}

${keywordInstruction}

YOUR MISSION: Don't just summarize — TEACH. Imagine a student sent you this right before an exam and asked you to explain everything so they can actually understand and remember it.

MATH & SCIENCE RULES:
- In simpleExplanation, show a complete worked example with clearly numbered steps (Step 1, Step 2...)
- Explain WHY each step is done, not just what to do
- Use plain language for formulas — write "x squared" or x² not LaTeX
- Use everyday analogies ("Think of it like...")
- If there are multiple problem types, show a worked example for each
- Make steps so clear that someone new to the topic could follow them

CORRECTIONS:
- Carefully check for factual errors, wrong formulas, logical mistakes, or misconceptions
- If you find errors, write: "Incorrect: [what they wrote]. Correct: [what it should be] because [reason]."
- If everything is correct, return an empty array []

ILLUSTRATION:
- In illustrationQuery, provide ONE specific English search term to find a helpful Wikipedia image
- Be specific: "quadratic function parabola" not just "math"
- Good examples: "mitochondria diagram", "supply demand curve", "Newton second law", "quadratic equation graph"
- Return null if the topic is abstract or wouldn't benefit from a visual

Please respond in valid JSON with EXACTLY these keys:
{
  "summary": "A clear 2-3 sentence overview of what this material covers",
  "simpleExplanation": "A thorough plain-language explanation. For math/science: include a fully worked example with numbered steps. Use analogies. Explain the WHY. Write as if explaining to a smart friend who has never seen this topic.",
  "corrections": [],
  "illustrationQuery": "specific english search term or null",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "flashcards": [
    { "question": "...", "answer": "..." }
  ],
  "quiz": [
    {
      "question": "...",
      "options": ["option 1", "option 2", "option 3", "option 4"],
      "correctIndex": 0,
      "explanation": "One short sentence explaining why."
    }
  ]
}

Rules:
- Generate at least 5 flashcards
- Generate 4 quiz questions most likely to appear on a university exam
- Each quiz question must have exactly 4 options
- correctIndex is 0-based
- Vary the correct answer position
- Make wrong options plausible
- Keep quiz explanations to ONE sentence
- Return ONLY the JSON. No markdown, no code blocks.`;

  const messageContent = hasImage
    ? [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: prompt },
      ]
    : prompt;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 6000,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(502).json({ error: 'AI service error. Try again.' });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text ?? '';

    const cleanText = rawText
      .trim()
      .replace(/^```json\s*/im, '')
      .replace(/^```\s*/im, '')
      .replace(/```\s*$/im, '')
      .trim();

    const parsed = JSON.parse(cleanText);
    res.json(parsed);
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
