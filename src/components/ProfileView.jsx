import { useAuth } from '../contexts/AuthContext.jsx';

export default function ProfileView({
  language, setLanguage,
  furigana, setFurigana,
  isJapanese,
  onUpgrade,
  onManageBilling,
  onOpenPricing,
  onOpenPrivacy,
  onOpenTerms,
  onOpenDisclaimer,
  onOpenSupport,
  adminModel, setAdminModel,
  onToggleSelfPro,
  onBack,
}) {
  const { user, isPro, isAdmin, generationsUsed, signOut, enabled } = useAuth();
  const FREE_LIMIT = 5;
  const usedCapped = Math.min(generationsUsed, FREE_LIMIT);
  const usagePct   = Math.round((usedCapped / FREE_LIMIT) * 100);
  const nearLimit  = generationsUsed >= FREE_LIMIT - 1;
  const usageColor = generationsUsed >= FREE_LIMIT ? 'var(--danger)' : nearLimit ? 'var(--color-amber)' : 'var(--accent)';

  const displayName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || (isJapanese ? 'ユーザー' : 'User');
  const avatarLetter = displayName[0]?.toUpperCase() ?? '?';

  async function handleSignOut() {
    await signOut();
    onBack();
  }

  return (
    <div className="pv-page">

      {/* Header */}
      <div className="pv-header">
        <h1 className="pv-title">{isJapanese ? 'プロフィール' : 'Profile'}</h1>
        <button className="pv-close-btn" onClick={onBack} aria-label="Back">‹</button>
      </div>

      {/* User card */}
      {user && (
        <div className="pv-user-card">
          <div className="pv-avatar">{avatarLetter}</div>
          <div className="pv-user-info">
            <p className="pv-user-name">{displayName}</p>
            <p className="pv-user-email">{user.email}</p>
            <span className={`pv-plan-badge ${isPro ? 'pro' : 'free'}`}>
              {isPro ? '👑 Pro' : (isJapanese ? '無料プラン' : 'Free plan')}
            </span>
          </div>
        </div>
      )}

      {/* Usage + upgrade (free only) */}
      {user && !isPro && (
        <div className="pv-usage-card">
          <div className="pv-usage-row">
            <span className="pv-usage-label">
              {isJapanese ? '今月の使用回数' : 'Monthly usage'}
            </span>
            <span className="pv-usage-count" style={{ color: usageColor }}>
              {generationsUsed} / {FREE_LIMIT}
            </span>
          </div>
          <div className="pv-usage-bar">
            <div className="pv-usage-fill" style={{ width: `${usagePct}%`, background: usageColor }} />
          </div>
          <div className="pv-upgrade-block">
            <div className="pv-upgrade-head">
              <span style={{ fontSize: 18 }}>👑</span>
              <p className="pv-upgrade-title">PassAI Pro</p>
            </div>
            <p className="pv-upgrade-sub">
              {isJapanese
                ? '無制限の生成・高精度GPT-4・優先処理'
                : 'Unlimited generations, GPT-4 accuracy, priority processing'}
            </p>
            <button className="pv-upgrade-btn" onClick={onUpgrade}>
              {isJapanese ? 'アップグレード · ¥800/月' : 'Upgrade to Pro · ¥800/month'}
            </button>
          </div>
        </div>
      )}

      {/* Pro billing (pro only) */}
      {user && isPro && (
        <div className="pv-settings-card" style={{ marginBottom: 12 }}>
          <div className="pv-settings-row">
            <span className="pv-settings-icon">💳</span>
            <div className="pv-settings-body">
              <p className="pv-settings-label">{isJapanese ? 'サブスクリプション' : 'Subscription'}</p>
              <p className="pv-settings-sub">{isJapanese ? 'Proプラン · ¥800/月' : 'Pro plan · ¥800/month'}</p>
            </div>
            <div className="pv-settings-right">
              <button className="pv-billing-btn" onClick={onManageBilling}>
                {isJapanese ? '管理' : 'Manage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      <p className="pv-section-title">{isJapanese ? '設定' : 'Settings'}</p>
      <div className="pv-settings-card">

        {/* Language */}
        <div className="pv-settings-row">
          <span className="pv-settings-icon">🌐</span>
          <div className="pv-settings-body">
            <p className="pv-settings-label">{isJapanese ? '言語' : 'Language'}</p>
            <p className="pv-settings-sub">{isJapanese ? '出力言語とOCRモード' : 'Output language and OCR mode'}</p>
          </div>
          <div className="pv-settings-right">
            <div className="pv-lang-seg">
              <button className={`pv-lang-btn${language === 'english' ? ' active' : ''}`} onClick={() => setLanguage('english')}>EN</button>
              <button className={`pv-lang-btn${language === 'japanese' ? ' active' : ''}`} onClick={() => setLanguage('japanese')}>JP</button>
            </div>
          </div>
        </div>

        {/* Furigana — Japanese mode only */}
        {language === 'japanese' && (
          <div className="pv-settings-row">
            <span className="pv-settings-icon">あ</span>
            <div className="pv-settings-body">
              <p className="pv-settings-label">ふりがな</p>
              <p className="pv-settings-sub">漢字の読み仮名を表示</p>
            </div>
            <div className="pv-settings-right">
              <button
                className={`uv-toggle${furigana ? ' on' : ''}`}
                onClick={() => setFurigana(f => !f)}
                aria-label="Toggle furigana"
              >
                <div className="uv-toggle-thumb" />
              </button>
            </div>
          </div>
        )}

        {/* Notifications (placeholder) */}
        <div className="pv-settings-row">
          <span className="pv-settings-icon">🔔</span>
          <div className="pv-settings-body">
            <p className="pv-settings-label">{isJapanese ? '通知' : 'Notifications'}</p>
            <p className="pv-settings-sub">{isJapanese ? '近日公開予定' : 'Coming soon'}</p>
          </div>
          <div className="pv-settings-right">
            <span className="pv-chevron">›</span>
          </div>
        </div>

        {/* Privacy */}
        <div className="pv-settings-row" style={{ cursor: 'pointer' }} onClick={onOpenPrivacy}>
          <span className="pv-settings-icon">🔒</span>
          <div className="pv-settings-body">
            <p className="pv-settings-label">{isJapanese ? 'プライバシー' : 'Privacy'}</p>
          </div>
          <div className="pv-settings-right">
            <span className="pv-chevron">›</span>
          </div>
        </div>

        {/* Support */}
        <div className="pv-settings-row" style={{ cursor: 'pointer' }} onClick={onOpenSupport}>
          <span className="pv-settings-icon">💬</span>
          <div className="pv-settings-body">
            <p className="pv-settings-label">{isJapanese ? 'サポート' : 'Support'}</p>
          </div>
          <div className="pv-settings-right">
            <span className="pv-chevron">›</span>
          </div>
        </div>

      </div>

      {/* Admin panel */}
      {isAdmin && (
        <>
          <p className="pv-section-title">Admin tools</p>
          <div className="pv-admin-panel">
            <p className="pv-admin-title">Admin tools</p>
            <p className="pv-admin-sub">
              {isJapanese ? '自分のPro状態とテスト用モデルを変更できます。' : 'Change your own Pro status and test model.'}
            </p>
            <button className="hv-manage-btn" style={{ width: '100%', textAlign: 'center', padding: '9px' }} onClick={onToggleSelfPro}>
              {isPro ? (isJapanese ? 'Freeに変更' : 'Set to Free') : (isJapanese ? 'Proに変更' : 'Set to Pro')}
            </button>
            <select
              className="pv-admin-select"
              value={adminModel}
              onChange={e => setAdminModel(e.target.value)}
            >
              <option value="gpt-5.4-mini">gpt-5.4-mini (free)</option>
              <option value="gpt-5.4">gpt-5.4 (pro)</option>
              <option value="gpt-5.5">gpt-5.5 (admin)</option>
            </select>
          </div>
        </>
      )}

      {/* Sign out */}
      {user && (
        <button className="pv-signout-btn" onClick={handleSignOut}>
          🚪 {isJapanese ? 'ログアウト' : 'Sign out'}
        </button>
      )}

      {/* Sign in (not logged in) */}
      {!user && enabled && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 14 }}>
            {isJapanese ? 'サインインしてPassAIを使い始めましょう' : 'Sign in to start using PassAI'}
          </p>
        </div>
      )}

      {/* Footer links */}
      <div className="pv-footer">
        <button className="pv-footer-link" onClick={onOpenPrivacy}>{isJapanese ? 'プライバシー' : 'Privacy'}</button>
        <button className="pv-footer-link" onClick={onOpenTerms}>{isJapanese ? '利用規約' : 'Terms'}</button>
        <button className="pv-footer-link" onClick={onOpenDisclaimer}>{isJapanese ? 'AIについて' : 'AI disclaimer'}</button>
        <button className="pv-footer-link" onClick={onOpenSupport}>{isJapanese ? 'サポート' : 'Support'}</button>
        {!isPro && (
          <button className="pv-footer-link" onClick={onOpenPricing} style={{ color: 'var(--accent)' }}>
            {isJapanese ? '料金プラン' : 'Pricing'}
          </button>
        )}
      </div>
      <p className="pv-version">PassAI v1.0.0</p>

    </div>
  );
}
