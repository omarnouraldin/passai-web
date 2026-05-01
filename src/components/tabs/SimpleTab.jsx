import { useState, useEffect } from 'react';
import FuriganaText from '../FuriganaText.jsx';

const STEP_PALETTES = [
  { bg: 'rgba(107,96,255,0.11)', border: 'rgba(107,96,255,0.35)', accent: 'var(--color-purple)' },
  { bg: 'rgba(10,132,255,0.10)', border: 'rgba(10,132,255,0.32)',  accent: '#0a84ff'             },
  { bg: 'rgba(48,209,88,0.10)',  border: 'rgba(48,209,88,0.30)',   accent: 'var(--color-green)'  },
  { bg: 'rgba(255,159,10,0.10)', border: 'rgba(255,159,10,0.32)', accent: 'var(--color-amber)'  },
  { bg: 'rgba(255,55,95,0.09)',  border: 'rgba(255,55,95,0.28)',   accent: '#ff375f'             },
];

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
    const summaryData = await (await fetch(summaryUrl)).json();
    if (summaryData?.thumbnail?.source) {
      return { src: summaryData.thumbnail.source, caption: summaryData.title, url: summaryData.content_urls?.desktop?.page };
    }
    return null;
  } catch { return null; }
}

// ── Render a block of text with 👉 headers and ・ sub-bullets ────────────────
function BulletText({ text, furigana, baseSize = 14 }) {
  if (!text) return null;
  // Sanitize broken Unicode in case anything slips through
  const clean = text.replace(/\uFFFD/g, '').trim();
  const lines  = clean.split('\n').filter(l => l.trim());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {lines.map((line, i) => {
        // 👉 — section header / key transition (used sparingly)
        if (line.startsWith('👉')) {
          const content = line.slice(1).trim();
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: i > 0 ? 4 : 0 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0, fontSize: baseSize, lineHeight: 1.6 }}>👉</span>
              <div style={{ fontSize: baseSize, lineHeight: 1.6, color: 'var(--text)', fontWeight: 600 }}>
                <FuriganaText text={content} furigana={furigana} />
              </div>
            </div>
          );
        }

        // ・ — sub-bullet (lighter, indented)
        if (line.startsWith('・') || line.startsWith('•') || line.startsWith('- ')) {
          const content = line.replace(/^[・•\-]\s*/, '');
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingLeft: 20 }}>
              <span style={{ color: 'var(--muted)', flexShrink: 0, fontSize: 12, lineHeight: 1.8 }}>•</span>
              <div style={{ fontSize: baseSize - 1, lineHeight: 1.65, color: 'var(--text-2)' }}>
                <FuriganaText text={content} furigana={furigana} />
              </div>
            </div>
          );
        }

        // Plain line
        return (
          <div key={i} style={{ fontSize: baseSize, lineHeight: 1.75, color: 'var(--text)' }}>
            <FuriganaText text={line} furigana={furigana} />
          </div>
        );
      })}
    </div>
  );
}

// ── Step card — supports 👉 micro-bullets inside ──────────────────────────────
function StepCard({ label, body, palette, furigana }) {
  return (
    <div style={{
      background: palette.bg, border: `1px solid ${palette.border}`,
      borderLeft: `3px solid ${palette.accent}`,
      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', padding: '12px 16px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: palette.accent, marginBottom: 8 }}>
        {label}
      </div>
      <BulletText text={body} furigana={furigana} baseSize={14} />
    </div>
  );
}

// ── Full explanation renderer ──────────────────────────────────────────────────
function ExplanationText({ text, furigana }) {
  if (!text) return null;
  const paragraphs = text.split(/\n{2,}/);
  let stepCounter = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {paragraphs.map((para, i) => {
        if (!para.trim()) return null;

        // Step block: "Step N｜Label" on first line, rest is body
        const stepMatch = para.match(/^(Step\s*\d+[｜|─\-]?\s*.+?)[\n\r]/i)
          || para.match(/^(Step\s*\d+[｜|─\-]?\s*.+)$/i)
          || para.match(/^(ステップ\s*\d+[｜|]?\s*.+?)[\n\r]/i);

        if (stepMatch || /^(Step\s*\d+|ステップ\s*\d+|手順\s*\d+)/i.test(para)) {
          const palette  = STEP_PALETTES[stepCounter % STEP_PALETTES.length];
          stepCounter++;
          const firstNewline = para.indexOf('\n');
          const label = firstNewline > -1 ? para.slice(0, firstNewline).trim() : para.trim();
          const body  = firstNewline > -1 ? para.slice(firstNewline + 1).trim() : '';
          return <StepCard key={i} label={label} body={body} palette={palette} furigana={furigana} />;
        }

        // Analogy lines (Japanese and English)
        const analogyRx = /^(Think of it|Imagine|For example|Example:|たとえば[：:]?|例えば[：:]?|イメージ|具体例)/i;
        if (analogyRx.test(para.trim())) {
          return (
            <div key={i} style={{
              background: 'rgba(90,200,250,0.08)', border: '1px solid rgba(90,200,250,0.25)',
              borderRadius: 'var(--radius-sm)', padding: '12px 14px',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-2)' }}>
                <FuriganaText text={para} furigana={furigana} />
              </div>
            </div>
          );
        }

        // Formula / definition lines
        const formulaRx = /^(Formula|Definition|公式|定義|Rule:|ルール)[：:]/i;
        if (formulaRx.test(para.trim())) {
          return (
            <div key={i} style={{
              background: 'rgba(255,159,10,0.09)', border: '1px solid rgba(255,159,10,0.28)',
              borderRadius: 'var(--radius-sm)', padding: '10px 14px',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>📐</span>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text)', fontFamily: 'monospace' }}>
                <FuriganaText text={para} furigana={furigana} />
              </div>
            </div>
          );
        }

        // Plain paragraph (may contain 👉 lines)
        return (
          <div key={i} style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--text)' }}>
            <BulletText text={para} furigana={furigana} baseSize={15} />
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SimpleTab({ summary, highlightStat, simpleExplanation, thinkingQuestions, corrections, illustrationQuery, furigana, isJapanese }) {
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

  const hasCorrections       = corrections?.length > 0;
  const hasThinkingQuestions = thinkingQuestions?.length > 0;

  return (
    <div>
      {/* ── Corrections banner ─────────────────────────────────────── */}
      {hasCorrections && (
        <div style={{
          background: 'rgba(255,69,58,0.07)', border: '1px solid rgba(255,69,58,0.25)',
          borderRadius: 'var(--radius)', padding: '16px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span>⚠️</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-red)', textTransform: 'uppercase', letterSpacing: 1 }}>
              {isJapanese ? '修正が必要な箇所' : 'Corrections found in your notes'}
            </span>
          </div>
          {corrections.map((c, i) => (
            <div key={i} style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-2)', paddingTop: i > 0 ? 10 : 0, borderTop: i > 0 ? '1px solid rgba(255,69,58,0.12)' : 'none' }}>
              <FuriganaText text={c} furigana={furigana} />
            </div>
          ))}
        </div>
      )}

      {/* ── ⚡ 30-second summary ───────────────────────────────────── */}
      {summary && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(107,96,255,0.13), rgba(10,132,255,0.10))',
          border: '1px solid rgba(107,96,255,0.28)',
          borderRadius: highlightStat ? 'var(--radius) var(--radius) 0 0' : 'var(--radius)',
          padding: '16px 18px',
          marginBottom: highlightStat ? 0 : 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>⚡</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-purple)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
              {isJapanese ? '30秒まとめ' : '30-Second Summary'}
            </span>
          </div>
          <BulletText text={summary} furigana={furigana} baseSize={15} />
        </div>
      )}

      {/* ── 💥 Highlight stat ──────────────────────────────────────── */}
      {highlightStat && (
        <div style={{
          background: 'rgba(255,55,95,0.07)',
          border: '1px solid rgba(107,96,255,0.28)',
          borderTop: 'none',
          borderRadius: '0 0 var(--radius) var(--radius)',
          padding: '14px 18px', marginBottom: 20,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#ff375f', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
            💥 {highlightStat.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 16px', fontSize: 15, fontWeight: 600, color: 'var(--text)',
            }}>
              {highlightStat.from}
            </div>
            <div style={{ fontSize: 20, color: 'var(--muted)' }}>→</div>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 16px', fontSize: 15, fontWeight: 600, color: 'var(--text)',
            }}>
              {highlightStat.to}
            </div>
          </div>
          {highlightStat.magnitude && (
            <div style={{ marginTop: 12, fontSize: 22, fontWeight: 800, color: '#ff375f', letterSpacing: -0.5 }}>
              {highlightStat.magnitude}
            </div>
          )}
        </div>
      )}

      {/* ── Wikipedia illustration ─────────────────────────────────── */}
      {illustrationQuery && (
        <div style={{ marginBottom: 20 }}>
          {imgLoading && (
            <div style={{ height: 100, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
              {isJapanese ? '画像を読み込み中...' : 'Loading illustration...'}
            </div>
          )}
          {!imgLoading && wikiImage && (
            <a href={wikiImage.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <img src={wikiImage.src} alt={wikiImage.caption} style={{ width: '100%', maxHeight: 220, objectFit: 'contain', background: '#fff', padding: 12 }} />
                <div style={{ padding: '9px 14px', fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--border)' }}>
                  <span>📖</span><span style={{ flex: 1 }}>{wikiImage.caption}</span>
                  <span style={{ fontSize: 11 }}>{isJapanese ? 'Wikipedia より ↗' : 'via Wikipedia ↗'}</span>
                </div>
              </div>
            </a>
          )}
        </div>
      )}

      {/* ── 🧠 Step-by-step explanation ────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>🧠</span>
        <div className="section-title" style={{ marginBottom: 0 }}>
          {isJapanese ? 'ステップ解説' : 'Step-by-Step'}
        </div>
      </div>
      <div className="card" style={{ padding: '20px', marginBottom: 20 }}>
        <ExplanationText text={simpleExplanation} furigana={furigana} />
      </div>

      {/* ── 🤔 Thinking questions ──────────────────────────────────── */}
      {hasThinkingQuestions && (
        <div style={{
          background: 'rgba(255,159,10,0.07)', border: '1px solid rgba(255,159,10,0.25)',
          borderRadius: 'var(--radius)', padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🤔</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-amber)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
              {isJapanese ? '考えてみよう — クイズの前に' : 'Think About It — Before the Quiz'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {thinkingQuestions.map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--color-amber)', fontWeight: 700, flexShrink: 0, fontSize: 14 }}>{i + 1}.</span>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>
                  <FuriganaText text={q} furigana={furigana} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
