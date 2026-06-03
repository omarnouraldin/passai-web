import { useState, useEffect } from 'react';
import { getBrandWordmark } from '../lib/branding.js';

const EN_STAGES = [
  'Reading your notes',
  'Understanding the content',
  'Predicting likely test points',
  'Creating flashcards',
  'Generating quiz questions',
  'Finalizing your study pack',
];
const JA_STAGES = [
  'ノートを読み込んでいます',
  '内容を理解しています',
  'テストに出るポイントを予測中',
  'フラッシュカードを作成中',
  'クイズを生成中',
  '仕上げています',
];

const EN_TIPS = [
  'AI is organizing your study pack into a calmer format.',
  'Longer notes can take a little more time, especially when they include many topics.',
  'We are turning raw notes into summaries, flashcards, and quiz-ready material.',
  'This wait is normal while the app reads, organizes, and checks your study content.',
];

const JA_TIPS = [
  'AI がノートを整理して、見返しやすい学習パックにまとめています。',
  '内容が多いノートほど、少し長めにかかることがあります。',
  '要約・フラッシュカード・クイズ用の内容を順番に整えています。',
  '読み込み、整理、確認をしているので、この待ち時間は正常です。',
];

export default function LoadingView({ isJapanese, progress = 0, onCancel }) {
  const brand = getBrandWordmark(isJapanese);
  const [dots, setDots] = useState(1);
  const [tipIdx, setTipIdx] = useState(0);
  const [isStalled, setIsStalled] = useState(false);
  const safeProgress = Number.isFinite(Number(progress))
    ? Math.max(0, Math.min(100, Number(progress)))
    : 0;
  const [displayProgress, setDisplayProgress] = useState(safeProgress);

  const stages = isJapanese ? JA_STAGES : EN_STAGES;
  const tips = isJapanese ? JA_TIPS : EN_TIPS;

  const stageIdx =
    displayProgress <= 16 ? 0 :
    displayProgress <= 32 ? 1 :
    displayProgress <= 48 ? 2 :
    displayProgress <= 66 ? 3 :
    displayProgress <= 84 ? 4 : 5;

  useEffect(() => {
    const t = setInterval(() => setDots(d => d % 3 + 1), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 4500);
    return () => clearInterval(t);
  }, [tips.length]);

  useEffect(() => {
    setDisplayProgress(prev => Math.max(prev, safeProgress));
    setIsStalled(false);
  }, [safeProgress]);

  useEffect(() => {
    if (safeProgress >= 100) {
      setDisplayProgress(100);
      setIsStalled(false);
      return;
    }

    const t = setInterval(() => {
      setDisplayProgress(prev => {
        const base = Math.max(prev, safeProgress, 8);
        const cap = safeProgress >= 90 ? 96 : safeProgress >= 70 ? 90 : safeProgress >= 40 ? 80 : 68;
        if (base >= cap) return base;
        const step = base < 32 ? 2 : 1;
        return Math.min(base + step, cap);
      });
    }, 650);

    const stallTimer = setTimeout(() => {
      if (safeProgress < 95) setIsStalled(true);
    }, 14000);

    return () => {
      clearInterval(t);
      clearTimeout(stallTimer);
    };
  }, [safeProgress]);

  return (
    <div className="loading-overlay">
      <div className="loading-shell">
        <div className="loading-brand-row">
          <div className="logo loading-wordmark">
            <span className="logo-pass">{brand.lead}</span>
            <span className="logo-ai">{brand.suffix}</span>
          </div>
          <div className="loading-subtitle">{isJapanese ? '学習素材を作成中' : 'Preparing your study material'}</div>
        </div>

        <div className="loading-layout">
          <div className="loading-mascot-wrap">
            <img src="/mascot/mascot-loading.png" alt="Thinking..." className="loading-mascot" />
          </div>

          <div className="loading-copy">
            <div className="loading-note">
              {isJapanese
                ? 'AI が学習パックを作成しています'
                : 'AI is creating your study pack'}
            </div>
            <div className="loading-msg" key={stageIdx}>
              {stages[stageIdx]}
              <span className="loading-dots">{'.' .repeat(dots)}</span>
            </div>

            <div className="loading-status-card">
              <div className="loading-progress-head">
                <div className="loading-progress-label">{isJapanese ? '進行状況' : 'Progress'}</div>
                <div className="loading-percent">{Math.round(displayProgress)}%</div>
              </div>

              <div className="loading-progress-bar">
                <div
                  className="loading-progress-fill"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>

              <div className="loading-stage-list">
                {stages.map((stage, index) => (
                  <div
                    key={stage}
                    className={`loading-stage-item ${index < stageIdx ? 'done' : index === stageIdx ? 'active' : ''}`}
                  >
                    <span className="loading-stage-dot">{index < stageIdx ? '✓' : index + 1}</span>
                    <span className="loading-stage-text">{stage}</span>
                  </div>
                ))}
              </div>

              <div className="loading-tip-card">
                <div className="loading-tip-label">{isJapanese ? 'ヒント' : 'Tip'}</div>
                <div className="loading-tip-text">{tips[tipIdx]}</div>
              </div>

              {isStalled && (
                <div className="loading-tip-card loading-tip-card-long">
                  <div className="loading-tip-label">{isJapanese ? '少し長めです' : 'Taking longer'}</div>
                  <div className="loading-tip-text">
                    {isJapanese
                      ? '内容量が多いと少し長くなることがあります。処理はそのまま続いています。'
                      : 'This can take a bit longer with larger notes. Your request is still processing.'}
                  </div>
                </div>
              )}
            </div>

            {onCancel && (
              <button
                onClick={onCancel}
                className="loading-cancel"
              >
                {isJapanese ? 'キャンセル' : 'Cancel'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
