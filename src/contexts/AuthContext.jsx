import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, SUPABASE_ENABLED } from '../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,             setUser]             = useState(null);
  const [isPro,            setIsPro]            = useState(false);
  const [isAdmin,          setIsAdmin]          = useState(false);
  const [generationsUsed,  setGenerationsUsed]  = useState(0);
  const [loading,          setLoading]          = useState(true);

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

  async function fetchAdminState(token) {
    if (!token) return;
    try {
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
      setIsAdmin(!!data?.isAdmin);
      if (typeof data?.isPro === 'boolean') setIsPro(data.isPro);
      if (typeof data?.generationsUsed === 'number') setGenerationsUsed(data.generationsUsed);
    } catch (err) {
      void err;
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
      await fetchAdminState(session.access_token);
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
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!SUPABASE_ENABLED || !user) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        fetchAdminState(session.access_token);
      }
    });
  }, [user]);

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

  // Get the current access token (for passing to API requests)
  async function getAccessToken() {
    if (!SUPABASE_ENABLED || !supabase) return null;
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
