import { useState, useRef } from 'react';
import SettingsModal from './SettingsModal.jsx';
import Mascot from './Mascot.jsx';

export default function HomeView({
  onGenerate, charLimit,
  language, setLanguage,
  furigana, setFurigana,
  isJapanese,
}) {
  const [noteText, setNoteText]         = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const fileRef = useRef(null);

  const count      = noteText.length;
  const overLimit  = count > charLimit;
  const canGenerate = noteText.trim().length > 0 && !overLimit;

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setNoteText(ev.target.result.slice(0, charLimit));
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <>
      <div className="page">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Mascot pose="idle" size={64} />
            <div>
              <div className="logo">
                <span className="logo-pass">{isJapanese ? 'パス' : 'Pass'}</span>
                <span className="logo-ai">AI</span>
              </div>
              <div className="tagline">
                {isJapanese ? 'ノートをAIで学習素材に変換' : 'Turn your notes into study material'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 22 }}
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>

        {/* File import */}
        <div style={{ marginBottom: 12 }}>
          <button className="btn btn-ghost" style={{ height: 40, fontSize: 13 }} onClick={() => fileRef.current.click()}>
            📄 {isJapanese ? 'ファイルをインポート' : 'Import file'}
          </button>
          <input ref={fileRef} type="file" accept=".txt,.md" style={{ display: 'none' }} onChange={handleFile} />
        </div>

        {/* Textarea */}
        <div className="note-area-wrap" style={{ marginBottom: 16 }}>
          <textarea
            className="note-area"
            placeholder={isJapanese
              ? 'ここにノートを入力または貼り付けてください...'
              : 'Paste or type your notes here...'}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            maxLength={charLimit + 50}
          />
          <span className={`char-count ${overLimit ? 'over' : ''}`}>
            {count} / {charLimit}
          </span>
        </div>

        {/* Generate button */}
        <button
          className="btn btn-primary"
          disabled={!canGenerate}
          onClick={() => onGenerate(noteText.slice(0, charLimit))}
        >
          ✨ {isJapanese ? '生成する' : 'Generate'}
        </button>
      </div>

      {/* Settings sheet */}
      {showSettings && (
        <SettingsModal
          language={language}
          setLanguage={setLanguage}
          furigana={furigana}
          setFurigana={setFurigana}
          isJapanese={isJapanese}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}
