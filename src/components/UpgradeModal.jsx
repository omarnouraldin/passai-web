const FREE_LIMIT = 5;

export default function UpgradeModal({
  used = 5,
  limit = FREE_LIMIT,
  resetAt,
  isJapanese,
  onClose,
  onUpgrade,
  onOpenPricing,
}) {
  const resetDate = resetAt ? new Date(resetAt) : null;
  const resetStr  = resetDate
    ? resetDate.toLocaleDateString(isJapanese ? 'ja-JP' : 'en-US', { month: 'long', day: 'numeric' })
    : null;
  const freeItems = isJapanese
    ? ['月5回の生成', '標準AI', '要約・フラッシュカード・クイズ', '基本OCR/アップロード']
    : ['5 generations/month', 'Standard AI', 'Summary + Flashcards + Quiz', 'Basic OCR/upload'];
  const proItems = isJapanese
    ? ['無制限の生成', '高度AI推論', '試験モード', '難しい内容への強い対応', '今後の機能を優先利用']
    : ['Unlimited generations', 'Advanced AI reasoning', 'Exam Mode', 'Better difficult-subject support', 'Priority future features'];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '28px 24px',
        maxWidth: 420, width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
        maxHeight: 'min(92vh, 760px)', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>

        <div className="upgrade-modal-hero">
          <div className="upgrade-modal-art">
            <img
              src="/mascot/mascot-sleepy.png"
              alt=""
              aria-hidden="true"
            />
          </div>
          <div className="upgrade-modal-copy">
            <div className="upgrade-modal-badge">
              {isJapanese ? 'PassAI Pro' : 'PassAI Pro'}
            </div>
            <div className="upgrade-modal-title">
              {isJapanese ? '今月の無料生成回数を使い切りました' : "You've reached this month's free limit"}
            </div>
            <div className="upgrade-modal-subtitle">
              {isJapanese
                ? `無料プランは月${limit}回まで。Proなら、もっと多くの学習 सामग्रीを、より強いAIで作れます。`
                : `Free includes ${limit} generations per month. Upgrade to Pro for unlimited study material, stronger AI explanations, and Exam Mode.`}
            </div>
          </div>
        </div>

        {/* Usage bar */}
        <div className="upgrade-modal-usage">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {isJapanese ? '今月の使用回数' : 'This month'}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-red)' }}>
              {used}/{limit}
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: '100%',
              background: 'var(--color-red)', borderRadius: 99,
              transition: 'width 0.4s ease',
            }} />
          </div>
          {resetStr && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, textAlign: 'right' }}>
              {isJapanese ? `${resetStr}にリセット` : `Resets ${resetStr}`}
            </div>
          )}
        </div>

        {/* Free vs Pro comparison */}
        <div className="upgrade-modal-compare">
          <div className="upgrade-plan upgrade-plan-free">
            <div className="upgrade-plan-label">{isJapanese ? 'FREE' : 'FREE'}</div>
            <ul>
              {freeItems.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="upgrade-plan upgrade-plan-pro">
            <div className="upgrade-plan-label">{isJapanese ? 'PRO' : 'PRO'}</div>
            <ul>
              {proItems.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="upgrade-modal-ctas">
          <button
            className="btn btn-primary upgrade-modal-primary"
            onClick={() => (onUpgrade ? onUpgrade() : onClose())}
          >
            {isJapanese ? 'Proにアップグレード — ¥800/月' : 'Upgrade to Pro — ¥800/month'}
          </button>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', fontSize: 14 }}
            onClick={() => (onOpenPricing ? onOpenPricing() : onClose())}
          >
            {isJapanese ? '料金を見る' : 'View pricing'}
          </button>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', fontSize: 14, marginTop: 2 }}
            onClick={onClose}
          >
            {isJapanese ? '後で' : 'Maybe later'}
          </button>
        </div>
      </div>
    </div>
  );
}
