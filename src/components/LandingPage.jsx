import { getBrandWordmark, getBrandTagline } from '../lib/branding.js';

const CONTENT = {
  en: {
    heroTitle: 'Turn your class notes into summaries, flashcards, and quizzes.',
    heroBody: 'Upload notes, PDFs, DOCX, or images and get simple study material in seconds.',
    heroCta: 'Try PassAI Free',
    signIn: 'Sign in / Sign up',
    whyTitle: 'Why students use PassAI',
    whyBody: 'Built for quick revision and mobile-first study sessions.',
    benefits: [
      { title: 'Upload anything', body: 'Notes, PDFs, DOCX, or images all work in one flow.' },
      { title: 'Easy summaries', body: 'Simple explanations with furigana support for Japanese study.' },
      { title: 'Practice fast', body: 'Study with flashcards and quizzes without extra setup.' },
    ],
    previewTitle: 'Preview the study flow',
    previewBody: 'Clean, quick, and built for phone screens.',
    mockupTitle: 'Weekly lecture notes',
    freeTitle: 'Free',
    proTitle: 'Pro',
    footer: { privacy: 'Privacy', terms: 'Terms', contact: 'Support' },
    nav: '日本語',
  },
  ja: {
    heroTitle: '授業ノートを、要約・フラッシュカード・クイズに変換。',
    heroBody: 'ノート、PDF、DOCX、画像をアップロードして、すぐに学習素材を作成できます。',
    heroCta: 'PassAI を無料で試す',
    signIn: 'サインイン / 新規登録',
    whyTitle: 'PassAI が選ばれる理由',
    whyBody: '日本の大学生や留学生向けに、スマホでも使いやすく作っています。',
    benefits: [
      { title: '何でもアップロード', body: 'ノート、PDF、DOCX、画像をまとめて扱えます。' },
      { title: 'やさしい要約', body: 'ふりがな対応で、読みやすい学習内容にします。' },
      { title: 'すぐ練習', body: 'フラッシュカードとクイズで、すぐ復習できます。' },
    ],
    previewTitle: '学習の流れを見る',
    previewBody: 'シンプルで、スマホでも見やすい画面です。',
    mockupTitle: '今週の講義ノート',
    freeTitle: 'Free',
    proTitle: 'Pro',
    footer: { privacy: 'プライバシー', terms: '利用規約', contact: 'サポート' },
    nav: 'English',
  },
};

export default function LandingPage({
  onTryFree,
  onOpenAuth,
  isJapanese,
  locale,
  onLocaleChange,
  onOpenPrivacy,
  onOpenTerms,
  onOpenPricing,
  onOpenDisclaimer,
  onOpenSupport,
}) {
  const copy = CONTENT[locale] ?? CONTENT.en;
  const brand = getBrandWordmark(locale === 'ja');
  return (
    <div className="landing-page">
      <div className="landing-topbar">
        <div className="landing-brand">
          <div className="logo landing-brand-wordmark">
            <span className="logo-pass">{brand.lead}</span>
            <span className="logo-ai">{brand.suffix}</span>
          </div>
          <div className="landing-brand-sub">{getBrandTagline(locale === 'ja')}</div>
        </div>
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
      <section className="landing-hero">
        <div className="landing-hero-grid">
          <div>
            <div className="landing-hero-kicker">{brand.full}</div>
            <h1>{copy.heroTitle}</h1>
            <p>{copy.heroBody}</p>
          </div>
          <div className="landing-hero-art">
            <img src="/mascot/mascot-reading.png" alt={brand.full} className="landing-mascot" />
          </div>
        </div>
        <div className="landing-cta-row">
          <button className="btn btn-primary landing-cta" onClick={onTryFree}>
            {copy.heroCta}
          </button>
          <button className="btn btn-ghost landing-secondary" onClick={onOpenAuth}>
            {copy.signIn}
          </button>
          <button className="btn btn-ghost landing-secondary" onClick={() => onOpenPricing?.()}>
            {locale === 'ja' ? '料金を見る' : 'View pricing'}
          </button>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <h2>{copy.whyTitle}</h2>
          <p>{copy.whyBody}</p>
        </div>
        <div className="benefits-grid">
          {copy.benefits.map((item, index) => (
            <article className="benefit-card" key={item.title}>
              <span className="benefit-icon">{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section mockup-section">
        <div className="section-heading">
          <h2>{copy.previewTitle}</h2>
          <p>{copy.previewBody}</p>
        </div>
        <div className="mockup-card">
          <div className="mockup-header">
            <span className="mockup-dot" />
            <span className="mockup-dot" />
            <span className="mockup-dot" />
          </div>
          <div className="mockup-body">
            <div className="mockup-title">{copy.mockupTitle}</div>
            <div className="mockup-shell">
              <div className="mockup-shell-copy">
                <div className="mockup-line long" />
                <div className="mockup-line" />
                <div className="mockup-line short" />
              </div>
              <img src="/mascot/mascot-loading.png" alt="" className="mockup-shell-mascot" />
            </div>
            <div className="mockup-line long" />
            <div className="mockup-line" />
            <div className="mockup-line short" />
            <div className="mockup-pill-row">
              <span className="mockup-pill">Summary</span>
              <span className="mockup-pill">Flashcards</span>
              <span className="mockup-pill">Quiz</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <h2>{locale === 'ja' ? 'Free と Pro' : 'Free vs Pro'}</h2>
          <p>{locale === 'ja' ? 'まずは無料で試して、必要になったら Pro にアップグレードできます。' : 'Start free, upgrade later if you want more power.'}</p>
        </div>
        <div className="pricing-grid">
          <article className="pricing-card">
            <div className="pricing-label">{copy.freeTitle}</div>
            <div className="pricing-value">{locale === 'ja' ? '月5回まで' : '5 generations/month'}</div>
            <ul>
              <li>{locale === 'ja' ? 'まずは試すのに十分' : 'Good for trying the app'}</li>
              <li>{locale === 'ja' ? '要約・フラッシュカード対応' : 'Study summaries and flashcards'}</li>
              <li>{locale === 'ja' ? 'スマホでも使いやすい' : 'Mobile-friendly study sessions'}</li>
            </ul>
          </article>
          <article className="pricing-card featured">
            <div className="pricing-label">{copy.proTitle}</div>
            <div className="pricing-value">{locale === 'ja' ? 'より高い上限' : 'Higher limit'}</div>
            <ul>
              <li>{locale === 'ja' ? 'より高性能なモデル' : 'Better model quality'}</li>
              <li>{locale === 'ja' ? '試験モード' : 'Exam mode'}</li>
              <li>{locale === 'ja' ? 'たくさん使う人向け' : 'More room for heavy study use'}</li>
            </ul>
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <a href="#" onClick={e => { e.preventDefault(); onOpenPrivacy(); }}>{copy.footer.privacy}</a>
        <a href="#" onClick={e => { e.preventDefault(); onOpenTerms(); }}>{copy.footer.terms}</a>
        <a href="#" onClick={e => { e.preventDefault(); onOpenDisclaimer?.(); }}>{locale === 'ja' ? 'AIについて' : 'AI Disclaimer'}</a>
        <a href="#" onClick={e => { e.preventDefault(); onOpenPricing?.(); }}>{locale === 'ja' ? '料金' : 'Pricing'}</a>
        <a href="#" onClick={e => { e.preventDefault(); onOpenSupport?.(); }}>{copy.footer.contact}</a>
      </footer>
    </div>
  );
}
