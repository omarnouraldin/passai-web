import { useEffect, useState } from 'react';
import SettingsModal from './SettingsModal.jsx';
import AuthModal from './AuthModal.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getBrandWordmark, getBrandTagline } from '../lib/branding.js';

// ── UI helpers ────────────────────────────────────────────────────────────────
function getGreeting(isJapanese) {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return isJapanese ? 'おはようございます' : 'Good morning';
  if (h >= 12 && h < 18) return isJapanese ? 'こんにちは' : 'Good afternoon';
  return isJapanese ? 'こんばんは' : 'Good evening';
}

function formatRelativeDate(dateStr, isJapanese) {
  const d     = new Date(dateStr);
  const diffH = (Date.now() - d) / 3_600_000;
  if (diffH < 1)  return isJapanese ? 'たった今' : 'Just now';
  if (diffH < 24) return isJapanese ? `${Math.floor(diffH)}時間前` : `${Math.floor(diffH)}h ago`;
  const diffD = diffH / 24;
  if (diffD < 2)  return isJapanese ? '昨日' : 'Yesterday';
  if (diffD < 7)  return isJapanese ? `${Math.floor(diffD)}日前` : `${Math.floor(diffD)} days ago`;
  return d.toLocaleDateString(isJapanese ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' });
}

function getPackMeta(content, isJapanese) {
  if (!content) return null;
  const parts = [];
  if (content.questions?.length)  parts.push(isJapanese ? `${content.questions.length}問` : `${content.questions.length} Q`);
  if (content.flashcards?.length) parts.push(isJapanese ? `${content.flashcards.length}枚` : `${content.flashcards.length} cards`);
  if (content.summary)            parts.push(isJapanese ? '要約' : 'summary');
  return parts.join(' · ') || null;
}

const RECENT_COLORS = [
  { bg: 'rgba(107,96,255,0.14)', color: 'var(--accent)' },
  { bg: 'rgba(78,205,196,0.14)', color: '#4ECDC4' },
  { bg: 'rgba(255,181,71,0.14)', color: '#FFB547' },
];

// ── LoginGate ─────────────────────────────────────────────────────────────────
function LoginGate({ isJapanese, onOpenAuth }) {
  const brand = getBrandWordmark(isJapanese);
  return (
    <div className="login-gate">
      <img src={brand.iconPath} alt={brand.full} className="login-gate-mascot" />
      <div className="login-gate-title">
        {isJapanese ? 'ようこそ PassAI へ' : 'Welcome to PassAI'}
      </div>
      <div className="login-gate-sub">
        {isJapanese
          ? 'アプリを使うにはサインインが必要です。アカウントを作成するか、既存のアカウントでログインしてください。'
          : 'Sign in to start turning your notes into study material. It only takes a moment.'}
      </div>
      <button
        className="btn btn-primary"
        style={{ width: '100%', maxWidth: 280 }}
        onClick={onOpenAuth}
      >
        {isJapanese ? 'サインイン / 新規登録' : 'Sign in / Sign up'}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HomeView({
  language, setLanguage,
  furigana, setFurigana,
  isJapanese,
  onUpgrade,
  stripeLoading,
  onManageBilling,
  recentHistory = [],
  onOpenHistoryItem,
  profileOpenSignal = 0,
  adminModel,
  setAdminModel,
  onNewPack,
  onOpenPricing,
  onOpenPrivacy,
  onOpenTerms,
  onOpenDisclaimer,
  onOpenSupport,
}) {
  const { user, isPro, isAdmin, generationsUsed, enabled, getAccessToken, refreshProfile } = useAuth();
  const FREE_LIMIT = 2;
  const brand = getBrandWordmark(isJapanese);

  const [showSettings, setShowSettings] = useState(false);
  const [showAuth,     setShowAuth]     = useState(false);

  const requiresAuth = enabled && !user;

  // Derived
  const displayName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || (isJapanese ? 'ユーザー' : 'there');
  const avatarLetter = displayName[0]?.toUpperCase() ?? '?';

  // Ring progress
  const ringRadius = 18;
  const ringCirc   = 2 * Math.PI * ringRadius;
  const usedCapped = Math.min(generationsUsed, FREE_LIMIT);
  const ringOffset = ringCirc * (1 - usedCapped / FREE_LIMIT);
  const barPct     = Math.round((usedCapped / FREE_LIMIT) * 100);
  const nearLimit  = generationsUsed >= FREE_LIMIT - 1;

  useEffect(() => {
    if (!profileOpenSignal) return;
    setShowSettings(true);
  }, [profileOpenSignal]);

  async function handleToggleSelfPro() {
    if (!isAdmin) return;
    const token = await getAccessToken();
    if (!token) return;
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'set_self_pro', isPro: !isPro }),
    });
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    await refreshProfile({ isAdmin: true, isPro: typeof data?.isPro === 'boolean' ? data.isPro : !isPro });
  }

  return (
    <>
      <div className="hv-page">

        {/* ── Header ── */}
        <div className="hv-header">
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <p className="hv-greeting">{getGreeting(isJapanese)}</p>
            <p className="hv-name">{displayName}</p>
          </div>
          <div className="hv-header-right">
            <button
              className="hv-icon-btn"
              onClick={() => setShowSettings(true)}
              aria-label={isJapanese ? '設定' : 'Settings'}
            >
              🔔
            </button>
            <div
              className="hv-avatar"
              onClick={() => setShowSettings(true)}
              role="button"
              tabIndex={0}
              title={isJapanese ? 'プロフィール' : 'Profile'}
            >
              {avatarLetter}
            </div>
          </div>
        </div>

        {requiresAuth ? (
          <LoginGate isJapanese={isJapanese} onOpenAuth={() => setShowAuth(true)} />
        ) : (
          <>
            {/* ── Usage card (free) ── */}
            {user && !isPro && (
              <div className="hv-usage-card">
                <div className="hv-usage-top">
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <p className="hv-usage-label">{isJapanese ? '無料プラン' : 'Free plan'}</p>
                    <p className="hv-usage-count">
                      {isJapanese
                        ? `今月 ${generationsUsed} / ${FREE_LIMIT} 回使用`
                        : `${generationsUsed} of ${FREE_LIMIT} generations used`}
                    </p>
                  </div>
                  <div className="hv-ring-wrap">
                    <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="24" cy="24" r={ringRadius} fill="none" stroke="var(--border)" strokeWidth="4" />
                      <circle
                        cx="24" cy="24" r={ringRadius} fill="none"
                        stroke={nearLimit ? 'var(--danger)' : 'var(--accent)'}
                        strokeWidth="4"
                        strokeDasharray={ringCirc}
                        strokeDashoffset={ringOffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="hv-ring-label">{generationsUsed}/{FREE_LIMIT}</span>
                  </div>
                </div>
                <div className="hv-bar">
                  <div className={`hv-bar-fill${nearLimit ? ' danger' : ''}`} style={{ width: `${barPct}%` }} />
                </div>
                <button className="hv-upgrade-cta" onClick={onUpgrade} disabled={stripeLoading}>
                  {stripeLoading ? (isJapanese ? '処理中…' : 'Loading…') : `👑 ${isJapanese ? 'Proにアップグレード · ¥780/月' : 'Upgrade to Pro · ¥780/month'}`}
                </button>
              </div>
            )}

            {/* ── Pro card ── */}
            {user && isPro && (
              <div className="hv-pro-card">
                <span style={{ fontSize: 22 }}>👑</span>
                <div className="hv-pro-text">
                  <p className="hv-pro-plan-label">{isJapanese ? 'Proプラン' : 'Pro plan'}</p>
                  <p className="hv-pro-plan-desc">
                    {isJapanese ? '月30回・高精度AI' : '30 generations/month · High-accuracy AI'}
                  </p>
                </div>
                <button className="hv-manage-btn" onClick={onManageBilling}>
                  {isJapanese ? '管理' : 'Manage'}
                </button>
              </div>
            )}

            {/* ── Quick action: New pack ── */}
            <button
              className="hv-generate-btn"
              onClick={onNewPack}
              style={{ marginBottom: 22 }}
            >
              ✨ {isJapanese ? '新しいパックを作る' : 'Create New Pack'}
            </button>

            {/* ── Recent packs ── */}
            {recentHistory.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div className="hv-section-head">
                  <span className="hv-section-title">
                    {isJapanese ? '最近のパック' : 'Recent packs'}
                  </span>
                  <button className="hv-section-link" onClick={() => onOpenHistoryItem?.(null)}>
                    {isJapanese ? 'すべて見る' : 'See all'}
                  </button>
                </div>

                {recentHistory.slice(0, 3).map((item, i) => {
                  const col     = RECENT_COLORS[i % RECENT_COLORS.length];
                  const isImage = item.snippet === '📷 Image';
                  const label   = isImage
                    ? (isJapanese ? '画像から生成' : 'From image')
                    : (item.snippet || (isJapanese ? '学習ノート' : 'Study note'));
                  const meta    = getPackMeta(item.content, isJapanese);
                  const date    = formatRelativeDate(item.date, isJapanese);

                  return (
                    <button
                      key={item.id}
                      className="hv-recent-card"
                      onClick={() => onOpenHistoryItem?.(item)}
                    >
                      <div className="hv-recent-icon" style={{ background: col.bg }}>
                        <span style={{ color: col.color }}>{isImage ? '🖼' : '📝'}</span>
                      </div>
                      <div className="hv-recent-body">
                        <p className="hv-recent-name">{label}</p>
                        <p className="hv-recent-meta">{meta ? `${meta} · ${date}` : date}</p>
                      </div>
                      <span className="hv-recent-arrow">›</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Empty state when no history ── */}
            {recentHistory.length === 0 && user && (
              <div style={{
                textAlign: 'center',
                padding: '32px 16px',
                background: 'var(--card)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>
                  {isJapanese ? 'まだパックがありません' : 'No packs yet'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 16px' }}>
                  {isJapanese ? '最初の学習パックを作ってみましょう' : 'Create your first study pack to get started'}
                </p>
                <button className="hv-upgrade-cta" onClick={onNewPack} style={{ maxWidth: 200, margin: '0 auto' }}>
                  {isJapanese ? '今すぐ作る →' : 'Get started →'}
                </button>
              </div>
            )}

            {/* ── Bottom upgrade block (free only) ── */}
            {user && !isPro && recentHistory.length > 0 && (
              <div className="hv-bottom-upgrade" style={{ marginTop: 14 }}>
                <div className="hv-bottom-upgrade-head">
                  <span style={{ fontSize: 18 }}>👑</span>
                  <p className="hv-bottom-upgrade-title">PassAI Pro</p>
                </div>
                <p className="hv-bottom-upgrade-sub">
                  {isJapanese
                    ? '月30回・高精度GPT-4・優先処理で毎日の勉強をもっと深く。'
                    : '30 generations/month, GPT-4 accuracy, and priority processing for deeper daily study.'}
                </p>
                <button className="hv-bottom-upgrade-btn" onClick={onUpgrade} disabled={stripeLoading}>
                  {stripeLoading ? (isJapanese ? '処理中…' : 'Loading…') : (isJapanese ? 'Proにアップグレード · ¥780/月' : 'Upgrade to Pro · ¥780/month')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {showSettings && (
        <SettingsModal
          language={language}       setLanguage={setLanguage}
          furigana={furigana}       setFurigana={setFurigana}
          isJapanese={isJapanese}
          onClose={() => setShowSettings(false)}
          onOpenAuth={() => { setShowSettings(false); setShowAuth(true); }}
          adminModel={adminModel}   setAdminModel={setAdminModel}
          onToggleSelfPro={handleToggleSelfPro}
          onUpgrade={onUpgrade}
          onManageBilling={onManageBilling}
          onOpenPricing={onOpenPricing}
          onOpenPrivacy={onOpenPrivacy}
          onOpenTerms={onOpenTerms}
          onOpenDisclaimer={onOpenDisclaimer}
          onOpenSupport={onOpenSupport}
        />
      )}
      {showAuth && (
        <AuthModal isJapanese={isJapanese} onClose={() => setShowAuth(false)} />
      )}
    </>
  );
}
