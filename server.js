import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;

const FREE_LIMIT = 5;
const ADMIN_EMAIL = 'omarnourelden3@gmail.com';
const ADMIN_MODELS = new Set([
  'auto',
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-opus-4-6',
]);

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

function getWebhookEventType(event) {
  return event?.type ?? 'unknown';
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

async function getAuthedUser(token) {
  const { supabaseUrl, supabaseAnon } = getSupabaseEnv();
  if (!token || !supabaseUrl || !supabaseAnon) return null;
  const supabase = createClient(supabaseUrl, supabaseAnon);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function checkUsage(authHeader) {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { isPro: false, userId: null, userClient: null, used: 0 };
  const { supabaseUrl, supabaseAnon } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseAnon) return { isPro: false, userId: null, userClient: null, used: 0 };
  try {
    const supabase = createClient(supabaseUrl, supabaseAnon);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { isPro: false, userId: null, userClient: null, used: 0 };
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    // Select full profile; fall back if generations_reset_at column doesn't exist yet
    let profile;
    const { data: fullData, error: fullErr } = await userClient
      .from('profiles').select('is_pro, generations_used, generations_reset_at').eq('id', user.id).single();
    if (fullErr) {
      const { data: basicData } = await userClient
        .from('profiles').select('is_pro, generations_used').eq('id', user.id).single();
      profile = basicData;
    } else {
      profile = fullData;
    }
    const isPro = profile?.is_pro ?? false;
    const now = new Date();
    const resetAt = profile?.generations_reset_at ? new Date(profile.generations_reset_at) : null;
    const msInMonth = 30 * 24 * 60 * 60 * 1000;
    const needsReset = !resetAt || (now - resetAt) > msInMonth;
    let used = profile?.generations_used ?? 0;
    if (needsReset) {
      await userClient.from('profiles').update({ generations_used: 0, generations_reset_at: now.toISOString() }).eq('id', user.id);
      used = 0;
    }
    if (!isPro && used >= FREE_LIMIT) {
      const resetDate = resetAt ? new Date(resetAt.getTime() + msInMonth) : null;
      throw { status: 429, body: { error: 'limit_reached', used, limit: FREE_LIMIT, resetAt: resetDate?.toISOString() ?? null } };
    }
    return { isPro, userId: user.id, userClient, used };
  } catch (e) {
    if (e.status) throw e;
    return { isPro: false, userId: null, userClient: null, used: 0 };
  }
}

async function incrementUsage(userClient, userId, used) {
  if (!userClient || !userId) return;
  try { await userClient.from('profiles').update({ generations_used: used + 1 }).eq('id', userId); } catch {}
}

async function resolveAdminRequest(authHeader) {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { isAdmin: false };
  const { supabaseUrl, supabaseAnon } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseAnon) return { isAdmin: false };
  try {
    const supabase = createClient(supabaseUrl, supabaseAnon);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { isAdmin: false };
    return { isAdmin: user.email === ADMIN_EMAIL };
  } catch {
    return { isAdmin: false };
  }
}

app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
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
    if (getWebhookEventType(event) === 'checkout.session.completed') {
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
      getWebhookEventType(event) === 'customer.subscription.created' ||
      getWebhookEventType(event) === 'customer.subscription.updated' ||
      getWebhookEventType(event) === 'customer.subscription.deleted'
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

app.use(express.json({ limit: '20mb' }));

app.post('/api/admin', async (req, res) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
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

app.post('/api/stripe-checkout', async (req, res) => {
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

// ── /api/generate — streaming SSE response ────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const {
    noteText, imageBase64, mediaType = 'image/jpeg',
    language = 'english', furigana = false,
  } = req.body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server.' });

  const hasImage = !!imageBase64;
  const hasText  = noteText && noteText.trim().length > 0;
  if (!hasImage && !hasText) return res.status(400).json({ error: 'No content provided.' });

  // Check usage limits + model selection
  let isPro = false, userId = null, userClient = null, used = 0;
  try {
    ({ isPro, userId, userClient, used } = await checkUsage(req.headers.authorization));
  } catch (e) {
    if (e.status === 429) return res.status(429).json(e.body);
    throw e;
  }
  const model = isPro ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

  let languageInstruction;
  if (language === 'japanese') {
    if (furigana) {
      languageInstruction = `IMPORTANT: Write ALL text values in Japanese (日本語).
This app is used by 留学生 so assume limited kanji knowledge.
Add furigana to EVERY kanji without exception — including common ones like 日、月、年、人、国.
Every single kanji MUST use markup: 【kanji|reading】 — use 【 and 】 exactly, NOT curly braces.`;
    } else {
      languageInstruction = 'IMPORTANT: All text values in the JSON MUST be written in Japanese (日本語). Write clearly for 留学生.';
    }
  } else {
    languageInstruction = 'All text values in the JSON must be written in English.';
  }

  const keywordInstruction = `Use these color markup tags to make key content stand out:
- 《term》 → RED — the single most critical keyword per section (must-memorize terms)
- 〔concept〕 → ORANGE — important concepts and definitions
- ｛example｝ → BLUE — examples, numbers, or analogies
Apply markup to individual words or short phrases only — never full sentences. Use 2-4 highlights per section.`;

  const illustrationInstruction = `ILLUSTRATION: In "illustrationQuery", provide ONE specific search term in ${language === 'japanese' ? 'Japanese (日本語)' : 'English'} to find a helpful Wikipedia image. Be specific (e.g. "${language === 'japanese' ? '二次関数 グラフ' : 'quadratic function parabola'}"). Return null if no visual would help.`;

  const contentDescription = hasImage
    ? 'A student has provided an image of their study material.'
    : `A student has provided the following notes:\n\n${noteText}`;

  const prompt = `You are an expert study coach and tutor helping university students — including many international students. ${contentDescription}

${languageInstruction}

${keywordInstruction}

YOUR MISSION: Help students understand fast — before a quiz. Not a lecture.

── SUMMARY (30-second version) ──
GOAL: A tired student reads this in 10 seconds and gets it.
Rules:
- Line 1: ONE simple sentence. Everyday words only. No academic vocabulary.
  ${language === 'japanese' ? 'GOOD: "コーヒー農家は、ほとんど儲からない。"  BAD: "先物市場で搾取されている"' : 'GOOD: "Coffee farmers earn almost nothing."  BAD: "Farmers are exploited by futures markets"'}
- Line 2 (if highlightStat exists): Just the visual gap. Example: "👨‍🌾 2ブル → ☕ 2000ブル"
- Then 2 👉 sections with ・ bullets:
  👉 ${language === 'japanese' ? 'なぜ？' : 'Why?'}
  ・reason (max 7 words)
  ・reason (max 7 words)
  👉 ${language === 'japanese' ? '解決：' : 'Solution:'}
  ・one line
- ONE sticky line that sticks in the brain. Example: ${language === 'japanese' ? '"一番働いている人が、一番お金をもらえていない"' : '"The hardest workers earn the least"'}
- NO emojis before bullet points. ONLY 👉 and ・ as markers. No ❓⚠️🔸 etc.
- Language: ${language === 'japanese' ? 'Japanese (日本語)' : 'English'}

── HIGHLIGHT STAT ──
Find the single most dramatic number, contrast, or gap. Be specific and visual.
Return as: { "label": "short label", "from": "left side with emoji", "to": "right side with emoji", "magnitude": "the shocking % or number" }
Example: { "label": "価格格差", "from": "👨‍🌾 農家：約2ブル", "to": "☕ 消費者：約2000ブル", "magnitude": "+7000%" }
Return null if no dramatic contrast exists.

── SIMPLE EXPLANATION (step-by-step) ──
PURPOSE: Help a student understand the core concept in 1–2 minutes before a quiz. NOT a full lecture.
STRICT RULES:
- MAXIMUM 5–6 steps. Never more. Consolidate ruthlessly.
- Each step = EXACTLY ONE idea. One sentence + optional bullets. Nothing extra.
- Use SIMPLE everyday words. ${language === 'japanese' ? 'Avoid: 搾取、廃止、圧力、体制. Use: もらえない、なくなった、強くなった' : 'Avoid jargon. Use plain words.'}
- REMOVE: country statistics, detailed history, policy deep-dives, anything not needed to understand the core.
- FLOW: ① problem → ② why (simple) → ③ what changed → ④ solution → ⑤ reality
- Format per step:
  "Step N｜Short Label
  Short sentence.
  ・bullet (only if truly needed)"
- For 2-part ideas, break across lines for breathing room:
  "コーヒー豆の価格は、
  ニューヨークで決まる
  → 農家は決められない"
  👉 More vertical = easier to read
- Use 👉 ONLY for section headers (👉 ${language === 'japanese' ? 'なぜ？/ 👉 解決' : 'Why? / Solution'}). Max 1 per step. Only when it clearly helps.
- ・ bullets under 👉 only. Max 2 per 👉.
- ONE analogy for the WHOLE explanation (${language === 'japanese' ? 'たとえば：＋ simple Japanese comparison. Example on its own line. NEVER "Think of it like"' : '"Think of it like..." + one concrete everyday comparison. On its own line.'}).
- ONE emotional line for the WHOLE explanation — not every step.
- NO emojis as decorators. NO ❓⚠️🔸 before text. Only 👉 and ・.
- Goal: student feels "I get it now" — NOT "I learned everything".

── THINKING QUESTIONS ──
2 casual questions that spark natural curiosity — NOT exam-style.
${language === 'japanese' ? 'Style: "〇〇って、誰が一番〜だと思う？" — feels like a friend asking, not a teacher' : 'Style: "Who do you think actually profits here?" — feels like a friend asking, not a teacher'}
Short: max 1–2 lines. No setup needed.

CORRECTIONS: Check for errors. List as "Incorrect: X. Correct: Y because Z." Return [] if correct.

${illustrationInstruction}

Respond in valid JSON with EXACTLY these keys:
{
  "summary": "Simple one sentence hook.\\n👨‍🌾 X → ☕ Y\\n👉 なぜ？\\n・reason\\n・reason\\n👉 解決：\\n・solution\\n一番働く人が、一番もらえない。",
  "highlightStat": { "label": "...", "from": "...", "to": "...", "magnitude": "..." },
  "simpleExplanation": "Step 1｜Label\\nOne idea.\\n👉 Section header\\n・bullet\\n・bullet\\n\\nStep 2｜Label\\n...",
  "thinkingQuestions": ["Short conversational question?", "Real-world framing question?"],
  "corrections": [],
  "illustrationQuery": "search term or null",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "flashcards": [{ "question": "...", "answer": "..." }],
  "quiz": [{ "question": "...", "options": ["a","b","c","d"], "correctIndex": 0, "explanation": "One sentence." }]
}

Rules: 5+ flashcards, 4 quiz questions, exactly 4 options each, vary correct answer position, return ONLY the JSON.`;

  const messageContent = hasImage
    ? [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: prompt },
      ]
    : prompt;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

  function send(obj) { res.write(`data: ${JSON.stringify(obj)}\n\n`); }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 5000,
        stream: true,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error('Anthropic error:', err);
      send({ type: 'error', message: 'AI service error. Try again.' });
      res.end();
      return;
    }

    const reader  = anthropicRes.body.getReader();
    const decoder = new TextDecoder();
    let fullText  = '';
    let charCount = 0;
    const EXPECTED_CHARS = 5000;
    let sseBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const event = JSON.parse(raw);
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            const chunk = event.delta.text;
            fullText  += chunk;
            charCount += chunk.length;
            const pct = Math.min(90, 5 + Math.round((charCount / EXPECTED_CHARS) * 85));
            send({ type: 'progress', value: pct });
          }
        } catch { /* skip malformed lines */ }
      }
    }

    send({ type: 'progress', value: 96 });
    // Sanitize — remove replacement characters and control chars that break rendering
    const sanitized = fullText
      .replace(/\uFFFD/g, '')
      .replace(/[\uD800-\uDFFF]/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .normalize('NFC');
    // Robust JSON extraction
    const jsonStart = sanitized.indexOf('{');
    const jsonEnd   = sanitized.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON object found in response');
    const parsed = JSON.parse(sanitized.slice(jsonStart, jsonEnd + 1));
    send({ type: 'progress', value: 100 });
    send({ type: 'result', data: parsed });
    await incrementUsage(userClient, userId, used);

  } catch (err) {
    console.error('Generate error:', err);
    send({ type: 'error', message: 'Something went wrong. Please try again.' });
  }
  res.end();
});

// ── /api/ocr ─────────────────────────────────────────────────────────────────
app.post('/api/ocr', async (req, res) => {
  const { image, mediaType } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });
  if (!image)  return res.status(400).json({ error: 'Image data required.' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-opus-4-6', max_tokens: 4096,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: image } },
          { type: 'text', text: 'Extract ALL text from this image exactly as written, preserving structure. Return only the extracted text.' },
        ]}],
      }),
    });
    if (!response.ok) return res.status(502).json({ error: 'OCR failed.' });
    const data = await response.json();
    res.json({ text: data.content?.[0]?.text ?? '' });
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: 'Could not read the image.' });
  }
});

app.listen(PORT, () => console.log(`✅  PassAI backend running at http://localhost:${PORT}`));
