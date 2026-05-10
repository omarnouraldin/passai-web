import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, mediaType } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });
  if (!image) return res.status(400).json({ error: 'Image data required.' });

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.create({
      model: 'gpt-5.4-mini',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: `data:${mediaType ?? 'image/jpeg'};base64,${image}`,
            },
            {
              type: 'input_text',
              text: 'Extract ALL text from this image exactly as written, preserving the structure as much as possible. Include everything — headings, bullet points, formulas, diagram labels. Return only the extracted text with no commentary.',
            },
          ],
        },
      ],
    });

    const text = response.output_text ?? '';
    res.json({ text });
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: 'Could not read the image.' });
  }
}
