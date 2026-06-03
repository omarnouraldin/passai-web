import { useAuth } from '../contexts/AuthContext.jsx';

export default function SettingsModal({
  language, setLanguage,
  furigana, setFurigana,
  isJapanese, onClose, onOpenAuth,
  adminModel, setAdminModel,
  onToggleSelfPro,
  onUpgrade,
  onManageBilling,
  onOpenPricing,
  onOpenPrivacy,
  onOpenTerms,
  onOpenDisclaimer,
  onOpenSupport,
}) {
  const { user, isPro, isAdmin, generationsUsed, signOut, enabled } = useAuth();
  const FREE_LIMIT = 5;
  const usagePct   = Math.min(100, (generationsUsed / FREE_LIMIT) * 100);
  const usageColor = usagePct >= 100 ? 'var(--color-red)' : usagePct >= 60 ? 'var(--color-amber)' : 'var(--accent)';
  const planStatus = isPro ? (isJapanese ? 'Proプラン' : 'Pro plan') : (isJapanese ? 'Freeプラン' : 'Free plan');
  const planSub = isPro
    ? (isJapanese ? '請求管理とPro機能が使えます。' : 'Billing management and Pro features are available.')
    : (isJapanese ? '無料枠を使いながら、必要なときにアップグレードできます。' : 'Use the free tier and upgrade when you need more room.');
  const proBenefits = isJapanese
    ? ['より高性能なモデル', '試験モード', 'より詳しい解説']
    : ['Stronger AI model', 'Exam Mode', 'Richer explanations'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{isJapanese ? '設定' : 'Settings'}</div>

        {/* Plan summary */}
        <div className="settings-plan-card">
          <div className="settings-plan-top">
            <div>
              <div className="settings-plan-label">{isJapanese ? '現在のプラン' : 'Current plan'}</div>
              <div className="settings-plan-title">{planStatus}</div>
            </div>
            <div className={`settings-plan-pill ${isPro ? 'pro' : 'free'}`}>
              {isPro ? 'PRO' : 'FREE'}
            </div>
          </div>
          <div className="settings-plan-sub">{planSub}</div>

          {isPro ? (
            <div className="settings-plan-meta">
              <div className="settings-plan-meta-row">
                <span className="settings-plan-meta-label">{isJapanese ? '請求状態' : 'Subscription'}</span>
                <span className="settings-plan-meta-value">{isJapanese ? '有効' : 'Active'}</span>
              </div>
              <div className="settings-plan-bullets">
                {proBenefits.map(item => (
                  <div key={item} className="settings-plan-bullet">✓ {item}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="settings-plan-meta">
              <div className="settings-usage-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                    {isJapanese ? '今月の使用回数' : 'Monthly usage'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: usageColor }}>
                    {generationsUsed} / {FREE_LIMIT}
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${usagePct}%`,
                    background: usageColor, borderRadius: 99,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-2)' }}>
                  <span>{isJapanese ? '無料枠' : 'Free usage'}</span>
                  <span>{FREE_LIMIT - generationsUsed > 0 ? `${FREE_LIMIT - generationsUsed} ${isJapanese ? '回残り' : 'left'}` : (isJapanese ? '上限到達' : 'Limit reached')}</span>
                </div>
              </div>
              <div className="settings-plan-bullets">
                {proBenefits.map(item => (
                  <div key={item} className="settings-plan-bullet">• {item}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Language */}
        <div className="setting-row">
          <div>
            <div className="setting-label">{isJapanese ? '言語' : 'Language'}</div>
          </div>
          <div className="seg-control">
            <button
              className={`seg-btn ${language === 'english' ? 'active' : ''}`}
              onClick={() => setLanguage('english')}
            >
              EN
            </button>
            <button
              className={`seg-btn ${language === 'japanese' ? 'active' : ''}`}
              onClick={() => setLanguage('japanese')}
            >
              日本語
            </button>
          </div>
        </div>

        {/* Furigana — only shown in Japanese mode */}
        {isJapanese && (
          <div className="setting-row">
            <div>
              <div className="setting-label">ふりがな</div>
              <div className="setting-sub">難しい漢字の読み仮名を表示</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={furigana}
                onChange={e => setFurigana(e.target.checked)}
              />
              <span className="toggle-track" />
            </label>
          </div>
        )}

        {/* Account section */}
        {enabled && (
          <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
            <div className="setting-label">{isJapanese ? 'アカウント' : 'Account'}</div>
            {user ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--muted)', wordBreak: 'break-all' }}>
                  {isJapanese ? 'ログイン中: ' : 'Signed in as '}
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{user.email}</span>
                </div>

                {!isPro && (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', height: 42, fontSize: 14 }}
                    onClick={onUpgrade}
                  >
                    {isJapanese ? 'Pro にアップグレード' : 'Upgrade / Go Pro'}
                  </button>
                )}

                {!isPro && (
                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%', height: 38, fontSize: 13 }}
                    onClick={() => (onOpenPricing ? onOpenPricing() : onClose())}
                  >
                    {isJapanese ? '料金を見る' : 'View pricing'}
                  </button>
                )}

                {/* Pro badge */}
                {isPro && (
                  <>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'rgba(107,96,255,0.12)', border: '1px solid rgba(107,96,255,0.3)',
                      borderRadius: 50, padding: '4px 12px',
                      fontSize: 12, fontWeight: 700, color: 'var(--accent)',
                    }}>
                      ✦ {isJapanese ? 'Proプラン' : 'Pro plan'}
                    </div>
                    <button
                      className="btn btn-ghost"
                      style={{ width: '100%', height: 38, fontSize: 13 }}
                      onClick={onManageBilling}
                    >
                      {isJapanese ? '請求を管理' : 'Manage billing'}
                    </button>
                  </>
                )}

                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', height: 36, fontSize: 13, opacity: 0.9 }}
                  onClick={async () => { await signOut(); onClose(); }}
                >
                  {isJapanese ? 'ログアウト' : 'Sign out'}
                </button>

                {isAdmin && (
                  <div style={{
                    width: '100%',
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 16,
                    background: 'rgba(107,96,255,0.08)',
                    border: '1px solid rgba(107,96,255,0.18)',
                    display: 'grid',
                    gap: 10,
                  }}>
                    <div className="setting-label">{isJapanese ? 'Admin tools' : 'Admin tools'}</div>
                    <div className="setting-sub">
                      {isJapanese ? '自分のPro状態とテスト用モデルのみ変更できます。' : 'You can only change your own Pro status and test model.'}
                    </div>
                    <button
                      className="btn btn-ghost"
                      style={{ width: '100%', height: 36, fontSize: 13 }}
                      onClick={onToggleSelfPro}
                    >
                      {isPro ? (isJapanese ? 'Freeにする' : 'Set Free') : (isJapanese ? 'Proにする' : 'Set Pro')}
                    </button>
                    <select
                      value={adminModel}
                      onChange={e => setAdminModel(e.target.value)}
                      style={{
                        width: '100%',
                        height: 38,
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                        color: 'var(--text)',
                        padding: '0 12px',
                      }}
                    >
                      <option value="gpt-5.4-mini">gpt-5.4-mini</option>
                      <option value="gpt-5.4">gpt-5.4</option>
                      <option value="gpt-5.5">gpt-5.5</option>
                    </select>
                  </div>
                )}
              </>
            ) : (
              <button
                className="btn btn-primary"
                style={{ width: '100%', height: 36, fontSize: 13 }}
                onClick={onOpenAuth}
              >
                {isJapanese ? 'サインイン / 新規登録' : 'Sign in / Sign up'}
              </button>
            )}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onClose}>
            {isJapanese ? '閉じる' : 'Done'}
          </button>
        </div>

        <div className="settings-footer-links">
          <button className="settings-footer-link" onClick={onOpenPrivacy}>{isJapanese ? 'プライバシー' : 'Privacy'}</button>
          <button className="settings-footer-link" onClick={onOpenTerms}>{isJapanese ? '利用規約' : 'Terms'}</button>
          <button className="settings-footer-link" onClick={onOpenDisclaimer}>{isJapanese ? 'AIについて' : 'AI Disclaimer'}</button>
          <button className="settings-footer-link" onClick={onOpenSupport}>{isJapanese ? 'サポート' : 'Support'}</button>
        </div>
      </div>
    </div>
  );
}
