import { useState } from 'react';
import FuriganaText from '../FuriganaText.jsx';

function FlashCard({ card, index, total, furigana, isJapanese }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div>
      <div className="flashcard-scene" onClick={() => setFlipped(f => !f)}>
        <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="flashcard-face front">
            <div className="flashcard-label">{isJapanese ? '問題' : 'Question'}</div>
            <div className="flashcard-text">
              <FuriganaText text={card.question} furigana={furigana} />
            </div>
            <div className="flashcard-hint">
              {isJapanese ? 'タップしてめくる' : 'Tap to flip'}
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
      <div className="flashcard-nav">
        <span className="card-counter">{index + 1} / {total}</span>
        {flipped && (
          <button
            className="btn btn-ghost"
            style={{ height: 34, fontSize: 13, padding: '0 14px' }}
            onClick={e => { e.stopPropagation(); setFlipped(false); }}
          >
            {isJapanese ? 'リセット' : 'Reset'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function FlashcardsTab({ cards, furigana, isJapanese }) {
  const [idx, setIdx] = useState(0);

  if (!cards?.length) return null;

  return (
    <div>
      <div className="section-title">{isJapanese ? 'フラッシュカード' : 'Flashcards'}</div>
      <FlashCard
        key={idx}
        card={cards[idx]}
        index={idx}
        total={cards.length}
        furigana={furigana}
        isJapanese={isJapanese}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1 }}
          disabled={idx === 0}
          onClick={() => setIdx(i => i - 1)}
        >
          ← {isJapanese ? '前へ' : 'Prev'}
        </button>
        <button
          className="btn btn-ghost"
          style={{ flex: 1 }}
          disabled={idx === cards.length - 1}
          onClick={() => setIdx(i => i + 1)}
        >
          {isJapanese ? '次へ' : 'Next'} →
        </button>
      </div>
    </div>
  );
}
