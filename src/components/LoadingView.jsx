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

export default function LoadingView({ isJapanese }) {
  const messages = isJapanese ? JA_MSGS : EN_MSGS;
  const [msgIdx,    setMsgIdx]    = useState(0);
  const [dots,      setDots]      = useState(1);
  const [progress,  setProgress]  = useState(0);

  // Cycle status messages
  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 1800);
    return () => clearInterval(t);
  }, [messages.length]);

  // Animate dots
  useEffect(() => {
    const t = setInterval(() => setDots(d => d % 3 + 1), 500);
    return () => clearInterval(t);
  }, []);

  // Easing progress bar: fast start → slows near 90% → holds until done
  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 90) return p;
        // Increment shrinks as we approach 90 — creates natural deceleration
        const step = Math.max(0.25, (90 - p) * 0.045);
        return Math.min(90, p + step);
      });
    }, 120);
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

        <div className="loading-msg" key={msgIdx}>
          {messages[msgIdx]}
          <span className="loading-dots">{'.' .repeat(dots)}</span>
        </div>

        {/* Progress bar */}
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
            transition: 'width 0.12s ease-out',
            boxShadow: '0 0 8px rgba(107,96,255,0.6)',
          }} />
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
}
