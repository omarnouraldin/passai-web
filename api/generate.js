export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { noteText, language = 'english', furigana = false } = req.body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  if (!noteText || noteText.trim().length === 0) {
    return res.status(400).json({ error: 'Note text is required.' });
  }

  let languageInstruction;
  if (language === 'japanese') {
    if (furigana) {
      languageInstruction = `IMPORTANT: Write ALL text values in Japanese (日本語).
This app is used by 留学生 (international students) so assume the reader's kanji knowledge is limited.
Add furigana to ALL kanji EXCEPT the most basic everyday ones: 一二三四五六七八九十百千万日月火水木金土年人口手足目耳山川田大小中上下左右本今何円時国.
Wrap every other kanji in furigana markup like this: 【漢字|かんじ】
Use the Japanese corner brackets 【 and 】 exactly as shown — do NOT use curly braces { }.`;
    } else {
      languageInstruction = 'IMPORTANT: All text values in the JSON MUST be written in Japanese (日本語). This app is used by 留学生 so write clearly.';
    }
  } else {
    languageInstruction = 'All text values in the JSON must be written in English.';
  }

  const keywordInstruction = `For the most critical keywords and terms that students MUST remember (3-5 per section), wrap them in 《》 like this: 《mitochondria》 or 《光合成》.
These will be highlighted in red in the app. Apply this to the single most important word or short phrase only — not full sentences.`;

  const prompt = `You are a study assistant helping university students, including many international students. A student has provided the following notes:

${noteText}

${languageInstruction}

${keywordInstruction}

Please generate the following in valid JSON format with EXACTLY these keys:
{
  "summary": "A concise 2-3 sentence summary of the notes",
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
- Generate 4 quiz questions most likely to appear on a university exam
- Each question must have exactly 4 options
- correctIndex is 0-based (0 = first option)
- Vary the position of the correct answer across questions
- Make wrong options plausible, not obviously wrong
- Keep explanations to ONE sentence maximum
- Return ONLY the JSON. No explanation, no markdown, no code blocks.`;

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
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
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
