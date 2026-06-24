# Dobly Environment Contract

## Core

Required:
- `NEXT_PUBLIC_APP_URL`
- `APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY`
- `DATA_ENCRYPTION_KEY`
- `WORKER_SECRET`
- `COOKIE_SIGNING_SECRET`
- `WEBHOOK_SIGNING_SECRET`

## Mobile public config

Required:
- `EXPO_PUBLIC_APP_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Model routing

Recommended:
- `ANTHROPIC_API_KEY`
- `GROQ_API_KEY`
- `OPENAI_API_KEY`
- `PERPLEXITY_API_KEY`

## Background execution

Required for durable runtime:
- `TRIGGER_SECRET_KEY`
- `TRIGGER_PROJECT_ID`
- `TRIGGER_PROJECT_REF`
- `SCHEDULER_SECRET`

## Memory

Short-term:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Long-term semantic:
- `PINECONE_API_KEY`
- `PINECONE_INDEX`
- `PINECONE_HOST`

## Messaging

Email:
- `RESEND_API_KEY`
- `EMAIL_FROM`

WhatsApp:
- `META_APP_ID`
- `META_APP_SECRET`
- `META_VERIFY_TOKEN`
- `DOBLY_WHATSAPP_WEBHOOK_SECRET`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_ACCESS_TOKEN`

Voice:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_API_KEY`
- `TWILIO_API_SECRET`
- `DEEPGRAM_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`

## Payments

Stripe:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID`
- `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`
- `NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID`

M-PESA:
- `MPESA_ENV`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`
- `MPESA_SHORTCODE`
- `MPESA_INITIATOR_NAME`
- `MPESA_SECURITY_CREDENTIAL`
- `MPESA_CALLBACK_URL`
- `MPESA_RESULT_URL`
- `MPESA_TIMEOUT_URL`

## Observability

Recommended:
- `NEXT_PUBLIC_POSTHOG_KEY` - browser product analytics key
- `NEXT_PUBLIC_POSTHOG_HOST` - PostHog ingest host, default `https://us.i.posthog.com`
- `POSTHOG_PROJECT_API_KEY` - optional server-side capture key; can match the project API key
- `NEXT_PUBLIC_POSTHOG_AUTOCAPTURE=false` - keep off at launch unless you want higher event volume
- `NEXT_PUBLIC_POSTHOG_SESSION_REPLAY=false` - keep off at launch unless explicitly debugging onboarding friction
- `NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT=false` - set `true` when you need opt-in consent before capture
- `SENTRY_DSN`
- `EXPO_PUBLIC_SENTRY_DSN`
- `SLACK_ALERT_WEBHOOK_URL`

Dobly now tracks page views on route changes, identifies signed-in users through `/api/telemetry/identity`, accepts important server events through `/api/telemetry/event`, and exposes analytics readiness inside `/api/internal/services/status`.
