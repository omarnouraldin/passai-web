import { getBrandWordmark, getBrandTagline } from '../lib/branding.js';

const CONTENT = {
  en: {
    heroKicker: 'For university students',
    heroTitle: 'Turn long notes and lecture PDFs into a study pack you can actually use.',
    heroBody: 'Upload slides, notes, screenshots, or pasted text. PassAI turns them into a clean Exam Pack with quick summaries, flashcards, quizzes, and Pro exam practice.',
    heroCta: 'Try PassAI',
    heroSecondary: 'Sign in / Sign up',
    pricingLink: 'View pricing',
    problemTitle: 'Studying often feels heavier than it should.',
    problemBody: 'Lecture PDFs are long, notes are messy, and exam review turns into scrolling, highlighting, and guessing what matters.',
    problems: [
      'Long PDFs and slide decks take too long to review.',
      'Class notes, screenshots, and handouts live in different places.',
      'It is hard to turn raw material into quick revision before tests.',
    ],
    howTitle: 'How PassAI works',
    howBody: 'A simple flow built for fast, mobile-friendly revision.',
    steps: [
      { title: 'Upload your notes', body: 'Add PDFs, lecture slides, screenshots, DOCX, or pasted text in one place.' },
      { title: 'AI creates an Exam Pack', body: 'PassAI organizes your material into a calm, readable study pack.' },
      { title: 'Study your weak points', body: 'Review with flashcards, quiz mode, and Pro exam mode when you need more practice.' },
    ],
    featuresTitle: 'What you get',
    featuresBody: 'Made for focused revision, not clutter.',
    features: [
      { title: '30-second summary', body: 'A fast overview of the topic before you dive deeper.', badge: '30 sec' },
      { title: 'Key test points', body: 'Important ideas likely to matter in review and exam prep.', badge: '重点' },
      { title: 'Flashcards', body: 'Quick card review for definitions, terms, and memorization.', badge: 'Cards' },
      { title: 'Quiz', body: 'Short practice questions to check understanding immediately.', badge: 'Quiz' },
      { title: 'Pro exam mode', body: 'Generate a fuller mock exam when you want realistic practice.', badge: 'Pro' },
    ],
    pricingTitle: 'Simple pricing',
    pricingBody: 'Start free, then upgrade if you want more room and exam mode.',
    freeLabel: 'Free',
    freePrice: '¥0',
    freeSub: '5 generations / month',
    freeItems: [
      'Summaries, flashcards, and quiz study flow',
      'Upload PDFs, images, DOCX, and text',
      'Good for trying PassAI and lighter study weeks',
    ],
    proLabel: 'Pro',
    proPrice: '¥800 / month',
    proSub: 'For heavier study use',
    proItems: [
      'Higher-quality model and more room to study',
      'Pro exam mode with mock-exam style practice',
      'Best for regular revision before quizzes and finals',
    ],
    trustTitle: 'Student-friendly and careful',
    trustBody: 'PassAI is built to help you study faster, while keeping the product language clear and grounded.',
    trustItems: [
      'Avoid uploading sensitive personal or confidential data.',
      'AI output can be helpful, but you should still double-check important academic details.',
      'The app is designed to reduce study friction, not replace your own judgment.',
    ],
    finalTitle: 'Start with one note and see if it feels lighter.',
    finalBody: 'Try PassAI on a lecture PDF, class note, or screenshot and turn it into a calmer study session.',
    finalCta: 'Try PassAI',
    footer: { privacy: 'Privacy', terms: 'Terms', contact: 'Support', disclaimer: 'AI Disclaimer', pricing: 'Pricing' },
  },
  ja: {
    heroKicker: '大学生の試験勉強向け',
    heroTitle: '長いPDFや講義ノートを、すぐ使える学習パックに変える。',
    heroBody: '講義スライド、ノート、スクリーンショット、貼り付けテキストをアップロードすると、PassAI が 30秒まとめ・重要ポイント・フラッシュカード・クイズ・Pro試験モードまで整えます。',
    heroCta: '無料で始める',
    heroSecondary: 'サインイン / 新規登録',
    pricingLink: '料金を見る',
    problemTitle: '試験勉強は、必要以上に重くなりがちです。',
    problemBody: '講義PDFは長く、ノートは散らばり、テスト前の復習は「どこが大事か」を探すだけで時間がかかります。',
    problems: [
      '長いPDFやスライドを見返すだけで時間がなくなる',
      'ノート、画像、配布資料がバラバラで整理しにくい',
      '試験前に素早く復習用の形へまとめ直すのが大変',
    ],
    howTitle: 'PassAI の使い方',
    howBody: 'スマホでも使いやすい、シンプルな学習フローです。',
    steps: [
      { title: 'ノートをアップロード', body: 'PDF、講義スライド、スクショ、DOCX、貼り付けテキストをまとめて追加できます。' },
      { title: 'AI が Exam Pack を作成', body: 'PassAI が内容を読み取り、見やすい学習パックへ整理します。' },
      { title: '苦手を復習', body: 'フラッシュカード、クイズ、必要なら Pro の試験モードで実践的に復習できます。' },
    ],
    featuresTitle: '受け取れる内容',
    featuresBody: 'ごちゃごちゃさせず、復習に必要なものだけを整えます。',
    features: [
      { title: '30秒まとめ', body: '最初に全体像をつかむための短い要約。', badge: '30秒' },
      { title: 'テストに出るポイント', body: '復習で押さえたい重要項目を見つけやすくします。', badge: '重要' },
      { title: 'フラッシュカード', body: '用語や定義をテンポよく暗記しやすい形に。', badge: 'Cards' },
      { title: 'クイズ', body: '理解度をその場で確認できる短い問題。', badge: 'Quiz' },
      { title: 'Pro試験モード', body: 'より本番に近い模擬問題で復習したい人向け。', badge: 'Pro' },
    ],
    pricingTitle: 'シンプルな料金',
    pricingBody: 'まずは無料で試して、必要なら Pro にアップグレードできます。',
    freeLabel: 'Free',
    freePrice: '¥0',
    freeSub: '月5回まで',
    freeItems: [
      '要約・フラッシュカード・クイズの学習フロー',
      'PDF・画像・DOCX・テキストのアップロード対応',
      'まず試したい人や軽めの復習にちょうどいい',
    ],
    proLabel: 'Pro',
    proPrice: '¥800 / 月',
    proSub: 'しっかり使いたい人向け',
    proItems: [
      'より高品質なモデルと、より余裕のある学習量',
      '模擬試験に近い Pro 試験モード',
      '小テストや期末前に継続して使いやすい',
    ],
    trustTitle: '学生向けに、わかりやすく慎重に',
    trustBody: 'PassAI は勉強を軽くするためのツールです。説明や注意書きも、できるだけ素直でわかりやすくしています。',
    trustItems: [
      '個人情報や機密性の高い内容はアップロードしないでください。',
      'AIの出力は便利ですが、重要な学習内容は必ず自分でも確認してください。',
      '勉強の負担を減らすための補助であり、判断そのものを置き換えるものではありません。',
    ],
    finalTitle: 'まずは1つのノートで、勉強が少し軽くなるか試してください。',
    finalBody: '講義PDF、授業ノート、スクリーンショットのどれでも大丈夫です。PassAI で見返しやすい形に整えられます。',
    finalCta: '無料で始める',
    footer: { privacy: 'プライバシー', terms: '利用規約', contact: 'サポート', disclaimer: 'AIについて', pricing: '料金' },
  },
};

function FeaturePreview({ locale }) {
  const items = locale === 'ja'
    ? [
        { title: '30秒まとめ', body: '微分の基本概念を短く整理。', accent: 'violet' },
        { title: 'テストに出るポイント', body: '定義・公式・典型問題を整理。', accent: 'blue' },
        { title: 'Flashcards', body: '用語確認をテンポよく。', accent: 'amber' },
      ]
    : [
        { title: '30-second summary', body: 'A quick overview before deeper review.', accent: 'violet' },
        { title: 'Likely test points', body: 'Definitions, formulas, and patterns.', accent: 'blue' },
        { title: 'Flashcards', body: 'Fast term review on one screen.', accent: 'amber' },
      ];

  return (
    <div className="landing-preview-phone">
      <div className="landing-preview-screen">
        <div className="landing-preview-top">
          <div className="landing-preview-brand">PassAI</div>
          <div className="landing-preview-pill">Exam Pack</div>
        </div>
        {items.map(item => (
          <div key={item.title} className={`landing-preview-card ${item.accent}`}>
            <div className="landing-preview-card-title">{item.title}</div>
            <div className="landing-preview-card-body">{item.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const copy = CONTENT[locale] ?? CONTENT.en;
  const brand = getBrandWordmark(locale === 'ja');

  return (
    <div className="landing-page passai-landing-refresh">
      <div className="landing-topbar">
        <div className="landing-brand">
          <div className="brand-orb landing-brand-orb">
            <img src={brand.iconPath} alt={brand.full} className="mascot-icon" />
          </div>
          <div>
            <div className="logo landing-brand-wordmark">
              <span className="logo-pass">{brand.lead}</span>
              <span className="logo-ai">{brand.suffix}</span>
            </div>
            <div className="landing-brand-sub">{getBrandTagline(locale === 'ja')}</div>
          </div>
        </div>

        <div className="landing-topbar-actions">
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
          <button className="btn btn-ghost landing-nav-pricing" onClick={() => onOpenPricing?.()}>
            {copy.pricingLink}
          </button>
        </div>
      </div>

      <section className="landing-hero landing-hero-refined">
        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <div className="landing-hero-kicker">{copy.heroKicker}</div>
            <h1>{copy.heroTitle}</h1>
            <p>{copy.heroBody}</p>
            <div className="landing-cta-row">
              <button className="btn btn-primary landing-cta" onClick={onTryFree}>
                {copy.heroCta}
              </button>
              <button className="btn btn-ghost landing-secondary" onClick={onOpenAuth}>
                {copy.heroSecondary}
              </button>
            </div>
          </div>
          <div className="landing-hero-art">
            <FeaturePreview locale={locale} />
          </div>
        </div>
      </section>

      <section className="landing-section landing-problem-section">
        <div className="section-heading">
          <h2>{copy.problemTitle}</h2>
          <p>{copy.problemBody}</p>
        </div>
        <div className="landing-problem-grid">
          {copy.problems.map(item => (
            <article className="landing-problem-card" key={item}>
              <div className="landing-problem-icon">•</div>
              <div className="landing-problem-text">{item}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-how-section">
        <div className="section-heading">
          <h2>{copy.howTitle}</h2>
          <p>{copy.howBody}</p>
        </div>
        <div className="landing-step-grid">
          {copy.steps.map((step, index) => (
            <article className="landing-step-card" key={step.title}>
              <div className="landing-step-number">{index + 1}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-features-section">
        <div className="section-heading">
          <h2>{copy.featuresTitle}</h2>
          <p>{copy.featuresBody}</p>
        </div>
        <div className="landing-feature-grid">
          {copy.features.map(feature => (
            <article className="landing-feature-card" key={feature.title}>
              <div className="landing-feature-badge">{feature.badge}</div>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-pricing-preview">
        <div className="section-heading">
          <h2>{copy.pricingTitle}</h2>
          <p>{copy.pricingBody}</p>
        </div>
        <div className="pricing-grid">
          <article className="pricing-card">
            <div className="pricing-label">{copy.freeLabel}</div>
            <div className="pricing-value">{copy.freePrice}</div>
            <div className="landing-pricing-sub">{copy.freeSub}</div>
            <ul>
              {copy.freeItems.map(item => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <article className="pricing-card featured">
            <div className="pricing-label">{copy.proLabel}</div>
            <div className="pricing-value">{copy.proPrice}</div>
            <div className="landing-pricing-sub">{copy.proSub}</div>
            <ul>
              {copy.proItems.map(item => <li key={item}>{item}</li>)}
            </ul>
          </article>
        </div>
      </section>

      <section className="landing-section landing-trust-section">
        <div className="section-heading">
          <h2>{copy.trustTitle}</h2>
          <p>{copy.trustBody}</p>
        </div>
        <div className="landing-trust-card">
          {copy.trustItems.map(item => (
            <div className="landing-trust-row" key={item}>
              <span className="landing-trust-check">✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-final-cta">
        <div className="landing-final-copy">
          <h2>{copy.finalTitle}</h2>
          <p>{copy.finalBody}</p>
        </div>
        <div className="landing-cta-row landing-final-actions">
          <button className="btn btn-primary landing-cta" onClick={onTryFree}>
            {copy.finalCta}
          </button>
          <button className="btn btn-ghost landing-secondary" onClick={() => onOpenPricing?.()}>
            {copy.pricingLink}
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <a href="#" onClick={e => { e.preventDefault(); onOpenPrivacy(); }}>{copy.footer.privacy}</a>
        <a href="#" onClick={e => { e.preventDefault(); onOpenTerms(); }}>{copy.footer.terms}</a>
        <a href="#" onClick={e => { e.preventDefault(); onOpenDisclaimer?.(); }}>{copy.footer.disclaimer}</a>
        <a href="#" onClick={e => { e.preventDefault(); onOpenPricing?.(); }}>{copy.footer.pricing}</a>
        <a href="#" onClick={e => { e.preventDefault(); onOpenSupport?.(); }}>{copy.footer.contact}</a>
      </footer>
    </div>
  );
}
