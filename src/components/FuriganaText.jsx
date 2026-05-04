/**
 * Renders text with markup types:
 *
 *  【base|ruby】  → furigana ruby annotation (shown when furigana=true)
 *  《keyword》   → critical term, highlighted red
 *  〔concept〕   → important concept, highlighted amber/orange
 *  ｛example｝   → example or analogy, highlighted teal/blue
 *
 *  Plain numbers (digits, +7000%, 2000ブル etc.) → highlighted amber
 */

// Colorize standalone numbers in plain text segments
function renderPlain(str, keyPrefix) {
  // Match: optional +/- sign, digits, optional decimal/comma, optional % or ％
  const numRx = /([+\-]?\d[\d,\.]*[%％]?)/g;
  const parts = [];
  let last = 0;
  let m;
  while ((m = numRx.exec(str)) !== null) {
    if (m.index > last) {
      parts.push(<span key={`${keyPrefix}_t${last}`}>{str.slice(last, m.index)}</span>);
    }
    parts.push(
      <span key={`${keyPrefix}_n${m.index}`} style={{ color: 'var(--color-amber)', fontWeight: 700 }}>
        {m[0]}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < str.length) {
    parts.push(<span key={`${keyPrefix}_t${last}`}>{str.slice(last)}</span>);
  }
  return parts.length === 1 && typeof parts[0].props?.children === 'string'
    ? parts[0]
    : <span key={keyPrefix}>{parts}</span>;
}

export default function FuriganaText({ text, furigana }) {
  if (!text) return null;

  const hasMarkup = text.includes('【') || text.includes('《') || text.includes('〔') || text.includes('｛');

  if (!hasMarkup) {
    return renderPlain(text, 'plain');
  }

  const parts = [];
  const regex = /【([^|【】]+)\|([^|【】]+)】|《([^《》]+)》|〔([^〔〕]+)〕|｛([^｛｝]+)｝/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(renderPlain(text.slice(last, match.index), `t${last}`));
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
    parts.push(renderPlain(text.slice(last), `t${last}`));
  }

  return <span>{parts}</span>;
}
