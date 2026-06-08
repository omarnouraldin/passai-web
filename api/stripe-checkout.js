import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, rateLimitResponse, isPlainObject } from '../lib/security.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

function resolveAppBaseUrl(req) {
  const configured = process.env.APP_BASE_URL ?? '';
  // Use configured URL only if it's a real production URL (not localhost)
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured;
  }
  // Fall back to Vercel's automatic deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Fall back to request origin
  const origin = req?.headers?.origin ?? req?.headers?.referer ?? '';
  if (origin.startsWith('https://')) return origin.replace(/\/$/, '');
  // Last resort: return configured value even if localhost (local dev)
  return configured;
}

function getEnv(req) {
  return {
    supabaseUrl: process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    supabaseAnon: process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
    stripeSecret: process.env.STRIPE_SECRET_KEY ?? '',
    priceId: process.env.STRIPE_PRICE_ID_PRO_MONTHLY ?? '',
    appBaseUrl: resolveAppBaseUrl(req),
  };
}

async function getAuthedUser(token) {
  const { supabaseUrl, supabaseAnon } = getEnv();
  if (!token || !supabaseUrl || !supabaseAnon) return null;
  const supabase = createClient(supabaseUrl, supabaseAnon);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const limited = rateLimit(req, 'stripe');
  if (!limited.allowed) return rateLimitResponse(res, 'stripe', limited.retryAfterSeconds);
  if (!isPlainObject(req.body)) return res.status(400).json({ error: 'Malformed JSON body.' });

  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const user = await getAuthedUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { stripeSecret, priceId, appBaseUrl } = getEnv(req);
  if (!stripeSecret) return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
  if (!priceId) return res.status(500).json({ error: 'Missing STRIPE_PRICE_ID_PRO_MONTHLY' });
  if (!appBaseUrl) return res.status(500).json({ error: 'Missing APP_BASE_URL' });

  const stripe = new Stripe(stripeSecret);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appBaseUrl}/?checkout=success`,
    cancel_url: `${appBaseUrl}/?checkout=cancel`,
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id },
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
  });

  return res.json({ url: session.url });
}
