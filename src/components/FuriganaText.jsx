/**
 * Renders text with markup types:
 *
 *  【base|ruby】  → furigana ruby annotation (shown when furigana=true)
 *  漢字【ruby】   → furigana ruby annotation (shown when furigana=true)
 *  《keyword》   → critical term, highlighted red
 *  〔concept〕   → important concept, highlighted amber/orange
 *  ｛example｝   → example or analogy, highlighted teal/blue
 *
 *  Plain numbers (digits, +7000%, 2000ブル etc.) → highlighted amber
 */

// Colorize standalone numbers in plain text segments and preserve line breaks.
function renderPlain(str, keyPrefix) {
  // Match: optional +/- sign, digits, optional decimal/comma, optional % or ％
  const numRx = /([+\-]?\d[\d,\.]*[%％]?)/g;
  const lines = String(str).split('\n');
  const parts = [];

  lines.forEach((line, lineIdx) => {
    numRx.lastIndex = 0;
    let last = 0;
    let m;
    while ((m = numRx.exec(line)) !== null) {
      if (m.index > last) {
        parts.push(<span key={`${keyPrefix}_l${lineIdx}_t${last}`}>{line.slice(last, m.index)}</span>);
      }
      parts.push(
        <span key={`${keyPrefix}_l${lineIdx}_n${m.index}`} style={{ color: 'var(--color-amber)', fontWeight: 700 }}>
          {m[0]}
        </span>
      );
      last = m.index + m[0].length;
    }
    if (last < line.length) {
      parts.push(<span key={`${keyPrefix}_l${lineIdx}_t${last}`}>{line.slice(last)}</span>);
    }
    if (lineIdx < lines.length - 1) parts.push(<br key={`${keyPrefix}_br${lineIdx}`} />);
  });

  return parts.length === 1 && typeof parts[0]?.props?.children === 'string'
    ? parts[0]
    : <span key={keyPrefix}>{parts}</span>;
}

function renderRubyBase(base, ruby, key, furigana) {
  if (!furigana) return <span key={key}>{base}</span>;
  return (
    <ruby key={key} className="ruby-inline">
      {base}
      <rt className="ruby-rt">{ruby}</rt>
    </ruby>
  );
}

function renderPlainSegment(str, keyPrefix, furigana) {
  const parts = [];
  // [|｜] handles both half-width (U+007C) and full-width (U+FF5C) pipes
  const regex = /【([^|｜【】]+)[|｜]([^|｜【】]+)】|([一-龯々仝〆ヶぁ-んァ-ンー]+)【([^【】]+)】|([+\-]?\d[\d,\.]*[%％]?)/g;
  let last = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > last) {
      parts.push(renderPlain(str.slice(last, match.index), `${keyPrefix}_t${last}`));
    }

    if (match[1] !== undefined) {
      parts.push(renderRubyBase(match[1], match[2], `${keyPrefix}_r${match.index}`, furigana));
    } else if (match[3] !== undefined) {
      parts.push(renderRubyBase(match[3], match[4], `${keyPrefix}_r${match.index}`, furigana));
    } else if (match[5] !== undefined) {
      parts.push(
        <span key={`${keyPrefix}_n${match.index}`} style={{ color: 'var(--color-amber)', fontWeight: 700 }}>
          {match[5]}
        </span>
      );
    }
    last = match.index + match[0].length;
  }

  if (last < str.length) {
    parts.push(renderPlain(str.slice(last), `${keyPrefix}_t${last}`));
  }

  return parts.length === 1 && typeof parts[0]?.props?.children === 'string'
    ? parts[0]
    : <span key={keyPrefix}>{parts}</span>;
}

function splitIntoMarkupSegments(text) {
  const segments = [];
  // [|｜] handles both half-width (U+007C) and full-width (U+FF5C) pipes from the AI
  const regex = /【([^|｜【】]+)[|｜]([^|｜【】]+)】|《([^《》]+)》|〔([^〔〕]+)〕|｛([^｛｝]+)｝/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', value: text.slice(last, match.index) });
    }
    segments.push({
      type: 'markup',
      key: match.index,
      value: match[0],
      kind: match[1] !== undefined ? 'furigana' : match[3] !== undefined ? 'keyword' : match[4] !== undefined ? 'concept' : 'example',
      base: match[1],
      ruby: match[2],
      text: match[3] ?? match[4] ?? match[5],
    });
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    segments.push({ type: 'text', value: text.slice(last) });
  }

  return segments;
}

export default function FuriganaText({ text, furigana }) {
  if (!text) return null;
  const segments = splitIntoMarkupSegments(text);
  const parts = segments.map((segment, idx) => {
    if (segment.type === 'text') {
      return renderPlainSegment(segment.value, `t${idx}`, furigana);
    }

    if (segment.kind === 'furigana') {
      return renderRubyBase(segment.base, segment.ruby, `r${idx}`, furigana);
    }
    if (segment.kind === 'keyword') {
      return (
        <span key={`k${idx}`} style={{ color: 'var(--color-red)', fontWeight: 700 }}>
          {segment.text}
        </span>
      );
    }
    if (segment.kind === 'concept') {
      return (
        <span key={`c${idx}`} style={{ color: 'var(--color-amber)', fontWeight: 600 }}>
          {segment.text}
        </span>
      );
    }
    return (
      <span key={`e${idx}`} style={{ color: 'var(--color-teal)', fontWeight: 600 }}>
        {segment.text}
      </span>
    );
  });

  return <span className="furigana-text">{parts}</span>;
}
