import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

function getEnv() {
  return {
    supabaseUrl: process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    supabaseService: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY ?? '',
    stripeSecret: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  };
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function syncSubscription({ supabaseServiceClient, userId, customerId, subscription }) {
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

async function handleEvent(stripe, supabaseServiceClient, event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.supabase_user_id ?? null;
    const subscriptionId = session.subscription ?? null;
    if (!userId || !subscriptionId) return;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscription({
      supabaseServiceClient,
      userId,
      customerId: session.customer ?? null,
      subscription,
    });
    return;
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object;
    const userId = subscription.metadata?.supabase_user_id ?? null;
    if (!userId) return;
    await syncSubscription({
      supabaseServiceClient,
      userId,
      customerId: subscription.customer ?? null,
      subscription,
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { supabaseUrl, supabaseService, stripeSecret, webhookSecret } = getEnv();
  if (!supabaseUrl || !supabaseService || !stripeSecret || !webhookSecret) {
    return res.status(500).send('Webhook not configured');
  }

  const stripe = new Stripe(stripeSecret);
  const rawBody = await readRawBody(req);
  let event;

  try {
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const supabaseServiceClient = createClient(supabaseUrl, supabaseService, {
    auth: { persistSession: false },
  });

  try {
    await handleEvent(stripe, supabaseServiceClient, event);
  } catch (err) {
    return res.status(500).send(`Webhook handler failed: ${err.message}`);
  }

  return res.json({ received: true });
}
