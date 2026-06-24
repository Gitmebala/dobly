# Dobly Launch Setup

Use this after the app builds locally. The app now includes guardrails for draft-only providers, but real execution still depends on these environment variables and provider dashboards.

## 1. Supabase

1. Open Supabase Dashboard.
2. Select the Dobly project.
3. Go to SQL Editor.
4. Run `supabase/schema.sql` if this is a fresh database.
5. If you already have workspace-based briefings, run `supabase/briefings_user_schema_migration.sql`.
6. Go to Authentication > URL Configuration.
7. Set Site URL to your real app URL for production, or `http://localhost:3000` locally.
8. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/dashboard`
   - your production `/auth/callback`

Required env:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## 2. Google OAuth

1. Open Google Cloud Console.
2. Select the Dobly project.
3. Go to APIs & Services > OAuth consent screen.
4. Add yourself under Test users while unverified.
5. Go to APIs & Services > Credentials.
6. Open the Web OAuth client.
7. Add redirect URI: `http://localhost:3000/api/oauth/google/callback`.
8. For Supabase Google sign-in, also add the Supabase auth callback URL shown in Supabase Auth > Providers > Google.
9. Enable APIs you want live: Gmail API, Google Docs API, Google Sheets API, Google Calendar API.

Required env:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## 3. Email As Dobly

Use Resend for system emails from Dobly, not Gmail. Gmail is for sending as the connected user.

1. Open Resend.
2. Verify your sending domain.
3. Create an API key.
4. Set the sender to something like `Dobly <hello@yourdomain.com>`.

Required env:

```bash
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

## 4. Stripe Billing

1. Open Stripe Dashboard.
2. Create products for Free, Operator, Business, Agency.
3. Copy price IDs.
4. Go to Developers > Webhooks.
5. Add endpoint: `/api/webhooks/stripe`.
6. Select subscription, checkout, invoice, and payment events.
7. Copy webhook signing secret.

Required env:

```bash
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_OPERATOR_PRICE_ID=
STRIPE_BUSINESS_PRICE_ID=
STRIPE_AGENCY_PRICE_ID=
```

## 5. WhatsApp Business

1. Open Meta for Developers.
2. Create or open the Dobly app.
3. Add WhatsApp product.
4. Add callback URL: `/api/webhooks/whatsapp`.
5. Add verify token matching your env.
6. Subscribe to messages.
7. Copy permanent access token, phone number ID, and business account ID.

Required env:

```bash
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=
```

## 6. M-PESA Daraja

1. Open Safaricom Daraja.
2. Create the app.
3. Copy consumer key and secret.
4. Configure callback URLs for STK push result and timeout.
5. Add shortcode, passkey, and environment.

Required env:

```bash
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_PASSKEY=
MPESA_SHORTCODE=
MPESA_CALLBACK_URL=
MPESA_ENV=sandbox
```

## 7. Agent Intelligence Providers

Only add paid AI keys when ready to test real agent reasoning. Without them, Dobly should stay in draft/sandbox behavior.

```bash
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
GROQ_API_KEY=
TOGETHER_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## 8. Voice Stack

Needed for the phone receptionist path.

```bash
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

## 9. Local Verification Commands

Stop the dev server before a clean build. The missing `./638.js` chunk error means `.next` was stale or corrupted.

```bash
npm run clean
npm run typecheck
npm run build
npm run dev:clean
```

## 10. Trust Rule

Dobly may only say a provider executed live when the runtime executor exists, credentials are present, and the provider call succeeds. Everything else must say draft-only or needs connection.
