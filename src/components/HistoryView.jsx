import Mascot from './Mascot.jsx';

export default function HistoryView({ history, onOpen, onDelete, onClear, isJapanese }) {
  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(isJapanese ? 'ja-JP' : 'en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="logo" style={{ fontSize: 28 }}>
            <span className="logo-pass">{isJapanese ? 'パス' : 'Pass'}</span>
            <span className="logo-ai">AI</span>
          </div>
          <div className="tagline">{isJapanese ? '生成履歴' : 'Generation history'}</div>
        </div>
        {history.length > 0 && (
          <button className="btn btn-danger" style={{ height: 36, fontSize: 13, padding: '0 14px' }} onClick={onClear}>
            {isJapanese ? '全て削除' : 'Clear all'}
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Mascot pose="sleepy" size={100} />
          </div>
          <div className="empty-title">{isJapanese ? '履歴なし' : 'No history yet'}</div>
          <div style={{ fontSize: 14, marginTop: 6 }}>
            {isJapanese ? 'ノートを生成すると、ここに表示されます' : 'Generate from your notes and they\'ll appear here'}
          </div>
        </div>
      ) : (
        history.map(item => (
          <div key={item.id} style={{ position: 'relative' }}>
            <div className="history-card" onClick={() => onOpen(item)}>
              <div className="history-date">{formatDate(item.date)}</div>
              <div className="history-snippet">{item.snippet}{item.snippet.length >= 80 ? '…' : ''}</div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onDelete(item.id); }}
              style={{
                position: 'absolute', top: 12, right: 12,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', fontSize: 16, lineHeight: 1,
              }}
              aria-label="Delete"
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  );
}
