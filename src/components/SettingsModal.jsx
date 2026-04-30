import { useTheme } from '../contexts/ThemeContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function SettingsModal({
  language, setLanguage,
  furigana, setFurigana,
  isJapanese, onClose, onOpenAuth,
}) {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, enabled } = useAuth();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{isJapanese ? '設定' : 'Settings'}</div>

        {/* Theme toggle */}
        <div className="setting-row">
          <div>
            <div className="setting-label">{isJapanese ? '表示モード' : 'Appearance'}</div>
            <div className="setting-sub">{theme === 'dark'
              ? (isJapanese ? 'ダークモード' : 'Dark mode')
              : (isJapanese ? 'ライトモード' : 'Light mode')}
            </div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={theme === 'light'}
              onChange={toggleTheme}
            />
            <span className="toggle-track" />
          </label>
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
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', height: 36, fontSize: 13 }}
                  onClick={async () => { await signOut(); onClose(); }}
                >
                  {isJapanese ? 'ログアウト' : 'Sign out'}
                </button>
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
      </div>
    </div>
  );
}
