const COPY = {
  en: {
    title: 'AI Disclaimer',
    intro: 'PassAI helps students study faster, but AI can make mistakes.',
    body: [
      'Always review summaries, explanations, quiz answers, and generated study material before using them for study decisions.',
      'PassAI is designed to support learning, not to replace your own judgment, teachers, or official course materials.',
      'If something looks wrong, please check the source material or ask support.',
    ],
  },
  ja: {
    title: 'AI 利用について',
    intro: 'PassAI は学習を速くしますが、AI は間違うことがあります。',
    body: [
      '要約、解説、クイズ、生成された学習素材は、必ず自分で確認してから使ってください。',
      'PassAI は学習を助けるためのツールであり、自分の判断や授業資料の代わりではありません。',
      'おかしいと思ったら、元の資料を確認するかサポートへご連絡ください。',
    ],
  },
};

export default function AIDisclaimerPage({ locale, onBack, onOpenSupport }) {
  const copy = COPY[locale] ?? COPY.en;

  return (
    <div className="legal-page">
      <div className="legal-topbar">
        <button className="legal-back" onClick={onBack}>← {locale === 'ja' ? '戻る' : 'Back'}</button>
        <button className="btn btn-ghost legal-auth" onClick={onOpenSupport}>
          {locale === 'ja' ? 'サポート' : 'Support'}
        </button>
      </div>
      <article className="legal-card">
        <h1>{copy.title}</h1>
        <p className="legal-intro">{copy.intro}</p>
        <div className="legal-copy">
          {copy.body.map((item, index) => <p key={index}>{item}</p>)}
        </div>
        <div className="legal-meta">Effective date: May 19, 2026</div>
      </article>
    </div>
  );
}
