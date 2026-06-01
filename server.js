import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import generateHandler from './api/generate.js';
import examHandler from './api/exam.js';
import ocrHandler from './api/ocr.js';
import stripePortalHandler from './api/stripe-portal.js';
import { rateLimit, rateLimitResponse, isPlainObject } from './lib/security.js';

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;
const ADMIN_EMAIL = 'omarnourelden3@gmail.com';
const jsonBody = express.json({ limit: '20mb' });

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function getSupabaseEnv() {
  return {
    supabaseUrl: process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    supabaseAnon: process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
    supabaseService: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY ?? '',
    stripeSecret: process.env.STRIPE_SECRET_KEY ?? '',
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO_MONTHLY ?? '',
    appBaseUrl: process.env.APP_BASE_URL ?? '',
  };
}

async function getAuthedUser(token) {
  const { supabaseUrl, supabaseAnon } = getSupabaseEnv();
  if (!token || !supabaseUrl || !supabaseAnon) return null;
  const supabase = createClient(supabaseUrl, supabaseAnon);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function syncStripeSubscription({ supabaseServiceClient, userId, customerId, subscription }) {
  if (!supabaseServiceClient || !userId || !subscription) return;
  const status = subscription.status ?? 'unknown';
  const active = status === 'active' || status === 'trialing';
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const { error } = await supabaseServiceClient.from('profiles').upsert({
    id: userId,
    is_pro: active,
    stripe_customer_id: customerId ?? subscription.customer ?? null,
    stripe_subscription_id: subscription.id ?? null,
    stripe_price_id: priceId,
    subscription_status: status,
    current_period_end: currentPeriodEnd,
  }, { onConflict: 'id' });

  if (error) throw error;
}

async function fetchSubscriptionFromStripe(stripe, subscriptionId) {
  if (!stripe || !subscriptionId) return null;
  return stripe.subscriptions.retrieve(subscriptionId);
}

app.post('/api/admin', jsonBody, async (req, res) => {
  const limited = rateLimit(req, 'admin');
  if (!limited.allowed) return rateLimitResponse(res, 'admin', limited.retryAfterSeconds);
  if (!isPlainObject(req.body)) return res.status(400).json({ error: 'Malformed JSON body.' });
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const action = req.body?.action ?? 'get_me';
  const { supabaseUrl, supabaseAnon, supabaseService } = getSupabaseEnv();
  if (!token || !supabaseUrl || !supabaseAnon) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });
  if (normalizeEmail(user.email) !== normalizeEmail(ADMIN_EMAIL)) return res.status(403).json({ error: 'Forbidden' });

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

  if (action === 'get_me') {
    return res.json({
      isAdmin: true,
      isPro: profile?.is_pro ?? false,
      generationsUsed: profile?.generations_used ?? 0,
      adminModel: 'auto',
    });
  }

  if (action === 'set_self_pro') {
    const nextIsPro = !!req.body?.isPro;
    if (!supabaseService) {
      return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });
    }
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
});

app.post('/api/stripe-checkout', jsonBody, async (req, res) => {
  const limited = rateLimit(req, 'stripe');
  if (!limited.allowed) return rateLimitResponse(res, 'stripe', limited.retryAfterSeconds);
  if (!isPlainObject(req.body)) return res.status(400).json({ error: 'Malformed JSON body.' });
  if (process.env.NODE_ENV !== 'production') {
    console.info('[api/stripe-checkout] request body received', {
      hasBody: true,
      keys: Object.keys(req.body ?? {}),
    });
  }
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const user = await getAuthedUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { stripeSecret, stripePriceId, appBaseUrl } = getSupabaseEnv();
  if (!stripeSecret) return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
  if (!stripePriceId) return res.status(500).json({ error: 'Missing STRIPE_PRICE_ID_PRO_MONTHLY' });
  if (!appBaseUrl) return res.status(500).json({ error: 'Missing APP_BASE_URL' });

  const stripe = new Stripe(stripeSecret);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: stripePriceId, quantity: 1 }],
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
});

app.post('/api/stripe-portal', jsonBody, stripePortalHandler);

app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const limited = rateLimit(req, 'webhook');
  if (!limited.allowed) return rateLimitResponse(res, 'webhook', limited.retryAfterSeconds);
  const { stripeSecret, supabaseService, supabaseUrl } = getSupabaseEnv();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
  if (!stripeSecret || !webhookSecret || !supabaseService || !supabaseUrl) {
    return res.status(500).send('Webhook not configured');
  }

  const stripe = new Stripe(stripeSecret);
  let event;
  try {
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const supabaseServiceClient = createClient(supabaseUrl, supabaseService, {
    auth: { persistSession: false },
  });

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.supabase_user_id ?? null;
      const subscriptionId = session.subscription ?? null;
      const customerId = session.customer ?? null;
      const subscription = await fetchSubscriptionFromStripe(stripe, subscriptionId);
      if (userId && subscription) {
        await syncStripeSubscription({ supabaseServiceClient, userId, customerId, subscription });
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object;
      const userId = subscription.metadata?.supabase_user_id ?? null;
      if (userId) {
        await syncStripeSubscription({
          supabaseServiceClient,
          userId,
          customerId: subscription.customer ?? null,
          subscription,
        });
      }
    }
  } catch (err) {
    return res.status(500).send(`Webhook handler failed: ${err.message}`);
  }

  return res.json({ received: true });
});

app.post('/api/generate', jsonBody, generateHandler);

// ── /api/ocr — image OCR / extraction ───────────────────────────────────────
app.post('/api/ocr', jsonBody, ocrHandler);

// ── /api/exam — generate and grade mock exams ────────────────────────────────
app.post('/api/exam', jsonBody, examHandler);

app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Malformed JSON body.' });
  }
  return next(err);
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
