/**
 * Renders text with markup types:
 *
 *  【base|ruby】  → furigana ruby annotation (shown when furigana=true)
 *  《keyword》   → critical term, highlighted red
 *  〔concept〕   → important concept, highlighted amber/orange
 *  ｛example｝   → example or analogy, highlighted teal/blue
 */
export default function FuriganaText({ text, furigana }) {
  if (!text) return null;

  const hasMarkup = text.includes('【') || text.includes('《') || text.includes('〔') || text.includes('｛');
  if (!hasMarkup) return <span>{text}</span>;

  const parts = [];
  const regex = /【([^|【】]+)\|([^|【】]+)】|《([^《》]+)》|〔([^〔〕]+)〕|｛([^｛｝]+)｝/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<span key={`t${last}`}>{text.slice(last, match.index)}</span>);
    }

    if (match[1] !== undefined) {
      // ── Furigana: 【base|ruby】 ──
      if (furigana) {
        parts.push(
          <ruby key={`r${match.index}`}>
            {match[1]}<rt>{match[2]}</rt>
          </ruby>
        );
      } else {
        parts.push(<span key={`r${match.index}`}>{match[1]}</span>);
      }
    } else if (match[3] !== undefined) {
      // ── Keyword 《term》 — red ──
      parts.push(
        <span key={`k${match.index}`} style={{ color: 'var(--color-red)', fontWeight: 700 }}>
          {match[3]}
        </span>
      );
    } else if (match[4] !== undefined) {
      // ── Concept 〔term〕 — amber/orange ──
      parts.push(
        <span key={`c${match.index}`} style={{ color: 'var(--color-amber)', fontWeight: 600 }}>
          {match[4]}
        </span>
      );
    } else if (match[5] !== undefined) {
      // ── Example ｛text｝ — teal/blue ──
      parts.push(
        <span key={`e${match.index}`} style={{ color: 'var(--color-teal)', fontWeight: 600 }}>
          {match[5]}
        </span>
      );
    }

    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(<span key={`t${last}`}>{text.slice(last)}</span>);
  }

  return <span>{parts}</span>;
}
