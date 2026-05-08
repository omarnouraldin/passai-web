const CONTENT = {
  en: {
    title: 'Privacy Policy',
    intro: 'This placeholder explains how PassAI may handle account data, uploads, and usage information.',
    body: [
      'We only use your data to provide the service, improve reliability, and keep your account working.',
      'Uploaded notes and generated study content may be stored to show history and support your account.',
      'Authentication is handled by Supabase. Please review Supabase and browser privacy settings as needed.',
    ],
  },
  ja: {
    title: 'プライバシーポリシー',
    intro: 'このページは、PassAI がアカウント情報・アップロードデータ・利用情報をどのように扱うかの概要です。',
    body: [
      '収集したデータは、サービス提供、安定性の向上、アカウント機能の維持のために使います。',
      'アップロードしたノートや生成結果は、履歴表示やアカウント連携のために保存される場合があります。',
      '認証は Supabase を利用しています。必要に応じて Supabase 側の設定も確認してください。',
    ],
  },
};

export default function PrivacyPage({ locale, onBack, onOpenAuth }) {
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
