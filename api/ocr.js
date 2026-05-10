import OpenAI from 'openai';
import { rateLimit, rateLimitResponse, isPlainObject, normalizePayload, clampString } from '../lib/security.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const limited = rateLimit(req, 'ocr');
  if (!limited.allowed) return rateLimitResponse(res, 'ocr', limited.retryAfterSeconds);
  if (!isPlainObject(req.body)) return res.status(400).json({ error: 'Malformed JSON body.' });

  const normalized = normalizePayload(req.body, {
    image: 'longstring',
    mediaType: 'shortstring',
  });
  const image = clampString(normalized.image, 12_000_000);
  const mediaType = normalized.mediaType || 'image/jpeg';
  const apiKey = process.env.OPENAI_API_KEY;
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;

  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
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
