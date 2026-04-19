import { useState, useEffect } from 'react';
import Mascot from './Mascot.jsx';

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
  const [msgIdx, setMsgIdx]   = useState(0);
  const [dots, setDots]       = useState(1);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 1800);
    return () => clearInterval(t);
  }, [messages.length]);

  useEffect(() => {
    const t = setInterval(() => setDots(d => d % 3 + 1), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="loading-overlay">
      <div className="pulse-rings">
        <div className="ring ring-1" />
        <div className="ring ring-2" />
        <div className="ring ring-3" />
        <div className="sparkle-center" style={{ background: 'none' }}>
          <Mascot pose="loading" size={88} style={{ boxShadow: '0 0 0 4px rgba(107,96,255,0.35)' }} />
        </div>
      </div>

      <div className="loading-text">
        <div className="logo" style={{ textAlign: 'center', marginBottom: 14 }}>
          <span className="logo-pass">{isJapanese ? 'パス' : 'Pass'}</span>
          <span className="logo-ai">AI</span>
        </div>
        <div className="loading-msg" key={msgIdx}>
          {messages[msgIdx]}
          <span className="loading-dots">{'.'  .repeat(dots)}</span>
        </div>
      </div>
    </div>
  );
}
