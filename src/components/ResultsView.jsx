import { useState } from 'react';
import SummaryTab    from './tabs/SummaryTab.jsx';
import TopicsTab     from './tabs/TopicsTab.jsx';
import FlashcardsTab from './tabs/FlashcardsTab.jsx';
import QuizTab       from './tabs/QuizTab.jsx';

// Strip furigana / keyword markup from text for plain export
function stripMarkup(text = '') {
  return text
    .replace(/【([^|【】]+)\|([^|【】]+)】/g, '$1')   // 【漢字|かんじ】 → 漢字
    .replace(/《([^《》]+)》/g, '$1');                   // 《term》 → term
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
  const tabs = isJapanese
    ? ['要約', 'トピック', 'フラッシュカード', 'クイズ']
    : ['Summary', 'Topics', 'Flashcards', 'Quiz'];

  const [activeTab, setActiveTab] = useState(0);
  const [copied,    setCopied]    = useState(false);

  async function handleShare() {
    const text = buildShareText(content, isJapanese);
    const title = isJapanese ? 'PassAI 学習素材' : 'PassAI Study Material';

    // Try Web Share API first (works great on mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch { /* user cancelled or share failed — fall through to copy */ }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onToast) onToast(isJapanese ? 'クリップボードにコピーしました' : 'Copied to clipboard!', 'success');
    } catch {
      if (onToast) onToast(isJapanese ? 'コピーできませんでした' : 'Copy failed', 'error');
    }
  }

  return (
    <div className="page">
      {/* Back */}
      <button className="back-btn" onClick={onBack}>
        ← {isJapanese ? '戻る' : 'Back'}
      </button>

      {/* Share row */}
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
        {tabs.map((t, i) => (
          <button
            key={t}
            className={`pill-tab ${activeTab === i ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 0 && <SummaryTab    summary={content.summary}    furigana={furigana} isJapanese={isJapanese} />}
      {activeTab === 1 && <TopicsTab     topics={content.keyTopics}   furigana={furigana} isJapanese={isJapanese} />}
      {activeTab === 2 && <FlashcardsTab cards={content.flashcards}   furigana={furigana} isJapanese={isJapanese} />}
      {activeTab === 3 && <QuizTab       questions={content.quiz}      furigana={furigana} isJapanese={isJapanese} />}
    </div>
  );
}
