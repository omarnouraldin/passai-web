import { createClient } from '@supabase/supabase-js';
import { buildStudyPrompt, generateStudyMaterial, resolveOpenAIModel, OPENAI_ADMIN_MODELS } from '../lib/openaiStudy.js';
import { rateLimit, rateLimitResponse, isPlainObject, normalizePayload, clampString, asBoolean } from '../lib/security.js';

const FREE_LIMIT = 5;
const ADMIN_EMAIL = 'omarnourelden3@gmail.com';
const DEV_LOGS = process.env.NODE_ENV !== 'production';

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfNextMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

async function checkUsage(authHeader) {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { isPro: false, userId: null, userClient: null, used: 0 };

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !supabaseAnon) return { isPro: false, userId: null, userClient: null, used: 0 };

  try {
    const supabase = createClient(supabaseUrl, supabaseAnon);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { isPro: false, userId: null, userClient: null, used: 0 };

    if (!supabaseService) {
      throw {
        status: 500,
        body: { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' },
      };
    }

    const profileClient = createClient(supabaseUrl, supabaseService, {
      auth: { persistSession: false },
    });

    const now = new Date();
    const month = monthKey(now);

    let profile;
    const { data: fullData, error: fullErr } = await profileClient
      .from('profiles')
      .select('is_pro, generations_used, generations_reset_at')
      .eq('id', user.id)
      .single();
    if (fullErr) {
      await profileClient.from('profiles').upsert({
        id: user.id,
        is_pro: false,
        generations_used: 0,
        generations_reset_at: startOfMonth(now).toISOString(),
      }, { onConflict: 'id' });
      const { data: seededProfile } = await profileClient
        .from('profiles')
        .select('is_pro, generations_used, generations_reset_at')
        .eq('id', user.id)
        .single();
      profile = seededProfile;
    } else {
      profile = fullData;
    }

    const isPro = profile?.is_pro ?? false;
    const resetAt = profile?.generations_reset_at ? new Date(profile.generations_reset_at) : null;
    const needsReset = !resetAt || Number.isNaN(resetAt.getTime()) || monthKey(resetAt) !== monthKey(now);
    let used = profile?.generations_used ?? 0;

    if (needsReset) {
      await profileClient.from('profiles').upsert({
        id: user.id,
        generations_used: 0,
        generations_reset_at: startOfMonth(now).toISOString(),
      }, { onConflict: 'id' });
      used = 0;
    }

    if (!isPro && used >= FREE_LIMIT) {
      throw {
        status: 429,
        body: {
          error: 'limit_reached',
          used,
          limit: FREE_LIMIT,
          resetAt: startOfNextMonth(now).toISOString(),
        },
      };
    }

    if (DEV_LOGS) {
      console.info('[api/generate] usage check', {
        userId: user.id,
        isPro,
        usedBefore: used,
        resetMonth: month,
        needsReset,
      });
    }

    return { isPro, userId: user.id, userClient: profileClient, used };
  } catch (e) {
    if (e.status) throw e;
    return { isPro: false, userId: null, userClient: null, used: 0 };
  }
}

async function incrementUsage(userClient, userId, used) {
  if (!userClient || !userId) return;
  try {
    const { error } = await userClient.from('profiles').upsert({
      id: userId,
      generations_used: used + 1,
    }, { onConflict: 'id' });
    if (DEV_LOGS) {
      console.info('[api/generate] usage increment', {
        userId,
        usedBefore: used,
        usedAfter: used + 1,
        incrementSucceeded: !error,
      });
    }
    return !error;
  } catch (err) {
    if (DEV_LOGS) {
      console.info('[api/generate] usage increment', {
        userId,
        usedBefore: used,
        usedAfter: used + 1,
        incrementSucceeded: false,
        error: err?.message ?? String(err),
      });
    }
    return false;
  }
}

async function resolveAdminRequest(authHeader) {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { isAdmin: false };

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  if (!supabaseUrl || !supabaseAnon) return { isAdmin: false };

  try {
    const supabase = createClient(supabaseUrl, supabaseAnon);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { isAdmin: false };
    return { isAdmin: String(user.email ?? '').trim().toLowerCase() === ADMIN_EMAIL };
  } catch {
    return { isAdmin: false };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const limited = rateLimit(req, 'generate');
  if (!limited.allowed) return rateLimitResponse(res, 'generate', limited.retryAfterSeconds);
  if (!isPlainObject(req.body)) return res.status(400).json({ error: 'Malformed JSON body.' });

  const normalized = normalizePayload(req.body, {
    noteText: 'longstring',
    imageBase64: 'longstring',
    mediaType: 'shortstring',
    language: 'shortstring',
    furigana: 'boolean',
    adminModel: 'shortstring',
  });

  const noteText = clampString(normalized.noteText, 8000);
  const imageBase64 = clampString(normalized.imageBase64, 12_000_000);
  const mediaType = normalized.mediaType || 'image/jpeg';
  const language = normalized.language || 'english';
  const furigana = asBoolean(normalized.furigana, false);
  const adminModel = normalized.adminModel || 'auto';

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server.' });
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const hasImage = !!imageBase64;
  const hasText = noteText && noteText.trim().length > 0;
  if (!hasImage && !hasText) return res.status(400).json({ error: 'No content provided.' });

  let isPro = false, userId = null, userClient = null, used = 0;
  try {
    ({ isPro, userId, userClient, used } = await checkUsage(authHeader));
  } catch (e) {
    if (e.status && e.body) return res.status(e.status).json(e.body);
    throw e;
  }

  const { isAdmin } = await resolveAdminRequest(authHeader);
  const model = resolveOpenAIModel({
    adminOverride: isAdmin ? adminModel : null,
    isPro,
  });

  const prompt = buildStudyPrompt({ language, furigana, hasImage, noteText });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = obj => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    send({ type: 'progress', value: 8 });
    const parsed = await generateStudyMaterial({
      apiKey,
      model,
      prompt,
      onProgress: value => send({ type: 'progress', value }),
    });
    send({ type: 'progress', value: 96 });
    send({ type: 'progress', value: 100 });
    send({ type: 'result', data: parsed });
    await incrementUsage(userClient, userId, used);
  } catch (err) {
    console.error('OpenAI generate error:', err?.message ?? err);
    send({ type: 'error', message: 'Something went wrong. Please try again.' });
  }

  res.end();
}
