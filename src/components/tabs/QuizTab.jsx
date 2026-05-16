import { useState, useMemo, useEffect } from 'react';
import FuriganaText from '../FuriganaText.jsx';

const LETTERS = ['A', 'B', 'C', 'D'];

// ── Deterministic shuffle — same question always produces same order ───────────
// This makes saved answer indices always valid across app reloads.
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = (seed | 1) >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(1664525, s) + 1013904223 | 0;
    const j = (s >>> 0) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildShuffled(questions, retakeKey) {
  return questions.map((q, qi) => {
    const correct  = q.options[q.correctIndex];
    // Multiply seed by (retakeKey + 1) so each retake gets a different order
    const seed     = hashSeed(q.question + qi) * (retakeKey + 1);
    const shuffled = seededShuffle(q.options, Math.abs(seed));
    return { shuffled, correctIndex: shuffled.indexOf(correct) };
  });
}

// ── Single quiz card ──────────────────────────────────────────────────────────
function QuizCard({ question, shuffledData, qIdx, answer, onAnswer, furigana, isJapanese }) {
  const { shuffled, correctIndex } = shuffledData;
  const answered = answer !== undefined;

  return (
    <div style={{ marginBottom: 32 }}>
      <div className="quiz-question-text">
        <span style={{ color: 'var(--accent)', marginRight: 8 }}>Q{qIdx + 1}.</span>
        <FuriganaText text={question.question} furigana={furigana} />
      </div>

      {shuffled.map((opt, i) => {
        let cls = 'quiz-option';
        if (answered) {
          if (i === correctIndex) cls += ' correct';
          else if (i === answer)  cls += ' wrong';
        }
        return (
          <button
            key={i}
            className={cls}
            disabled={answered}
            onClick={() => onAnswer(qIdx, i)}
          >
            <span className="option-letter">{LETTERS[i]}</span>
            <FuriganaText text={opt} furigana={furigana} />
          </button>
        );
      })}

      {answered && (
        <div className="explanation-box">
          💡 <FuriganaText text={question.explanation} furigana={furigana} />
        </div>
      )}
    </div>
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────
export default function QuizTab({ questions, thinkingQuestions, furigana, isJapanese, contentId }) {
  const storageKey = contentId ? `passai_qz_${contentId}` : null;

  // Load saved state { answers, retakeKey }
  const [answers,   setAnswers]   = useState(() => {
    if (!storageKey) return {};
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return saved?.answers ?? {};
    } catch { return {}; }
  });
  const [retakeKey, setRetakeKey] = useState(() => {
    if (!storageKey) return 0;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return saved?.retakeKey ?? 0;
    } catch { return 0; }
  });

  // Save whenever answers or retakeKey change
  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify({ answers, retakeKey }));
  }, [answers, retakeKey, storageKey]);

  // Deterministic shuffle — same seed per (question + retakeKey)
  const shuffledData = useMemo(() => buildShuffled(questions, retakeKey), [questions, retakeKey]);

  const total    = questions.length;
  const answered = Object.keys(answers).length;
  const allDone  = answered === total;
  const score    = allDone
    ? Object.entries(answers).filter(([qi, ai]) => shuffledData[+qi].correctIndex === ai).length
    : null;

  function handleAnswer(qIdx, optIdx) {
    setAnswers(a => ({ ...a, [qIdx]: optIdx }));
  }

  function retake() {
    setAnswers({});
    setRetakeKey(k => k + 1);
    if (storageKey) localStorage.removeItem(storageKey);
  }

  return (
    <div>
      {/* 🤔 Thinking questions warm-up — only shown before any answers */}
      {thinkingQuestions?.length > 0 && answered === 0 && (
        <div style={{
          background: 'rgba(255,159,10,0.07)',
          border: '1px solid rgba(255,159,10,0.25)',
          borderRadius: 'var(--radius)',
          padding: '16px 18px',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🤔</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-amber)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
              {isJapanese ? '考えてみよう' : 'Think About It First'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {thinkingQuestions.map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--color-amber)', fontWeight: 700, flexShrink: 0, fontSize: 14 }}>{i + 1}.</span>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>
                  <FuriganaText text={q} furigana={furigana} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          {isJapanese ? 'クイズ' : 'Quiz'}
        </div>
        {answered > 0 && (
          <button className="btn btn-ghost" style={{ height: 32, fontSize: 13, padding: '0 14px' }} onClick={retake}>
            🔄 {isJapanese ? 'やり直す' : 'Retake'}
          </button>
        )}
      </div>

      {/* Progress dots */}
      <div className="quiz-progress">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`quiz-dot ${answers[i] !== undefined ? 'answered' : ''}`}
          />
        ))}
      </div>

      {/* Score banner */}
      {allDone && (
        <div className="quiz-score" style={{ marginBottom: 24 }}>
          <img src="/mascot/mascot-success.png" alt="" className="quiz-score-mascot" />
          <div className="quiz-score-num">{score}/{total}</div>
          <div className="quiz-score-label">
            {isJapanese
              ? `正解率 ${Math.round((score / total) * 100)}%`
              : `${Math.round((score / total) * 100)}% correct`}
          </div>
        </div>
      )}

      {questions.map((q, i) => (
        <QuizCard
          key={`${retakeKey}-${i}`}
          question={q}
          shuffledData={shuffledData[i]}
          qIdx={i}
          answer={answers[i]}
          onAnswer={handleAnswer}
          furigana={furigana}
          isJapanese={isJapanese}
        />
      ))}
    </div>
  );
}
