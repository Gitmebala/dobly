# Dobly Runtime Environment

Set these environment variables to turn the built runtime into a live product.

## Core

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

## Admin

- `DOBLY_ADMIN_EMAILS` comma-separated list of admin emails.

## Worker

- `WORKER_SECRET` used by `/api/internal/office-worker`.
- `DOBLY_APP_URL` for the office worker daemon.

## Kenya Calls/SMS

Kenya launch is local-first. Use a Kenya SMS gateway for SMS and Africa's Talking for Kenya voice numbers.

- `DOBLY_SMS_PROVIDER=kenya_local`
- `KENYA_SMS_API_URL`
- `KENYA_SMS_API_KEY`
- `KENYA_SMS_SENDER_ID`
- `AFRICASTALKING_API_KEY`
- `AFRICASTALKING_USERNAME`

Twilio is optional international fallback:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

Webhook URLs:

- SMS inbound: `/api/webhooks/twilio/sms`
- Voice inbound: `/api/webhooks/twilio/voice`
- Voice status: `/api/webhooks/twilio/voice/status`
- Phone verification: `/api/business-channels/phone/verify`

For local unsigned webhook testing only:

- `DOBLY_ALLOW_UNSIGNED_WEBHOOKS=true`

## Meta WhatsApp

- `META_WHATSAPP_VERIFY_TOKEN`
- `META_APP_SECRET`
- `META_WHATSAPP_ACCESS_TOKEN`
- `META_WHATSAPP_PHONE_NUMBER_ID`
- `NEXT_PUBLIC_META_APP_ID`
- `NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID`
- `NEXT_PUBLIC_META_WHATSAPP_REDIRECT_URI`

Webhook URL:

- `/api/webhooks/meta/whatsapp`

## Observability

- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

## Paystack and M-PESA Plans

Stripe is not the Kenya launch default. Use Paystack plus M-PESA first:

- `BILLING_PROVIDER=paystack`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_CURRENCY=KES`
- `PAYSTACK_CHANNELS=card,mobile_money`
- `PAYSTACK_PLAN_SIGNAL_ROOM`
- `PAYSTACK_PLAN_MOMENTUM_DESK`
- `PAYSTACK_PLAN_COMMAND_FLOOR`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`
- `MPESA_SHORTCODE`

Webhook URLs:

- `/api/webhooks/paystack`
- `/api/webhooks/mpesa`

## Email

Connect Gmail/Outlook through OAuth connections where available. For domain sender fallback:

- `RESEND_API_KEY`
- `DOBLY_DEFAULT_FROM_EMAIL`

## Required SQL Additions

Apply these files in Supabase:

- `supabase/business_channel_connections.sql`
- `supabase/business_memory_items.sql`
- `supabase/usage_events.sql`

The main Homebase runtime also requires:

- `supabase/dobly_operating_system_schema.sql`
