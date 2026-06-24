# Dobly Setup and Deployment Guide

Dobly is an AI automation operator for work and life. This repo contains the marketing site, dashboard, workflow runtime, connection management, billing, and webhook surfaces.

## Kenya-first launch mode

Dobly is launching as a maximum product with a minimum provider surface. The goal is not a tiny MVP; it is a full operating system that keeps provider spend and setup complexity under control.

Default customer-facing stack:

- Paystack for checkout, M-PESA, cards, international cards, and plan billing
- M-PESA / Daraja for direct STK push and callbacks when Paystack is not enough
- WhatsApp Business for customer follow-up, reminders, approvals, and support handoff
- Kenya Calls & SMS for the cheapest local messaging and voice path already supported here

Internal launch-critical stack:

- Supabase for auth, data, storage, and operating records
- Anthropic for planning, research, classification, writing, and judgment-heavy work
- Resend for transactional email and product notifications

Optional providers should stay optional or hidden by default until a real workflow needs them.

## Stack

- Next.js 15 App Router
- TypeScript
- Supabase for auth and data
- Anthropic for workflow planning, research, classification, and writing
- Paystack-first billing for Kenya-ready checkout, M-PESA, and international cards
- Optional Stripe fallback for supported-country entities
- Resend for email delivery
- Optional OAuth providers for workflow-specific external connections
- Daraja for direct M-PESA credential-backed payment flows

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
- `PAYSTACK_SECRET_KEY`
- `ENCRYPTION_KEY`
- `WORKER_SECRET`

Provider-specific values are only required if those providers are enabled. For budget launch, do not configure every OAuth provider just because code exists.

## Paystack setup

Use Paystack as the default billing provider for Kenya-first launch.

Required environment variables:

- `BILLING_PROVIDER=paystack`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_CURRENCY=KES`
- `PAYSTACK_CHANNELS=card,mobile_money`

Optional recurring plan codes, created in the Paystack dashboard:

- `PAYSTACK_PLAN_SIGNAL_ROOM`
- `PAYSTACK_PLAN_MOMENTUM_DESK`
- `PAYSTACK_PLAN_COMMAND_FLOOR`

Webhook endpoint:

`https://your-domain.com/api/webhooks/paystack`

Listen for:

- `charge.success`
- `subscription.disable`

If plan codes are configured, checkout attempts to create a Paystack subscription. If plan codes are missing, Dobly still initializes a one-time Paystack checkout and grants the plan after a signed `charge.success` webhook.

## Optional Stripe setup

Stripe is retained as a fallback for supported-country entities. Set `BILLING_PROVIDER=stripe` to force Stripe checkout.

1. Create recurring prices for each paid plan.
2. Register the webhook endpoint:

`https://your-domain.com/api/webhooks/stripe`

3. Subscribe to:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

4. Add the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

## Optional provider setup

Configure only the providers you plan to expose beyond the Kenya-first stack:

- Google
- Slack
- HubSpot
- Canva
- Webhook / API

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
- Anthropic key configured and budget limits reviewed
- Resend sender domain verified
- Paystack keys are live
- Paystack plan codes are configured, or one-time plan checkout is accepted for launch
- Paystack webhook registered
- Stripe price IDs and webhook registered only if `BILLING_PROVIDER=stripe`
- Optional OAuth redirect URIs configured only for providers being exposed
- WhatsApp webhook configured if used
- M-PESA callback configured if used
- Kenya SMS or Africa's Talking route tested before enabling paid SMS
- Homepage, auth, dashboard, billing, workflow runs, and webhook routes smoke-tested

See `docs/LAUNCH_READINESS.md` for the fuller checklist.
