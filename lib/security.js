const DEFAULT_RATE_LIMITS = {
  generate: { windowMs: 15 * 60 * 1000, max: 20 },
  exam: { windowMs: 15 * 60 * 1000, max: 20 },
  ocr: { windowMs: 15 * 60 * 1000, max: 20 },
  admin: { windowMs: 15 * 60 * 1000, max: 5 },
  auth: { windowMs: 15 * 60 * 1000, max: 5 },
  stripe: { windowMs: 15 * 60 * 1000, max: 10 },
  webhook: { windowMs: 15 * 60 * 1000, max: 1000 },
};

// ⚠️  PRODUCTION NOTE: This rate limiter is in-memory and resets on every
// Vercel cold start. It provides burst protection within a single instance
// but not across instances or restarts. The real abuse guard is the monthly
// generation limit enforced via Supabase (FREE_LIMIT in api/generate.js).
// For stricter per-IP rate limiting in production, replace this with
// Upstash Redis: https://upstash.com/docs/redis/sdks/ts/ratelimit
const buckets = new Map();

export function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  const direct = String(req.headers['x-real-ip'] ?? '').trim();
  const remote = req.socket?.remoteAddress ?? req.connection?.remoteAddress ?? '';
  return forwarded || direct || remote || 'unknown';
}

function envInt(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getRateLimitConfig(key) {
  const base = DEFAULT_RATE_LIMITS[key];
  if (!base) return null;
  return {
    windowMs: envInt(`${key.toUpperCase()}_RATE_LIMIT_WINDOW_MS`, base.windowMs),
    max: envInt(`${key.toUpperCase()}_RATE_LIMIT_MAX`, base.max),
  };
}

export function rateLimitResponse(res, key, retryAfterSeconds) {
  return res.status(429).json({
    error: 'rate_limited',
    code: `${key}_rate_limited`,
    retryAfter: retryAfterSeconds,
  });
}

export function rateLimit(req, key) {
  const config = getRateLimitConfig(key);
  if (!config) return { allowed: true };

  const now = Date.now();
  const ip = getClientIp(req);
  const bucketKey = `${key}:${ip}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.expiresAt <= now) {
    buckets.set(bucketKey, { count: 1, expiresAt: now + config.windowMs });
    return { allowed: true };
  }

  bucket.count += 1;
  if (bucket.count > config.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

export function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.expiresAt <= now) buckets.delete(key);
  }
}

setInterval(cleanupRateLimits, 5 * 60 * 1000).unref?.();

export function safeJsonError(res, status, error, extra = {}) {
  return res.status(status).json({ error, ...extra });
}

export function clampString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

export function clampMaybeString(value, maxLength, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, maxLength);
}

export function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

export function asStringArray(value, maxItems = 20, maxLength = 200) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map(item => typeof item === 'string' ? item.trim().slice(0, maxLength) : '')
    .filter(Boolean);
}

export function asQuizOptions(value, maxItems = 4, maxLength = 160) {
  return asStringArray(value, maxItems, maxLength);
}

export function normalizePayload(reqBody, shape) {
  if (!isPlainObject(reqBody)) return null;
  const out = {};
  for (const [key, rule] of Object.entries(shape)) {
    const value = reqBody[key];
    if (rule === 'string') {
      out[key] = clampMaybeString(value, 10000, '');
    } else if (rule === 'longstring') {
      // Large image/base64 payloads need to survive this normalization step so
      // route-level clamping can enforce the real policy instead of silently
      // truncating uploads before OCR sees them.
      out[key] = clampMaybeString(value, 15_000_000, '');
    } else if (rule === 'shortstring') {
      out[key] = clampMaybeString(value, 500, '');
    } else if (rule === 'boolean') {
      out[key] = asBoolean(value, false);
    } else if (rule === 'array') {
      out[key] = Array.isArray(value) ? value : [];
    } else if (rule === 'stringArray') {
      out[key] = asStringArray(value);
    }
  }
  return out;
}
