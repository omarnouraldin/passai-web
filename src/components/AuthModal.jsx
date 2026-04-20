import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function AuthModal({ onClose, isJapanese }) {
  const { user, signIn, signUp, signOut, enabled } = useAuth();
  const [mode, setMode]       = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const t = {
    title:    isJapanese ? 'アカウント'            : 'Account',
    signin:   isJapanese ? 'ログイン'              : 'Sign in',
    signup:   isJapanese ? '新規登録'              : 'Sign up',
    email:    isJapanese ? 'メールアドレス'         : 'Email',
    password: isJapanese ? 'パスワード'             : 'Password',
    or:       isJapanese ? 'または'                : 'or',
    signout:  isJapanese ? 'ログアウト'             : 'Sign out',
    close:    isJapanese ? '閉じる'                : 'Done',
    check:    isJapanese ? '確認メールを送りました。メールをご確認ください。' : 'Check your email to confirm your account.',
    noSupabase: isJapanese
      ? 'アカウント機能を使うには Supabase の設定が必要です。'
      : 'Set up Supabase env vars to enable accounts.',
    loggedIn: isJapanese ? 'ログイン中:' : 'Signed in as',
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{mode === 'signin' ? t.signin : t.signup}</div>

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

        <div className="auth-divider">{t.or}</div>
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
