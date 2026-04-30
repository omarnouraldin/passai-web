import { useState, useEffect } from 'react';

const EN_MSGS = [
  'Analyzing your notes',
  'Generating summary',
  'Creating flashcards',
  'Building quiz questions',
  'Almost there',
];
const JA_MSGS = [
  'ノートを分析中',
  '要約を作成中',
  'フラッシュカードを生成中',
  'クイズを準備中',
  'もうすぐ完了',
];

export default function LoadingView({ isJapanese, progress = 0, onCancel }) {
  const messages = isJapanese ? JA_MSGS : EN_MSGS;
  const [dots, setDots] = useState(1);

  // Message driven by real progress (not timer)
  const messageIdx =
    progress < 20 ? 0 :
    progress < 45 ? 1 :
    progress < 65 ? 2 :
    progress < 82 ? 3 : 4;

  // Animate dots
  useEffect(() => {
    const t = setInterval(() => setDots(d => d % 3 + 1), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="loading-overlay">
      {/* Thinking cat */}
      <img src="/mascot-loading.png" alt="Thinking..." style={{ width: 200, objectFit: 'contain' }} />

      <div className="loading-text">
        <div className="logo" style={{ textAlign: 'center', marginBottom: 14 }}>
          <span className="logo-pass">{isJapanese ? 'パス' : 'Pass'}</span>
          <span className="logo-ai">AI</span>
        </div>

        <div className="loading-msg" key={messageIdx}>
          {messages[messageIdx]}
          <span className="loading-dots">{'.' .repeat(dots)}</span>
        </div>

        {/* Real progress bar — width driven by actual API progress */}
        <div style={{
          marginTop: 20,
          width: '100%',
          height: 6,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 99,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            borderRadius: 99,
            background: 'linear-gradient(90deg, #6b60ff, #a78bfa)',
            transition: 'width 0.3s ease-out',
            boxShadow: '0 0 8px rgba(107,96,255,0.6)',
          }} />
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
          {Math.round(progress)}%
        </div>

        {/* Cancel button */}
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              marginTop: 20,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: 'var(--muted)',
              fontSize: 13,
              padding: '7px 20px',
              cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'rgba(255,69,58,0.5)'; e.target.style.color = 'var(--danger)'; }}
            onMouseLeave={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.color = 'var(--muted)'; }}
          >
            {isJapanese ? 'キャンセル' : 'Cancel'}
          </button>
        )}
      </div>
    </div>
  );
}
