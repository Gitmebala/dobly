# Dobly Setup and Deployment Guide

Dobly is an AI automation operator for work and life. This repo contains the marketing site, dashboard, workflow runtime, connection management, billing, and webhook surfaces.

## Stack

- Next.js 15 App Router
- TypeScript
- Supabase for auth and data
- Anthropic for workflow planning
- Stripe for billing
- Resend for email delivery
- OAuth providers for external connections
- Daraja for M-PESA credential-backed payment flows

## Quick start

1. Install dependencies

```bash
npm install
```

2. Copy environment variables

```bash
cp .env.example .env.local
```

3. Fill in `.env.local`
4. Apply `supabase/schema.sql`
5. Run:

```bash
npm run validate:env
npm run dev
```

## Required environment variables

See `.env.example` for the full list. Core launch-critical values:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ENCRYPTION_KEY`
- `WORKER_SECRET`

Provider-specific values are only required if those providers are enabled.

## Stripe setup

1. Create recurring prices for each paid plan.
2. Register the webhook endpoint:

`https://your-domain.com/api/webhooks/stripe`

3. Subscribe to:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

4. Add the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

## OAuth setup

Configure only the providers you plan to expose:

- Google
- Microsoft
- Slack
- Shopify
- Notion
- HubSpot
- Airtable
- Meta

Each provider needs its client ID, client secret, and redirect URIs configured against your deployment domain.

## M-PESA / Daraja setup

Dobly supports a Daraja-backed M-PESA connector path.

You will need:

- consumer key
- consumer secret
- passkey
- business shortcode / paybill / till
- callback URL

Recommended callback:

`https://your-domain.com/api/webhooks/mpesa`

You can also set `MPESA_CALLBACK_URL` globally in env.

## Validation and smoke tests

Run these before every production deployment:

```bash
npm run validate:env
npm run smoke
npm run typecheck
npm run build
```

`npm run smoke` assumes the app is already running locally or at `APP_URL`.

## Production deployment checklist

- Required env vars present
- Supabase schema applied
- Stripe price IDs are live
- Stripe webhook registered
- OAuth redirect URIs configured
- Resend sender domain verified
- WhatsApp webhook configured if used
- M-PESA callback configured if used
- Homepage, auth, dashboard, billing, workflow runs, and webhook routes smoke-tested

See `docs/LAUNCH_READINESS.md` for the fuller checklist.
