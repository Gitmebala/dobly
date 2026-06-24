# Dobly Connections System - Kenya Budget Launch Mode

Dobly should launch in Kenya with a powerful product and a controlled provider surface. The default experience is not a giant connector marketplace. It is a focused operating stack that can run real customer, payment, research, messaging, and approval work without burning budget on every possible SaaS integration.

## Default Visible Stack

Show these providers by default:

- **Paystack** - default checkout and payment links for M-PESA, cards, international cards, and plan billing.
- **M-PESA / Daraja** - direct STK push and callback-aware flows when a workflow needs Safaricom-native control.
- **WhatsApp Business** - customer reminders, payment nudges, approvals, support handoff, and follow-up.
- **Kenya Calls & SMS** - lowest-cost local SMS and voice route for Reception, missed-call recovery, bookings, and reminders.

These are the providers returned by `getLaunchReadyConnectionProviders()`.

## Internal Platform Providers

These are required to ship Dobly, but users should not be asked to connect them:

- **Supabase** - auth, database, storage, and operating records.
- **Anthropic** - planning, research, classification, writing, and judgment-heavy work.
- **Resend** - transactional email and product notifications.

Treat these as setup and deployment requirements, not customer-facing connections.

## Optional Expansion

Keep optional providers available behind advanced or workflow-specific flows:

- **Google** - inbox, Sheets, Docs, Calendar when a workflow proves it needs workspace access.
- **Slack** - team alerts and internal escalation.
- **HubSpot** - CRM context for sales workflows.
- **Canva** - design handoffs and branded content work.
- **Webhook / API** - custom systems and long-tail integrations.

These are returned by `getOptionalLaunchConnectionProviders()`. They should not compete visually with the default launch stack.

## Hidden By Default

Everything else stays hidden by default, even if code exists. A provider can graduate into optional or default only when:

- there is a verified live runtime contract,
- a launch customer needs it,
- setup is understandable without developer handholding,
- pricing and usage risk are clear,
- support can debug the happy path.

This keeps Dobly ambitious without turning onboarding into a credentials scavenger hunt.

## Setup Policy

1. Start inside Dobly with business context, market research, memory, approvals, and test runs.
2. Add Paystack first for checkout and payment-triggered flows.
3. Add direct M-PESA only when a workflow needs STK push or callback control outside Paystack.
4. Add WhatsApp for customer-facing follow-up and approvals.
5. Add Kenya Calls & SMS for local reminders, missed-call recovery, and phone workflows.
6. Reveal optional providers only after a workflow has a concrete need.

## Copy Rules

Use:

- "Kenya-first launch stack"
- "Paystack-first checkout"
- "Direct M-PESA when needed"
- "Cheapest local calls and SMS route"
- "Optional expansion"
- "Hidden by default"

Avoid:

- "All integrations included"
- "Connect everything"
- "Enterprise connector marketplace"
- "Supabase connection"
- "Anthropic connection"
- "Resend connection"

## Operational Checklist

- Supabase schema applied.
- Anthropic key configured.
- Resend sender domain verified.
- Paystack live keys configured.
- Paystack webhook registered.
- `PAYSTACK_CURRENCY=KES`.
- `PAYSTACK_CHANNELS=card,mobile_money`.
- M-PESA Daraja sandbox tested if direct STK push is used.
- WhatsApp webhook and OTP path tested if WhatsApp is used.
- Kenya SMS or Africa's Talking route tested before enabling paid SMS.
- Twilio kept as international fallback, not the default Kenya path.
