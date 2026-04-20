import { useState } from 'react';
import SummaryTab    from './tabs/SummaryTab.jsx';
import TopicsTab     from './tabs/TopicsTab.jsx';
import FlashcardsTab from './tabs/FlashcardsTab.jsx';
import QuizTab       from './tabs/QuizTab.jsx';
export default function ResultsView({ content, furigana, isJapanese, onBack }) {
  const tabs = isJapanese
    ? ['要約', 'トピック', 'フラッシュカード', 'クイズ']
    : ['Summary', 'Topics', 'Flashcards', 'Quiz'];

  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="page">
      {/* Back */}
      <button className="back-btn" onClick={onBack}>
        ← {isJapanese ? '戻る' : 'Back'}
      </button>

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

      {activeTab === 0 && <SummaryTab  summary={content.summary}   furigana={furigana} isJapanese={isJapanese} />}
      {activeTab === 1 && <TopicsTab   topics={content.keyTopics}  furigana={furigana} isJapanese={isJapanese} />}
      {activeTab === 2 && <FlashcardsTab cards={content.flashcards} furigana={furigana} isJapanese={isJapanese} />}
      {activeTab === 3 && <QuizTab     questions={content.quiz}    furigana={furigana} isJapanese={isJapanese} />}
    </div>
  );
}
