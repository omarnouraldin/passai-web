import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function AuthModal({ onClose, isJapanese }) {
  const { user, signIn, signUp, signOut, signInWithGoogle, enabled } = useAuth();
  const [mode, setMode]         = useState('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [done, setDone]         = useState(false);

  const t = {
    title:      isJapanese ? 'アカウント'     : 'Account',
    signin:     isJapanese ? 'ログイン'       : 'Sign in',
    signup:     isJapanese ? '新規登録'       : 'Sign up',
    email:      isJapanese ? 'メールアドレス' : 'Email',
    password:   isJapanese ? 'パスワード'     : 'Password',
    or:         isJapanese ? 'または'         : 'or',
    signout:    isJapanese ? 'ログアウト'     : 'Sign out',
    close:      isJapanese ? '閉じる'         : 'Done',
    check:      isJapanese ? '確認メールを送りました。メールをご確認ください。' : 'Check your email to confirm your account.',
    noSupabase: isJapanese ? 'アカウント機能を使うには Supabase の設定が必要です。' : 'Set up Supabase env vars to enable accounts.',
    loggedIn:   isJapanese ? 'ログイン中:'   : 'Signed in as',
    google:     isJapanese ? 'Googleでログイン' : 'Continue with Google',
  };

  if (!enabled) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={e => e.stopPropagation()}>
          <div className="modal-handle" />
          <div className="modal-title">{t.title}</div>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>{t.noSupabase}</p>
          <div style={{ marginTop: 24 }}>
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onClose}>{t.close}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Signed-in state ──
  if (user) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={e => e.stopPropagation()}>
          <div className="modal-handle" />
          <div className="modal-title">{t.title}</div>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
            {t.loggedIn} <strong style={{ color: 'var(--text)' }}>{user.email}</strong>
          </p>
          <button
            className="btn btn-danger"
            style={{ width: '100%', marginBottom: 10 }}
            onClick={async () => { await signOut(); onClose(); }}
          >
            {t.signout}
          </button>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onClose}>{t.close}</button>
        </div>
      </div>
    );
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Supabase redirects the page — onClose not needed
    } catch (err) {
      setError(err.message);
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        onClose();
      } else {
        await signUp(email, password);
        setDone(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{mode === 'signin' ? t.signin : t.signup}</div>

        {/* Google button */}
        <button
          className="btn btn-ghost"
          style={{ width: '100%', marginBottom: 16, gap: 10 }}
          onClick={handleGoogle}
          disabled={googleLoading}
        >
          {/* Google logo SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {googleLoading ? '...' : t.google}
        </button>

        <div className="auth-divider">{t.or}</div>

        {done ? (
          <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>{t.check}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}
            <input
              className="auth-input"
              type="email"
              placeholder={t.email}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              className="auth-input"
              type="password"
              placeholder={t.password}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ marginBottom: 16 }}
            >
              {loading ? '...' : (mode === 'signin' ? t.signin : t.signup)}
            </button>
          </form>
        )}

        <button
          className="btn btn-ghost"
          style={{ width: '100%', marginBottom: 10 }}
          onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null); setDone(false); }}
        >
          {mode === 'signin' ? t.signup : t.signin}
        </button>
        <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onClose}>{t.close}</button>
      </div>
    </div>
  );
}
