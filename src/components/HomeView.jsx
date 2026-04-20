import { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import SettingsModal from './SettingsModal.jsx';

// Point pdf.js worker to CDN so no extra bundling is needed
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'pdf') {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text.trim();
  }

  if (ext === 'docx' || ext === 'doc') {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value.trim();
  }

  // Plain text fallback: txt, md, etc.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export default function HomeView({
  onGenerate, charLimit,
  language, setLanguage,
  furigana, setFurigana,
  isJapanese,
}) {
  const [noteText, setNoteText]         = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [importing, setImporting]       = useState(false);
  const [importError, setImportError]   = useState(null);
  const fileRef = useRef(null);

  const count       = noteText.length;
  const overLimit   = count > charLimit;
  const canGenerate = noteText.trim().length > 0 && !overLimit;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportError(null);
    try {
      const text = await extractText(file);
      setNoteText(text.slice(0, charLimit));
    } catch (err) {
      setImportError(isJapanese ? 'ファイルの読み込みに失敗しました' : 'Failed to read file');
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <div className="page">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src="/mascot-icon.png" alt="PassAI" style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 14 }} />
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
          <button
            className="btn btn-ghost"
            style={{ height: 40, fontSize: 13 }}
            onClick={() => fileRef.current.click()}
            disabled={importing}
          >
            {importing
              ? (isJapanese ? '読み込み中...' : 'Reading...')
              : `📄 ${isJapanese ? 'ファイルをインポート' : 'Import file'}`}
          </button>
          {/* Accept PDF, Word, and plain text files */}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,.rtf"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
          {importError && (
            <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--danger)' }}>{importError}</span>
          )}
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
