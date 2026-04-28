import { useState } from 'react';
import SimpleTab     from './tabs/SimpleTab.jsx';
import SummaryTab    from './tabs/SummaryTab.jsx';
import TopicsTab     from './tabs/TopicsTab.jsx';
import FlashcardsTab from './tabs/FlashcardsTab.jsx';
import QuizTab       from './tabs/QuizTab.jsx';

function stripMarkup(text = '') {
  return text
    .replace(/【([^|【】]+)\|([^|【】]+)】/g, '$1')
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

export default function ResultsView({ content, furigana, isJapanese, onBack, onToast }) {
  const tabDefs = isJapanese
    ? ['簡単解説', '要約', 'トピック', 'フラッシュカード', 'クイズ']
    : ['Simple', 'Summary', 'Topics', 'Flashcards', 'Quiz'];

  const [activeTab, setActiveTab] = useState(0);
  const [copied,    setCopied]    = useState(false);

  const hasCorrections = content.corrections?.length > 0;

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
    <div className="page">
      <button className="back-btn" onClick={onBack}>
        ← {isJapanese ? '戻る' : 'Back'}
      </button>

      {/* Corrections badge — visible across all tabs */}
      {hasCorrections && (
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,69,58,0.09)',
            border: '1px solid rgba(255,69,58,0.3)',
            borderRadius: 50, padding: '5px 12px',
            fontSize: 12, fontWeight: 700, color: 'var(--danger)',
            marginBottom: 16, cursor: 'pointer',
          }}
          onClick={() => setActiveTab(0)}
        >
          ⚠️ {content.corrections.length} {isJapanese ? '件の修正あり — 簡単解説で確認' : `correction${content.corrections.length > 1 ? 's' : ''} found — see Simple tab`}
        </div>
      )}

      {/* Share */}
      <div className="share-row">
        <button className={`share-btn ${copied ? 'copied' : ''}`} onClick={handleShare}>
          {copied
            ? (isJapanese ? '✓ コピー済み' : '✓ Copied!')
            : (navigator.share
                ? (isJapanese ? '↑ 共有する' : '↑ Share')
                : (isJapanese ? '📋 コピー' : '📋 Copy'))}
        </button>
      </div>

      {/* Pill tabs */}
      <div className="pill-tabs" style={{ marginBottom: 24 }}>
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
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <SimpleTab
          simpleExplanation={content.simpleExplanation}
          corrections={content.corrections}
          illustrationQuery={content.illustrationQuery}
          furigana={furigana}
          isJapanese={isJapanese}
        />
      )}
      {activeTab === 1 && <SummaryTab    summary={content.summary}    furigana={furigana} isJapanese={isJapanese} />}
      {activeTab === 2 && <TopicsTab     topics={content.keyTopics}   furigana={furigana} isJapanese={isJapanese} />}
      {activeTab === 3 && <FlashcardsTab cards={content.flashcards}   furigana={furigana} isJapanese={isJapanese} />}
      {activeTab === 4 && <QuizTab       questions={content.quiz}      furigana={furigana} isJapanese={isJapanese} />}
    </div>
  );
}
