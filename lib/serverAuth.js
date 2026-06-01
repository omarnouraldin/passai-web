import { createClient } from '@supabase/supabase-js';

export function getServerSupabaseEnv() {
  return {
    supabaseUrl: process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    supabaseAnon: process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
    supabaseService: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY ?? '',
  };
}

export function getTokenFromAuthHeader(authHeader = '') {
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

export function getSupabaseUserClient(token) {
  const { supabaseUrl, supabaseAnon } = getServerSupabaseEnv();
  if (!token || !supabaseUrl || !supabaseAnon) return null;
  return createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export function getSupabaseServiceClient() {
  const { supabaseUrl, supabaseService } = getServerSupabaseEnv();
  if (!supabaseUrl || !supabaseService) return null;
  return createClient(supabaseUrl, supabaseService, { auth: { persistSession: false } });
}

export async function getAuthedUser(authHeader = '') {
  const token = getTokenFromAuthHeader(authHeader);
  const client = getSupabaseUserClient(token);
  if (!client || !token) return null;
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function getProStatus(authHeader = '', { userId = null } = {}) {
  const token = getTokenFromAuthHeader(authHeader);
  const user = await getAuthedUser(authHeader);
  if (!user) return { user: null, isPro: false, client: null };

  const serviceClient = getSupabaseServiceClient();
  const profileClient = serviceClient ?? getSupabaseUserClient(token);
  if (!profileClient) return { user, isPro: false, client: null };

  const id = userId ?? user.id;
  const { data: profile } = await profileClient
    .from('profiles')
    .select('is_pro')
    .eq('id', id)
    .single();

  return {
    user,
    isPro: profile?.is_pro ?? false,
    client: profileClient,
  };
}
