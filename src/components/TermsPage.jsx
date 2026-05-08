const CONTENT = {
  en: {
    title: 'Terms of Service',
    intro: 'These placeholder terms explain the basics of using PassAI.',
    body: [
      'Use PassAI responsibly and do not upload content you do not have the right to use.',
      'Free and Pro access may change as the product evolves.',
      'We may update these terms as the service grows.',
    ],
  },
  ja: {
    title: '利用規約',
    intro: 'このページは、PassAI の利用に関する基本方針のプレースホルダーです。',
    body: [
      'PassAI は責任を持って利用し、権利のないコンテンツはアップロードしないでください。',
      'Free / Pro の内容は、サービス改善にあわせて変更される場合があります。',
      'サービスの成長にあわせて、利用規約を更新することがあります。',
    ],
  },
};

export default function TermsPage({ locale, onBack, onOpenAuth }) {
  const copy = CONTENT[locale] ?? CONTENT.en;

  return (
    <div className="legal-page">
      <div className="legal-topbar">
        <button className="legal-back" onClick={onBack}>← {locale === 'ja' ? '戻る' : 'Back'}</button>
        <button className="btn btn-ghost legal-auth" onClick={onOpenAuth}>
          {locale === 'ja' ? 'サインイン' : 'Sign in'}
        </button>
      </div>
      <article className="legal-card">
        <h1>{copy.title}</h1>
        <p className="legal-intro">{copy.intro}</p>
        <div className="legal-copy">
          {copy.body.map((item, index) => <p key={index}>{item}</p>)}
        </div>
      </article>
    </div>
  );
}
