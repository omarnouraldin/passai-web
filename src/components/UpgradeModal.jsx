const FREE_LIMIT = 5;

export default function UpgradeModal({
  used = 5,
  limit = FREE_LIMIT,
  resetAt,
  isJapanese,
  onClose,
  onUpgrade,
}) {
  const resetDate = resetAt ? new Date(resetAt) : null;
  const resetStr  = resetDate
    ? resetDate.toLocaleDateString(isJapanese ? 'ja-JP' : 'en-US', { month: 'long', day: 'numeric' })
    : null;

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
        maxWidth: 360, width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>

        {/* Icon + Title */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🚀</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
            {isJapanese ? '今月の無料枠を使い切りました' : 'Free limit reached'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
            {isJapanese
              ? `無料プランは月${limit}回まで。Proにアップグレードして無制限に使いましょう。`
              : `Free plan includes ${limit} generations/month. Upgrade to Pro for unlimited access.`}
          </div>
        </div>

        {/* Usage bar */}
        <div style={{ marginBottom: 20 }}>
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
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 20,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        }}>
          {[
            [isJapanese ? '月5回' : '5/month',     isJapanese ? '無制限' : 'Unlimited'],
            [isJapanese ? 'Haikuモデル' : 'Haiku model', isJapanese ? 'Sonnetモデル' : 'Sonnet model'],
            [isJapanese ? '試験モード ✗' : 'Exam mode ✗', isJapanese ? '試験モード ✓' : 'Exam mode ✓'],
          ].map(([free, pro], i) => (
            <>
              <div key={`f${i}`} style={{ fontSize: 13, color: 'var(--text-2)', padding: '3px 0' }}>
                {free}
              </div>
              <div key={`p${i}`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', padding: '3px 0' }}>
                ✦ {pro}
              </div>
            </>
          ))}
        </div>

        {/* CTA */}
        <button
          className="btn btn-primary"
          style={{ width: '100%', fontSize: 15, fontWeight: 800, marginBottom: 10 }}
          onClick={() => (onUpgrade ? onUpgrade() : onClose())}
        >
          {isJapanese ? '🚀 Proにアップグレード — ¥800/月' : '🚀 Upgrade to Pro — ¥800/month'}
        </button>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', fontSize: 14 }}
          onClick={onClose}
        >
          {isJapanese ? '後で' : 'Maybe later'}
        </button>
      </div>
    </div>
  );
}
