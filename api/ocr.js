import OpenAI from 'openai';
import { rateLimit, rateLimitResponse, isPlainObject, normalizePayload, clampString } from '../lib/security.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

const DEV_LOGS = process.env.NODE_ENV !== 'production';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const limited = rateLimit(req, 'ocr');
  if (!limited.allowed) return rateLimitResponse(res, 'ocr', limited.retryAfterSeconds);
  if (!isPlainObject(req.body)) return res.status(400).json({ error: 'Malformed JSON body.' });

  if (DEV_LOGS) {
    console.info('[api/ocr] local route hit', {
      method: req.method,
      url: req.url,
    });
  }

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
  if (!/^image\/[a-z0-9.+-]+$/i.test(mediaType)) {
    return res.status(400).json({ error: 'Unsupported image type.' });
  }

  if (DEV_LOGS) {
    console.info('[api/ocr] request received', {
      mime: mediaType,
      base64Size: image.length,
    });
  }

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

    const text = String(response.output_text ?? '').trim();
    if (!text) {
      return res.status(422).json({ error: 'Could not extract enough text.' });
    }
    if (DEV_LOGS) {
      console.info('[api/ocr] success', {
        chars: text.length,
      });
    }
    res.json({ text });
  } catch (err) {
    console.error('OCR error:', err?.message ?? err);
    res.status(500).json({ error: 'Could not read the image.' });
  }
}
