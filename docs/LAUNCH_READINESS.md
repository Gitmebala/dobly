# Dobly Launch Readiness

Last updated: April 4, 2026

## In-repo launch requirements

- Fill every required environment variable from `.env.example`
- Apply `supabase/schema.sql`
- Register Stripe webhook delivery
- Register OAuth redirect URLs for enabled providers
- Register WhatsApp delivery webhook if WhatsApp is enabled
- Register M-PESA callback URL if M-PESA is enabled
- Set strong `ENCRYPTION_KEY` and `WORKER_SECRET`

## Smoke tests before production

1. `npm run validate:env`
2. `npm run smoke`
3. `npm run typecheck`
4. `npm run build`

## External verification still required

- Live Stripe checkout
- Stripe webhook delivery
- Real OAuth handshakes
- Resend sender verification and delivery
- WhatsApp OTP and approval reply delivery
- M-PESA Daraja sandbox and callback verification
- Domain, TLS, redirect, and DNS checks

## Security and compliance checklist

- Terms page
- Privacy page
- Cookie notice
- Environment template
- Security headers
- Auth middleware
- Per-route auth checks on sensitive APIs
- Rate limiting on critical writes
- Encrypted secret storage
- Webhook signature or secret validation where supported
