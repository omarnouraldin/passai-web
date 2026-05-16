import { useState, useEffect } from 'react';
import { getBrandWordmark } from '../lib/branding.js';

const EN_STAGES = [
  'Reading your notes',
  'Finding key topics',
  'Building explanations',
  'Creating quiz & flashcards',
  'Finalizing',
];
const JA_STAGES = [
  'ノートを読む',
  'キートピックを見つける',
  '解説を作る',
  'クイズとカードを作成',
  '仕上げ中',
];

const EN_TIPS = [
  'Tip: Review flashcards once before opening the quiz.',
  'Tip: If your PDF is blurry, upload screenshots of the clearest pages.',
  'Tip: Use the quiz tab to find weak points faster.',
  'Tip: Furigana helps with difficult terms, but focus on meaning first.',
];

const JA_TIPS = [
  'ヒント: クイズを開く前に、フラッシュカードを一度見直すと効果的です。',
  'ヒント: PDF がぼやけるときは、見やすいページのスクリーンショットもおすすめです。',
  'ヒント: クイズで苦手分野をすばやく見つけましょう。',
  'ヒント: ふりがなは難しい語を読む助けです。まず意味に注目しましょう。',
];

export default function LoadingView({ isJapanese, progress = 0, onCancel }) {
  const brand = getBrandWordmark(isJapanese);
  const [dots, setDots] = useState(1);
  const [tipIdx, setTipIdx] = useState(0);
  const safeProgress = Number.isFinite(Number(progress))
    ? Math.max(0, Math.min(100, Number(progress)))
    : 0;
  const [displayProgress, setDisplayProgress] = useState(safeProgress);

  const stages = isJapanese ? JA_STAGES : EN_STAGES;
  const tips = isJapanese ? JA_TIPS : EN_TIPS;

  const stageIdx =
    displayProgress <= 20 ? 0 :
    displayProgress <= 40 ? 1 :
    displayProgress <= 60 ? 2 :
    displayProgress <= 85 ? 3 : 4;

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
  }, [safeProgress]);

  useEffect(() => {
    if (safeProgress >= 96) {
      setDisplayProgress(safeProgress);
      return;
    }

    const t = setInterval(() => {
      setDisplayProgress(prev => {
        const target = Math.max(prev, safeProgress);
        if (target >= 95) return 95;
        return Math.min(target + 2, 95);
      });
    }, 900);

    return () => clearInterval(t);
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
            <div className="loading-msg" key={stageIdx}>
              {stages[stageIdx]}
              <span className="loading-dots">{'.' .repeat(dots)}</span>
            </div>

            <div className="loading-status-card">
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

              <div className="loading-percent">{Math.round(displayProgress)}%</div>
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
