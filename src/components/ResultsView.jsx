import { useState } from 'react';
import SummaryTab    from './tabs/SummaryTab.jsx';
import TopicsTab     from './tabs/TopicsTab.jsx';
import FlashcardsTab from './tabs/FlashcardsTab.jsx';
import QuizTab       from './tabs/QuizTab.jsx';
import Mascot        from './Mascot.jsx';

export default function ResultsView({ content, furigana, isJapanese, onBack }) {
  const tabs = isJapanese
    ? ['要約', 'トピック', 'フラッシュカード', 'クイズ']
    : ['Summary', 'Topics', 'Flashcards', 'Quiz'];

  const [activeTab, setActiveTab] = useState(0);

  // Mascot pose changes per tab: Summary, Topics, Flashcards, Quiz
  const poses = ['happy', 'thinking', 'front', 'panic'];

  return (
    <div className="page">
      {/* Back */}
      <button className="back-btn" onClick={onBack}>
        ← {isJapanese ? '戻る' : 'Back'}
      </button>

      {/* Mascot header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Mascot pose={poses[activeTab]} size={52} />
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
          {isJapanese ? '学習素材が完成しました！' : 'Your study material is ready!'}
        </div>
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

      {activeTab === 0 && <SummaryTab  summary={content.summary}   furigana={furigana} isJapanese={isJapanese} />}
      {activeTab === 1 && <TopicsTab   topics={content.keyTopics}  furigana={furigana} isJapanese={isJapanese} />}
      {activeTab === 2 && <FlashcardsTab cards={content.flashcards} furigana={furigana} isJapanese={isJapanese} />}
      {activeTab === 3 && <QuizTab     questions={content.quiz}    furigana={furigana} isJapanese={isJapanese} />}
    </div>
  );
}
