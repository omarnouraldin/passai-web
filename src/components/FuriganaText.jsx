/**
 * Renders text with two types of markup:
 *
 *  【base|ruby】  → furigana ruby annotation (shown when furigana=true)
 *  《keyword》   → important keyword, always highlighted in red
 */
export default function FuriganaText({ text, furigana }) {
  if (!text) return null;

  const hasMarkup = text.includes('【') || text.includes('《');
  if (!hasMarkup) return <span>{text}</span>;

  const parts = [];
  // Match furigana OR keyword markup in one pass
  const regex = /【([^|【】]+)\|([^|【】]+)】|《([^《》]+)》/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Plain text before this match
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
        // Furigana off — show base kanji only
        parts.push(<span key={`r${match.index}`}>{match[1]}</span>);
      }
    } else {
      // ── Keyword: 《term》 — always red regardless of furigana setting ──
      parts.push(
        <span key={`k${match.index}`} style={{ color: '#ff453a', fontWeight: 700 }}>
          {match[3]}
        </span>
      );
    }

    last = match.index + match[0].length;
  }

  // Remaining plain text
  if (last < text.length) {
    parts.push(<span key={`t${last}`}>{text.slice(last)}</span>);
  }

  return <span>{parts}</span>;
}
