import { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import heic2any from 'heic2any';
import mammoth from 'mammoth';
import SettingsModal from './SettingsModal.jsx';
import AuthModal from './AuthModal.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getBrandWordmark, getBrandTagline } from '../lib/branding.js';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'];
const HEIC_EXTS = ['heic', 'heif'];
const HEIC_MIME_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
const MAX_UPLOAD_FILES = 8;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MIN_VALID_TEXT = 40;
const BLUR_WARNING_SCORE = 70;
const BLUR_ERROR_SCORE = 35;

function formatSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getKindLabel(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (IMAGE_EXTS.includes(ext) || file.type.startsWith('image/')) return 'Image';
  if (ext === 'pdf') return 'PDF';
  if (ext === 'docx' || ext === 'doc') return 'DOC';
  if (ext === 'txt' || ext === 'md' || ext === 'rtf') return 'Text';
  return 'File';
}

function getFileKey(file) {
  return `${file.name}_${file.size}_${file.lastModified}`;
}

function normalizeTextForDedup(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function extractDroppedFiles(dataTransfer) {
  const files = Array.from(dataTransfer?.files ?? []).filter(Boolean);
  if (files.length) return files;
  return Array.from(dataTransfer?.items ?? [])
    .filter(item => item?.kind === 'file')
    .map(item => item.getAsFile())
    .filter(Boolean);
}

function isFileDrag(dataTransfer) {
  return Array.from(dataTransfer?.types ?? []).includes('Files');
}

function getExt(file) {
  return file.name.split('.').pop().toLowerCase();
}

function isHeicFile(file) {
  const ext = getExt(file);
  return HEIC_EXTS.includes(ext) || HEIC_MIME_TYPES.includes((file.type || '').toLowerCase());
}

async function convertHeicToJpeg(file) {
  try {
    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!(blob instanceof Blob)) {
      throw new Error('Invalid HEIC conversion result.');
    }
    return new File(
      [blob],
      file.name.replace(/\.(heic|heif)$/i, '.jpg'),
      { type: 'image/jpeg', lastModified: file.lastModified },
    );
  } catch {
    throw new Error('Could not process HEIC image.');
  }
}

async function normalizeImageFile(file) {
  if (!isHeicFile(file)) return file;
  return convertHeicToJpeg(file);
}

async function loadImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function blurScoreFromCanvas(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  let sum = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap = gray[idx] * 4 - gray[idx - 1] - gray[idx + 1] - gray[idx - width] - gray[idx + width];
      sum += lap * lap;
      count += 1;
    }
  }
  return count ? sum / count : 0;
}

async function compressImage(file) {
  const normalizedFile = await normalizeImageFile(file);
  const img = await loadImage(normalizedFile);
  if (!img) throw new Error('Could not load image.');
  const MAX = 1800;
  const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width  = Math.max(1, Math.round(img.width * ratio));
  canvas.height = Math.max(1, Math.round(img.height * ratio));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const previewCanvas = document.createElement('canvas');
  const previewMax = 72;
  const previewRatio = Math.min(1, previewMax / Math.max(canvas.width, canvas.height));
  previewCanvas.width = Math.max(1, Math.round(canvas.width * previewRatio));
  previewCanvas.height = Math.max(1, Math.round(canvas.height * previewRatio));
  previewCanvas.getContext('2d').drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
  const blurScore = blurScoreFromCanvas(previewCanvas);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.84));
  if (!blob) throw new Error('Could not process image.');
  return { blob, blurScore };
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(String(e.target.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function ocrImageBlob(blob, token) {
  const base64 = await blobToBase64(blob);
  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ image: base64, mediaType: 'image/jpeg' }),
  });

  let payload = null;
  try { payload = await res.json(); } catch { payload = null; }
  if (!res.ok) throw new Error(payload?.error ?? 'Could not read the image.');
  return String(payload?.text ?? '').trim();
}

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return { text: text.trim(), pages: pdf.numPages, pdf };
}

async function ocrPdfPages(pdf, token, maxPages = 8) {
  const parts = [];
  const pagesToRead = Math.min(pdf.numPages, maxPages);
  for (let i = 1; i <= pagesToRead; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob) continue;
    const pageText = await ocrImageBlob(blob, token);
    if (pageText) parts.push(pageText);
  }
  return parts.join('\n\n').trim();
}

async function processFile(file, token) {
  const ext = getExt(file);
  const isImage = IMAGE_EXTS.includes(ext) || file.type.startsWith('image/');
  const kind = getKindLabel(file);

  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File too large. Please use a smaller file.');
  }

  if (isImage) {
    const { blob, blurScore } = await compressImage(file);
    const text = await ocrImageBlob(blob, token);
    if (text.length < MIN_VALID_TEXT) {
      throw new Error(blurScore < BLUR_ERROR_SCORE
        ? 'Image too blurry.'
        : 'Could not extract enough text from the image.');
    }
    return {
      kind,
      text,
      quality: blurScore < BLUR_WARNING_SCORE ? 'warning' : 'ok',
      warning: blurScore < BLUR_WARNING_SCORE ? 'Low confidence — check this image before generating.' : '',
    };
  }

  if (ext === 'pdf') {
    const { text, pages, pdf } = await extractPdfText(file);
    if (text.length >= MIN_VALID_TEXT) {
      return { kind, text, quality: 'ok', warning: '' };
    }
    if (pages <= 10) {
      const ocrText = await ocrPdfPages(pdf, token, 8);
      if (ocrText.length >= MIN_VALID_TEXT) {
        return { kind, text: ocrText, quality: 'warning', warning: 'Text was extracted using OCR fallback.' };
      }
    }
    throw new Error('Could not extract enough text from this PDF.');
  }

  if (ext === 'docx' || ext === 'doc') {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = result.value.trim();
    if (text.length < MIN_VALID_TEXT) throw new Error('Could not extract enough text from this document.');
    return { kind, text, quality: 'ok', warning: '' };
  }

  // Plain text
  const text = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
  const clean = String(text ?? '').trim();
  if (clean.length < MIN_VALID_TEXT) throw new Error('Text file is too short or empty.');
  return { kind, text: clean, quality: 'ok', warning: '' };
}

// ── File card component ───────────────────────────────────────────────────────
function FileCard({ file, status, error, warning, onRemove, isJapanese, kind }) {
  const icon = kind === 'Image' ? '📷' : kind === 'PDF' ? '📕' : '📄';
  const statusLabel = status === 'loading'
    ? (isJapanese ? '読み込み中' : 'Processing')
    : status === 'error'
      ? (isJapanese ? '失敗' : 'Failed')
      : status === 'warning'
        ? (isJapanese ? '要確認' : 'Check')
        : (isJapanese ? '準備完了' : 'Ready');

  return (
    <div className={`upload-card ${status}`}>
      <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
      <div className="upload-card-main">
        <div className="upload-card-title">
          {file.name}
        </div>
        <div className="upload-card-meta">
          <span>{kind}</span>
          {formatSize(file.size)}
          <span className={`upload-status ${status}`}>
            {status === 'ok' ? '✓' : status === 'warning' ? '!' : status === 'error' ? '✗' : '…'} {statusLabel}
          </span>
        </div>
        {warning && (
          <div className="upload-warning">
            {warning}
          </div>
        )}
        {error && (
          <div className="upload-error">
            {error}
          </div>
        )}
      </div>
      <button
        className="upload-remove"
        onClick={onRemove}
        aria-label="Remove file"
      >
        ✕
      </button>
    </div>
  );
}

// ── Login gate ────────────────────────────────────────────────────────────────
function LoginGate({ isJapanese, onOpenAuth }) {
  const brand = getBrandWordmark(isJapanese);
  return (
    <div className="login-gate">
      <img src="/mascot/mascot-reading.png" alt={brand.full} className="login-gate-mascot" />
      <div className="login-gate-title">
        {isJapanese ? 'ようこそ PassAI へ' : 'Welcome to PassAI'}
      </div>
      <div className="login-gate-sub">
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
  onUpgrade,
  onOpenPricing,
}) {
  const { user, isPro, isAdmin, generationsUsed, enabled, getAccessToken, refreshProfile } = useAuth();
  const FREE_LIMIT = 5;
  const brand = getBrandWordmark(isJapanese);

  const [noteText,     setNoteText]     = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]); // [{ id, file, status, text, error, warning, kind }]
  const [isProcessingUploads, setIsProcessingUploads] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth,     setShowAuth]     = useState(false);
  const [adminModel,   setAdminModel]   = useState('gpt-5.4-mini');
  const [dragActive,   setDragActive]   = useState(false);

  const fileRef   = useRef(null);
  const cameraRef = useRef(null);

  // Require login when Supabase is configured
  const requiresAuth = enabled && !user;

  // If a file is loaded, use its data; otherwise use typed text
  const readyFiles = uploadedFiles.filter(item => item.status === 'ok' || item.status === 'warning');
  const canGenerate = !isProcessingUploads && (readyFiles.length > 0 || noteText.trim().length > 0);
  const count       = noteText.length;
  const overLimit   = count > charLimit;

  function updateUploadItem(id, patch) {
    setUploadedFiles(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  }

  async function ingestFiles(selectedFiles) {
    const files = Array.from(selectedFiles ?? []).filter(Boolean);
    if (!files.length) return;

    const existing = new Set(uploadedFiles.map(item => `${item.file.name}_${item.file.size}_${item.file.lastModified}`));
    const fresh = files.filter(file => !existing.has(getFileKey(file))).slice(0, Math.max(0, MAX_UPLOAD_FILES - uploadedFiles.length));
    if (!fresh.length) return;

    const seeded = fresh.map(file => ({
      id: getFileKey(file),
      file,
      status: 'loading',
      text: '',
      error: '',
      warning: '',
      kind: getKindLabel(file),
    }));
    setUploadedFiles(prev => [...prev, ...seeded]);
    setIsProcessingUploads(true);

    const token = await getAccessToken();
    const needsAuth = fresh.some(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      const isImage = IMAGE_EXTS.includes(ext) || file.type.startsWith('image/');
      return isImage || ext === 'pdf';
    });
    if (!token && needsAuth) {
      setShowAuth(true);
    }

    for (const file of fresh) {
      const id = getFileKey(file);
      try {
        const processed = await processFile(file, token);
        updateUploadItem(id, {
          status: processed.quality ?? 'ok',
          text: processed.text,
          error: '',
          warning: processed.warning ?? '',
          kind: processed.kind ?? getKindLabel(file),
        });
      } catch (err) {
        updateUploadItem(id, {
          status: 'error',
          error: err?.message ?? 'Could not process file.',
          warning: '',
        });
      }
    }

    setIsProcessingUploads(false);
  }

  async function handleFile(e) {
    const files = Array.from(e.currentTarget.files ?? []);
    e.currentTarget.value = '';
    await ingestFiles(files);
  }

  function handleDragEnter(e) {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragOver(e) {
    if (!isFileDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragActive(false);
  }

  async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = extractDroppedFiles(e.dataTransfer);
    await ingestFiles(files);
  }

  function buildMergedText() {
    const parts = [];
    const seen = new Set();
    const typed = noteText.trim().slice(0, charLimit);
    if (typed) parts.push(typed);

    readyFiles.forEach((item) => {
      const text = item.text.trim();
      if (!text) return;
      const dedupKey = normalizeTextForDedup(text).toLowerCase();
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);
      const heading = readyFiles.length > 1 || typed ? `【${item.file.name}】\n` : '';
      parts.push(`${heading}${text}`);
    });

    const merged = parts.join('\n\n').trim();
    return merged.slice(0, charLimit);
  }

  function handleGenerate() {
    const mergedText = buildMergedText();
    if (!mergedText) return;
    onGenerate(mergedText, null, adminModel);
  }

  function removeUploadedFile(id) {
    setUploadedFiles(prev => prev.filter(item => item.id !== id));
  }

  const hasUploadErrors = uploadedFiles.some(item => item.status === 'error');
  const hasReadyFiles = readyFiles.length > 0;
  const trimmedUploadText = buildMergedText();
  const tooMuchText = trimmedUploadText.length >= charLimit && (noteText.trim().length > 0 || hasReadyFiles);

  function uploadMessage() {
    if (!uploadedFiles.length) return isJapanese
      ? 'PDF、画像、スクリーンショット、テキストを複数まとめて追加できます。'
      : 'Add multiple PDFs, images, screenshots, or text files.';
    if (isProcessingUploads) return isJapanese ? 'ファイルを順番に処理しています…' : 'Processing files one by one...';
    if (hasUploadErrors && !hasReadyFiles && !noteText.trim()) return isJapanese ? '読み取りに失敗したファイルがあります。別の画像やPDFを試してください。' : 'Some files could not be processed. Try clearer files.';
    if (tooMuchText) return isJapanese ? '内容が長いので一部を切り詰めました。' : 'Some imported text was trimmed to keep generation reliable.';
    return isJapanese
      ? 'ドラッグ＆ドロップでも追加できます。'
      : 'You can also drag and drop files here.';
  }

  async function handleToggleSelfPro() {
    if (!isAdmin) return;
    const token = await getAccessToken();
    if (!token) return;

    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'set_self_pro', isPro: !isPro }),
    });
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    await refreshProfile({
      isAdmin: true,
      isPro: typeof data?.isPro === 'boolean' ? data.isPro : !isPro,
    });
  }

  return (
    <>
      <div className="page">
        {/* Header */}
        <div className="header-row">
        <div className="header-left">
          <div className="brand-orb">
              <img src={brand.iconPath} alt={brand.full} className="mascot-icon" />
            </div>
            <div>
              <div className="logo header-wordmark">
                <span className="logo-pass">{brand.lead}</span>
                <span className="logo-ai">{brand.suffix}</span>
              </div>
              <div className="tagline">
                {isJapanese ? 'ノートをAIで学習素材に変換' : getBrandTagline(false)}
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
        <div className="study-hero-card">
          <div>
            <div className="study-hero-kicker">{isJapanese ? '次のテスト準備を始めよう' : 'Ready for your next exam?'}</div>
            <div className="study-hero-title">{isJapanese ? 'アップロードして開始' : 'Upload to get started'}</div>
            <div className="study-hero-sub">
              {isJapanese
                ? 'PDF・写真・テキストから、要約とクイズをすばやく作成します。'
                : 'Turn PDFs, images, and text notes into clean study material.'}
            </div>
          </div>
          <img src="/mascot/mascot-reading.png" alt="" className="study-hero-mascot" />
        </div>

        <div
          className={`upload-dropzone ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="upload-row">
            <label
              className="import-btn"
              htmlFor="passai-file-input"
              aria-disabled={isProcessingUploads}
            >
              📄 {isJapanese ? 'ファイルを追加' : 'Add files'}
            </label>
            <input
              ref={fileRef}
              id="passai-file-input"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md,.rtf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,image/heic,image/heif"
              className="file-input-hidden"
              onChange={handleFile}
            />

            <label
              className="import-btn"
              htmlFor="passai-camera-input"
              aria-disabled={isProcessingUploads}
            >
              📷 {isJapanese ? 'カメラ' : 'Camera'}
            </label>
            <input
              ref={cameraRef}
              id="passai-camera-input"
              type="file"
              accept="image/*"
              capture="environment"
              className="file-input-hidden"
              onChange={handleFile}
            />
          </div>

          <div className="upload-hint upload-hint-stack">
            <div className="upload-hint-title">
              {isJapanese ? 'アップロード' : 'Upload'}
            </div>
            <div className="upload-hint-copy">
              {uploadMessage()}
            </div>
          </div>

          {!!uploadedFiles.length && (
            <div className="upload-list">
              {uploadedFiles.map(item => (
                <FileCard
                  key={item.id}
                  file={item.file}
                  kind={item.kind}
                  status={item.status}
                  error={item.error}
                  warning={item.warning}
                  isJapanese={isJapanese}
                  onRemove={() => removeUploadedFile(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Textarea stays available for manual notes */}
        <div className="note-area-wrap" style={{ marginBottom: 16, marginTop: 16 }}>
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

            {/* Usage indicator — free users only */}
            {user && !isPro && (
              <div className="usage-strip">
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: FREE_LIMIT }).map((_, i) => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: i < generationsUsed ? 'var(--color-amber)' : 'var(--border)',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>
                <span style={{
                  fontSize: 12, color: generationsUsed >= FREE_LIMIT ? 'var(--color-red)' : 'var(--muted)',
                  fontWeight: generationsUsed >= FREE_LIMIT - 1 ? 700 : 400,
                }}>
                  {isJapanese
                    ? `今月 ${generationsUsed}/${FREE_LIMIT} 回使用`
                    : `${generationsUsed}/${FREE_LIMIT} this month`}
                </span>
              </div>
            )}

            <button
              className="btn btn-primary"
              disabled={!canGenerate || overLimit}
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
          adminModel={adminModel}
          setAdminModel={setAdminModel}
          onToggleSelfPro={handleToggleSelfPro}
          onUpgrade={onUpgrade}
          onOpenPricing={onOpenPricing}
        />
      )}
      {showAuth && (
        <AuthModal isJapanese={isJapanese} onClose={() => setShowAuth(false)} />
      )}
    </>
  );
}
