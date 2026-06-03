import { useEffect, useMemo, useState } from 'react';
import FuriganaText from '../FuriganaText.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { supabase, SUPABASE_ENABLED } from '../../lib/supabase.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const EXAM_STORAGE_PREFIX = 'passai_exam_state';

// ── Get access token helper ───────────────────────────────────────────────────
async function getToken() {
  if (!SUPABASE_ENABLED || !supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// ── Score label ───────────────────────────────────────────────────────────────
function gradeLabel(pct, isJapanese) {
  if (pct >= 90) return isJapanese ? '優秀 🎉'  : 'Excellent 🎉';
  if (pct >= 75) return isJapanese ? '良い 👍'  : 'Good 👍';
  if (pct >= 60) return isJapanese ? '合格 ✓'   : 'Passing ✓';
  return isJapanese ? '要復習 📚' : 'Needs Review 📚';
}

function shortAnswerGuidance(question, isJapanese) {
  const text = String(question ?? '').trim();
  const asksWhyOrHow = /なぜ|どうして|どのように|説明|compare|explain|why|how|describe|discuss/i.test(text);
  const asksListOrName = /何|どれ|挙げ|name|list|which|who|when|where|define/i.test(text);

  if (asksWhyOrHow || text.length > 55) {
    return isJapanese ? '2〜3文で答えてください。AIが採点します。' : 'Answer in 2–3 sentences. AI will grade your response.';
  }
  if (asksListOrName || text.length < 32) {
    return isJapanese ? '1文で短く答えても大丈夫です。必要なら2文でもOKです。' : 'A short 1-sentence answer is fine here. Use 2 if needed.';
  }
  return isJapanese ? '1〜2文で答えてください。AIが採点します。' : 'Answer in 1–2 sentences. AI will grade your response.';
}

function getStorageKey(contentId) {
  return `${EXAM_STORAGE_PREFIX}:${contentId ?? 'default'}`;
}

function loadExamSnapshot(contentId) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getStorageKey(contentId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveExamSnapshot(contentId, snapshot) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(contentId), JSON.stringify(snapshot));
  } catch {
    // ignore storage failures
  }
}

function clearExamSnapshot(contentId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getStorageKey(contentId));
  } catch {
    // ignore storage failures
  }
}

// ── Pro gate ─────────────────────────────────────────────────────────────────
function ProGate({ isJapanese, onUpgrade }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎓</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
        {isJapanese ? '試験モードは Pro 機能です' : 'Exam Mode is a Pro feature'}
      </div>
      <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 28, maxWidth: 280, margin: '0 auto 28px' }}>
        {isJapanese
          ? 'Pro にアップグレードすると、混合問題形式の本格的な模擬試験を生成できます。多肢選択、短答式、穴埋め問題を含む本格的な試験です。'
          : 'Upgrade to Pro to generate full mock exams from your notes — multiple choice, short answer, and fill-in-the-blank with AI grading.'}
      </div>
      <div style={{
        background: 'linear-gradient(135deg, rgba(107,96,255,0.15), rgba(167,139,250,0.15))',
        border: '1px solid rgba(107,96,255,0.3)',
        borderRadius: 12,
        padding: '16px 20px',
        fontSize: 13,
        color: 'var(--muted)',
        marginBottom: 24,
      }}>
        {isJapanese ? '✨ Pro では...' : '✨ With Pro...'}
        <ul style={{ margin: '10px 0 0', padding: '0 0 0 18px', lineHeight: 2 }}>
          <li>{isJapanese ? '混合形式の模擬試験' : 'Full mixed-format mock exams'}</li>
          <li>{isJapanese ? 'AI による短答採点' : 'AI-graded short answer questions'}</li>
          <li>{isJapanese ? 'より高度な AI 理解' : 'Advanced AI explanations'}</li>
          <li>{isJapanese ? '無制限の生成' : 'Unlimited generations'}</li>
        </ul>
      </div>
      <button className="btn btn-primary" style={{ width: '100%', maxWidth: 280 }}
        onClick={onUpgrade}>
        {isJapanese ? 'Pro にアップグレード' : 'Upgrade to Pro'}
      </button>
    </div>
  );
}

// ── Main ExamTab ──────────────────────────────────────────────────────────────
export default function ExamTab({ originalInput, furigana, isJapanese, contentId, onUpgrade }) {
  const { isPro, refreshProfile } = useAuth();

  const [examState,  setExamState]  = useState('idle');    // idle | generating | ready | evaluating | done
  const [examData,   setExamData]   = useState(null);
  const [progress,   setProgress]   = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState({});        // { idx: choiceIdx }
  const [saAnswers,  setSaAnswers]  = useState(['', '', '']); // short answer text
  const [fbAnswers,  setFbAnswers]  = useState(['', '', '']); // fill blank text
  const [results,    setResults]    = useState(null);
  const [error,      setError]      = useState(null);
  const [proReady,   setProReady]    = useState(false);
  const [displayProgress, setDisplayProgress] = useState(8);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const [showLongRunning, setShowLongRunning] = useState(false);
  const [loadingDots, setLoadingDots] = useState(1);

  const loadingStages = useMemo(() => (
    isJapanese
      ? ['ノートを読み込んでいます', '内容を理解しています', 'テストに出るポイントを予測中', 'フラッシュカードを作成中', 'クイズを生成中', '仕上げています']
      : ['Reading your notes', 'Understanding the content', 'Predicting likely test points', 'Creating flashcards', 'Generating quiz questions', 'Finalizing your exam pack']
  ), [isJapanese]);

  const loadingTips = useMemo(() => (
    isJapanese
      ? [
          'AI が学習内容を読み取って、試験パックへ整理しています。',
          '内容が多いと少し長くかかることがありますが、処理は続いています。',
          '問題を作るだけでなく、復習しやすい順序にも整えています。',
        ]
      : [
          'AI is organizing your notes into an exam pack.',
          'Larger notes can take a little longer, but the process is still running.',
          'We are building questions in a careful order so the pack stays useful.',
        ]
  ), [isJapanese]);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    let alive = true;

    async function syncProAndRestore() {
      setProReady(false);
      const restoreSnapshot = () => {
        const snapshot = loadExamSnapshot(contentId);
        if (snapshot) {
          setExamState(snapshot.examState ?? 'idle');
          setExamData(snapshot.examData ?? null);
          setProgress(Number(snapshot.progress ?? 0));
          setMcqAnswers(snapshot.mcqAnswers ?? {});
          setSaAnswers(Array.isArray(snapshot.saAnswers) ? snapshot.saAnswers : ['', '', '']);
          setFbAnswers(Array.isArray(snapshot.fbAnswers) ? snapshot.fbAnswers : ['', '', '']);
          setResults(snapshot.results ?? null);
          setError(snapshot.error ?? null);
          return true;
        }
        setExamState('idle');
        setExamData(null);
        setProgress(0);
        setMcqAnswers({});
        setSaAnswers(['', '', '']);
        setFbAnswers(['', '', '']);
        setResults(null);
        setError(null);
        return false;
      };

      if (!isPro) {
        try {
          await refreshProfile();
        } catch {
          // ignore refresh failures and rely on current context state
        }
      }

      if (!alive) return;
      restoreSnapshot();
      if (alive) setProReady(true);
    }

    syncProAndRestore();
    return () => {
      alive = false;
    };
  }, [contentId]);

  useEffect(() => {
    if (!proReady || !contentId) return;
    saveExamSnapshot(contentId, {
      examState,
      examData,
      progress,
      mcqAnswers,
      saAnswers,
      fbAnswers,
      results,
      error,
    });
  }, [contentId, proReady, examState, examData, progress, mcqAnswers, saAnswers, fbAnswers, results, error]);

  useEffect(() => {
    if (examState !== 'generating') {
      setShowLongRunning(false);
      setLoadingDots(1);
      setTipIndex(0);
      setLoadingStageIndex(0);
      if (examState !== 'ready' && examState !== 'done') {
        setDisplayProgress(8);
      }
      return;
    }

    const stageForProgress = value => {
      if (value <= 16) return 0;
      if (value <= 32) return 1;
      if (value <= 48) return 2;
      if (value <= 66) return 3;
      if (value <= 84) return 4;
      return 5;
    };

    const dotTimer = setInterval(() => setLoadingDots(d => d % 3 + 1), 450);
    const tipTimer = setInterval(() => setTipIndex(i => (i + 1) % loadingTips.length), 4500);
    const progressTimer = setInterval(() => {
      setDisplayProgress(prev => {
        const base = Math.max(prev, progress || 8, 8);
        const cap = progress >= 90 ? 96 : progress >= 70 ? 90 : progress >= 40 ? 80 : 68;
        const next = base >= cap ? base : Math.min(base + (base < 30 ? 2 : 1), cap);
        setLoadingStageIndex(stageForProgress(next));
        return next;
      });
    }, 700);
    const longRunningTimer = setTimeout(() => setShowLongRunning(true), 24000);

    return () => {
      clearInterval(dotTimer);
      clearInterval(tipTimer);
      clearInterval(progressTimer);
      clearTimeout(longRunningTimer);
    };
  }, [examState, loadingTips.length, progress]);

  useEffect(() => {
    if (examState !== 'generating') return;
    setDisplayProgress(prev => Math.max(prev, Number(progress) || 8));
    if (Number(progress) >= 96) {
      setDisplayProgress(Number(progress));
    }
  }, [progress, examState]);

  // ── Generate exam ───────────────────────────────────────────────────────
  async function generateExam() {
    clearExamSnapshot(contentId);
    setExamState('generating');
    setProgress(8);
    setDisplayProgress(8);
    setLoadingStageIndex(0);
    setTipIndex(0);
    setLoadingDots(1);
    setShowLongRunning(false);
    setError(null);
    setMcqAnswers({});
    setSaAnswers(['', '', '']);
    setFbAnswers(['', '', '']);
    setResults(null);

    try {
      const token = await getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body = { mode: 'generate', language: isJapanese ? 'japanese' : 'english' };
      if (originalInput?.fileData?.imageBase64) {
        body.imageBase64 = originalInput.fileData.imageBase64;
        body.mediaType   = originalInput.fileData.mediaType;
      } else {
        body.noteText = originalInput?.fileData?.text ?? originalInput?.noteText ?? '';
      }

      const res = await fetch('/api/exam', { method: 'POST', headers, body: JSON.stringify(body) });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to generate exam');
      }

      // Read SSE stream
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      let data      = null;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'progress') {
              const nextValue = Number(event.value);
              if (Number.isFinite(nextValue)) {
                setProgress(nextValue);
                setDisplayProgress(prev => Math.max(prev, nextValue));
                setLoadingStageIndex(nextValue <= 16 ? 0 : nextValue <= 32 ? 1 : nextValue <= 48 ? 2 : nextValue <= 66 ? 3 : nextValue <= 84 ? 4 : 5);
              }
            }
            if (event.type === 'result')   { data = event.data; break outer; }
            if (event.type === 'error')    throw new Error(event.message);
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }

      if (!data) throw new Error('No exam data received');
      setExamData(data);
      setProgress(100);
      setDisplayProgress(100);
      setLoadingStageIndex(4);
      await new Promise(resolve => setTimeout(resolve, 320));
      setExamState('ready');
    } catch (err) {
      setError(err.message);
      setExamState('idle');
      setProgress(0);
      setDisplayProgress(8);
      setLoadingStageIndex(0);
      setShowLongRunning(false);
    }
  }

  // ── Submit exam ─────────────────────────────────────────────────────────
  async function submitExam() {
    setExamState('evaluating');
    setError(null);

    try {
      const token = await getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const evalRes = await fetch('/api/exam', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: 'evaluate',
          questions: examData.shortAnswer,
          shortAnswers: saAnswers,
        }),
      });

      if (!evalRes.ok) throw new Error('Evaluation failed');
      const evalData = await evalRes.json();

      // Score MCQ
      const mcqScore = examData.multipleChoice.reduce((sum, q, i) => {
        return sum + (mcqAnswers[i] === q.correctIndex ? 1 : 0);
      }, 0);

      // Score fill blank (case-insensitive exact match)
      const fbScore = examData.fillBlank.reduce((sum, q, i) => {
        return sum + (fbAnswers[i].trim().toLowerCase() === q.answer.toLowerCase() ? 1 : 0);
      }, 0);

      // Short answer score from Claude
      const saScore = evalData.evaluations?.reduce((sum, e) => sum + e.score, 0) ?? 0;
      const saMax   = examData.shortAnswer.length * 3;

      setResults({
        mcqScore, mcqMax: examData.multipleChoice.length,
        saScore,  saMax,
        fbScore,  fbMax: examData.fillBlank.length,
        evaluations: evalData.evaluations ?? [],
      });
      setExamState('done');
    } catch (err) {
      setError(err.message);
      setExamState('ready');
    }
  }

  // ── Check if all questions answered ────────────────────────────────────
  const allMcqAnswered = examData
    ? Object.keys(mcqAnswers).length === examData.multipleChoice.length
    : false;
  const allSaAnswered = saAnswers.every(a => a.trim().length > 0);
  const allFbAnswered = fbAnswers.every(a => a.trim().length > 0);
  const canSubmit = allMcqAnswered && allSaAnswered && allFbAnswered;

  // ── Pro gate ────────────────────────────────────────────────────────────
  if (!proReady) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>
          {isJapanese ? '試験モードを確認中...' : 'Checking Exam Mode access...'}
        </div>
      </div>
    );
  }

  if (!isPro) return <ProGate isJapanese={isJapanese} onUpgrade={onUpgrade} />;

  // ── Idle state ──────────────────────────────────────────────────────────
  if (examState === 'idle') {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>📝</div>
        <div className="section-title" style={{ marginBottom: 10 }}>
          {isJapanese ? '模擬試験を生成する' : 'Generate Mock Exam'}
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 28 }}>
          {isJapanese
            ? '多肢選択（5問）、短答式（3問）、穴埋め（3問）の本格的な試験を作成します。'
            : 'Creates a full exam: 5 multiple choice, 3 short answer, and 3 fill-in-the-blank questions.'}
        </div>
        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}
        <button className="btn btn-primary" style={{ width: '100%', maxWidth: 300 }} onClick={generateExam}>
          ✨ {isJapanese ? '試験を生成する' : 'Generate Exam'}
        </button>
      </div>
    );
  }

  // ── Generating state ────────────────────────────────────────────────────
  if (examState === 'generating') {
    return (
      <div className="exam-loading-shell">
        <div className="exam-loading-illustration">
          <img src="/mascot/mascot-loading.png" alt="" className="exam-loading-mascot" />
        </div>
        <div className="exam-loading-note">
          {isJapanese ? 'AI が試験パックを作成しています' : 'AI is creating your exam pack'}
        </div>
        <div className="exam-loading-title">
          {loadingStages[loadingStageIndex]}
          <span className="exam-loading-dots">{'.'.repeat(loadingDots)}</span>
        </div>
        <div className="exam-loading-card">
          <div className="exam-loading-progress-head">
            <div className="exam-loading-progress-label">{isJapanese ? '進行状況' : 'Progress'}</div>
            <div className="exam-loading-percent">{Math.round(displayProgress)}%</div>
          </div>
          <div className="exam-loading-progress-bar">
            <div
              className="exam-loading-progress-fill"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <div className="exam-loading-stage-list">
            {loadingStages.map((stage, index) => (
              <div key={stage} className={`exam-loading-stage-item ${index < loadingStageIndex ? 'done' : index === loadingStageIndex ? 'active' : ''}`}>
                <span className="exam-loading-stage-dot">{index < loadingStageIndex ? '✓' : index + 1}</span>
                <span className="exam-loading-stage-text">{stage}</span>
              </div>
            ))}
          </div>
          <div className={`exam-loading-tip-card ${showLongRunning ? 'long' : ''}`}>
            <div className="exam-loading-tip-label">
              {showLongRunning ? (isJapanese ? '少し長めです' : 'Taking longer') : (isJapanese ? '進行中' : 'In progress')}
            </div>
            <div className="exam-loading-tip-text">
              {showLongRunning
                ? (isJapanese ? '内容量が多いと少し長くなることがあります。処理は続いています。' : 'This can take longer with larger notes. Your request is still processing.')
                : loadingTips[tipIndex]}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Results state ───────────────────────────────────────────────────────
  if (examState === 'done' && results) {
    const total    = results.mcqScore + results.saScore + results.fbScore;
    const totalMax = results.mcqMax + results.saMax + results.fbMax;
    const pct      = Math.round((total / totalMax) * 100);

    return (
      <div>
        {/* Score banner */}
        <div className="quiz-score" style={{ marginBottom: 28 }}>
          <div className="quiz-score-num">{total}/{totalMax}</div>
          <div className="quiz-score-label">{pct}% — {gradeLabel(pct, isJapanese)}</div>
        </div>

        {/* Score breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
          {[
            { label: isJapanese ? '多肢選択' : 'Multiple Choice', score: results.mcqScore, max: results.mcqMax },
            { label: isJapanese ? '短答式' : 'Short Answer',     score: results.saScore,  max: results.saMax  },
            { label: isJapanese ? '穴埋め' : 'Fill in Blank',    score: results.fbScore,  max: results.fbMax  },
          ].map(({ label, score, max }) => (
            <div key={label} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{score}/{max}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* MCQ review */}
        <div className="section-title">{isJapanese ? '多肢選択の振り返り' : 'Multiple Choice Review'}</div>
        {examData.multipleChoice.map((q, i) => {
          const userChoice = mcqAnswers[i];
          const correct = userChoice === q.correctIndex;
          return (
            <div key={i} style={{ marginBottom: 20, padding: '14px', background: 'var(--card)', borderRadius: 10, border: `1.5px solid ${correct ? 'rgba(48,209,88,0.3)' : 'rgba(255,69,58,0.3)'}` }}>
              <div className="exam-review-question" style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
                {correct ? '✅' : '❌'} Q{i + 1}. <FuriganaText text={q.question} furigana={furigana} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {isJapanese ? '正解: ' : 'Answer: '}<span style={{ color: 'var(--color-green)', fontWeight: 600 }}>{LETTERS[q.correctIndex]}. {q.options[q.correctIndex]}</span>
              </div>
              {!correct && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  {isJapanese ? 'あなたの回答: ' : 'Your answer: '}<span style={{ color: 'var(--danger)' }}>{LETTERS[userChoice]}. {q.options[userChoice]}</span>
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, fontStyle: 'italic' }}>💡 {q.explanation}</div>
            </div>
          );
        })}

        {/* Short answer review */}
        <div className="section-title" style={{ marginTop: 24 }}>{isJapanese ? '短答式の採点' : 'Short Answer Grading'}</div>
        {examData.shortAnswer.map((q, i) => {
          const ev = results.evaluations[i];
          return (
            <div key={i} style={{ marginBottom: 20, padding: '14px', background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div className="exam-review-question" style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Q{i + 1}. <FuriganaText text={q.question} furigana={furigana} /></div>
              <div style={{ fontSize: 13, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px', marginBottom: 8, color: 'var(--muted)' }}>
                {isJapanese ? 'あなたの回答: ' : 'Your answer: '}{saAnswers[i] || '—'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-green)', marginBottom: 6 }}>
                {isJapanese ? '模範解答: ' : 'Model answer: '}{q.modelAnswer}
              </div>
              {ev && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{ev.score}/{ev.maxScore}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>💡 {ev.feedback}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Fill blank review */}
        <div className="section-title" style={{ marginTop: 24 }}>{isJapanese ? '穴埋めの振り返り' : 'Fill in the Blank Review'}</div>
        {examData.fillBlank.map((q, i) => {
          const correct = fbAnswers[i].trim().toLowerCase() === q.answer.toLowerCase();
          return (
            <div key={i} style={{ marginBottom: 16, padding: '14px', background: 'var(--card)', borderRadius: 10, border: `1.5px solid ${correct ? 'rgba(48,209,88,0.3)' : 'rgba(255,69,58,0.3)'}` }}>
              <div className="exam-review-question" style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>{correct ? '✅' : '❌'} {q.sentence.replace('___', `[${q.answer}]`)}</div>
              {!correct && <div style={{ fontSize: 13, color: 'var(--danger)' }}>{isJapanese ? 'あなた: ' : 'You wrote: '}{fbAnswers[i] || '—'}</div>}
            </div>
          );
        })}

        <button className="btn btn-primary" style={{ width: '100%', marginTop: 24 }} onClick={() => {
          clearExamSnapshot(contentId);
          setExamState('idle');
          setExamData(null);
          setProgress(0);
          setMcqAnswers({});
          setSaAnswers(['', '', '']);
          setFbAnswers(['', '', '']);
          setResults(null);
          setError(null);
        }}>
          🔄 {isJapanese ? '新しい試験を生成' : 'Generate New Exam'}
        </button>
      </div>
    );
  }

  // ── Exam ready — show questions ──────────────────────────────────────────
  return (
    <div>
      <div className="section-title" style={{ marginBottom: 4 }}>
        {examData?.examTitle ?? (isJapanese ? '模擬試験' : 'Mock Exam')}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
        {isJapanese ? '全問に回答してから「提出」を押してください。' : 'Answer all questions then press Submit.'}
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Section 1: Multiple Choice ─────────────────────────────────── */}
      <div className="section-title">{isJapanese ? '第1部：多肢選択問題' : 'Part 1: Multiple Choice'}</div>
      {examData.multipleChoice.map((q, i) => (
        <div key={i} style={{ marginBottom: 28 }}>
          <div className="quiz-question-text">
            <span style={{ color: 'var(--accent)', marginRight: 8 }}>Q{i + 1}.</span>
            <FuriganaText text={q.question} furigana={furigana} />
          </div>
          {q.options.map((opt, j) => {
            let cls = 'quiz-option';
            if (mcqAnswers[i] === j) cls += ' correct'; // highlight selected (not graded yet)
            return (
              <button
                key={j}
                className={cls}
                style={mcqAnswers[i] === j ? { border: '1.5px solid var(--accent)' } : {}}
                onClick={() => setMcqAnswers(a => ({ ...a, [i]: j }))}
              >
                <span className="option-letter">{LETTERS[j]}</span>
                <FuriganaText text={opt} furigana={furigana} />
              </button>
            );
          })}
        </div>
      ))}

      {/* ── Section 2: Short Answer ────────────────────────────────────── */}
      <div className="section-title" style={{ marginTop: 8 }}>{isJapanese ? '第2部：短答式問題' : 'Part 2: Short Answer'}</div>
      {examData.shortAnswer.map((q, i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <div className="quiz-question-text">
            <span style={{ color: 'var(--accent)', marginRight: 8 }}>Q{i + 1}.</span>
            <FuriganaText text={q.question} furigana={furigana} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            {shortAnswerGuidance(q.question, isJapanese)}
          </div>
          <textarea
            value={saAnswers[i]}
            onChange={e => setSaAnswers(a => { const n = [...a]; n[i] = e.target.value; return n; })}
            placeholder={isJapanese ? 'ここに回答を入力...' : 'Type your answer here...'}
            style={{
              width: '100%', minHeight: 80, padding: '10px 12px',
              background: 'var(--card)', border: '1.5px solid var(--border)',
              borderRadius: 10, color: 'var(--text)', fontSize: 14,
              resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
              outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      ))}

      {/* ── Section 3: Fill in the Blank ──────────────────────────────── */}
      <div className="section-title" style={{ marginTop: 8 }}>{isJapanese ? '第3部：穴埋め問題' : 'Part 3: Fill in the Blank'}</div>
      {examData.fillBlank.map((q, i) => {
        const parts = q.sentence.split('___');
        return (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', lineHeight: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ color: 'var(--accent)', marginRight: 4, fontWeight: 700 }}>Q{i + 1}.</span>
              <span>{parts[0]}</span>
              <input
                type="text"
                value={fbAnswers[i]}
                onChange={e => setFbAnswers(a => { const n = [...a]; n[i] = e.target.value; return n; })}
                placeholder={isJapanese ? '答え' : 'answer'}
                style={{
                  minWidth: 100, padding: '4px 10px',
                  background: 'var(--card)', border: '1.5px solid var(--border)',
                  borderRadius: 6, color: 'var(--text)', fontSize: 14,
                  outline: 'none', textAlign: 'center',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <span>{parts[1]}</span>
            </div>
            {q.hint && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>
                💡 {isJapanese ? 'ヒント: ' : 'Hint: '}{q.hint}
              </div>
            )}
          </div>
        );
      })}

      {/* Submit */}
      <button
        className="btn btn-primary"
        style={{ width: '100%', marginTop: 24, opacity: canSubmit ? 1 : 0.5 }}
        disabled={!canSubmit || examState === 'evaluating'}
        onClick={submitExam}
      >
        {examState === 'evaluating'
          ? (isJapanese ? '採点中...' : 'Grading...')
          : (isJapanese ? '試験を提出する' : 'Submit Exam')}
      </button>

      {!canSubmit && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
          {isJapanese ? '全ての問題に回答してから提出してください。' : 'Answer all questions before submitting.'}
        </div>
      )}
    </div>
  );
}
