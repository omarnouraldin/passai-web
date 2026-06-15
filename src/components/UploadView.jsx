import { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { useAuth } from '../contexts/AuthContext.jsx';
import AuthModal from './AuthModal.jsx';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// ── Constants ─────────────────────────────────────────────────────────────────
const IMAGE_EXTS       = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'];
const HEIC_EXTS        = ['heic', 'heif'];
const HEIC_MIME_TYPES  = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
const MAX_UPLOAD_FILES = 8;
const MAX_FILE_BYTES   = 25 * 1024 * 1024;
const MIN_VALID_TEXT   = 40;
const BLUR_WARNING_SCORE = 70;
const BLUR_ERROR_SCORE   = 35;
const DEV_LOGS = import.meta.env.DEV;

let heic2anyPromise = null;

// ── File helpers ──────────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getKindLabel(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (IMAGE_EXTS.includes(ext) || file.type.startsWith('image/')) return 'Image';
  if (ext === 'pdf')                     return 'PDF';
  if (ext === 'docx' || ext === 'doc')   return 'DOC';
  if (ext === 'txt'  || ext === 'md' || ext === 'rtf') return 'Text';
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

function getExt(file) { return file.name.split('.').pop().toLowerCase(); }

function isHeicFile(file) {
  const ext = getExt(file);
  return HEIC_EXTS.includes(ext) || HEIC_MIME_TYPES.includes((file.type || '').toLowerCase());
}

async function getHeic2Any() {
  if (!heic2anyPromise) heic2anyPromise = import('heic2any').then(m => m.default ?? m);
  return heic2anyPromise;
}

async function convertHeicToJpeg(file) {
  try {
    const heic2any  = await getHeic2Any();
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const blob      = Array.isArray(converted) ? converted[0] : converted;
    if (!(blob instanceof Blob)) throw new Error('Invalid HEIC conversion result.');
    return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg', lastModified: file.lastModified });
  } catch { throw new Error('Could not process HEIC image.'); }
}

async function normalizeImageFile(file) {
  return isHeicFile(file) ? convertHeicToJpeg(file) : file;
}

async function loadImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return { kind: 'bitmap', bitmap };
    } catch {}
  }
  const img = await loadImage(file);
  return img ? { kind: 'image', image: img } : null;
}

async function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.84) {
  if (canvas.toBlob) {
    const blob = await new Promise(r => canvas.toBlob(r, type, quality));
    if (blob) return blob;
  }
  try { return await fetch(canvas.toDataURL(type, quality)).then(r => r.blob()); }
  catch { return null; }
}

function blurScoreFromCanvas(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++)
    gray[p] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  let sum = 0, count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap = gray[idx]*4 - gray[idx-1] - gray[idx+1] - gray[idx-width] - gray[idx+width];
      sum += lap * lap; count++;
    }
  }
  return count ? sum / count : 0;
}

async function compressImage(file) {
  const normalizedFile = await normalizeImageFile(file);
  const decoded = await decodeImage(normalizedFile);
  if (!decoded) throw new Error('Could not load image.');
  const w = decoded.kind === 'bitmap' ? decoded.bitmap.width  : decoded.image.width;
  const h = decoded.kind === 'bitmap' ? decoded.bitmap.height : decoded.image.height;
  const ratio  = Math.min(1, 1800 / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width  = Math.max(1, Math.round(w * ratio));
  canvas.height = Math.max(1, Math.round(h * ratio));
  const ctx = canvas.getContext('2d');
  if (decoded.kind === 'bitmap') { ctx.drawImage(decoded.bitmap, 0, 0, canvas.width, canvas.height); decoded.bitmap.close?.(); }
  else                             ctx.drawImage(decoded.image,  0, 0, canvas.width, canvas.height);
  const prev = document.createElement('canvas');
  const pr   = Math.min(1, 72 / Math.max(canvas.width, canvas.height));
  prev.width  = Math.max(1, Math.round(canvas.width  * pr));
  prev.height = Math.max(1, Math.round(canvas.height * pr));
  prev.getContext('2d').drawImage(canvas, 0, 0, prev.width, prev.height);
  const blurScore = blurScoreFromCanvas(prev);
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.84);
  if (!blob) throw new Error('Could not process image.');
  return { blob, blurScore };
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(String(e.target.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function ocrImageBlob(blob, token) {
  const base64  = await blobToBase64(blob);
  const body    = JSON.stringify({ image: base64, mediaType: 'image/jpeg' });
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  let res = await fetch('/api/ocr', { method: 'POST', headers, body });
  if (import.meta.env.DEV && res.status === 404 && window.location.hostname === 'localhost') {
    res = await fetch('http://localhost:3001/api/ocr', { method: 'POST', headers, body });
  }
  let payload = null;
  try { payload = await res.json(); } catch {}
  if (!res.ok) throw new Error(payload?.error ?? 'Could not read the image.');
  return String(payload?.text ?? '').trim();
}

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf    = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return { text: text.trim(), pages: pdf.numPages, pdf };
}

async function ocrPdfPages(pdf, token, maxPages = 8) {
  const parts = [];
  for (let i = 1; i <= Math.min(pdf.numPages, maxPages); i++) {
    const page     = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas   = document.createElement('canvas');
    canvas.width   = Math.max(1, Math.round(viewport.width));
    canvas.height  = Math.max(1, Math.round(viewport.height));
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.82));
    if (blob) { const t = await ocrImageBlob(blob, token); if (t) parts.push(t); }
  }
  return parts.join('\n\n').trim();
}

async function processFile(file, token) {
  const ext     = getExt(file);
  const isImage = IMAGE_EXTS.includes(ext) || file.type.startsWith('image/');
  const kind    = getKindLabel(file);
  if (file.size > MAX_FILE_BYTES) throw new Error('File too large. Please use a smaller file.');

  if (isImage) {
    const { blob, blurScore } = await compressImage(file);
    const text = await ocrImageBlob(blob, token);
    if (text.length < MIN_VALID_TEXT)
      throw new Error(blurScore < BLUR_ERROR_SCORE ? 'Image too blurry.' : 'Could not extract enough text from the image.');
    return { kind, text, quality: blurScore < BLUR_WARNING_SCORE ? 'warning' : 'ok', warning: blurScore < BLUR_WARNING_SCORE ? 'Low confidence — check this image before generating.' : '' };
  }

  if (ext === 'pdf') {
    const { text, pages, pdf } = await extractPdfText(file);
    if (text.length >= MIN_VALID_TEXT) return { kind, text, quality: 'ok', warning: '' };
    if (pages <= 10) {
      const ocrText = await ocrPdfPages(pdf, token, 8);
      if (ocrText.length >= MIN_VALID_TEXT) return { kind, text: ocrText, quality: 'warning', warning: 'Text was extracted using OCR fallback.' };
    }
    throw new Error('Could not extract enough text from this PDF.');
  }

  if (ext === 'docx' || ext === 'doc') {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const text   = result.value.trim();
    if (text.length < MIN_VALID_TEXT) throw new Error('Could not extract enough text from this document.');
    return { kind, text, quality: 'ok', warning: '' };
  }

  const text = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsText(file);
  });
  const clean = String(text ?? '').trim();
  if (clean.length < MIN_VALID_TEXT) throw new Error('Text file is too short or empty.');
  return { kind, text: clean, quality: 'ok', warning: '' };
}

// ── FileCard ──────────────────────────────────────────────────────────────────
function FileCard({ file, status, error, warning, onRemove, isJapanese, kind }) {
  const icon = kind === 'Image' ? '📷' : kind === 'PDF' ? '📕' : '📄';
  const statusLabel = { loading: isJapanese ? '処理中' : 'Processing', error: isJapanese ? '失敗' : 'Failed', warning: isJapanese ? '要確認' : 'Check', ok: isJapanese ? '準備完了' : 'Ready' }[status] ?? 'Ready';
  return (
    <div className={`hv-file-card ${status}`}>
      <div className="hv-file-icon-badge">{icon}</div>
      <div className="hv-file-body">
        <div className="hv-file-name">{file.name}</div>
        <div className="hv-file-meta">
          <span>{kind}</span><span>·</span><span>{formatSize(file.size)}</span>
          <span className={`hv-file-status ${status}`}>
            {status === 'ok' ? '✓' : status === 'warning' ? '!' : status === 'error' ? '✗' : '…'} {statusLabel}
          </span>
        </div>
        {warning && <div className="hv-file-warning">{warning}</div>}
        {error   && <div className="hv-file-error">{error}</div>}
      </div>
      <button className="hv-file-remove" onClick={onRemove} aria-label="Remove file">✕</button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UploadView({
  onGenerate, charLimit, adminModel,
  language, setLanguage,
  furigana, setFurigana,
  isJapanese,
  onBack,
}) {
  const { getAccessToken } = useAuth();

  const [noteText,            setNoteText]            = useState('');
  const [uploadedFiles,       setUploadedFiles]       = useState([]);
  const [isProcessingUploads, setIsProcessingUploads] = useState(false);
  const [dragActive,          setDragActive]          = useState(false);
  const [showAuth,            setShowAuth]            = useState(false);

  const fileRef      = useRef(null);
  const cameraRef    = useRef(null);
  const dropZoneRef  = useRef(null);

  const readyFiles  = uploadedFiles.filter(i => i.status === 'ok' || i.status === 'warning');
  const count       = noteText.length;
  const overLimit   = count > charLimit;
  const canGenerate = !isProcessingUploads && (readyFiles.length > 0 || noteText.trim().length > 0);

  function updateItem(id, patch) {
    setUploadedFiles(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }

  async function ingestFiles(selectedFiles) {
    const files = Array.from(selectedFiles ?? []).filter(Boolean);
    if (!files.length) return;
    const existing = new Set(uploadedFiles.map(i => `${i.file.name}_${i.file.size}_${i.file.lastModified}`));
    const fresh = files
      .filter(f => !existing.has(getFileKey(f)))
      .slice(0, Math.max(0, MAX_UPLOAD_FILES - uploadedFiles.length));
    if (!fresh.length) return;

    setUploadedFiles(prev => [...prev, ...fresh.map(f => ({ id: getFileKey(f), file: f, status: 'loading', text: '', error: '', warning: '', kind: getKindLabel(f) }))]);
    setIsProcessingUploads(true);

    const token     = await getAccessToken();
    const needsAuth = fresh.some(f => { const ext = getExt(f); return IMAGE_EXTS.includes(ext) || f.type.startsWith('image/') || ext === 'pdf'; });
    if (!token && needsAuth) setShowAuth(true);

    for (const file of fresh) {
      const id = getFileKey(file);
      try {
        const p = await processFile(file, token);
        updateItem(id, { status: p.quality ?? 'ok', text: p.text, error: '', warning: p.warning ?? '', kind: p.kind ?? getKindLabel(file) });
      } catch (err) {
        updateItem(id, { status: 'error', error: err?.message ?? 'Could not process file.', warning: '' });
      }
    }
    setIsProcessingUploads(false);
  }

  async function handleFile(e) {
    const files = Array.from(e.currentTarget.files ?? []);
    e.currentTarget.value = '';
    await ingestFiles(files);
  }

  function handleDragEnter(e) { if (!isFileDrag(e.dataTransfer)) return; e.preventDefault(); e.stopPropagation(); setDragActive(true); }
  function handleDragOver(e)  { if (!isFileDrag(e.dataTransfer)) return; e.preventDefault(); e.stopPropagation(); if (!dragActive) setDragActive(true); }
  function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget)) return; setDragActive(false); }
  async function handleDrop(e) { e.preventDefault(); e.stopPropagation(); setDragActive(false); await ingestFiles(extractDroppedFiles(e.dataTransfer)); }

  function buildMergedText() {
    const parts = [];
    const seen  = new Set();
    const typed = noteText.trim().slice(0, charLimit);
    if (typed) parts.push(typed);
    readyFiles.forEach(item => {
      const text = item.text.trim();
      if (!text) return;
      const key = normalizeTextForDedup(text).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const heading = readyFiles.length > 1 || typed ? `【${item.file.name}】\n` : '';
      parts.push(`${heading}${text}`);
    });
    return parts.join('\n\n').trim().slice(0, charLimit);
  }

  function handleGenerate() {
    const merged = buildMergedText();
    if (!merged) return;
    readyFiles.length > 0
      ? onGenerate(noteText.trim(), { text: merged }, adminModel)
      : onGenerate(merged, null, adminModel);
  }

  const tooMuchText = buildMergedText().length >= charLimit && (noteText.trim().length > 0 || readyFiles.length > 0);
  const isJP = language === 'japanese';

  const OUTPUT_TYPES = isJapanese
    ? ['問題', 'フラッシュカード', '要約']
    : ['Questions', 'Flashcards', 'Summary'];

  return (
    <>
      {/* Hidden file inputs */}
      <input ref={fileRef} id="uv-file-input" type="file" multiple
        accept=".pdf,.doc,.docx,.txt,.md,.rtf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,image/heic,image/heif"
        style={{ display: 'none' }} onChange={handleFile} />
      <input ref={cameraRef} id="uv-camera-input" type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handleFile} />

      <div className="uv-page">

        {/* ── Header ── */}
        <div className="uv-header">
          <button className="uv-back-btn" onClick={onBack} aria-label={isJapanese ? '戻る' : 'Back'}>
            ‹
          </button>
          <h1 className="uv-title">
            {isJapanese ? '新しい学習パック' : 'New study pack'}
          </h1>
        </div>

        {/* ── Drop zone ── */}
        <div
          ref={dropZoneRef}
          className={`uv-drop-zone${dragActive ? ' drag-active' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="uv-drop-icon">⬆</div>
          <p className="uv-drop-title">
            {isJapanese ? 'ノートをアップロード' : 'Upload your notes'}
          </p>
          <p className="uv-drop-sub">
            {isJapanese ? 'PDF・画像・テキストに対応' : 'PDF · Image · Text file supported'}
          </p>
          <div className="uv-drop-btns">
            <button className="uv-drop-btn" onClick={() => fileRef.current?.click()} disabled={isProcessingUploads}>
              📄 {isJapanese ? 'ファイルを追加' : 'Browse files'}
            </button>
            <button className="uv-drop-btn" onClick={() => cameraRef.current?.click()} disabled={isProcessingUploads}>
              📷 {isJapanese ? 'カメラ' : 'Camera'}
            </button>
          </div>
          {!uploadedFiles.length && (
            <p className="uv-drop-hint">
              {isJapanese ? 'ドラッグ＆ドロップも使えます' : 'Drag and drop works too'}
            </p>
          )}
          {!!uploadedFiles.length && (
            <div className="uv-file-list">
              {uploadedFiles.map(item => (
                <FileCard
                  key={item.id}
                  file={item.file}
                  kind={item.kind}
                  status={item.status}
                  error={item.error}
                  warning={item.warning}
                  isJapanese={isJapanese}
                  onRemove={() => setUploadedFiles(prev => prev.filter(i => i.id !== item.id))}
                />
              ))}
              {tooMuchText && (
                <p style={{ fontSize: 11, color: 'var(--color-amber)', marginTop: 4 }}>
                  {isJapanese ? '内容が長いので一部を切り詰めました。' : 'Some text was trimmed to keep generation reliable.'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Options card ── */}
        <div className="uv-options-card">

          {/* Language toggle */}
          <div className="uv-options-row">
            <span className="uv-options-icon">🌐</span>
            <div className="uv-options-body">
              <p className="uv-options-label">{isJapanese ? '言語' : 'Language'}</p>
              <p className="uv-options-sub">
                {isJapanese ? '出力言語と日本語OCRモード' : 'Output language and Japanese OCR mode'}
              </p>
            </div>
            <div className="uv-lang-toggle">
              <button
                className={`uv-lang-btn${language === 'english' ? ' active' : ''}`}
                onClick={() => setLanguage('english')}
              >EN</button>
              <button
                className={`uv-lang-btn${language === 'japanese' ? ' active' : ''}`}
                onClick={() => setLanguage('japanese')}
              >JP</button>
            </div>
          </div>

          {/* Furigana toggle — only relevant in Japanese mode */}
          {isJP && (
            <div className="uv-options-row">
              <span className="uv-options-icon">あ</span>
              <div className="uv-options-body">
                <p className="uv-options-label">ふりがな</p>
                <p className="uv-options-sub">漢字にふりがなを表示します</p>
              </div>
              <div className="uv-toggle-wrap">
                <button
                  className={`uv-toggle${furigana ? ' on' : ''}`}
                  onClick={() => setFurigana(f => !f)}
                  aria-label="Toggle furigana"
                >
                  <div className="uv-toggle-thumb" />
                </button>
              </div>
            </div>
          )}

          {/* Output types (informational) */}
          <div className="uv-options-row">
            <span className="uv-options-icon">📋</span>
            <div className="uv-options-body">
              <p className="uv-options-label">{isJapanese ? '生成内容' : 'Output'}</p>
              <p className="uv-options-sub">
                {isJapanese ? '以下の内容がすべて生成されます' : 'All of the following will be generated'}
              </p>
            </div>
            <div className="uv-output-badges">
              {OUTPUT_TYPES.map(t => (
                <span key={t} className="uv-badge">✓ {t}</span>
              ))}
            </div>
          </div>

        </div>

        {/* ── Textarea ── */}
        <div className="uv-note-wrap">
          <textarea
            className="uv-textarea"
            placeholder={isJapanese
              ? 'またはここにノートを貼り付け・入力...'
              : 'Or paste / type your notes here...'}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            maxLength={charLimit + 100}
          />
          <span className={`uv-char-count${overLimit ? ' over' : ''}`}>
            {count.toLocaleString()} / {charLimit.toLocaleString()}
          </span>
        </div>

        {/* ── Generate button ── */}
        <button
          className="uv-generate-btn"
          disabled={!canGenerate || overLimit}
          onClick={handleGenerate}
        >
          ✨ {isJapanese ? '学習パックを生成する' : 'Generate Study Pack'}
        </button>

      </div>

      {showAuth && (
        <AuthModal isJapanese={isJapanese} onClose={() => setShowAuth(false)} />
      )}
    </>
  );
}
