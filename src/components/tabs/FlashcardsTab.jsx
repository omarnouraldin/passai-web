import { useState, useEffect } from 'react';
import FuriganaText from '../FuriganaText.jsx';

// ── Single card ───────────────────────────────────────────────────────────────
function FlashCard({ card, index, furigana, isJapanese, onVerdict, verdict }) {
  const [flipped, setFlipped] = useState(false);

  function handleVerdict(v) {
    onVerdict(index, v);
    setTimeout(() => setFlipped(false), 300);
  }

  const verdictIcon = verdict === 'know' ? '✓' : verdict === 'skip' ? '✗' : null;

  return (
    <div>
      <div className="flashcard-scene" onClick={() => setFlipped(f => !f)}>
        <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="flashcard-face front">
            {verdictIcon && (
              <div style={{
                position: 'absolute', top: 12, right: 14,
                fontSize: 13, fontWeight: 800,
                color: verdict === 'know' ? 'var(--success)' : 'var(--danger)',
              }}>
                {verdictIcon}
              </div>
            )}
            <div className="flashcard-label">{isJapanese ? '問題' : 'Question'}</div>
            <div className="flashcard-text">
              <FuriganaText text={card.question} furigana={furigana} />
            </div>
            <div className="flashcard-hint">
              {isJapanese ? 'タップして答えを見る' : 'Tap to reveal answer'}
            </div>
          </div>
          {/* Back */}
          <div className="flashcard-face back">
            <div className="flashcard-label">{isJapanese ? '答え' : 'Answer'}</div>
            <div className="flashcard-text">
              <FuriganaText text={card.answer} furigana={furigana} />
            </div>
          </div>
        </div>
      </div>

      {/* Know / Don't Know — only when flipped */}
      {flipped && (
        <div className="flashcard-verdict">
          <button
            className="verdict-btn dont-know"
            onClick={e => { e.stopPropagation(); handleVerdict('skip'); }}
          >
            ✗ {isJapanese ? 'まだ覚えてない' : "Don't know"}
          </button>
          <button
            className="verdict-btn know"
            onClick={e => { e.stopPropagation(); handleVerdict('know'); }}
          >
            ✓ {isJapanese ? '覚えた！' : 'Got it!'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────
export default function FlashcardsTab({ cards, furigana, isJapanese, contentId }) {
  const storageKey = contentId ? `passai_fc_${contentId}` : null;

  // Load saved verdicts
  const [verdicts, setVerdicts] = useState(() => {
    if (!storageKey) return {};
    try { return JSON.parse(localStorage.getItem(storageKey)) ?? {}; }
    catch { return {}; }
  });
  const [idx,      setIdx]      = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [retryIndices, setRetryIndices] = useState([]);

  // Persist verdicts whenever they change
  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(verdicts));
  }, [verdicts, storageKey]);

  if (!cards?.length) return null;

  const activeCards = retrying
    ? retryIndices.map(i => ({ ...cards[i], _origIdx: i })).filter(Boolean)
    : cards.map((c, i) => ({ ...c, _origIdx: i }));

  const currentCard = activeCards[Math.min(idx, activeCards.length - 1)];
  const knownCount  = Object.values(verdicts).filter(v => v === 'know').length;
  const skipCount   = Object.values(verdicts).filter(v => v === 'skip').length;
  const allAnswered = activeCards.length > 0 && activeCards.every(c => verdicts[c._origIdx] !== undefined);

  function handleVerdict(cardIndex, v) {
    if (retrying) {
      setRetryIndices(prev => (
        v === 'know'
          ? prev.filter(i => i !== cardIndex)
          : prev.includes(cardIndex) ? prev : [...prev, cardIndex]
      ));
    }
    setVerdicts(prev => ({ ...prev, [cardIndex]: v }));
    setTimeout(() => setIdx(i => Math.min(i + 1, activeCards.length - 1)), 400);
  }

  function startRetry() {
    const skipped = cards
      .map((_, i) => i)
      .filter(i => verdicts[i] === 'skip');
    setRetryIndices(skipped);
    setIdx(0);
    setVerdicts(prev => {
      const next = { ...prev };
      skipped.forEach(i => { delete next[i]; });
      return next;
    });
    setRetrying(true);
  }

  function resetAll() {
    setIdx(0);
    setVerdicts({});
    setRetrying(false);
    setRetryIndices([]);
    if (storageKey) localStorage.removeItem(storageKey);
  }

  useEffect(() => {
    if (!retrying) return;
    if (retryIndices.length === 0) {
      setRetrying(false);
      setIdx(0);
      return;
    }
    setIdx(prev => Math.min(prev, retryIndices.length - 1));
  }, [retryIndices, retrying]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          {retrying
            ? (isJapanese ? 'もう一度練習' : 'Practice again')
            : (isJapanese ? 'フラッシュカード' : 'Flashcards')}
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
          ✓ {knownCount} &nbsp; ✗ {skipCount}
        </span>
      </div>

      {/* Retry banner */}
      {allAnswered && skipCount > 0 && !retrying && (
        <div className="retry-banner">
          <div className="retry-badge">
            ✗ {skipCount} {isJapanese ? '枚もう一度' : `card${skipCount > 1 ? 's' : ''} to review`}
          </div>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={startRetry}>
            🔄 {isJapanese ? 'もう一度練習する' : 'Practice those cards again'}
          </button>
        </div>
      )}

      {allAnswered && skipCount === 0 && (
        <div className="retry-banner" style={{ marginBottom: 16 }}>
          <img src="/mascot/mascot-success.png" alt="" className="celebration-mascot" />
          <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 12 }}>
            {isJapanese ? '全部覚えた！' : 'All cards mastered!'}
          </div>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={resetAll}>
            🔄 {isJapanese ? 'もう一回' : 'Start over'}
          </button>
        </div>
      )}

      {currentCard && (
        <FlashCard
          key={`${currentCard._origIdx}-${retrying}`}
          card={currentCard}
          index={currentCard._origIdx}
          furigana={furigana}
          isJapanese={isJapanese}
          onVerdict={handleVerdict}
          verdict={verdicts[currentCard._origIdx]}
        />
      )}

      {/* Prev / Next */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1 }}
          disabled={idx === 0}
          onClick={() => setIdx(i => i - 1)}
        >
          ← {isJapanese ? '前' : 'Prev'}
        </button>
        <span className="card-counter" style={{ flexShrink: 0 }}>
          {Math.min(idx + 1, activeCards.length)} / {activeCards.length}
        </span>
        <button
          className="btn btn-ghost"
          style={{ flex: 1 }}
          disabled={idx >= activeCards.length - 1}
          onClick={() => setIdx(i => i + 1)}
        >
          {isJapanese ? '次' : 'Next'} →
        </button>
      </div>

      {Object.keys(verdicts).length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button
            onClick={resetAll}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
          >
            {isJapanese ? 'リセット' : 'Reset all'}
          </button>
        </div>
      )}
    </div>
  );
}
