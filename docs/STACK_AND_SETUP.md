# Dobly Stack And Setup

## Premium Starter Stack

- `Vercel Pro` for the web app and deploy flow
- `Cloudflare` for domain, DNS, SSL, and edge protection
- `Supabase Pro` for Postgres, Auth, Storage, and row-level security
- `Anthropic Claude Sonnet` for primary reasoning
- `OpenAI mini-tier model` for low-cost utility tasks
- `Perplexity` for research and grounded search
- `Resend` for transactional email
- `Stripe` for subscriptions and payments
- `Meta` for Instagram and WhatsApp flows
- `Twilio` for phone and voice channels when receptionist features go live
- `ElevenLabs` for premium voice output when voice is enabled

## Setup Order

1. Buy and connect the production domain in Cloudflare.
2. Create the Supabase project and run `supabase/schema.sql`.
3. Set Supabase Auth URLs for local and production callback routes.
4. Create API keys for Anthropic, OpenAI, Perplexity, and Resend.
5. Create Stripe products, prices, and the webhook endpoint.
6. Add provider apps one by one for Google, Slack, Notion, Meta, Shopify, and others you actually plan to launch with.
7. Add all environment variables in local development and in Vercel.
8. Run `npm run validate:env`, then `npm run typecheck`, then `npm run build`.

## Minimum Launch Variables

- `NEXT_PUBLIC_APP_URL`
- `APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `PERPLEXITY_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID`
- `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`
- `ENCRYPTION_KEY`
- `WORKER_SECRET`
- `SCHEDULER_SECRET`
- `ADMIN_EMAIL`

## Only Add When Needed

- `META_*` and `DOBLY_WHATSAPP_*` for Instagram and WhatsApp
- `TWILIO_*` and `ELEVENLABS_*` for receptionist and voice
- `SHOPIFY_*` and `KLAVIYO_PRIVATE_KEY` for ecommerce depth
- `GOOGLE_*`, `MICROSOFT_*`, `SLACK_*`, `NOTION_*`, `HUBSPOT_*`, `AIRTABLE_*` when those integrations are part of the live product
