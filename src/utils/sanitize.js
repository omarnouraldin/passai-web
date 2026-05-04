/**
 * sanitizeText — safe text cleaning for AI-generated content
 *
 * Handles:
 *  - �  replacement characters from broken SSE stream chunks
 *  - Lone surrogates (\uD800–\uDFFF) — unpaired UTF-16 surrogate halves
 *  - Control characters that break rendering
 *  - Unicode normalization (NFC) — combines combining diacritics, fixes ã vs ã
 *
 * Preserves:
 *  - Japanese (Hiragana, Katakana, Kanji, punctuation)
 *  - Furigana markup  【漢字|かんじ】
 *  - Colour markup     《term》  〔concept〕  ｛example｝
 *  - All valid emojis  👉 ☕ 👨‍🌾 etc.
 *  - Newlines \n (needed for bullet rendering)
 */
export function sanitizeText(text) {
  if (!text) return '';
  return text
    // 1. Remove Unicode replacement characters
    .replace(/�/g, '')
    // 2. Remove lone surrogates (half of a surrogate pair — invalid in UTF-16)
    //    These appear when a 4-byte emoji is split across two SSE chunks
    .replace(/[\uD800-\uDFFF]/g, '')
    // 3. Remove ASCII control characters (keep \n = 0x0A, \r = 0x0D, \t = 0x09)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // 4. Normalize to NFC — fixes combining-character issues
    //    e.g. "が" as two code points → single NFC code point
    .normalize('NFC')
    .trim();
}

/**
 * sanitizeAIResponse — run on the full raw string from the API
 * before JSON.parse. More aggressive than sanitizeText.
 */
export function sanitizeAIResponse(raw) {
  if (!raw) return '';
  return raw
    .replace(/�/g, '')
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .normalize('NFC');
  // Note: do NOT .trim() here — we still need to find { ... } boundaries
}
