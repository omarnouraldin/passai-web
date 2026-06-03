import { useState } from 'react';
import SimpleTab     from './tabs/SimpleTab.jsx';
import FlashcardsTab from './tabs/FlashcardsTab.jsx';
import QuizTab       from './tabs/QuizTab.jsx';
import ExamTab       from './tabs/ExamTab.jsx';
import FuriganaText  from './FuriganaText.jsx';

// ── Combined Overview tab (Summary + Topics) ──────────────────────────────────
function OverviewTab({ summary, keyTopics, furigana, isJapanese }) {
  return (
    <div className="results-overview-tab">
      {/* Summary */}
      <div className="section-title">{isJapanese ? '要約' : 'Summary'}</div>
      <div className="card results-summary-card" style={{ marginBottom: 24 }}>
        <p className="summary-text">
          <FuriganaText text={summary} furigana={furigana} />
        </p>
      </div>

      {/* Key Topics */}
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

export default function ResultsView({ content, contentId, originalInput, furigana, isJapanese, onBack, onToast, onUpgrade }) {
  // 5 tabs: Simple | Overview | Flashcards | Quiz | Exam(PRO)
  const tabDefs = isJapanese
    ? ['解説', '概要', 'フラッシュカード', 'クイズ', '試験']
    : ['Simple', 'Overview', 'Flashcards', 'Quiz', 'Exam'];

  const [activeTab, setActiveTab] = useState(0);
  const [copied,    setCopied]    = useState(false);

  const hasCorrections = content.corrections?.length > 0;
  const brandLabel = isJapanese ? 'PassAI' : 'PassAI';
  const shareTitle = isJapanese ? '30秒まとめ' : '30-second summary';
  const shareLead = String(content.summary ?? '')
    .split('\n')
    .map(line => line.trim())
    .find(Boolean) ?? '';
  const shareTopics = (content.keyTopics ?? []).slice(0, 3);
  const subjectLabel = (() => {
    const raw = String(originalInput?.noteText ?? '').trim();
    if (!raw) return null;
    const firstLine = raw.split('\n').map(line => line.trim()).find(Boolean) ?? '';
    if (!firstLine) return null;
    return firstLine.length > 28 ? `${firstLine.slice(0, 28)}…` : firstLine;
  })();

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
    <div className="page results-page">
      <button className="back-btn" onClick={onBack}>
        ← {isJapanese ? '戻る' : 'Back'}
      </button>

      {/* Corrections badge */}
      {hasCorrections && (
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,69,58,0.09)', border: '1px solid rgba(255,69,58,0.3)',
            borderRadius: 50, padding: '5px 12px',
            fontSize: 12, fontWeight: 700, color: 'var(--danger)',
            marginBottom: 16, cursor: 'pointer',
          }}
          onClick={() => setActiveTab(0)}
        >
          ⚠️ {content.corrections.length} {isJapanese ? '件の修正あり — 解説で確認' : `correction${content.corrections.length > 1 ? 's' : ''} found — see Simple tab`}
        </div>
      )}

      {/* Share */}
      <div className="share-card-preview" aria-label={isJapanese ? '共有カードのプレビュー' : 'Share card preview'}>
        <div className="share-card-preview-top">
          <div>
            <div className="share-card-brand">{brandLabel}</div>
            <div className="share-card-kicker">{isJapanese ? 'Study Pack' : 'Study Pack'}</div>
          </div>
          <div className="share-card-badge">{isJapanese ? 'Exam Pack' : 'Exam Pack'}</div>
        </div>

        {subjectLabel && (
          <div className="share-card-subject">
            {subjectLabel}
          </div>
        )}

        <div className="share-card-title">{shareTitle}</div>
        <div className="share-card-summary">
          <FuriganaText text={shareLead} furigana={furigana} />
        </div>

        {!!shareTopics.length && (
          <div className="share-card-topics">
            {shareTopics.map((topic, idx) => (
              <div key={idx} className="share-card-topic">
                <span className="share-card-topic-dot">✦</span>
                <FuriganaText text={topic} furigana={furigana} />
              </div>
            ))}
          </div>
        )}

        <div className="share-card-footer">
          <div className="share-card-generated">{isJapanese ? 'Generated by PassAI' : 'Generated by PassAI'}</div>
          <img src="/mascot/mascot-reading.png" alt="" aria-hidden="true" className="share-card-mascot" />
        </div>
      </div>

      <div className="share-row results-share-row">
        <button className={`share-btn ${copied ? 'copied' : ''}`} onClick={handleShare}>
          {copied
            ? (isJapanese ? '✓ コピー済み' : '✓ Copied!')
            : (navigator.share
                ? (isJapanese ? '↑ 共有する' : '↑ Share')
                : (isJapanese ? '📋 コピー' : '📋 Copy'))}
        </button>
      </div>

      {/* Pill tabs */}
      <div className="pill-tabs results-tabs" style={{ marginBottom: 24 }}>
        {tabDefs.map((t, i) => (
          <button
            key={t}
            className={`pill-tab ${activeTab === i ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {t}
            {i === 0 && hasCorrections && (
              <span style={{ marginLeft: 5, color: 'var(--danger)' }}>•</span>
            )}
            {i === 4 && (
              <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--color-amber)', fontWeight: 700 }}>PRO</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <SimpleTab
          summary={content.summary}
          highlightStat={content.highlightStat}
          simpleExplanation={content.simpleExplanation}
          thinkingQuestions={content.thinkingQuestions}
          corrections={content.corrections}
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
        <FlashcardsTab cards={content.flashcards} furigana={furigana} isJapanese={isJapanese} contentId={contentId} />
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
  );
}
