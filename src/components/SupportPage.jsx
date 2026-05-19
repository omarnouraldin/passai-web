const COPY = {
  en: {
    title: 'Support',
    intro: 'Need help? Reach out for account issues, billing questions, or bug reports.',
    items: [
      ['Email', 'support@passai.app'],
      ['Billing', 'Questions about Pro, checkout, or subscriptions'],
      ['Account', 'Sign-in issues, profile questions, or deletion requests'],
      ['Bugs', 'Anything that feels broken or unclear'],
    ],
  },
  ja: {
    title: 'サポート',
    intro: 'アカウント、請求、バグ報告などはサポートへご連絡ください。',
    items: [
      ['メール', 'support@passai.app'],
      ['請求', 'Pro、決済、サブスクリプションに関する質問'],
      ['アカウント', 'サインイン、プロフィール、削除依頼'],
      ['不具合', '壊れている、わかりにくい、改善してほしい点'],
    ],
  },
};

export default function SupportPage({ locale, onBack, onOpenPrivacy, onOpenTerms, onOpenDisclaimer }) {
  const copy = COPY[locale] ?? COPY.en;

  return (
    <div className="legal-page">
      <div className="legal-topbar">
        <button className="legal-back" onClick={onBack}>← {locale === 'ja' ? '戻る' : 'Back'}</button>
        <div className="legal-link-row">
          <button className="legal-inline-link" onClick={onOpenPrivacy}>{locale === 'ja' ? 'プライバシー' : 'Privacy'}</button>
          <button className="legal-inline-link" onClick={onOpenTerms}>{locale === 'ja' ? '利用規約' : 'Terms'}</button>
          <button className="legal-inline-link" onClick={onOpenDisclaimer}>{locale === 'ja' ? 'AIについて' : 'AI Disclaimer'}</button>
        </div>
      </div>
      <article className="legal-card">
        <h1>{copy.title}</h1>
        <p className="legal-intro">{copy.intro}</p>
        <div className="support-grid">
          {copy.items.map(([label, value]) => (
            <div key={label} className="support-card">
              <div className="support-label">{label}</div>
              <div className="support-value">{value}</div>
            </div>
          ))}
        </div>
        <div className="legal-meta">Effective date: May 19, 2026</div>
      </article>
    </div>
  );
}
