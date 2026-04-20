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
  const [msgIdx, setMsgIdx] = useState(0);
  const [dots, setDots]     = useState(1);

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
      </div>
    </div>
  );
}
