import { useState, useEffect } from 'react';
import FuriganaText from '../FuriganaText.jsx';

// ── Step card colors — cycle through 5 palettes ───────────────────────────────
// rgba values are semi-transparent so they work on both dark and light backgrounds
const STEP_PALETTES = [
  { bg: 'rgba(107,96,255,0.11)', border: 'rgba(107,96,255,0.35)', accent: 'var(--color-purple)' }, // purple
  { bg: 'rgba(10,132,255,0.10)', border: 'rgba(10,132,255,0.32)',  accent: '#0a84ff'             }, // blue
  { bg: 'rgba(48,209,88,0.10)',  border: 'rgba(48,209,88,0.30)',   accent: 'var(--color-green)'  }, // green
  { bg: 'rgba(255,159,10,0.10)', border: 'rgba(255,159,10,0.32)', accent: 'var(--color-amber)'  }, // amber
  { bg: 'rgba(255,55,95,0.09)',  border: 'rgba(255,55,95,0.28)',   accent: '#ff375f'             }, // rose
];

// ── Wikipedia fetch — language-aware ─────────────────────────────────────────
async function fetchWikiImage(query, isJapanese) {
  if (!query) return null;
  const lang = isJapanese ? 'ja' : 'en';
  try {
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`;
    const searchRes  = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const title = searchData?.query?.search?.[0]?.title;
    if (!title) return null;

    const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const summaryRes  = await fetch(summaryUrl);
    const summaryData = await summaryRes.json();

    if (summaryData?.thumbnail?.source) {
      return {
        src:     summaryData.thumbnail.source,
        caption: summaryData.title,
        url:     summaryData.content_urls?.desktop?.page,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Paragraph renderer with step/analogy detection ───────────────────────────
function ExplanationText({ text, furigana }) {
  if (!text) return null;

  const paragraphs = text.split(/\n+/);
  let stepCounter = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {paragraphs.map((para, i) => {
        if (!para.trim()) return null;

        // ── Step lines: "Step 1:", "ステップ1:", "手順1:" ──
        const stepMatch = para.match(/^(Step\s*\d+|ステップ\s*\d+|手順\s*\d+|STEP\s*\d+)[：:]/i);
        if (stepMatch) {
          const palette = STEP_PALETTES[stepCounter % STEP_PALETTES.length];
          stepCounter++;
          const label = stepMatch[0];
          const body  = para.slice(label.length).trim();
          return (
            <div key={i} style={{
              background: palette.bg,
              border: `1px solid ${palette.border}`,
              borderLeft: `3px solid ${palette.accent}`,
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              padding: '12px 16px',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: 1.2,
                textTransform: 'uppercase', color: palette.accent, marginBottom: 6,
              }}>
                {label.trim()}
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text)' }}>
                <FuriganaText text={body} furigana={furigana} />
              </div>
            </div>
          );
        }

        // ── Analogy / think-of-it lines ──
        const analogyRx = /^(Think of it|Imagine|For example|Example:|たとえば|例えば|イメージ|具体例)/i;
        if (analogyRx.test(para)) {
          return (
            <div key={i} style={{
              background: 'rgba(90,200,250,0.08)',
              border: '1px solid rgba(90,200,250,0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-2)' }}>
                <FuriganaText text={para} furigana={furigana} />
              </div>
            </div>
          );
        }

        // ── Formula / definition lines (starts with a symbol or "Formula:") ──
        const formulaRx = /^(Formula|Definition|公式|定義|Rule:|ルール)[：:]/i;
        if (formulaRx.test(para)) {
          return (
            <div key={i} style={{
              background: 'rgba(255,159,10,0.09)',
              border: '1px solid rgba(255,159,10,0.28)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>📐</span>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text)', fontFamily: 'monospace' }}>
                <FuriganaText text={para} furigana={furigana} />
              </div>
            </div>
          );
        }

        // ── Plain paragraph ──
        return (
          <p key={i} style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--text)', margin: 0 }}>
            <FuriganaText text={para} furigana={furigana} />
          </p>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SimpleTab({ simpleExplanation, corrections, illustrationQuery, furigana, isJapanese }) {
  const [wikiImage,  setWikiImage]  = useState(null);
  const [imgLoading, setImgLoading] = useState(false);

  useEffect(() => {
    if (!illustrationQuery) return;
    setImgLoading(true);
    setWikiImage(null);
    fetchWikiImage(illustrationQuery, isJapanese).then(img => {
      setWikiImage(img);
      setImgLoading(false);
    });
  }, [illustrationQuery, isJapanese]);

  const hasCorrections = corrections?.length > 0;

  return (
    <div>
      {/* Corrections banner */}
      {hasCorrections && (
        <div style={{
          background: 'rgba(255,69,58,0.07)',
          border: '1px solid rgba(255,69,58,0.25)',
          borderRadius: 'var(--radius)',
          padding: '16px',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-red)', textTransform: 'uppercase', letterSpacing: 1 }}>
              {isJapanese ? '修正が必要な箇所' : 'Corrections found in your notes'}
            </span>
          </div>
          {corrections.map((c, i) => (
            <div key={i} style={{
              fontSize: 14, lineHeight: 1.65, color: 'var(--text-2)',
              paddingTop: i > 0 ? 10 : 0,
              borderTop: i > 0 ? '1px solid rgba(255,69,58,0.12)' : 'none',
            }}>
              <FuriganaText text={c} furigana={furigana} />
            </div>
          ))}
        </div>
      )}

      {/* Wikipedia illustration */}
      {illustrationQuery && (
        <div style={{ marginBottom: 20 }}>
          {imgLoading && (
            <div style={{
              height: 100, background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--muted)', fontSize: 13,
            }}>
              {isJapanese ? '画像を読み込み中...' : 'Loading illustration...'}
            </div>
          )}
          {!imgLoading && wikiImage && (
            <a href={wikiImage.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
              }}>
                <img
                  src={wikiImage.src}
                  alt={wikiImage.caption}
                  style={{ width: '100%', maxHeight: 220, objectFit: 'contain', background: '#fff', padding: 12 }}
                />
                <div style={{
                  padding: '9px 14px', fontSize: 12, color: 'var(--muted)',
                  display: 'flex', alignItems: 'center', gap: 6,
                  borderTop: '1px solid var(--border)',
                }}>
                  <span>📖</span>
                  <span style={{ flex: 1 }}>{wikiImage.caption}</span>
                  <span style={{ fontSize: 11 }}>{isJapanese ? 'Wikipedia より ↗' : 'via Wikipedia ↗'}</span>
                </div>
              </div>
            </a>
          )}
        </div>
      )}

      {/* Simple explanation */}
      <div className="section-title">{isJapanese ? 'わかりやすい解説' : 'Simple Explanation'}</div>
      <div className="card" style={{ padding: '20px' }}>
        <ExplanationText text={simpleExplanation} furigana={furigana} />
      </div>
    </div>
  );
}
