// ── Supabase Client ────────────────────────────────────────────────────────
//
// Setup steps:
//  1. Go to https://supabase.com and create a free project
//  2. Dashboard → Settings → API → copy:
//       Project URL  →  VITE_SUPABASE_URL
//       anon/public key  →  VITE_SUPABASE_ANON_KEY
//  3. Add to PassAI-Web/.env and to Vercel environment variables:
//       VITE_SUPABASE_URL=https://xxxx.supabase.co
//       VITE_SUPABASE_ANON_KEY=eyJ...
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

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_ENABLED = !!(SUPABASE_URL && SUPABASE_KEY);

export const supabase = SUPABASE_ENABLED
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// No-op shim so callers don't need to check — used in main.jsx
export async function initSupabase() {}
