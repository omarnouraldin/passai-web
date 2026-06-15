import { useState, useEffect, useRef, Component } from 'react';
import HomeView from './components/HomeView.jsx';
import UploadView from './components/UploadView.jsx';
import ResultsView from './components/ResultsView.jsx';
import ProfileView from './components/ProfileView.jsx';
import HistoryView from './components/HistoryView.jsx';
import LoadingView from './components/LoadingView.jsx';
import AuthModal from './components/AuthModal.jsx';
import UpgradeModal from './components/UpgradeModal.jsx';
import LandingPage from './components/LandingPage.jsx';
import PrivacyPage from './components/PrivacyPage.jsx';
import TermsPage from './components/TermsPage.jsx';
import AIDisclaimerPage from './components/AIDisclaimerPage.jsx';
import SupportPage from './components/SupportPage.jsx';
import PricingPage from './components/PricingPage.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { supabase, SUPABASE_ENABLED } from './lib/supabase.js';

const CHAR_LIMIT  = 8000;
const HISTORY_KEY = 'passai_history';
const LANG_KEY = 'passai_landing_lang';

function pathToPage(pathname) {
  const path = String(pathname || '/').replace(/\/+$/, '') || '/';
  if (path === '/privacy') return 'privacy';
  if (path === '/terms') return 'terms';
  if (path === '/ai-disclaimer') return 'ai-disclaimer';
  if (path === '/support') return 'support';
  if (path === '/pricing') return 'pricing';
  return 'landing';
}

function pageToPath(page) {
  if (page === 'privacy') return '/privacy';
  if (page === 'terms') return '/terms';
  if (page === 'ai-disclaimer') return '/ai-disclaimer';
  if (page === 'support') return '/support';
  if (page === 'pricing') return '/pricing';
  return '/';
}

function loadLocalHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) ?? []; }
  catch { return []; }
}

function detectInitialLocale() {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'en' || saved === 'ja') return saved;
  const browserLang = navigator.language?.toLowerCase() ?? '';
  return browserLang.startsWith('ja') ? 'ja' : 'en';
}

// ── Error boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[PassAI] Uncaught error:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100dvh', padding: '32px 24px',
          textAlign: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 40 }}>😵</div>
          <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Something went wrong</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 12 }}
            onClick={() => window.location.reload()}
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Inner app (has access to auth context) ───────────────────────────────────
function AppInner() {
  const { user, isPro, isAdmin, getAccessToken, refreshProfile } = useAuth();

  const [view,          setView]        = useState('home');
  const [adminModel,    setAdminModel]  = useState('gpt-5.4-mini');
  const [isLoading,     setIsLoading]   = useState(false);
  const [progress,      setProgress]    = useState(0);
  const [generated,     setGenerated]   = useState(null);
  const [contentId,     setContentId]   = useState(null);
  const [originalInput, setOriginalInput] = useState(null);
  const [history,       setHistory]     = useState(loadLocalHistory);
  const [language,      setLanguage]    = useState('english');
  const [furigana,      setFurigana]    = useState(false);
  const [error,         setError]       = useState(null);
  const [toast,         setToast]       = useState(null);
  const [abortCtrl,     setAbortCtrl]   = useState(null);
  const [upgradeData,   setUpgradeData] = useState(null); // { used, limit, resetAt }
  const [stripeLoading, setStripeLoading] = useState(false);
  const [showAuth,      setShowAuth]    = useState(false);
  const [profileOpenSignal, setProfileOpenSignal] = useState(0);
  const [page,          setPage]        = useState(() => (
    typeof window === 'undefined' ? 'landing' : pathToPage(window.location.pathname)
  ));
  const [locale,        setLocale]      = useState(detectInitialLocale);

  const isJapanese = language === 'japanese';
  const landingIsJapanese = locale === 'ja';
  const progressSeenAtRef = useRef(Date.now());

  // ── Persist history locally ────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, locale);
  }, [locale]);

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

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout');
    if (!checkoutStatus) return;

    refreshProfile();
    if (checkoutStatus === 'success') {
      showToast(landingIsJapanese ? 'アップグレード完了！Proプランへようこそ 🎉' : 'Upgrade successful! Welcome to Pro 🎉', 'success');
    } else if (checkoutStatus === 'cancel') {
      showToast(landingIsJapanese ? 'チェックアウトをキャンセルしました' : 'Checkout cancelled', 'error');
    }

    params.delete('checkout');
    const nextSearch = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash || ''}`,
    );
  }, [user]);

  // ── Generate ───────────────────────────────────────────────────────────
  function cancelGeneration() {
    abortCtrl?.abort();
    setIsLoading(false);
    setProgress(0);
    setAbortCtrl(null);
  }

  useEffect(() => {
    if (!isLoading) {
      progressSeenAtRef.current = Date.now();
      return;
    }
    progressSeenAtRef.current = Date.now();
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) return;
    const t = setInterval(() => {
      const stalledFor = Date.now() - progressSeenAtRef.current;
      if (stalledFor < 1400) return;
      setProgress(prev => (prev >= 95 ? prev : Math.min(prev + 1, 95)));
    }, 1100);
    return () => clearInterval(t);
  }, [isLoading]);

  // fileData = { text } | { imageBase64, mediaType } | null
  async function generate(noteText, fileData, modelOverride) {
    const adminModel = modelOverride ?? 'auto';
    const controller = new AbortController();
    setAbortCtrl(controller);
    setIsLoading(true);
    setProgress(0);
    setError(null);
    setOriginalInput({ noteText, fileData });

    try {
      const body = { language, furigana };
      if (adminModel && adminModel !== 'auto') body.adminModel = adminModel;
      if (fileData?.imageBase64) {
        body.imageBase64 = fileData.imageBase64;
        body.mediaType   = fileData.mediaType;
      } else {
        body.noteText = fileData?.text ?? noteText;
      }

      // Attach auth token so server can determine pro status
      const token = await getAccessToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/generate', {
        method:  'POST',
        headers,
        body:    JSON.stringify(body),
        signal:  controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 429 && errData.error === 'limit_reached') {
          setUpgradeData({ used: errData.used, limit: errData.limit, resetAt: errData.resetAt });
          return; // don't throw — show upgrade modal instead
        }
        throw new Error(errData.error ?? 'Unknown error');
      }

      // ── Read SSE stream ──────────────────────────────────────────────────
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      let data      = null;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'progress') {
              progressSeenAtRef.current = Date.now();
              setProgress(event.value);
            }
            if (event.type === 'result')   { data = event.data; break outer; }
            if (event.type === 'error')    throw new Error(event.message);
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }

      if (!data) throw new Error('No result received');
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 320));

      const snippetSource = fileData?.text ?? noteText ?? '';
      const item = {
        id:      Date.now(),
        date:    new Date().toISOString(),
        snippet: fileData?.imageBase64 ? '📷 Image' : snippetSource.slice(0, 80),
        content: data,
      };

      setHistory(h => [item, ...h]);
      setGenerated(data);
      setContentId(item.id);
      setView('results');
      refreshProfile(); // keep generation count in sync

      // Sync to Supabase if logged in
      if (user && SUPABASE_ENABLED && supabase) {
        supabase.from('history').insert({
          user_id: user.id,
          snippet: item.snippet,
          content: data,
        }).then(() => {});
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      setIsLoading(false);
      setProgress(0);
      setAbortCtrl(null);
    }
  }

  function openHistoryItem(item) {
    if (!item) {
      setView('history');
      return;
    }
    setGenerated(item.content);
    setContentId(item.id);
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

  function navigateTo(nextPage) {
    setPage(nextPage);
    if (typeof window !== 'undefined') {
      const nextPath = pageToPath(nextPage);
      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, '', nextPath);
      }
    }
  }

  function openAuth() {
    setShowAuth(true);
  }

  function openLanding() {
    navigateTo('landing');
  }

  function openPricing() {
    navigateTo('pricing');
  }

  function openProfileFromNav() {
    setView('profile');
  }

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

  useEffect(() => {
    const onPopState = () => setPage(pathToPage(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function startFreeFlow() {
    if (user) {
      navigateTo('landing');
      setView('home');
      return;
    }
    openAuth();
  }

  async function startCheckout() {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (stripeLoading) return;

    setStripeLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setShowAuth(true);
        return;
      }

      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'Checkout failed');
      if (!data?.url) throw new Error('Checkout URL missing');
      window.location.assign(data.url);
    } catch (err) {
      showToast(err?.message ?? 'Checkout failed', 'error');
    } finally {
      setStripeLoading(false);
    }
  }

  async function openBillingPortal() {
    if (!user) {
      setShowAuth(true);
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        setShowAuth(true);
        return;
      }

      const res = await fetch('/api/stripe-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'Could not open billing portal');
      if (!data?.url) throw new Error('Billing portal URL missing');
      window.location.assign(data.url);
    } catch (err) {
      showToast(err?.message ?? 'Could not open billing portal', 'error');
    }
  }

  return (
    <div className="app">
      {isLoading && <LoadingView isJapanese={isJapanese} progress={progress} onCancel={cancelGeneration} />}

      {page === 'privacy' ? (
        <PrivacyPage
          locale={locale}
          onBack={openLanding}
          onOpenAuth={openAuth}
        />
      ) : page === 'terms' ? (
        <TermsPage
          locale={locale}
          onBack={openLanding}
          onOpenAuth={openAuth}
        />
      ) : page === 'ai-disclaimer' ? (
        <AIDisclaimerPage
          locale={locale}
          onBack={openLanding}
          onOpenSupport={() => navigateTo('support')}
        />
      ) : page === 'support' ? (
        <SupportPage
          locale={locale}
          onBack={openLanding}
          onOpenPrivacy={() => navigateTo('privacy')}
          onOpenTerms={() => navigateTo('terms')}
          onOpenDisclaimer={() => navigateTo('ai-disclaimer')}
        />
      ) : page === 'pricing' ? (
        <PricingPage
          locale={locale}
          isSignedIn={!!user}
          isPro={isPro}
          onBack={openLanding}
          onStartFree={startFreeFlow}
          onUpgrade={startCheckout}
          stripeLoading={stripeLoading}
          onLocaleChange={setLocale}
          onOpenPrivacy={() => navigateTo('privacy')}
          onOpenTerms={() => navigateTo('terms')}
          onOpenDisclaimer={() => navigateTo('ai-disclaimer')}
          onOpenSupport={() => navigateTo('support')}
        />
      ) : !user ? (
        <LandingPage
          onTryFree={openAuth}
          onOpenAuth={openAuth}
          isJapanese={landingIsJapanese}
          locale={locale}
          onLocaleChange={setLocale}
          onOpenPrivacy={() => navigateTo('privacy')}
          onOpenTerms={() => navigateTo('terms')}
          onOpenPricing={openPricing}
          onOpenDisclaimer={() => navigateTo('ai-disclaimer')}
          onOpenSupport={() => navigateTo('support')}
        />
      ) : view === 'home' ? (
        <HomeView
          language={language}
          setLanguage={setLanguage}
          furigana={furigana}
          setFurigana={setFurigana}
          isJapanese={isJapanese}
          onUpgrade={startCheckout}
          stripeLoading={stripeLoading}
          onManageBilling={openBillingPortal}
          recentHistory={history}
          onOpenHistoryItem={openHistoryItem}
          profileOpenSignal={profileOpenSignal}
          adminModel={adminModel}
          setAdminModel={setAdminModel}
          onNewPack={() => setView('upload')}
          onOpenPricing={openPricing}
          onOpenPrivacy={() => navigateTo('privacy')}
          onOpenTerms={() => navigateTo('terms')}
          onOpenDisclaimer={() => navigateTo('ai-disclaimer')}
          onOpenSupport={() => navigateTo('support')}
        />
      ) : view === 'upload' ? (
        <UploadView
          onGenerate={generate}
          charLimit={CHAR_LIMIT}
          adminModel={adminModel}
          language={language}
          setLanguage={setLanguage}
          furigana={furigana}
          setFurigana={setFurigana}
          isJapanese={isJapanese}
          onBack={() => setView('home')}
        />
      ) : view === 'profile' ? (
        <ProfileView
          language={language}
          setLanguage={setLanguage}
          furigana={furigana}
          setFurigana={setFurigana}
          isJapanese={isJapanese}
          onUpgrade={startCheckout}
          stripeLoading={stripeLoading}
          onManageBilling={openBillingPortal}
          onOpenPricing={openPricing}
          onOpenPrivacy={() => navigateTo('privacy')}
          onOpenTerms={() => navigateTo('terms')}
          onOpenDisclaimer={() => navigateTo('ai-disclaimer')}
          onOpenSupport={() => navigateTo('support')}
          adminModel={adminModel}
          setAdminModel={setAdminModel}
          onToggleSelfPro={handleToggleSelfPro}
          onBack={() => setView('home')}
        />
      ) : view === 'results' && generated ? (
          <ResultsView
            content={generated}
            contentId={contentId}
            originalInput={originalInput}
            furigana={furigana}
            isJapanese={isJapanese}
            onBack={() => setView('home')}
            onToast={showToast}
            onUpgrade={startCheckout}
          />
      ) : (
        <HistoryView
          history={history}
          onOpen={openHistoryItem}
          onDelete={deleteHistoryItem}
          onClear={clearHistory}
          isJapanese={isJapanese}
        />
      )}

      {user && (
        <nav className="bottom-nav bottom-nav-three">
          <button
            className={`nav-tab ${view === 'home' ? 'active' : ''}`}
            onClick={() => setView('home')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            {isJapanese ? 'ホーム' : 'Home'}
          </button>
          <button
            className={`nav-tab nav-tab-center${view === 'upload' ? ' active' : ''}`}
            onClick={() => setView('upload')}
            aria-label={isJapanese ? '新規作成' : 'New pack'}
          >
            <span className="nav-plus-pill">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/>
              </svg>
            </span>
          </button>
          <button
            className={`nav-tab ${view === 'profile' ? 'active' : ''}`}
            onClick={openProfileFromNav}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4.33 0-8 2.17-8 5v1h16v-1c0-2.83-3.67-5-8-5z"/>
            </svg>
            {isJapanese ? 'プロフィール' : 'Profile'}
          </button>
        </nav>
      )}

      {upgradeData && (
        <UpgradeModal
          used={upgradeData.used}
          limit={upgradeData.limit}
          resetAt={upgradeData.resetAt}
          isJapanese={isJapanese}
          onClose={() => setUpgradeData(null)}
          onUpgrade={() => { setUpgradeData(null); startCheckout(); }}
          onOpenPricing={() => { setUpgradeData(null); openPricing(); }}
        />
      )}

      {error && <div className="toast">{error}</div>}
      {toast && <div className={`toast ${toast.type === 'success' ? 'success' : ''}`}>{toast.msg}</div>}
      {showAuth && <AuthModal isJapanese={isJapanese} onClose={() => setShowAuth(false)} />}
    </div>
  );
}

// ── Root with providers ───────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
