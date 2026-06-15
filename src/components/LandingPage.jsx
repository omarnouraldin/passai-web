import { useEffect, useRef, useState } from 'react';
import { getBrandWordmark, getBrandTagline } from '../lib/branding.js';

// ── Copy ──────────────────────────────────────────────────────────────────────
const CONTENT = {
  en: {
    chip: 'AI study companion for university students',
    heroLines: [
      'Stop cramming.\nStart understanding.',
      'Upload notes.\nGet a study pack in 30 sec.',
    ],
    heroBody: 'Turn any lecture notes into flashcards, quizzes, and mock exams — in 30 seconds.',
    heroCta: 'Try PassAI free',
    heroSecondary: 'Sign in / Sign up',
    pricingLink: 'View pricing',
    earlyAccess: 'Now in early access',
    earlyAccessSub: 'Be among the first students to try PassAI.',
    painTitle: 'Sound familiar?',
    pains: [
      { icon: '🌙', bg: 'rgba(248,113,113,0.15)', title: 'The night-before panic', body: '"200 pages of notes. Exam is at 9am."' },
      { icon: '📷', bg: 'rgba(52,211,153,0.12)',  title: 'The neglected photos',   body: '"I photographed every slide. Never reviewed them."' },
      { icon: '🈳', bg: 'rgba(251,191,36,0.12)',  title: 'The language barrier',   body: '"Lectures in Japanese. I miss half the nuance."' },
    ],
    howTitle: 'How it works',
    steps: [
      { num: '1', title: 'Upload your notes',         body: 'Photo, PDF, DOCX, or paste text directly.' },
      { num: '2', title: 'AI builds your study pack', body: 'Summary, flashcards, quiz, and exam in 30 seconds.' },
      { num: '3', title: 'Study smart. Pass confident.', body: 'Review, self-test, and walk into the exam ready.' },
    ],
    featuresTitle: 'Everything in one pack',
    featuresSub: 'One upload covers your whole exam.',
    features: [
      { icon: '📄', title: 'Summary + key topics', body: 'A 30-second hook that forces focus on what actually matters.', pro: false },
      { icon: '🃏', title: 'Smart flashcards',     body: 'AI-written Q&A built from your exact content.', pro: false },
      { icon: '❓', title: '4-choice quiz',         body: 'Tricky distractors that expose gaps before the exam does.', pro: false },
      { icon: '👑', title: 'Exam mode',             body: 'Full mock exam: MCQ, short answer (auto-graded), fill-in-the-blank.', pro: true },
    ],
    furiganaTitle: 'Built for international students',
    furiganaSub: 'PassAI adds furigana to Japanese academic terms automatically — focus on understanding, not decoding.',
    furiganaLabel: 'Example — actual PassAI output',
    pricingTitle: 'Simple pricing',
    pricingSub: 'Start free. Upgrade when you need more.',
    freeItems: [{ ok: true, label: '2 packs / month' }, { ok: true, label: 'GPT-5.4 Mini' }, { ok: false, label: 'No exam mode' }],
    proItems:  [{ ok: true, label: '30 packs / month' }, { ok: true, label: 'GPT-5.4 model' }, { ok: true, label: 'Exam mode' }],
    finalTitle: 'Ready to study smarter?',
    finalSub: 'Join early users and shape what PassAI becomes.',
    finalCta: 'Get started free',
    footer: { privacy: 'Privacy', terms: 'Terms', contact: 'Support' },
  },
  ja: {
    chip: '大学生の試験勉強向けAIアシスタント',
    heroLines: [
      '詰め込むのをやめて、\n理解し始めよう。',
      'ノートをアップロードして\n30秒で学習パックを作成。',
    ],
    heroBody: '講義ノートを、フラッシュカード・クイズ・模擬試験に30秒で変換。',
    heroCta: '無料で始める',
    heroSecondary: 'サインイン / 新規登録',
    pricingLink: '料金を見る',
    earlyAccess: 'アーリーアクセス公開中',
    earlyAccessSub: 'PassAIをいち早く体験する学生になろう。',
    painTitle: '思い当たりませんか？',
    pains: [
      { icon: '🌙', bg: 'rgba(248,113,113,0.15)', title: '前日の焦り',     body: '"試験まで200ページのノートが残っている。"' },
      { icon: '📷', bg: 'rgba(52,211,153,0.12)',  title: '放置された写真', body: '"スライドを全部撮ったけど、一度も見直していない。"' },
      { icon: '🈳', bg: 'rgba(251,191,36,0.12)',  title: '言語の壁',       body: '"日本語の講義の半分のニュアンスを理解できていない。"' },
    ],
    howTitle: '使い方',
    steps: [
      { num: '1', title: 'ノートをアップロード',     body: '写真・PDF・DOCX・テキスト貼り付けに対応。' },
      { num: '2', title: 'AIが学習パックを作成',     body: '要約・フラッシュカード・クイズ・試験を30秒で。' },
      { num: '3', title: 'スマートに学習して合格', body: '確認・自己テスト・試験に自信を持って臨む。' },
    ],
    featuresTitle: '1パックで全部カバー',
    featuresSub: '1回のアップロードで試験範囲をすべてカバー。',
    features: [
      { icon: '📄', title: '30秒まとめ + 重要トピック', body: '本当に大切なことにフォーカスできる30秒のまとめ。', pro: false },
      { icon: '🃏', title: 'スマートフラッシュカード', body: 'あなたのノートから作成したAI製Q&Aカード。', pro: false },
      { icon: '❓', title: '4択クイズ',               body: '試験前に弱点を見つけるひっかけ選択肢付きクイズ。', pro: false },
      { icon: '👑', title: '試験モード',              body: '自動採点付きの本格的な模擬試験（MCQ・記述・穴埋め）。', pro: true },
    ],
    furiganaTitle: '留学生にも使いやすい',
    furiganaSub: '専門用語にルビを自動追加。漢字の解読に時間を使わず、内容の理解に集中できます。',
    furiganaLabel: 'PassAI の出力例',
    pricingTitle: 'シンプルな料金',
    pricingSub: '無料から始めて、必要なときにアップグレード。',
    freeItems: [{ ok: true, label: '月2パック' }, { ok: true, label: 'GPT-5.4 Mini' }, { ok: false, label: '試験モードなし' }],
    proItems:  [{ ok: true, label: '月30パック' }, { ok: true, label: 'GPT-5.4モデル' }, { ok: true, label: '試験モード' }],
    finalTitle: 'スマートに勉強する準備はできましたか？',
    finalSub: 'アーリーユーザーとして、PassAI の進化に参加しよう。',
    finalCta: '無料で始める',
    footer: { privacy: 'プライバシー', terms: '利用規約', contact: 'サポート' },
  },
};

// ── Hook: scroll reveal ───────────────────────────────────────────────────────
function useScrollReveal(containerRef) {
  useEffect(() => {
    const root    = containerRef?.current ?? null;
    const targets = (root ?? document).querySelectorAll('.lp-reveal');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('lp-visible'); }),
      { root, threshold: 0.12 },
    );
    targets.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [containerRef]);
}

// ── Hook: count-up ────────────────────────────────────────────────────────────
function useCountUp(containerRef) {
  useEffect(() => {
    const root    = containerRef?.current ?? null;
    const targets = (root ?? document).querySelectorAll('.lp-stat-num[data-target]');
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          const el     = e.target;
          const target = parseFloat(el.dataset.target);
          const suffix = el.dataset.suffix ?? '';
          const inc    = target / (1100 / 16);
          let cur      = 0;
          const t      = setInterval(() => {
            cur = Math.min(cur + inc, target);
            el.textContent = Math.round(cur) + suffix;
            if (cur >= target) clearInterval(t);
          }, 16);
        });
      },
      { root, threshold: 0.3 },
    );
    targets.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [containerRef]);
}

// ── Hook: highlight card that's in the scroll viewport centre ─────────────────
function useActiveOnScroll(containerRef, selector) {
  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;
    const onScroll = () => {
      const mid = container.scrollTop + container.clientHeight * 0.52;
      container.querySelectorAll(selector).forEach(el => {
        const top = el.offsetTop;
        const bot = top + el.offsetHeight;
        if (mid > top && mid < bot) el.classList.add('lp-active');
        else el.classList.remove('lp-active');
      });
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [containerRef, selector]);
}

// ── Hook: typewriter ──────────────────────────────────────────────────────────
function useTypewriter(lines, elRef) {
  useEffect(() => {
    let li = 0, ci = 0, deleting = false, timer = null;
    const el = elRef?.current;
    if (!el) return;
    function tick() {
      const full = lines[li] ?? '';
      if (!deleting) {
        ci++;
        el.innerHTML = full.slice(0, ci).replace(/\n/g, '<br>');
        if (ci >= full.length) { timer = setTimeout(() => { deleting = true; tick(); }, 2400); return; }
      } else {
        ci--;
        el.innerHTML = full.slice(0, ci).replace(/\n/g, '<br>');
        if (ci <= 0) { deleting = false; li = (li + 1) % lines.length; }
      }
      timer = setTimeout(tick, deleting ? 22 : 52);
    }
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [lines, elRef]);
}

// ── Hook: testimonial auto-rotate ─────────────────────────────────────────────
function useTestiRotator(testimonials, cardRef, setIdx) {
  useEffect(() => {
    const id = setInterval(() => {
      const card = cardRef?.current;
      if (!card) return;
      card.style.opacity = '0';
      card.style.transform = 'translateX(14px)';
      setTimeout(() => {
        setIdx(prev => (prev + 1) % testimonials.length);
        card.style.opacity = '1';
        card.style.transform = 'translateX(0)';
      }, 360);
    }, 4200);
    return () => clearInterval(id);
  }, [testimonials, cardRef, setIdx]);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage({
  onTryFree,
  onOpenAuth,
  locale,
  onLocaleChange,
  onOpenPrivacy,
  onOpenTerms,
  onOpenPricing,
  onOpenDisclaimer,
  onOpenSupport,
}) {
  const copy  = CONTENT[locale] ?? CONTENT.en;
  const brand = getBrandWordmark(locale === 'ja');
  const isJa  = locale === 'ja';

  const containerRef = useRef(null);
  const headlineRef  = useRef(null);
  const progFillRef  = useRef(null);

  useScrollReveal(containerRef);
  useActiveOnScroll(containerRef, '.lp-pain-card');
  useActiveOnScroll(containerRef, '.lp-feature-card');
  useTypewriter(copy.heroLines, headlineRef);

  // Scroll progress bar
  useEffect(() => {
    const el   = containerRef.current;
    const fill = progFillRef.current;
    if (!el || !fill) return;
    const onScroll = () => {
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
      fill.style.width = Math.round(pct * 100) + '%';
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className="landing-page passai-landing-refresh"
      style={{ overflowY: 'auto', height: '100vh' }}
    >
      {/* ── Scroll progress bar ── */}
      <div className="lp-progress-bar">
        <div className="lp-progress-fill" ref={progFillRef} />
      </div>

      {/* ── Top bar ── */}
      <div className="landing-topbar">
        <div className="landing-brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="brand-orb landing-brand-orb">
            <img src={brand.iconPath} alt={brand.full} className="mascot-icon" />
          </div>
          <div>
            <div className="logo landing-brand-wordmark">
              <span className="logo-pass">{brand.lead}</span>
              <span className="logo-ai">{brand.suffix}</span>
            </div>
            <div className="landing-brand-sub">{getBrandTagline(isJa)}</div>
          </div>
        </div>
        <div className="landing-topbar-actions">
          <div className="landing-lang-toggle" role="group" aria-label="Language selector">
            <button className={`lang-btn ${locale === 'en' ? 'active' : ''}`} onClick={() => onLocaleChange('en')}>EN</button>
            <button className={`lang-btn ${locale === 'ja' ? 'active' : ''}`} onClick={() => onLocaleChange('ja')}>日本語</button>
          </div>
          <button className="btn btn-ghost landing-nav-pricing" onClick={() => onOpenPricing?.()}>
            {copy.pricingLink}
          </button>
        </div>
      </div>

      {/* ── Hero ── */}
      <section style={{ textAlign: 'center', padding: '36px 20px 28px', borderBottom: '1px solid var(--border)' }}>
        <div className="lp-reveal" style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <span className="lp-chip">
            <span className="lp-live-dot" aria-hidden="true" />
            {copy.chip}
          </span>
        </div>

        <div
          ref={headlineRef}
          className="lp-reveal lp-d1"
          style={{ fontSize: 'clamp(22px, 6vw, 28px)', fontWeight: 700, lineHeight: 1.28, color: 'var(--text)', minHeight: 72, marginBottom: 14 }}
          aria-label={copy.heroLines[0]}
        />

        <div className="lp-reveal lp-d2" style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
          {copy.heroBody}
        </div>

        <div className="lp-reveal lp-d3" style={{ marginBottom: 28 }}>
          <button className="btn btn-primary lp-cta-pulse" onClick={onTryFree} style={{ width: '100%', marginBottom: 10, fontSize: 15 }}>
            {copy.heroCta}
          </button>
          <button className="btn btn-ghost" onClick={onOpenAuth} style={{ width: '100%' }}>
            {copy.heroSecondary}
          </button>
        </div>

        {/* Floating artifact cards around mascot */}
        <div className="lp-reveal lp-d4 lp-hero-art">
          <div className="lp-hero-mascot">
            <img src={brand.iconPath} alt="" aria-hidden="true" style={{ width: 38, height: 38, objectFit: 'contain' }} />
          </div>
          <div className="lp-artifact a1">
            <div className="lp-artifact-title">30秒まとめ</div>
            <div className="lp-artifact-sub">ready</div>
          </div>
          <div className="lp-artifact a2">
            <div className="lp-artifact-title" style={{ color: 'var(--success)' }}>5 flashcards</div>
            <div className="lp-artifact-sub">created</div>
          </div>
          <div className="lp-artifact a3">
            <div className="lp-artifact-title" style={{ color: 'var(--color-amber)' }}>Quiz ready</div>
            <div className="lp-artifact-sub">4 questions</div>
          </div>
        </div>
      </section>

      {/* ── Early access banner ── */}
      <div className="lp-stats-row" style={{ padding: '22px 20px', flexDirection: 'column', gap: 4, textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {copy.earlyAccess}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          {copy.earlyAccessSub}
        </div>
      </div>

      {/* ── Pain points ── */}
      <section style={{ padding: '26px 20px', borderTop: '1px solid var(--border)' }}>
        <div className="lp-reveal" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
          {copy.painTitle}
        </div>
        {copy.pains.map((p, i) => (
          <div className={`lp-pain-card lp-reveal lp-d${i + 1}`} key={p.title}>
            <div className="lp-pain-icon" style={{ background: p.bg }}>
              <span style={{ fontSize: 15 }}>{p.icon}</span>
            </div>
            <div>
              <div className="lp-pain-title">{p.title}</div>
              <div className="lp-pain-body">{p.body}</div>
            </div>
          </div>
        ))}
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: '26px 20px', borderTop: '1px solid var(--border)' }}>
        <div className="lp-reveal" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>
          {copy.howTitle}
        </div>
        {copy.steps.map((s, i) => (
          <div key={s.title} className={`lp-step-row lp-reveal lp-from-left lp-d${i + 1}`}>
            <div className="lp-step-icon-wrap">
              <div className="lp-step-icon" style={{ background: i === 2 ? 'rgba(52,211,153,0.15)' : 'var(--accent-dim)' }}>
                <span style={{ color: i === 2 ? 'var(--success)' : 'var(--accent)', fontWeight: 700, fontSize: 14 }}>{s.num}</span>
              </div>
              {i < copy.steps.length - 1 && <div className="lp-step-line" />}
            </div>
            <div>
              <div className="lp-step-title">{s.title}</div>
              <div className="lp-step-body">{s.body}</div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '26px 20px', borderTop: '1px solid var(--border)' }}>
        <div className="lp-reveal" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          {copy.featuresTitle}
        </div>
        <div className="lp-reveal" style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 18 }}>
          {copy.featuresSub}
        </div>
        {copy.features.map((f, i) => (
          <div key={f.title} className={`lp-feature-card lp-reveal lp-d${i + 1}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div className="lp-feature-icon">
                <span style={{ fontSize: 16 }}>{f.icon}</span>
              </div>
              <span className="lp-feature-title">{f.title}</span>
              {f.pro && <span className="lp-pro-badge">Pro</span>}
            </div>
            <div className="lp-feature-body">{f.body}</div>
          </div>
        ))}
      </section>

      {/* ── Furigana ── */}
      <section style={{ padding: '26px 20px', borderTop: '1px solid var(--border)' }}>
        <div className="lp-reveal" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
          {copy.furiganaTitle}
        </div>
        <div className="lp-reveal" style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75, marginBottom: 16 }}>
          {copy.furiganaSub}
        </div>
        <div className="lp-furigana-card lp-reveal lp-d1">
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}>{copy.furiganaLabel}</div>
          <ruby>連立方程式<rt>れんりつほうていしき</rt></ruby>は、
          複数の<ruby>未知数<rt>みちすう</rt></ruby>を
          <ruby>同時<rt>どうじ</rt></ruby>に解く方程式です。
        </div>
      </section>


      {/* ── Pricing ── */}
      <section style={{ padding: '26px 20px', borderTop: '1px solid var(--border)' }}>
        <div className="lp-reveal" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          {copy.pricingTitle}
        </div>
        <div className="lp-reveal" style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>
          {copy.pricingSub}
        </div>
        <div className="lp-pricing-grid">
          <div className="lp-pricing-card lp-reveal">
            <div className="lp-pricing-tier">{isJa ? '無料' : 'Free'}</div>
            <div className="lp-pricing-price">¥0</div>
            {copy.freeItems.map(item => (
              <div key={item.label} className={`lp-pricing-item ${item.ok ? '' : 'lp-dim'}`}>
                <span className={item.ok ? 'lp-pricing-check' : 'lp-pricing-x'}>{item.ok ? '✓' : '−'}</span>
                {item.label}
              </div>
            ))}
          </div>
          <div className="lp-pricing-card lp-featured lp-reveal lp-d1">
            <div className="lp-pricing-popular">{isJa ? '人気' : 'Most popular'}</div>
            <div className="lp-pricing-tier">Pro</div>
            <div className="lp-pricing-price">¥780</div>
            {copy.proItems.map(item => (
              <div key={item.label} className="lp-pricing-item">
                <span className="lp-pricing-check">✓</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-final-cta-section lp-reveal">
        <div className="lp-final-mascot">
          <img src={brand.iconPath} alt="" aria-hidden="true" style={{ width: 30, height: 30, objectFit: 'contain' }} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, marginBottom: 8 }}>
          {copy.finalTitle}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 22 }}>
          {copy.finalSub}
        </div>
        <button className="btn btn-primary" onClick={onTryFree} style={{ width: '100%', fontSize: 15, marginBottom: 10 }}>
          {copy.finalCta}
        </button>
        <button className="btn btn-ghost" onClick={() => onOpenPricing?.()} style={{ width: '100%' }}>
          {copy.pricingLink}
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <a href="#" onClick={e => { e.preventDefault(); onOpenPrivacy(); }}>{copy.footer.privacy}</a>
        <a href="#" onClick={e => { e.preventDefault(); onOpenTerms(); }}>{copy.footer.terms}</a>
        <a href="#" onClick={e => { e.preventDefault(); onOpenSupport?.(); }}>{copy.footer.contact}</a>
      </footer>
    </div>
  );
}
