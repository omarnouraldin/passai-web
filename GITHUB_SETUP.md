# PassAI Setup And Deployment

## 1. Push To GitHub

Create a GitHub repo, then run:

```bash
git init
git add .
git commit -m "Initial commit: PassAI web app"
git branch -M main
git remote add origin https://github.com/your-username/passai-web.git
git push -u origin main
```

## 2. Required Environment Variables

PassAI currently needs all of these environment variables:

```bash
OPENAI_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID_PRO_MONTHLY=
STRIPE_WEBHOOK_SECRET=
APP_BASE_URL=
```

Use [.env.example](/Users/omarghazy/Documents/PassAI/PassAI-Web/.env.example:1) as the template for local development.

## 3. Where To Get Each Variable

### OpenAI

You must create:

- `OPENAI_API_KEY`

Get it from the OpenAI dashboard API keys page.

### Supabase

You must create:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Get them from your Supabase project:

1. Open Supabase
2. Go to Project Settings
3. Open API
4. Copy:
   - Project URL
   - anon public key
   - service_role key

Important:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are used by the frontend.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed in client code.

### Stripe

You must create:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_PRO_MONTHLY`
- `STRIPE_WEBHOOK_SECRET`

Get them from Stripe:

1. Create a Product for PassAI Pro
2. Create a monthly recurring Price
3. Copy the Price ID into `STRIPE_PRICE_ID_PRO_MONTHLY`
4. Copy your Stripe secret key into `STRIPE_SECRET_KEY`
5. Create a webhook endpoint and copy the signing secret into `STRIPE_WEBHOOK_SECRET`

### Vercel / Production URL

You must set:

- `APP_BASE_URL`

Examples:

- Local: `http://localhost:5173`
- Production: `https://yourdomain.com`

This value is used for Stripe checkout success and cancel redirects.

## 4. Local Development Setup

Install dependencies:

```bash
npm install
```

Create your local env file:

```bash
cp .env.example .env
```

Fill in all required values in `.env`.

Run locally:

```bash
npm run dev
```

This starts:

- Vite frontend on `http://localhost:5173`
- Express API server on `http://localhost:3001`

## 5. Supabase Setup Notes

PassAI needs two Supabase tables:

- `profiles`
- `history`

It also needs Row Level Security and a trigger that creates a default `profiles` row for each new auth user.

### 5.1 Run This SQL In Supabase

Open the Supabase SQL editor and run this:

```sql
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_pro boolean not null default false,
  is_admin boolean not null default false,
  generations_used integer not null default 0,
  generations_reset_at timestamptz not null default date_trunc('month', now()),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  subscription_status text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  snippet text,
  content jsonb not null
);

create index if not exists history_user_id_created_at_idx
  on public.history (user_id, created_at desc);

create unique index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists profiles_stripe_subscription_id_idx
  on public.profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;
```

### 5.2 Updated-At Trigger

Run this so `profiles.updated_at` stays current:

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();
```

### 5.3 New-User Profile Trigger

Run this so every new auth user gets a default `profiles` row automatically:

```sql
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    is_pro,
    is_admin,
    generations_used,
    generations_reset_at
  )
  values (
    new.id,
    false,
    false,
    0,
    date_trunc('month', now())
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();
```

### 5.4 Enable Row Level Security

Run this:

```sql
alter table public.profiles enable row level security;
alter table public.history enable row level security;
```

### 5.5 Profiles Policies

Users should only be able to read and update their own profile row.

```sql
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
```

Notes:

- The client currently reads `is_pro`, `is_admin`, and `generations_used` from `profiles`.
- The client may also upsert its own default row if one is missing.
- The service role bypasses RLS, so backend billing and admin writes will still work.

### 5.6 History Policies

Users should only be able to read, insert, and delete their own history.

```sql
drop policy if exists "Users can view own history" on public.history;
create policy "Users can view own history"
on public.history
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own history" on public.history;
create policy "Users can insert own history"
on public.history
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own history" on public.history;
create policy "Users can delete own history"
on public.history
for delete
using (auth.uid() = user_id);
```

### 5.7 What The App Actually Reads And Writes

`profiles` columns required by the current code:

- `id`
- `is_pro`
- `is_admin`
- `generations_used`
- `generations_reset_at`
- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_price_id`
- `subscription_status`
- `current_period_end`
- `created_at`
- `updated_at`

`history` columns required by the current code:

- `id`
- `user_id`
- `created_at`
- `snippet`
- `content`

### 5.8 Service-Role vs User Access

Operations that currently need service-role access:

- reading `profiles.is_pro` for backend Pro checks
- creating or seeding missing profile rows during generation
- resetting `generations_used` and `generations_reset_at`
- incrementing `generations_used`
- marking the hardcoded admin user as `is_admin`
- toggling the admin user's own `is_pro` state through `/api/admin`
- writing Stripe subscription fields from webhook events

Operations that currently need user RLS access:

- reading the signed-in user's own `profiles` row on the client
- inserting or upserting the signed-in user's own `profiles` row on first sign-in
- reading the signed-in user's own `history`
- inserting the signed-in user's own `history`
- deleting the signed-in user's own `history`

### 5.9 Manual Supabase Setup Checklist

In Supabase, also configure:

1. Authentication
   - Enable Email auth
   - Enable Google auth if you want Google sign-in

2. Redirect URLs
   - Add your local app URL, for example `http://localhost:5173`
   - Add your production app URL, for example `https://yourdomain.com`

3. API keys
   - Copy Project URL to `VITE_SUPABASE_URL`
   - Copy anon public key to `VITE_SUPABASE_ANON_KEY`
   - Copy service role key to `SUPABASE_SERVICE_ROLE_KEY`

4. Quick verification
   - Create a new test user
   - Confirm a `profiles` row is created automatically
   - Sign in through the app
   - Generate one study result
   - Confirm a `history` row is inserted
   - Confirm the same user can read and delete only their own history

Before production launch, confirm:

- auth is enabled
- email/password sign-in works
- Google OAuth is configured if you want Google sign-in
- redirect URLs are correct for local and production
- Row Level Security is configured correctly

## 6. Stripe Webhook Setup

Create a Stripe webhook endpoint pointing to:

```bash
https://your-domain.com/api/stripe-webhook
```

Subscribe to these events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Then copy the webhook signing secret into:

- `STRIPE_WEBHOOK_SECRET`

## 7. Vercel Deployment

Deploy with Vercel:

1. Sign in to Vercel
2. Import your GitHub repo
3. Add all required environment variables
4. Deploy

Add these env vars in Vercel before production testing:

- `OPENAI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_PRO_MONTHLY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_BASE_URL`

## 8. Production Checklist

Before launch, manually verify:

- sign up works
- sign in works
- Google OAuth works if enabled
- note generation works
- OCR works
- exam mode works for Pro users
- free usage limits behave correctly
- Stripe checkout opens correctly
- Stripe webhook updates `is_pro`
- history loads and saves correctly
- `APP_BASE_URL` matches the real public site URL

## 9. Current Limitation

This doc only covers environment and deployment setup.

The backend logic, Stripe lifecycle hardening, and Supabase schema hardening should still be reviewed before public launch.
