import FuriganaText from '../FuriganaText.jsx';

export default function TopicsTab({ topics, furigana, isJapanese }) {
  return (
    <div>
      <div className="section-title">{isJapanese ? 'キートピック' : 'Key Topics'}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {topics.map((t, i) => (
          <span key={i} className="topic-chip">
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✦</span>
            <FuriganaText text={t} furigana={furigana} />
          </span>
        ))}
      </div>
    </div>
  );
}
