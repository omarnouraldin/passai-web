import { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import SettingsModal from './SettingsModal.jsx';
import AuthModal from './AuthModal.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

// Point pdf.js worker to CDN so no extra bundling is needed
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

// Compress image to JPEG via canvas so large phone photos don't exceed API limits
async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1600;
      const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    };
    img.src = url;
  });
}

async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  // ── Images → Claude Vision OCR ──
  if (IMAGE_EXTS.includes(ext) || file.type.startsWith('image/')) {
    const compressed = await compressImage(file);
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result.split(',')[1]);
      reader.readAsDataURL(compressed);
    });
    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mediaType: 'image/jpeg' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'OCR failed');
    return data.text;
  }

  // ── PDF ──
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

  // ── Word docs ──
  if (ext === 'docx' || ext === 'doc') {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value.trim();
  }

  // ── Plain text fallback ──
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
  const { theme, toggleTheme } = useTheme();
  const { user }               = useAuth();

  const [noteText,     setNoteText]     = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth,     setShowAuth]     = useState(false);
  const [importing,    setImporting]    = useState(false);
  const [importError,  setImportError]  = useState(null);

  const fileRef   = useRef(null);
  const cameraRef = useRef(null);

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
        <div className="header-row">
          <div className="header-left">
            <img
              src="/mascot-icon.png"
              alt="PassAI"
              className="mascot-icon"
            />
            <div>
              <div className="logo">
                <span className="logo-pass">{isJapanese ? 'パス' : 'Pass'}</span>
                <span className="logo-ai">AI</span>
              </div>
              <div className="tagline">
                {isJapanese ? 'ノートをAIで学習素材に変換' : 'Turn notes into study material'}
              </div>
            </div>
          </div>

          <div className="header-actions">
            {/* Theme toggle */}
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Account button */}
            <button
              className="icon-btn"
              onClick={() => setShowAuth(true)}
              aria-label="Account"
              title={user ? user.email : 'Sign in'}
            >
              {user ? '👤' : '🔑'}
            </button>

            {/* Settings */}
            <button
              className="icon-btn"
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* File import row */}
        <div className="import-row">
          {/* File picker */}
          <button
            className="import-btn"
            onClick={() => fileRef.current.click()}
            disabled={importing}
          >
            {importing
              ? (isJapanese ? '読み込み中...' : 'Reading...')
              : `📄 ${isJapanese ? 'ファイル' : 'Import file'}`}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,.rtf,.jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={handleFile}
          />

          {/* Camera (photo capture — shows naturally on mobile) */}
          <button
            className="import-btn"
            onClick={() => cameraRef.current.click()}
            disabled={importing}
            title={isJapanese ? 'カメラで撮影' : 'Take a photo'}
          >
            📷 {isJapanese ? 'カメラ' : 'Camera'}
          </button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFile}
          />

          {importError && (
            <span style={{ fontSize: 13, color: 'var(--danger)' }}>{importError}</span>
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
            maxLength={charLimit + 100}
          />
          <span className={`char-count ${overLimit ? 'over' : ''}`}>
            {count.toLocaleString()} / {charLimit.toLocaleString()}
          </span>
        </div>

        {/* Generate button */}
        <button
          className="btn btn-primary"
          disabled={!canGenerate}
          onClick={() => onGenerate(noteText.slice(0, charLimit))}
        >
          ✨ {isJapanese ? '生成する' : 'Generate study material'}
        </button>
      </div>

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

      {showAuth && (
        <AuthModal
          isJapanese={isJapanese}
          onClose={() => setShowAuth(false)}
        />
      )}
    </>
  );
}
