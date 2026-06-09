import { getBrandWordmark, getBrandTagline } from '../lib/branding.js';

const COPY = {
  en: {
    title: 'Clear plans for serious study',
    body: 'Start free, then upgrade when you want higher limits, stronger models, and Exam Mode.',
    back: 'Back',
    free: 'Free',
    freePrice: '5 generations/month',
    freeNote: 'For casual study sessions and quick revision.',
    pro: 'Pro',
    proPrice: '¥780/month',
    proNote: 'Built for heavier study use and deeper explanations.',
    startFree: 'Start Free',
    upgrade: 'Upgrade to Pro',
    current: 'Current plan',
    features: [
      ['Free plan', ['Summaries', 'Flashcards', 'Quizzes', 'Basic OCR / upload']],
      ['Pro plan', ['Higher generation limit', 'Stronger AI model', 'Exam mode', 'Better explanations']],
    ],
    freeBullets: [
      'Limited monthly generations',
      'Summaries, flashcards, quizzes',
      'Basic OCR / upload support',
    ],
    proBullets: [
      'Higher limit for heavier study',
      'Stronger model quality',
      'Exam mode and richer explanations',
    ],
  },
  ja: {
    title: '学習にちょうどいい、わかりやすいプラン',
    body: 'まずは無料で試して、必要になったら上限アップと試験モードを使えます。',
    back: '戻る',
    free: 'Free',
    freePrice: '月5回まで',
    freeNote: 'ちょっとした復習やお試しに。',
    pro: 'Pro',
    proPrice: '¥780/月',
    proNote: 'たくさん使う人向けの学習プラン。',
    startFree: '無料で始める',
    upgrade: 'Proにアップグレード',
    current: '現在のプラン',
    features: [
      ['Free プラン', ['要約', 'フラッシュカード', 'クイズ', '基本OCR / アップロード']],
      ['Pro プラン', ['より高い上限', '強いAIモデル', '試験モード', 'より丁寧な解説']],
    ],
    freeBullets: [
      '月ごとの無料回数つき',
      '要約・カード・クイズ対応',
      '基本OCR / アップロード対応',
    ],
    proBullets: [
      'たくさん使っても安心',
      'より高性能なモデル',
      '試験モードと詳しい解説',
    ],
  },
};

function PlanCard({ title, price, note, bullets, featured = false, cta, onCta, badge, disabled = false }) {
  return (
    <article className={`pricing-card${featured ? ' featured' : ''}`}>
      <div className="pricing-label-row">
        <div className="pricing-label">{title}</div>
        {badge && <span className="pricing-badge">{badge}</span>}
      </div>
      <div className="pricing-value">{price}</div>
      <p className="pricing-note">{note}</p>
      <ul className="pricing-list">
        {bullets.map(item => <li key={item}>{item}</li>)}
      </ul>
      <button className={`btn ${featured ? 'btn-primary' : 'btn-ghost'}`} onClick={onCta} disabled={disabled}>
        {cta}
      </button>
    </article>
  );
}

export default function PricingPage({
  locale = 'en',
  isSignedIn = false,
  isPro = false,
  onBack,
  onStartFree,
  onUpgrade,
  onLocaleChange,
  onOpenPrivacy,
  onOpenTerms,
  onOpenDisclaimer,
  onOpenSupport,
}) {
  const copy = COPY[locale] ?? COPY.en;
  const brand = getBrandWordmark(locale === 'ja');

  return (
    <div className="landing-page pricing-page">
      <div className="landing-topbar pricing-topbar">
        <div className="landing-brand">
          <div className="logo landing-brand-wordmark">
            <span className="logo-pass">{brand.lead}</span>
            <span className="logo-ai">{brand.suffix}</span>
          </div>
          <div className="landing-brand-sub">{getBrandTagline(locale === 'ja')}</div>
        </div>
        <div className="pricing-topbar-actions">
          <button className="btn btn-ghost pricing-back-btn" onClick={onBack}>
            ← {copy.back}
          </button>
          <div className="landing-lang-toggle" role="group" aria-label="Language selector">
            <button
              className={`lang-btn ${locale === 'en' ? 'active' : ''}`}
              onClick={() => onLocaleChange('en')}
            >
              EN
            </button>
            <button
              className={`lang-btn ${locale === 'ja' ? 'active' : ''}`}
              onClick={() => onLocaleChange('ja')}
            >
              日本語
            </button>
          </div>
        </div>
      </div>

      <section className="landing-hero pricing-hero">
        <div className="pricing-hero-badge">{isSignedIn && isPro ? copy.current : brand.full}</div>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <div className="landing-cta-row pricing-cta-row">
          <button className="btn btn-primary landing-cta" onClick={onStartFree}>
            {copy.startFree}
          </button>
          <button className="btn btn-ghost landing-secondary" onClick={onUpgrade}>
            {copy.upgrade}
          </button>
        </div>
      </section>

      <section className="landing-section">
        <div className="pricing-grid">
          <PlanCard
            title={copy.free}
            price={copy.freePrice}
            note={copy.freeNote}
            bullets={copy.freeBullets}
            cta={copy.startFree}
            onCta={onStartFree}
            badge={locale === 'ja' ? 'まずはお試し' : 'Start here'}
          />
          <PlanCard
            title={copy.pro}
            price={copy.proPrice}
            note={copy.proNote}
            bullets={copy.proBullets}
            featured
            cta={isSignedIn && isPro ? copy.current : copy.upgrade}
            onCta={isSignedIn && isPro ? () => {} : onUpgrade}
            badge={isSignedIn && isPro ? copy.current : 'Best for daily study'}
            disabled={isSignedIn && isPro}
          />
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <h2>{locale === 'ja' ? '比較' : 'Compare'}</h2>
          <p>{locale === 'ja' ? '今の使い方に合わせて、必要なときに切り替えられます。' : 'Upgrade only when your study load needs it.'}</p>
        </div>
        <div className="pricing-comparison">
          {copy.features.map(([label, items]) => (
            <div key={label} className="pricing-comparison-card">
              <div className="pricing-label">{label}</div>
              <ul className="pricing-list">
                {items.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer pricing-footer">
        <a href="#" onClick={e => { e.preventDefault(); onOpenPrivacy?.(); }}>{locale === 'ja' ? 'プライバシー' : 'Privacy'}</a>
        <a href="#" onClick={e => { e.preventDefault(); onOpenTerms?.(); }}>{locale === 'ja' ? '利用規約' : 'Terms'}</a>
        <a href="#" onClick={e => { e.preventDefault(); onOpenDisclaimer?.(); }}>{locale === 'ja' ? 'AIについて' : 'AI Disclaimer'}</a>
        <a href="#" onClick={e => { e.preventDefault(); onOpenSupport?.(); }}>{locale === 'ja' ? 'サポート' : 'Support'}</a>
      </footer>
    </div>
  );
}
