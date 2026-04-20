import { useTheme } from '../contexts/ThemeContext.jsx';

export default function SettingsModal({
  language, setLanguage,
  furigana, setFurigana,
  isJapanese, onClose,
}) {
  const { theme, toggleTheme } = useTheme();

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

        <div style={{ marginTop: 24 }}>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onClose}>
            {isJapanese ? '閉じる' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
