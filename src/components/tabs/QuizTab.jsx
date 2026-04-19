import { useState, useMemo } from 'react';
import FuriganaText from '../FuriganaText.jsx';

const LETTERS = ['A', 'B', 'C', 'D'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build shuffled option list per question once per quiz attempt
function buildShuffled(questions) {
  return questions.map(q => {
    const correct = q.options[q.correctIndex];
    const shuffled = shuffle(q.options);
    return { shuffled, correctIndex: shuffled.indexOf(correct) };
  });
}

function QuizCard({ question, shuffledData, qIdx, total, answer, onAnswer, furigana, isJapanese }) {
  const { shuffled, correctIndex } = shuffledData;
  const answered = answer !== undefined;

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Question */}
      <div className="quiz-question-text">
        <span style={{ color: 'var(--accent)', marginRight: 8 }}>Q{qIdx + 1}.</span>
        <FuriganaText text={question.question} furigana={furigana} />
      </div>

      {/* Options */}
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

      {/* Explanation */}
      {answered && (
        <div className="explanation-box">
          💡 <FuriganaText text={question.explanation} furigana={furigana} />
        </div>
      )}
    </div>
  );
}

export default function QuizTab({ questions, furigana, isJapanese }) {
  const [answers, setAnswers]       = useState({});
  const [retakeKey, setRetakeKey]   = useState(0);

  // Re-shuffle on each retake
  const shuffledData = useMemo(() => buildShuffled(questions), [questions, retakeKey]);

  const total     = questions.length;
  const answered  = Object.keys(answers).length;
  const allDone   = answered === total;
  const score     = allDone
    ? Object.entries(answers).filter(([qi, ai]) => shuffledData[+qi].correctIndex === ai).length
    : null;

  function handleAnswer(qIdx, optIdx) {
    setAnswers(a => ({ ...a, [qIdx]: optIdx }));
  }

  function retake() {
    setAnswers({});
    setRetakeKey(k => k + 1);
  }

  return (
    <div>
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

      {/* Score banner (shown when all answered) */}
      {allDone && (
        <div className="quiz-score" style={{ marginBottom: 24 }}>
          <div className="quiz-score-num">{score}/{total}</div>
          <div className="quiz-score-label">
            {isJapanese
              ? `正解率 ${Math.round((score / total) * 100)}%`
              : `${Math.round((score / total) * 100)}% correct`}
          </div>
        </div>
      )}

      {/* Questions */}
      {questions.map((q, i) => (
        <QuizCard
          key={`${retakeKey}-${i}`}
          question={q}
          shuffledData={shuffledData[i]}
          qIdx={i}
          total={total}
          answer={answers[i]}
          onAnswer={handleAnswer}
          furigana={furigana}
          isJapanese={isJapanese}
        />
      ))}
    </div>
  );
}
