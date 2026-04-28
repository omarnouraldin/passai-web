import { useState, useEffect } from 'react';
import FuriganaText from '../FuriganaText.jsx';

// Fetch a Wikipedia image for the given query
async function fetchWikiImage(query) {
  if (!query) return null;
  try {
    // Search for the closest Wikipedia article
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const title = searchData?.query?.search?.[0]?.title;
    if (!title) return null;

    // Get summary + thumbnail for that article
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const summaryRes = await fetch(summaryUrl);
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

// Render the simple explanation text with Step N: formatting
function ExplanationText({ text, furigana }) {
  if (!text) return null;

  // Split into paragraphs
  const paragraphs = text.split(/\n{1,}/);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {paragraphs.map((para, i) => {
        // Detect step lines like "Step 1:", "Step 1：", "ステップ1:"
        const stepMatch = para.match(/^(Step\s*\d+|ステップ\s*\d+|手順\s*\d+)[：:]\s*/i);
        if (stepMatch) {
          const label = stepMatch[0];
          const body  = para.slice(label.length);
          return (
            <div key={i} style={{
              background: 'var(--accent-dim)',
              border: '1px solid rgba(107,96,255,0.2)',
              borderLeft: '3px solid var(--accent)',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>
                {label.trim()}
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text)' }}>
                <FuriganaText text={body} furigana={furigana} />
              </div>
            </div>
          );
        }

        // Detect analogy lines ("Think of it like...", "たとえば...")
        const analogyMatch = para.match(/^(Think of it|Imagine|For example|例えば|たとえば|イメージ)/i);
        if (analogyMatch) {
          return (
            <div key={i} style={{
              background: 'rgba(48,209,88,0.07)',
              border: '1px solid rgba(48,209,88,0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)' }}>
                <FuriganaText text={para} furigana={furigana} />
              </div>
            </div>
          );
        }

        // Plain paragraph
        return (
          <p key={i} style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text)', margin: 0 }}>
            <FuriganaText text={para} furigana={furigana} />
          </p>
        );
      })}
    </div>
  );
}

export default function SimpleTab({ simpleExplanation, corrections, illustrationQuery, furigana, isJapanese }) {
  const [wikiImage, setWikiImage] = useState(null);
  const [imgLoading, setImgLoading] = useState(false);

  useEffect(() => {
    if (!illustrationQuery) return;
    setImgLoading(true);
    fetchWikiImage(illustrationQuery).then(img => {
      setWikiImage(img);
      setImgLoading(false);
    });
  }, [illustrationQuery]);

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
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {isJapanese ? '修正が必要な箇所' : 'Corrections found'}
            </span>
          </div>
          {corrections.map((c, i) => (
            <div key={i} style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--text-2)',
              paddingTop: i > 0 ? 10 : 0,
              borderTop: i > 0 ? '1px solid rgba(255,69,58,0.15)' : 'none',
            }}>
              <FuriganaText text={c} furigana={furigana} />
            </div>
          ))}
        </div>
      )}

      {/* Illustration */}
      {illustrationQuery && (
        <div style={{ marginBottom: 20 }}>
          {imgLoading && (
            <div style={{
              height: 140,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--muted)',
              fontSize: 13,
            }}>
              {isJapanese ? '画像を読み込み中...' : 'Loading illustration...'}
            </div>
          )}
          {!imgLoading && wikiImage && (
            <a href={wikiImage.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <img
                  src={wikiImage.src}
                  alt={wikiImage.caption}
                  style={{ width: '100%', maxHeight: 220, objectFit: 'contain', background: '#fff', padding: 12 }}
                />
                <div style={{
                  padding: '10px 14px',
                  fontSize: 12,
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderTop: '1px solid var(--border)',
                }}>
                  <span>📖</span>
                  <span>{wikiImage.caption}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11 }}>{isJapanese ? 'Wikipedia より' : 'via Wikipedia'} ↗</span>
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
