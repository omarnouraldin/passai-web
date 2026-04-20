import { useState, useEffect } from 'react';
import HomeView from './components/HomeView.jsx';
import ResultsView from './components/ResultsView.jsx';
import HistoryView from './components/HistoryView.jsx';
import LoadingView from './components/LoadingView.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { supabase, SUPABASE_ENABLED } from './lib/supabase.js';

const CHAR_LIMIT  = 8000;
const HISTORY_KEY = 'passai_history';

function loadLocalHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) ?? []; }
  catch { return []; }
}

// ── Inner app (has access to auth context) ───────────────────────────────────
function AppInner() {
  const { user } = useAuth();

  const [view,      setView]      = useState('home');   // 'home' | 'results' | 'history'
  const [isLoading, setIsLoading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [history,   setHistory]   = useState(loadLocalHistory);
  const [language,  setLanguage]  = useState('english');
  const [furigana,  setFurigana]  = useState(false);
  const [error,     setError]     = useState(null);
  const [toast,     setToast]     = useState(null);    // { msg, type }

  const isJapanese = language === 'japanese';

  // ── Persist history locally ────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  // ── Load history from Supabase when user signs in ─────────────────────
  useEffect(() => {
    if (!user || !SUPABASE_ENABLED || !supabase) return;
    supabase
      .from('history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data?.length) {
          const items = data.map(row => ({
            id:      row.id,
            date:    row.created_at,
            snippet: row.snippet,
            content: row.content,
          }));
          setHistory(items);
        }
      });
  }, [user]);

  // ── Auto-clear errors ──────────────────────────────────────────────────
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4500);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Generate ───────────────────────────────────────────────────────────
  async function generate(noteText) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ noteText, language, furigana }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');

      const item = {
        id:      Date.now(),
        date:    new Date().toISOString(),
        snippet: noteText.slice(0, 80),
        content: data,
      };

      setHistory(h => [item, ...h]);
      setGenerated(data);
      setView('results');

      // Sync to Supabase if logged in
      if (user && SUPABASE_ENABLED && supabase) {
        supabase.from('history').insert({
          user_id: user.id,
          snippet: item.snippet,
          content: data,
        }).then(() => {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function openHistoryItem(item) {
    setGenerated(item.content);
    setView('results');
  }

  function clearHistory() {
    setHistory([]);
    if (user && SUPABASE_ENABLED && supabase) {
      supabase.from('history').delete().eq('user_id', user.id).then(() => {});
    }
  }

  function deleteHistoryItem(id) {
    setHistory(h => h.filter(i => i.id !== id));
    if (user && SUPABASE_ENABLED && supabase) {
      supabase.from('history').delete().eq('id', id).then(() => {});
    }
  }

  function showToast(msg, type = 'error') {
    setToast({ msg, type });
  }

  return (
    <div className="app">
      {isLoading && <LoadingView isJapanese={isJapanese} />}

      {view === 'home' && (
        <HomeView
          onGenerate={generate}
          charLimit={CHAR_LIMIT}
          language={language}
          setLanguage={setLanguage}
          furigana={furigana}
          setFurigana={setFurigana}
          isJapanese={isJapanese}
        />
      )}

      {view === 'results' && generated && (
        <ResultsView
          content={generated}
          furigana={furigana}
          isJapanese={isJapanese}
          onBack={() => setView('home')}
          onToast={showToast}
        />
      )}

      {view === 'history' && (
        <HistoryView
          history={history}
          onOpen={openHistoryItem}
          onDelete={deleteHistoryItem}
          onClear={clearHistory}
          isJapanese={isJapanese}
        />
      )}

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button
          className={`nav-tab ${view !== 'history' ? 'active' : ''}`}
          onClick={() => setView('home')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          {isJapanese ? 'ホーム' : 'Home'}
        </button>
        <button
          className={`nav-tab ${view === 'history' ? 'active' : ''}`}
          onClick={() => setView('history')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
          </svg>
          {isJapanese ? '履歴' : 'History'}
        </button>
      </nav>

      {error && <div className="toast">{error}</div>}
      {toast && <div className={`toast ${toast.type === 'success' ? 'success' : ''}`}>{toast.msg}</div>}
    </div>
  );
}

// ── Root with providers ───────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
