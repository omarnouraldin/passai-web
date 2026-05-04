import { useState, useEffect } from 'react';
import FuriganaText from '../FuriganaText.jsx';

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

// ── Summary text: first plain line = large bold hook, rest = smaller ──────────
function SummaryText({ text, furigana }) {
  if (!text) return null;
  const clean = text.replace(/�/g, '').trim();
  const lines = clean.split('\n').filter(l => l.trim());
  let hookUsed = false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {lines.map((line, i) => {
        const is👉 = line.startsWith('👉');
        const isBullet = line.startsWith('・') || line.startsWith('•') || line.startsWith('- ');

        // First non-bullet line = hook sentence (big + bold)
        if (!is👉 && !isBullet && !hookUsed) {
          hookUsed = true;
          return (
            <div key={i} style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.55, color: 'var(--text)', marginBottom: 8 }}>
              <FuriganaText text={line} furigana={furigana} />
            </div>
          );
        }

        // 👉 section header
        if (is👉) {
          const content = line.slice(1).trim();
          return (
            <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginTop: 6 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0, fontSize: 13, lineHeight: 1.6 }}>👉</span>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.6, color: 'var(--text)' }}>
                <FuriganaText text={content} furigana={furigana} />
              </div>
            </div>
          );
        }

        // ・ sub-bullet (lighter, smaller, indented)
        if (isBullet) {
          const content = line.replace(/^[・•\-]\s*/, '');
          return (
            <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', paddingLeft: 20 }}>
              <span style={{ color: 'var(--muted)', flexShrink: 0, fontSize: 11, lineHeight: 1.9 }}>•</span>
              <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-2)', opacity: 0.85 }}>
                <FuriganaText text={content} furigana={furigana} />
              </div>
            </div>
          );
        }

        // Other plain line (e.g. sticky emotional line, visual gap line)
        return (
          <div key={i} style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', opacity: 0.9, marginTop: 4 }}>
            <FuriganaText text={line} furigana={furigana} />
          </div>
        );
      })}
    </div>
  );
}

// ── Bullet text for step body (👉 headers + ・ bullets) ───────────────────────
function BulletText({ text, furigana, baseSize = 14 }) {
  if (!text) return null;
  const clean = text.replace(/�/g, '').trim();
  const lines = clean.split('\n').filter(l => l.trim());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {lines.map((line, i) => {
        if (line.startsWith('👉')) {
          const content = line.slice(1).trim();
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: i > 0 ? 6 : 0 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0, fontSize: baseSize, lineHeight: 1.6 }}>👉</span>
              <div style={{ fontSize: baseSize, lineHeight: 1.6, color: 'var(--text)', fontWeight: 600 }}>
                <FuriganaText text={content} furigana={furigana} />
              </div>
            </div>
          );
        }
        if (line.startsWith('・') || line.startsWith('•') || line.startsWith('- ')) {
          const content = line.replace(/^[・•\-]\s*/, '');
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingLeft: 20 }}>
              <span style={{ color: 'var(--muted)', flexShrink: 0, fontSize: 11, lineHeight: 1.9 }}>•</span>
              <div style={{ fontSize: baseSize - 1, lineHeight: 1.65, color: 'var(--text-2)' }}>
                <FuriganaText text={content} furigana={furigana} />
              </div>
            </div>
          );
        }
        return (
          <div key={i} style={{ fontSize: baseSize, lineHeight: 1.75, color: 'var(--text)' }}>
            <FuriganaText text={line} furigana={furigana} />
          </div>
        );
      })}
    </div>
  );
}

// ── Step card — unified single accent color (no rainbow) ─────────────────────
function StepCard({ label, body, furigana }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--accent)',
      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
      padding: '14px 16px',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--accent)',
        opacity: 0.65, marginBottom: 8,
      }}>
        {label}
      </div>
      <BulletText text={body} furigana={furigana} baseSize={14} />
    </div>
  );
}

// ── Explanation renderer ──────────────────────────────────────────────────────
function ExplanationText({ text, furigana }) {
  if (!text) return null;
  const paragraphs = text.split(/\n{2,}/);
  let stepCounter = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {paragraphs.map((para, i) => {
        if (!para.trim()) return null;

        // Step block
        if (/^(Step\s*\d+|ステップ\s*\d+|手順\s*\d+)/i.test(para)) {
          stepCounter++;
          const firstNewline = para.indexOf('\n');
          const label = firstNewline > -1 ? para.slice(0, firstNewline).trim() : para.trim();
          const body  = firstNewline > -1 ? para.slice(firstNewline + 1).trim() : '';
          return <StepCard key={i} label={label} body={body} furigana={furigana} />;
        }

        // Analogy lines
        const analogyRx = /^(Think of it|Imagine|For example|Example:|たとえば[：:]?|例えば[：:]?|イメージ|具体例)/i;
        if (analogyRx.test(para.trim())) {
          return (
            <div key={i} style={{
              background: 'rgba(90,200,250,0.08)', border: '1px solid rgba(90,200,250,0.22)',
              borderRadius: 'var(--radius-sm)', padding: '12px 14px',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-2)' }}>
                <FuriganaText text={para} furigana={furigana} />
              </div>
            </div>
          );
        }

        // Formula / definition
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

        // Plain paragraph
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

      {/* ── Wikipedia header banner (top, not mid-page) ────────────── */}
      {!imgLoading && wikiImage && (
        <a href={wikiImage.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', marginBottom: 20 }}>
          <div style={{
            borderRadius: 'var(--radius)', overflow: 'hidden',
            border: '1px solid var(--border)', position: 'relative',
          }}>
            <img
              src={wikiImage.src}
              alt={wikiImage.caption}
              style={{ width: '100%', height: 130, objectFit: 'cover', objectPosition: 'center', display: 'block', background: '#fff' }}
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.55))',
              padding: '18px 12px 8px',
              fontSize: 11, color: 'rgba(255,255,255,0.85)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            }}>
              <span>{wikiImage.caption}</span>
              <span>{isJapanese ? 'Wikipedia ↗' : 'via Wikipedia ↗'}</span>
            </div>
          </div>
        </a>
      )}

      {/* ── Corrections banner ─────────────────────────────────────── */}
      {hasCorrections && (
        <div style={{
          background: 'rgba(255,69,58,0.07)', border: '1px solid rgba(255,69,58,0.25)',
          borderRadius: 'var(--radius)', padding: '16px 18px', marginBottom: 20,
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
          padding: '20px 22px',
          marginBottom: highlightStat ? 0 : 28,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 15 }}>⚡</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-purple)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
              {isJapanese ? '30秒まとめ' : '30-Second Summary'}
            </span>
          </div>
          <SummaryText text={summary} furigana={furigana} />
        </div>
      )}

      {/* ── 💥 Highlight stat ──────────────────────────────────────── */}
      {highlightStat && (
        <div style={{
          background: 'rgba(255,55,95,0.07)',
          border: '1px solid rgba(107,96,255,0.28)',
          borderTop: 'none',
          borderRadius: '0 0 var(--radius) var(--radius)',
          padding: '20px 22px',
          marginBottom: 28,
          textAlign: 'center',
        }}>
          {/* Label */}
          <div style={{ fontSize: 10, fontWeight: 800, color: '#ff375f', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 16, opacity: 0.8 }}>
            💥 {highlightStat.label}
          </div>

          {/* from → to */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 20px',
              fontSize: 22, fontWeight: 800, color: 'var(--text)',
            }}>
              {highlightStat.from}
            </div>
            <div style={{ fontSize: 22, color: 'var(--muted)', fontWeight: 300 }}>→</div>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 20px',
              fontSize: 22, fontWeight: 800, color: 'var(--text)',
            }}>
              {highlightStat.to}
            </div>
          </div>

          {/* Magnitude pill */}
          {highlightStat.magnitude && (
            <div style={{ display: 'inline-block' }}>
              <div style={{
                background: '#ff375f', color: '#fff',
                borderRadius: 50, padding: '6px 20px',
                fontSize: 20, fontWeight: 800, letterSpacing: -0.5,
              }}>
                {highlightStat.magnitude}
              </div>
            </div>
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
      <div style={{ marginBottom: 28 }}>
        <ExplanationText text={simpleExplanation} furigana={furigana} />
      </div>

      {/* ── 🤔 Thinking questions ──────────────────────────────────── */}
      {hasThinkingQuestions && (
        <>
          {/* Divider — signals "phase change" from learning → thinking */}
          <div style={{ borderTop: '1px solid var(--border)', marginBottom: 24 }} />

          <div style={{
            background: 'rgba(255,159,10,0.06)',
            border: '1px solid rgba(255,159,10,0.22)',
            borderRadius: 'var(--radius)', padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16 }}>🤔</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-amber)' }}>
                {isJapanese ? 'あなたはどう思う？' : 'Now It\'s Your Turn'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {thinkingQuestions.map((q, i) => (
                <div key={i} style={{
                  borderLeft: '3px solid var(--color-amber)',
                  paddingLeft: 14,
                }}>
                  <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text)' }}>
                    <FuriganaText text={q} furigana={furigana} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
