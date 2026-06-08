import { useState } from 'react';
import SimpleTab     from './tabs/SimpleTab.jsx';
import FlashcardsTab from './tabs/FlashcardsTab.jsx';
import QuizTab       from './tabs/QuizTab.jsx';
import ExamTab       from './tabs/ExamTab.jsx';
import FuriganaText  from './FuriganaText.jsx';

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ summary, keyTopics, furigana, isJapanese }) {
  return (
    <div className="results-overview-tab">
      <div className="section-title">{isJapanese ? '要約' : 'Summary'}</div>
      <div className="card results-summary-card" style={{ marginBottom: 24 }}>
        <p className="summary-text">
          <FuriganaText text={summary} furigana={furigana} />
        </p>
      </div>
      <div className="section-title">{isJapanese ? 'キートピック' : 'Key Topics'}</div>
      <div className="results-topic-grid">
        {keyTopics?.map((t, i) => (
          <span key={i} className="topic-chip">
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✦</span>
            <FuriganaText text={t} furigana={furigana} />
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripMarkup(text = '') {
  return text
    .replace(/【([^|【】]+)\|([^|【】]+)】/g, '$1')
    .replace(/([一-龯々仝〆ヶぁ-んァ-ンー]+)【([^【】]+)】/g, '$1')
    .replace(/《([^《》]+)》/g, '$1');
}

function buildShareText(content, isJapanese) {
  const lines = [];
  if (content.summary) {
    lines.push(isJapanese ? '【要約】' : '=== Summary ===');
    lines.push(stripMarkup(content.summary));
    lines.push('');
  }
  if (content.keyTopics?.length) {
    lines.push(isJapanese ? '【キートピック】' : '=== Key Topics ===');
    content.keyTopics.forEach(t => lines.push(`• ${stripMarkup(t)}`));
    lines.push('');
  }
  if (content.flashcards?.length) {
    lines.push(isJapanese ? '【フラッシュカード】' : '=== Flashcards ===');
    content.flashcards.forEach((c, i) => {
      lines.push(`Q${i + 1}: ${stripMarkup(c.question)}`);
      lines.push(`A: ${stripMarkup(c.answer)}`);
    });
    lines.push('');
  }
  lines.push(isJapanese ? '— PassAI で生成' : '— Generated with PassAI (passai-web.vercel.app)');
  return lines.join('\n');
}

function getTitle(content, originalInput, isJapanese) {
  const snippet = originalInput?.noteText?.trim();
  if (snippet) return snippet.slice(0, 38) + (snippet.length > 38 ? '…' : '');
  return isJapanese ? '学習パック' : 'Study Pack';
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ResultsView({
  content, contentId, originalInput,
  furigana, isJapanese,
  onBack, onToast, onUpgrade,
}) {
  const tabDefs = isJapanese
    ? [
        { label: '解説',           pro: false },
        { label: '概要',           pro: false },
        { label: 'カード',         pro: false },
        { label: 'クイズ',         pro: false },
        { label: '試験',           pro: true  },
      ]
    : [
        { label: 'Simple',        pro: false },
        { label: 'Overview',      pro: false },
        { label: 'Flashcards',    pro: false },
        { label: 'Quiz',          pro: false },
        { label: 'Exam',          pro: true  },
      ];

  const [activeTab, setActiveTab] = useState(0);
  const [copied,    setCopied]    = useState(false);

  const flashCount = content.flashcards?.length ?? 0;
  const quizCount  = content.quiz?.length ?? 0;
  const hasSummary = !!content.summary;
  const title      = getTitle(content, originalInput, isJapanese);

  const stats = [
    flashCount > 0 && { num: flashCount, label: isJapanese ? 'カード' : 'Cards' },
    quizCount  > 0 && { num: quizCount,  label: isJapanese ? 'クイズ' : 'Quiz' },
    hasSummary     && { num: 1,          label: isJapanese ? '要約'   : 'Summary' },
  ].filter(Boolean);

  async function handleShare() {
    const text  = buildShareText(content, isJapanese);
    const title = isJapanese ? 'PassAI 学習素材' : 'PassAI Study Material';
    if (navigator.share) {
      try { await navigator.share({ title, text }); return; } catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onToast) onToast(isJapanese ? 'コピーしました！' : 'Copied to clipboard!', 'success');
    } catch {
      if (onToast) onToast(isJapanese ? 'コピーできませんでした' : 'Copy failed', 'error');
    }
  }

  return (
    <div className="rv-page">

      {/* ── Sticky header ── */}
      <div className="rv-header">
        <button className="rv-back-btn" onClick={onBack} aria-label={isJapanese ? '戻る' : 'Back'}>
          ‹
        </button>
        <p className="rv-title">{title}</p>
        <button
          className={`rv-share-btn${copied ? ' copied' : ''}`}
          onClick={handleShare}
          aria-label={isJapanese ? '共有' : 'Share'}
        >
          {copied ? '✓' : (navigator.share ? '↑' : '📋')}
        </button>
      </div>

      {/* ── Stats row ── */}
      {stats.length > 0 && (
        <div className="rv-stats">
          {stats.map((s, i) => (
            <div key={i} className="rv-stat-chip">
              <span className="rv-stat-num">{s.num}</span>
              <span className="rv-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="rv-tabs">
        {tabDefs.map(({ label, pro }, i) => (
          <button
            key={label}
            className={`rv-tab${activeTab === i ? ' active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {label}
            {pro && <span className="rv-tab-pro-badge">PRO</span>}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="rv-content">
        {activeTab === 0 && (
          <SimpleTab
            summary={content.summary}
            highlightStat={content.highlightStat}
            simpleExplanation={content.simpleExplanation}
            thinkingQuestions={content.thinkingQuestions}
            illustrationQuery={content.illustrationQuery}
            furigana={furigana}
            isJapanese={isJapanese}
          />
        )}
        {activeTab === 1 && (
          <OverviewTab
            summary={content.summary}
            keyTopics={content.keyTopics}
            furigana={furigana}
            isJapanese={isJapanese}
          />
        )}
        {activeTab === 2 && (
          <FlashcardsTab
            cards={content.flashcards}
            furigana={furigana}
            isJapanese={isJapanese}
            contentId={contentId}
          />
        )}
        {activeTab === 3 && (
          <QuizTab
            questions={content.quiz}
            thinkingQuestions={content.thinkingQuestions}
            furigana={furigana}
            isJapanese={isJapanese}
            contentId={contentId}
          />
        )}
        {activeTab === 4 && (
          <ExamTab
            originalInput={originalInput}
            furigana={furigana}
            isJapanese={isJapanese}
            contentId={contentId}
            onUpgrade={onUpgrade}
          />
        )}
      </div>

    </div>
  );
}
