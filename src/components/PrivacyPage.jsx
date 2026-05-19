const CONTENT = {
  en: {
    title: 'Privacy Policy',
    intro: 'This page explains how PassAI handles student data in a clear, simple way.',
    sections: [
      {
        title: 'Information we collect',
        body: [
          'Account information such as your email address and sign-in details.',
          'Files you upload, study prompts, generated summaries, flashcards, quizzes, and related content.',
          'Usage information such as generation counts, plan status, and basic security logs.',
          'Subscription and payment status. PassAI does not sell user data.',
        ],
      },
      {
        title: 'How we use data',
        body: [
          'To generate study material and show your history.',
          'To maintain accounts, usage limits, and subscriptions.',
          'To improve reliability, security, and fraud prevention.',
        ],
      },
      {
        title: 'AI processing',
        body: [
          'Uploads and prompts may be processed through AI providers to create the study material you request.',
          'We use that processing only to provide the service and related features.',
        ],
      },
      {
        title: 'Storage and security',
        body: [
          'We use reasonable technical and organizational safeguards to protect data.',
          'No online service can promise absolute security, but we work to keep your data safe.',
        ],
      },
      {
        title: 'Payments',
        body: [
          'Payments are handled by Stripe.',
          'PassAI does not store full card details on its own servers.',
        ],
      },
      {
        title: 'Your rights',
        body: [
          'You can contact support to request account help or deletion of your data, subject to applicable law and technical limits.',
        ],
      },
      {
        title: 'Updates',
        body: [
          'We may update this policy when the product changes. The latest version will always be available on this page.',
        ],
      },
    ],
  },
  ja: {
    title: 'プライバシーポリシー',
    intro: 'PassAI が学生データをどう扱うかを、わかりやすくまとめたページです。',
    sections: [
      {
        title: '収集する情報',
        body: [
          'メールアドレスなどのアカウント情報。',
          'アップロードしたファイル、学習の入力内容、生成された要約・カード・クイズ。',
          '利用回数、プラン状態、基本的なセキュリティログ。',
          'サブスクリプションや支払い状況。PassAI はユーザーデータを販売しません。',
        ],
      },
      {
        title: 'データの使い方',
        body: [
          '学習素材を生成し、履歴を表示するため。',
          'アカウント、利用上限、サブスク管理のため。',
          '安定性の改善、セキュリティ、不正利用の防止のため。',
        ],
      },
      {
        title: 'AI 処理',
        body: [
          'アップロード内容や入力内容は、学習素材を作るために AI 事業者で処理される場合があります。',
          'その処理は、依頼された機能を提供する目的に限って使います。',
        ],
      },
      {
        title: '保存とセキュリティ',
        body: [
          'PassAI は、データ保護のために合理的な技術的・組織的対策を行います。',
          'ただし、オンラインサービスである以上、絶対的な安全を保証することはできません。',
        ],
      },
      {
        title: '支払い',
        body: [
          '支払い処理は Stripe が担当します。',
          'PassAI はカード番号全体を自前で保存しません。',
        ],
      },
      {
        title: 'ユーザーの権利',
        body: [
          'アカウントの確認・削除などの相談はサポートへご連絡ください。',
        ],
      },
      {
        title: '更新',
        body: [
          'サービスの変更に合わせて、このポリシーを更新することがあります。最新版はこのページに掲載します。',
        ],
      },
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
