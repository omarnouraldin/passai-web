import { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import SettingsModal from './SettingsModal.jsx';
import AuthModal from './AuthModal.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

function formatSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

// Returns { text } for text-based files, { imageBase64, mediaType } for images
async function processFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const isImage = IMAGE_EXTS.includes(ext) || file.type.startsWith('image/');

  if (isImage) {
    const compressed = await compressImage(file);
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result.split(',')[1]);
      reader.readAsDataURL(compressed);
    });
    return { imageBase64: base64, mediaType: 'image/jpeg' };
  }

  if (ext === 'pdf') {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return { text: text.trim() };
  }

  if (ext === 'docx' || ext === 'doc') {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return { text: result.value.trim() };
  }

  // Plain text
  const text = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
  return { text };
}

// ── File card component ───────────────────────────────────────────────────────
function FileCard({ file, status, onRemove, isJapanese }) {
  const isImage = IMAGE_EXTS.includes(file.name.split('.').pop().toLowerCase()) || file.type.startsWith('image/');
  const icon = isImage ? '📷' : '📄';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      background: 'var(--card)',
      border: `1.5px solid ${status === 'ok' ? 'rgba(48,209,88,0.35)' : status === 'error' ? 'rgba(255,69,58,0.35)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-sm)',
      marginBottom: 12,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
          {formatSize(file.size)}
          {status === 'loading' && <span style={{ marginLeft: 8 }}>{isJapanese ? '読み込み中...' : 'Processing...'}</span>}
          {status === 'ok'      && <span style={{ marginLeft: 8, color: 'var(--success)', fontWeight: 700 }}>✓ {isJapanese ? '準備完了' : 'Ready'}</span>}
          {status === 'error'   && <span style={{ marginLeft: 8, color: 'var(--danger)', fontWeight: 700 }}>✗ {isJapanese ? '読み込み失敗' : 'Failed'}</span>}
        </div>
      </div>
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, padding: 4, flexShrink: 0 }}
        aria-label="Remove file"
      >
        ✕
      </button>
    </div>
  );
}

// ── Login gate ────────────────────────────────────────────────────────────────
function LoginGate({ isJapanese, onOpenAuth }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 72, marginBottom: 20 }}>🎓</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
        {isJapanese ? 'ようこそ PassAI へ' : 'Welcome to PassAI'}
      </div>
      <div style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 32, maxWidth: 280 }}>
        {isJapanese
          ? 'アプリを使うにはサインインが必要です。アカウントを作成するか、既存のアカウントでログインしてください。'
          : 'Sign in to start turning your notes into study material. It only takes a moment.'}
      </div>
      <button
        className="btn btn-primary"
        style={{ width: '100%', maxWidth: 280 }}
        onClick={onOpenAuth}
      >
        {isJapanese ? 'サインイン / 新規登録' : 'Sign in / Sign up'}
      </button>
    </div>
  );
}

export default function HomeView({
  onGenerate, charLimit,
  language, setLanguage,
  furigana, setFurigana,
  isJapanese,
}) {
  const { user, enabled } = useAuth();

  const [noteText,     setNoteText]     = useState('');
  const [importedFile, setImportedFile] = useState(null); // { file, status, data }
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth,     setShowAuth]     = useState(false);

  const fileRef   = useRef(null);
  const cameraRef = useRef(null);

  // Require login when Supabase is configured
  const requiresAuth = enabled && !user;

  // If a file is loaded, use its data; otherwise use typed text
  const canGenerate = importedFile?.status === 'ok' || noteText.trim().length > 0;
  const count       = noteText.length;
  const overLimit   = !importedFile && count > charLimit;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImportedFile({ file, status: 'loading', data: null });
    try {
      const data = await processFile(file);
      setImportedFile({ file, status: 'ok', data });
    } catch {
      setImportedFile({ file, status: 'error', data: null });
    }
  }

  function handleGenerate() {
    if (importedFile?.status === 'ok') {
      onGenerate(null, importedFile.data);
    } else {
      onGenerate(noteText.slice(0, charLimit), null);
    }
  }

  return (
    <>
      <div className="page">
        {/* Header */}
        <div className="header-row">
          <div className="header-left">
            <img src="/mascot-icon.png" alt="PassAI" className="mascot-icon" />
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
            {/* Only settings button in header — auth + theme are inside settings */}
            <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
              ⚙️
            </button>
          </div>
        </div>

        {/* Login gate — shown when Supabase is enabled but user is not logged in */}
        {requiresAuth ? (
          <LoginGate isJapanese={isJapanese} onOpenAuth={() => setShowAuth(true)} />
        ) : (
          <>
            {/* File import buttons */}
            <div className="import-row">
              <button
                className="import-btn"
                onClick={() => fileRef.current.click()}
                disabled={importedFile?.status === 'loading'}
              >
                📄 {isJapanese ? 'ファイル' : 'Import file'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.rtf,.jpg,.jpeg,.png,.webp"
                style={{ display: 'none' }}
                onChange={handleFile}
              />

              <button
                className="import-btn"
                onClick={() => cameraRef.current.click()}
                disabled={importedFile?.status === 'loading'}
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
            </div>

            {/* File card — shown instead of raw text when file is loaded */}
            {importedFile && (
              <FileCard
                file={importedFile.file}
                status={importedFile.status}
                isJapanese={isJapanese}
                onRemove={() => setImportedFile(null)}
              />
            )}

            {/* Textarea — shown only when no file is loaded */}
            {!importedFile && (
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
            )}

            {/* Spacer when file card is shown */}
            {importedFile && <div style={{ height: 16 }} />}

            <button
              className="btn btn-primary"
              disabled={!canGenerate || overLimit || importedFile?.status === 'loading'}
              onClick={handleGenerate}
            >
              ✨ {isJapanese ? '生成する' : 'Generate study material'}
            </button>
          </>
        )}
      </div>

      {showSettings && (
        <SettingsModal
          language={language} setLanguage={setLanguage}
          furigana={furigana} setFurigana={setFurigana}
          isJapanese={isJapanese}
          onClose={() => setShowSettings(false)}
          onOpenAuth={() => { setShowSettings(false); setShowAuth(true); }}
        />
      )}
      {showAuth && (
        <AuthModal isJapanese={isJapanese} onClose={() => setShowAuth(false)} />
      )}
    </>
  );
}
