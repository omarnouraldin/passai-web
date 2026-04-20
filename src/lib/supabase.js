// ── Supabase Client ────────────────────────────────────────────────────────
//
// Setup steps:
//  1. Go to https://supabase.com and create a free project
//  2. In your project dashboard → Settings → API, copy:
//     - Project URL  →  VITE_SUPABASE_URL
//     - anon/public key  →  VITE_SUPABASE_ANON_KEY
//  3. Add these to PassAI-Web/.env:
//       VITE_SUPABASE_URL=https://xxxx.supabase.co
//       VITE_SUPABASE_ANON_KEY=eyJ...
//  4. Also add them to your Vercel project environment variables
//
//  SQL to run in Supabase SQL editor:
//
//    create table history (
//      id          uuid primary key default gen_random_uuid(),
//      user_id     uuid references auth.users not null,
//      created_at  timestamptz default now(),
//      snippet     text,
//      content     jsonb
//    );
//    alter table history enable row level security;
//    create policy "Users see own history" on history
//      for all using (auth.uid() = user_id);
//
// If env vars are not set, the app falls back gracefully to localStorage.
// ──────────────────────────────────────────────────────────────────────────

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_ENABLED = !!(SUPABASE_URL && SUPABASE_KEY);

// Lazily create the client only when env vars exist
let _client = null;

export function getSupabaseClient() {
  if (!SUPABASE_ENABLED) return null;
  if (_client) return _client;

  // Dynamic import so the bundle doesn't break when supabase-js isn't installed
  throw new Error('Call createSupabaseClient() first');
}

// Called from main.jsx after @supabase/supabase-js is imported
export let supabase = null;

export async function initSupabase() {
  if (!SUPABASE_ENABLED) return;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    _client = supabase;
  } catch {
    console.warn('PassAI: @supabase/supabase-js not installed — accounts disabled. Run: npm install @supabase/supabase-js');
  }
}
