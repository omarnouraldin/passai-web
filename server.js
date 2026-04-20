import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post('/api/generate', async (req, res) => {
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
For any kanji that a university student might not know, wrap it in furigana markup like this: 【漢字|かんじ】
Use the Japanese corner brackets 【 and 】 exactly as shown — do NOT use curly braces { }.
Apply furigana to difficult or technical kanji only — not to every single kanji.`;
    } else {
      languageInstruction = 'IMPORTANT: All text values in the JSON MUST be written in Japanese (日本語).';
    }
  } else {
    languageInstruction = 'All text values in the JSON must be written in English.';
  }

  const prompt = `You are a study assistant. A student has provided the following notes:

${noteText}

${languageInstruction}

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

    // Strip markdown code fences Claude sometimes adds despite instructions
    const cleanText = rawText
      .trim()
      .replace(/^```json\s*/im, '')
      .replace(/^```\s*/im, '')
      .replace(/```\s*$/im, '')
      .trim();

    console.log('Clean text preview:', cleanText.slice(0, 80));
    const parsed = JSON.parse(cleanText);
    res.json(parsed);
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ── OCR endpoint — extracts text from an uploaded image using Claude Vision ──
app.post('/api/ocr', async (req, res) => {
  const { image, mediaType } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });
  if (!image)  return res.status(400).json({ error: 'Image data required.' });

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
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: image },
            },
            {
              type: 'text',
              text: 'Extract ALL text from this image exactly as written, preserving the structure as much as possible. Include everything — headings, bullet points, formulas, diagrams labels. Return only the extracted text with no commentary.',
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OCR API error:', err);
      return res.status(502).json({ error: 'OCR failed. Try again.' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';
    res.json({ text });
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: 'Could not read the image.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅  PassAI backend running at http://localhost:${PORT}`);
});
