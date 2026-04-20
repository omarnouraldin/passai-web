export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
              text: 'Extract ALL text from this image exactly as written, preserving the structure as much as possible. Include everything — headings, bullet points, formulas, diagram labels. Return only the extracted text with no commentary.',
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
}
