/**
 * Renders text with furigana ruby annotations.
 * Input format: "これは【光合成|こうごうせい】の説明です"
 */
export default function FuriganaText({ text, furigana }) {
  if (!text) return null;

  if (!furigana || !text.includes('【')) {
    // Strip markup and render plain
    const plain = text.replace(/【([^|【】]+)\|[^|【】]+】/g, '$1');
    return <span>{plain}</span>;
  }

  const parts = [];
  const regex = /【([^|【】]+)\|([^|【】]+)】/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<span key={last}>{text.slice(last, match.index)}</span>);
    }
    parts.push(
      <ruby key={match.index}>
        {match[1]}
        <rt>{match[2]}</rt>
      </ruby>
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(<span key={last}>{text.slice(last)}</span>);
  }

  return <span>{parts}</span>;
}
