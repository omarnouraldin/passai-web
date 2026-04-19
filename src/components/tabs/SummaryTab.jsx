import FuriganaText from '../FuriganaText.jsx';

export default function SummaryTab({ summary, furigana, isJapanese }) {
  return (
    <div>
      <div className="section-title">{isJapanese ? '要約' : 'Summary'}</div>
      <div className="card">
        <p className="summary-text">
          <FuriganaText text={summary} furigana={furigana} />
        </p>
      </div>
    </div>
  );
}
