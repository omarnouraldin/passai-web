import Stripe from 'stripe';
import { rateLimit, rateLimitResponse, isPlainObject } from '../lib/security.js';
import { getAuthedUser, getSupabaseServiceClient } from '../lib/serverAuth.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

function resolveAppBaseUrl(req) {
  const configured = process.env.APP_BASE_URL ?? '';
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const origin = req?.headers?.origin ?? '';
  if (origin.startsWith('https://')) return origin.replace(/\/$/, '');
  return configured;
}

function getEnv(req) {
  return {
    stripeSecret: process.env.STRIPE_SECRET_KEY ?? '',
    appBaseUrl: resolveAppBaseUrl(req),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const limited = rateLimit(req, 'stripe');
  if (!limited.allowed) return rateLimitResponse(res, 'stripe', limited.retryAfterSeconds);
  if (!isPlainObject(req.body)) return res.status(400).json({ error: 'Malformed JSON body.' });

  const authHeader = req.headers.authorization ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided. Please sign in again.' });
  }
  const user = await getAuthedUser(authHeader);
  if (!user) return res.status(401).json({ error: 'Session expired. Please sign out and sign in again.' });

  const profileClient = getSupabaseServiceClient();
  if (!profileClient) return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });

  const { data: profile, error: profileError } = await profileClient
    .from('profiles')
    .select('stripe_customer_id, is_pro')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return res.status(500).json({ error: 'Could not load billing profile' });
  }
  if (!profile?.is_pro) {
    return res.status(403).json({ error: 'Billing portal is only available for Pro users.' });
  }
  if (!profile?.stripe_customer_id) {
    return res.status(400).json({ error: 'No billing record found. If you upgraded via the admin panel, please subscribe through the normal upgrade flow to access billing.' });
  }

  const { stripeSecret, appBaseUrl } = getEnv(req);
  if (!stripeSecret) return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
  if (!appBaseUrl) return res.status(500).json({ error: 'Missing APP_BASE_URL' });

  const stripe = new Stripe(stripeSecret);
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appBaseUrl}/`,
  });

  return res.json({ url: session.url });
}
