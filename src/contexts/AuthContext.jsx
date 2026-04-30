import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, SUPABASE_ENABLED } from '../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [isPro,   setIsPro]   = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch pro status from profiles table
  async function fetchProfile(userId) {
    if (!supabase || !userId) return;
    const { data } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('id', userId)
      .single();
    setIsPro(data?.is_pro ?? false);
  }

  useEffect(() => {
    if (!SUPABASE_ENABLED) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      else setIsPro(false);
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

  // Get the current access token (for passing to API requests)
  async function getAccessToken() {
    if (!SUPABASE_ENABLED || !supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  return (
    <AuthContext.Provider value={{
      user, isPro, loading,
      signUp, signIn, signInWithGoogle, signOut,
      getAccessToken,
      enabled: SUPABASE_ENABLED,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
