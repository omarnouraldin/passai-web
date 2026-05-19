const CONTENT = {
  en: {
    title: 'Terms of Service',
    intro: 'These terms explain how to use PassAI in a simple, modern way.',
    sections: [
      {
        title: 'Using PassAI',
        body: ['PassAI is provided to help students study faster and stay organized.'],
      },
      {
        title: 'Account responsibility',
        body: ['You are responsible for your account and for keeping your login details secure.'],
      },
      {
        title: 'Acceptable use',
        body: [
          'Do not use PassAI for illegal activity, abuse, scraping, attacks, or misuse of the service.',
          'Do not upload content you do not have the right to use.',
        ],
      },
      {
        title: 'AI-generated content',
        body: [
          'PassAI uses AI to generate summaries, explanations, quizzes, and flashcards.',
          'AI can make mistakes, so always review the output before relying on it for important decisions.',
        ],
      },
      {
        title: 'Subscription and billing',
        body: [
          'Subscriptions renew automatically unless cancelled.',
          'Cancellation timing and refunds are handled according to the billing provider and the applicable policy.',
        ],
      },
      {
        title: 'Availability',
        body: ['The service may change, pause, or improve over time. We may update features as needed.'],
      },
      {
        title: 'Limitation of liability',
        body: ['PassAI is provided as a study tool. To the extent allowed by law, liability is limited.'],
      },
      {
        title: 'Termination',
        body: ['We may suspend or terminate access if there is abuse, fraud, or a serious policy violation.'],
      },
    ],
  },
  ja: {
    title: '利用規約',
    intro: 'PassAI の使い方を、できるだけシンプルにまとめた利用規約です。',
    sections: [
      {
        title: 'PassAI の利用',
        body: ['PassAI は、学生が素早く学習するためのサポートツールです。'],
      },
      {
        title: 'アカウントの責任',
        body: ['アカウントの管理とログイン情報の保護は利用者の責任です。'],
      },
      {
        title: '禁止事項',
        body: [
          '違法行為、悪用、スクレイピング、攻撃、不正利用は禁止です。',
          '権利のないコンテンツはアップロードしないでください。',
        ],
      },
      {
        title: 'AI 生成コンテンツ',
        body: [
          'PassAI は要約、解説、クイズ、フラッシュカードを AI で生成します。',
          'AI は間違うことがあるため、重要な内容は必ず確認してください。',
        ],
      },
      {
        title: 'サブスクリプションと支払い',
        body: [
          'サブスクリプションは、キャンセルされるまで自動更新されます。',
          'キャンセルや返金は、決済事業者と適用ポリシーに従います。',
        ],
      },
      {
        title: 'サービス提供',
        body: ['サービス内容は今後変更・更新されることがあります。'],
      },
      {
        title: '責任の制限',
        body: ['PassAI は学習補助ツールとして提供され、法令の許す範囲で責任は制限されます。'],
      },
      {
        title: '利用停止',
        body: ['不正利用や重大な違反がある場合、利用停止やアカウント停止を行うことがあります。'],
      },
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
          {copy.sections.map(section => (
            <section key={section.title} className="legal-section">
              <h2>{section.title}</h2>
              {section.body.map((item, index) => <p key={index}>{item}</p>)}
            </section>
          ))}
        </div>
        <div className="legal-meta">Effective date: May 19, 2026</div>
      </article>
    </div>
  );
}
