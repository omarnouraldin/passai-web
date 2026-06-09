import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase, SUPABASE_ENABLED } from '../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,             setUser]             = useState(null);
  const [isPro,            setIsPro]            = useState(false);
  const [isAdmin,          setIsAdmin]          = useState(false);
  const [generationsUsed,  setGenerationsUsed]  = useState(0);
  const [loading,          setLoading]          = useState(true);
  const lastAdminFetchRef = useRef('');
  const lastAdminFetchAtRef = useRef(0);
  const adminFetchPromiseRef = useRef(null);

  // Fetch profile (pro status + usage count)
  async function fetchProfile(userId) {
    if (!supabase || !userId) return;
    let { data, error } = await supabase
      .from('profiles')
      .select('is_pro, generations_used, is_admin')
      .eq('id', userId)
      .single();

    // 406 = no row found — auto-create the profile
    if (error || !data) {
      await supabase.from('profiles').upsert({
        id: userId,
        is_pro: false,
        generations_used: 0,
      });
      data = { is_pro: false, generations_used: 0 };
    }

    setIsPro(data.is_pro ?? false);
    setGenerationsUsed(data.generations_used ?? 0);
  }

  async function fetchAdminState(token, { force = false } = {}) {
    if (!token) return;
    const now = Date.now();
    if (adminFetchPromiseRef.current) return adminFetchPromiseRef.current;
    if (!force) {
      if (lastAdminFetchRef.current === token && (now - lastAdminFetchAtRef.current) < 15000) return;
    }
    try {
      const promise = (async () => {
        const url = '/api/admin';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'get_me' }),
        });
        const text = await res.text();
        if (!res.ok) return;
        const data = JSON.parse(text);
        lastAdminFetchRef.current = token;
        lastAdminFetchAtRef.current = Date.now();
        setIsAdmin(!!data?.isAdmin);
        if (typeof data?.isPro === 'boolean') setIsPro(data.isPro);
        if (typeof data?.generationsUsed === 'number') setGenerationsUsed(data.generationsUsed);
      })();
      adminFetchPromiseRef.current = promise;
      await promise;
    } catch (err) {
      void err;
    } finally {
      adminFetchPromiseRef.current = null;
    }
  }

  // Call after a successful generation or admin write to keep state in sync
  async function refreshProfile(patch = null) {
    if (patch) {
      if (typeof patch.isPro === 'boolean') setIsPro(patch.isPro);
      if (typeof patch.isAdmin === 'boolean') setIsAdmin(patch.isAdmin);
      if (typeof patch.generationsUsed === 'number') setGenerationsUsed(patch.generationsUsed);
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id);
      await fetchAdminState(session.access_token, { force: true });
      if (patch) {
        if (typeof patch.isPro === 'boolean') setIsPro(patch.isPro);
        if (typeof patch.isAdmin === 'boolean') setIsAdmin(patch.isAdmin);
        if (typeof patch.generationsUsed === 'number') setGenerationsUsed(patch.generationsUsed);
      }
    }
  }

  useEffect(() => {
    if (!SUPABASE_ENABLED) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id);
        fetchAdminState(session?.access_token);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id);
        fetchAdminState(session?.access_token);
      } else {
        setIsPro(false);
        setIsAdmin(false);
        setGenerationsUsed(0);
        lastAdminFetchRef.current = '';
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async function signOut() {
    if (!SUPABASE_ENABLED) return;
    await supabase.auth.signOut();
  }

  // Get the current access token (for passing to API requests).
  // Always refreshes the session first so the JWT is never expired server-side.
  async function getAccessToken() {
    if (!SUPABASE_ENABLED || !supabase) return null;
    // refreshSession returns the refreshed session, or null on failure.
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed?.session?.access_token) return refreshed.session.access_token;
    // Fallback: read from storage (covers cases where refresh isn't needed)
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  return (
    <AuthContext.Provider value={{
      user, isPro, isAdmin, generationsUsed, loading,
      signUp, signIn, signInWithGoogle, signOut,
      getAccessToken, refreshProfile,
      enabled: SUPABASE_ENABLED,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
