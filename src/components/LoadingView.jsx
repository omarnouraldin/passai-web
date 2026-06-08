import { useState, useEffect } from 'react';
import { getBrandWordmark } from '../lib/branding.js';

const EN_STEPS = [
  'Reading your notes',
  'Extracting key concepts',
  'Generating questions',
  'Creating flashcards',
  'Writing summary',
];
const JA_STEPS = [
  'ノートを読み込んでいます',
  '重要ポイントを抽出中',
  '問題を生成しています',
  'フラッシュカードを作成中',
  '要約を作成しています',
];

// Map 0–100 progress → active step index 0–4
function progressToStep(p) {
  if (p <= 15) return 0;
  if (p <= 33) return 1;
  if (p <= 56) return 2;
  if (p <= 80) return 3;
  return 4;
}

export default function LoadingView({ isJapanese, progress = 0, onCancel }) {
  const brand = getBrandWordmark(isJapanese);

  const safeProgress = Number.isFinite(Number(progress))
    ? Math.max(0, Math.min(100, Number(progress)))
    : 0;

  const [displayProgress, setDisplayProgress] = useState(safeProgress);
  const [isStalled,       setIsStalled]       = useState(false);

  // Smoothly nudge display progress forward so bar never looks frozen
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
        const cap =
          safeProgress >= 90 ? 96 :
          safeProgress >= 70 ? 90 :
          safeProgress >= 40 ? 80 : 68;
        if (base >= cap) return base;
        return Math.min(base + (base < 32 ? 2 : 1), cap);
      });
    }, 650);

    const stallTimer = setTimeout(() => {
      if (safeProgress < 95) setIsStalled(true);
    }, 14000);

    return () => { clearInterval(t); clearTimeout(stallTimer); };
  }, [safeProgress]);

  const steps      = isJapanese ? JA_STEPS : EN_STEPS;
  const activeStep = progressToStep(displayProgress);

  return (
    <div className="lv-overlay">
      {/* Floating cat mascot */}
      <div className="lv-cat-wrap">
        <img
          src={brand.iconPath}
          alt="PassAI"
          className="lv-cat-img"
        />
      </div>

      <p className="lv-title">
        {isJapanese ? '学習パックを生成中' : 'Generating your study pack'}
      </p>
      <p className="lv-sub">
        {isJapanese
          ? 'AIがノートを分析しています。しばらくお待ちください。'
          : 'AI is reading and analysing your notes. Hang tight.'}
      </p>

      {/* Step checklist */}
      <div className="lv-steps">
        {steps.map((label, i) => {
          const isDone   = i < activeStep;
          const isActive = i === activeStep;
          const isPend   = i > activeStep;
          return (
            <div key={i} className="lv-step">
              <div className={`lv-dot ${isDone ? 'lv-dot-done' : isActive ? 'lv-dot-active' : 'lv-dot-pend'}`}>
                {isDone
                  ? '✓'
                  : isActive
                    ? <div className="lv-dot-active-inner" />
                    : null}
              </div>
              <span className={`lv-step-text ${isDone ? 'done' : isActive ? 'active' : 'pend'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="lv-bar-track">
        <div className="lv-bar-fill" style={{ width: `${Math.round(displayProgress)}%` }} />
      </div>

      {/* Stall notice */}
      {isStalled && (
        <p className="lv-stall-note">
          {isJapanese
            ? '内容量が多い場合、少し長めにかかることがあります。そのまましばらくお待ちください。'
            : 'Larger notes take a little longer. Your request is still processing.'}
        </p>
      )}

      {onCancel && (
        <button className="lv-cancel" onClick={onCancel}>
          {isJapanese ? 'キャンセル' : 'Cancel'}
        </button>
      )}
    </div>
  );
}
