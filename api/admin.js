import { createClient } from '@supabase/supabase-js';
import { rateLimit, rateLimitResponse, isPlainObject, normalizePayload } from '../lib/security.js';

const ADMIN_EMAIL = 'omarnourelden3@gmail.com';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function getSupabaseEnv() {
  return {
    supabaseUrl: process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    supabaseAnon: process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
    supabaseService: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY ?? '',
  };
}

function makeClient(token) {
  const { supabaseUrl, supabaseAnon } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseAnon) return null;
  return createClient(supabaseUrl, supabaseAnon, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });
}

async function getAdminUser(token) {
  const supabase = makeClient(token);
  if (!supabase || !token) return { user: null, profile: null, supabase: null };

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { user: null, profile: null, supabase: null };
  if (normalizeEmail(user.email) !== normalizeEmail(ADMIN_EMAIL)) return { user, profile: null, supabase };

  const { supabaseUrl, supabaseService } = getSupabaseEnv();
  const readClient = supabaseService
    ? createClient(supabaseUrl, supabaseService, { auth: { persistSession: false } })
    : supabase;

  if (supabaseService) {
    const { error: ensureError } = await readClient
      .from('profiles')
      .upsert({ id: user.id, is_admin: true }, { onConflict: 'id' });
    if (ensureError) void ensureError;
  }

  const { data: profile } = await readClient
    .from('profiles')
    .select('id, is_admin, is_pro, generations_used')
    .eq('id', user.id)
    .single();

  return { user, profile, supabase };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const limited = rateLimit(req, 'admin');
  if (!limited.allowed) return rateLimitResponse(res, 'admin', limited.retryAfterSeconds);
  if (!isPlainObject(req.body)) return res.status(400).json({ error: 'Malformed JSON body.' });

  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const normalized = normalizePayload(req.body, {
    action: 'shortstring',
    isPro: 'boolean',
  });
  const action = normalized.action || 'get_me';
  const { user, profile, supabase } = await getAdminUser(token);

  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (normalizeEmail(user.email) !== normalizeEmail(ADMIN_EMAIL)) return res.status(403).json({ error: 'Forbidden' });

  if (action === 'get_me') {
    const { supabaseService } = getSupabaseEnv();
    return res.json({
      isAdmin: true,
      isPro: profile?.is_pro ?? false,
      generationsUsed: profile?.generations_used ?? 0,
      adminModel: 'auto',
    });
  }

  if (action === 'set_self_pro') {
    const nextIsPro = normalized.isPro;
    const { supabaseService } = getSupabaseEnv();
    if (!supabaseService) {
      return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });
    }
    const { supabaseUrl } = getSupabaseEnv();
    const writeClient = createClient(supabaseUrl, supabaseService, { auth: { persistSession: false } });
    const { error: updateError } = await writeClient.from('profiles').upsert({
      id: user.id,
      is_admin: true,
      is_pro: nextIsPro,
    }, { onConflict: 'id' });
    if (updateError) {
      return res.status(500).json({ error: 'Update failed' });
    }

    const { data: updatedProfile, error: readError } = await writeClient
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .single();

    if (readError) {
      return res.status(500).json({ error: 'Readback failed' });
    }

    return res.json({
      ok: true,
      isAdmin: true,
      isPro: updatedProfile?.is_pro ?? nextIsPro,
    });
  }

  return res.status(400).json({ error: 'Unknown admin action' });
}
