# Dobly Go-Live Matrix

Last updated: May 21, 2026

Use this document during launch. Every row should be marked complete before calling Dobly production-ready.

Status meanings:

- `Configured`: required code, env, and dashboard/provider setup exist
- `Test step`: the exact action to perform
- `Pass condition`: what must be true to trust the surface
- `Blocker`: what prevents launch if it fails

---

## Core Platform

| Surface | Configured | Test step | Pass condition | Blocker |
|---|---|---|---|---|
| App URL | Partial | Set `NEXT_PUBLIC_APP_URL` to the real production domain and open landing, auth, and dashboard links | All internal redirects, auth redirects, checkout returns, and legal/footer links resolve to the correct domain | Broken redirects, wrong callback URLs, mixed environments |
| Supabase | Partial | Fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; apply `supabase/schema.sql` | Signup, login, dashboard data, workflows, runs, and connections all work against the production project | App cannot authenticate or persist runtime state |
| Encryption | Partial | Set a strong `ENCRYPTION_KEY`; connect one provider requiring secret storage | Connection secrets save and decrypt correctly during real connector use | Secure connections and provider auth cannot be trusted |
| Worker secret | Partial | Set `WORKER_SECRET`; call internal worker/service status route with and without the header | Unauthorized requests fail; authorized internal calls succeed | Queue processing and internal ops routes are exposed or unusable |
| Environment validation | Implemented | Run `npm run validate:env` against production env values | Validator passes with no required env omissions | Hidden deployment failures surface only after launch |
| Build integrity | Partial | Run `npm run typecheck` and `npm run build` in the deploy environment | Both commands pass | Deployment can fail or ship broken code |
| Smoke test harness | Implemented | Run `npm run smoke` against the deployed app with `APP_URL` set | All routes in the script return expected status codes | Core public and webhook health surfaces are unverified |

---

## Public Pages

| Page | Configured | Test step | Pass condition | Blocker |
|---|---|---|---|---|
| Landing `/` | Partial | Load on desktop and mobile, scroll full page, click all CTAs | No layout breakage, dead sections, or console-visible failures; CTA destinations work | Broken first impression or dead acquisition funnel |
| Pricing `/pricing` | Partial | Open pricing page signed out and signed in; start checkout for each paid plan | Correct plan cards render, checkout starts, free path routes correctly | No upgrade path |
| Terms `/terms` | Implemented | Open directly and through signup link | Page loads cleanly and content is readable | Legal surface missing or broken |
| Privacy `/privacy` | Implemented | Open directly and through signup link | Page loads cleanly and content is readable | Legal surface missing or broken |
| Cookies `/cookies` | Implemented | Open directly and through signup link/footer | Page loads cleanly and content is readable | Cookie/compliance surface missing |

---

## Auth

| Surface | Configured | Test step | Pass condition | Blocker |
|---|---|---|---|---|
| Signup `/auth/signup` | Partial | Create a fresh account | Account is created, confirmation flow works, and dashboard access begins after confirmation | No new user acquisition |
| Login `/auth/login` | Partial | Sign in with a valid user and with an invalid password | Valid login reaches dashboard; invalid login fails cleanly | Returning users locked out or auth feedback unreliable |
| Callback `/auth/callback` | Partial | Complete email confirmation and OAuth return flows | Redirect returns to a safe in-app location with a real session | Signup or OAuth completion breaks |
| Forgot password | Partial | Request reset email | Reset email is sent and no internal errors leak | Password recovery unusable |
| Reset password | Partial | Complete reset from email link | Password updates successfully and user can sign in | Recovery loop incomplete |
| Middleware redirects | Partial | Visit dashboard while signed out and auth pages while signed in | Protected routes redirect to login; signed-in users are redirected away from redundant auth pages | Broken route protection or confusing auth flow |

---

## Dashboard and Workflow Product

| Surface | Configured | Test step | Pass condition | Blocker |
|---|---|---|---|---|
| Dashboard overview | Partial | Sign in and open `/dashboard` with a real account | Stats, health, suggestions, and navigation render without crashing | Broken authenticated home surface |
| Onboarding | Partial | Run through `/dashboard/onboarding` as a fresh user | Guidance appears coherent and routes forward correctly | First-run experience incomplete |
| Generate workflow | Partial | Submit several prompts covering work and life use cases | Workflow drafts are created consistently and route into activation/connections flow | Core product promise fails |
| Workflow editor | Hardened | Open generated and edited workflows, save changes, add/remove supported steps | Editor saves, no dead legacy browser-agent UI remains, and definitions stay valid | Editing is misleading or unstable |
| Activation review | Partial | Open `/dashboard/workflows/[id]/activate` for valid and invalid workflows | Valid workflows can activate; invalid ones show clear blockers | Unsafe or confusing activation path |
| Missing connections | Partial | Open `/dashboard/workflows/[id]/connections` for a workflow requiring providers | Missing providers are shown clearly and return path works after connection | Users cannot complete setup |
| Manual run | Partial | Run an active workflow from UI | Run is queued/executed and status updates correctly | Core execution path broken |
| Run history | Hardened | Replay successful and failed runs | Replay works per-run and UI refreshes cleanly | Recovery loop unreliable |
| Version history | Hardened | Restore an older version | Version restores as draft for review, not silently live | Unsafe rollback behavior |
| Approvals | Partial | Create an approval-required workflow and approve/reject it | Status changes correctly in list and detail views | Trust layer incomplete |
| Notifications | Partial | Open `/dashboard/notifications` and follow settings links | Notifications page works and routes into settings/recovery flows | Recovery UX feels disconnected |
| Health | Partial | Open `/dashboard/health` with good and broken workflows | Issues are visible and understandable | Users cannot trust the system |
| Usage | Partial | Open `/dashboard/usage` and compare with real activity | Usage reflects plan state and execution consumption reasonably | Billing trust problem |
| Settings | Partial | Update profile, billing access, and notifications | Changes save and billing actions work | Core account management broken |

---

## Billing and Payments

| Surface | Configured | Test step | Pass condition | Blocker |
|---|---|---|---|---|
| Paystack checkout API | Partial | Call `/api/checkout` through pricing or settings using a real signed-in user | Paystack checkout URL is returned for valid plans in KES | Users cannot upgrade |
| Paystack plans | External | Ensure every paid `PAYSTACK_PLAN_*` matches a live Paystack plan | Correct plan maps to correct billing amount and currency | Wrong billing or failed checkout |
| M-PESA payment automation | Partial | Send a sandbox STK push and receive callback | Daraja callback reaches `/api/webhooks/mpesa` and payment state is recorded | Kenya payment automation path incomplete |
| Paystack webhook | Partial | Trigger Paystack subscription/payment events | Profile plan/subscription state updates correctly for successful charges and subscription changes | Billing state drifts from Paystack |
| Stripe fallback | Optional | Enable only if `BILLING_PROVIDER=stripe` for a supported entity | Stripe checkout/webhooks still work when explicitly configured | International fallback billing unavailable |
| Payment UI | Partial | Upgrade, downgrade, cancel, and refresh account state | UI reflects current subscription and billing actions without stale state | Billing feels broken or misleading |

---

## Connections and Providers

### Provider-agnostic connection flow

| Surface | Configured | Test step | Pass condition | Blocker |
|---|---|---|---|---|
| Connections list | Partial | Open `/dashboard/settings?tab=connections` and `/dashboard/connect/[provider]` | Providers render with status and setup routes work | Users cannot discover or manage integrations |
| Secure setup | Partial | Use `/api/connections/secure-setup` with a real provider and secrets | Connection becomes active only after valid setup | Fake or broken connections |
| Connection verification by code | Partial | Request code, verify correct code, retry invalid code | Valid code activates connection; invalid attempts are limited and safe | OTP-based providers unreliable |
| Connection verification by link | Partial | Request email link and complete verification | Link activates the connection exactly once | Email-based verification unreliable |
| Connection deletion/update | Partial | Update and remove a connection | Own connections update/delete cleanly; missing connections return 404 | Users cannot recover or clean up integrations |

### Providers

| Provider | Configured | Test step | Pass condition | Blocker |
|---|---|---|---|---|
| Google | Partial | Complete OAuth, then use Gmail/Sheets action in a workflow | OAuth succeeds, secrets store correctly, native actions work | Major mainstream provider unusable |
| Microsoft | Partial | Complete OAuth and verify connection record | OAuth succeeds and connection activates | Microsoft users blocked |
| Slack | Partial | Complete OAuth and run a Slack send workflow | OAuth succeeds and message delivery works | Team notification workflows blocked |
| Shopify | Partial | Complete OAuth with a real store and run Shopify customer tagging path | OAuth succeeds and action works on real store data | Commerce workflows blocked |
| WhatsApp | Partial | Request OTP, verify number, send a message, test approval reply webhook | Connection activates, outbound delivery works, inbound replies resolve correctly | Messaging and approval loop broken |
| Kenya Calls & SMS | Partial | Request Kenya phone setup, verify an existing number by SMS OTP, send a test SMS reply | Local SMS is used first, Africa's Talking handles Kenya voice setup, Twilio is not required for Kenya launch | AI receptionist and SMS coworkers cannot launch cheaply |
| Yahoo Mail | Partial | Request email verification link | Link arrives and activates the connection | Secondary email path incomplete |
| Notion | Partial | Complete OAuth and verify connection record | OAuth succeeds and account is stored cleanly | Workspace connector incomplete |
| HubSpot | Partial | Complete OAuth and verify connection record | OAuth succeeds and account is stored cleanly | CRM connector incomplete |
| Airtable | Partial | Complete OAuth and verify connection record | OAuth succeeds and account is stored cleanly | Data-store connector incomplete |
| Meta | Partial | Complete OAuth and verify connection record | OAuth succeeds and account is stored cleanly | Social connector incomplete |
| Stripe Connect | Optional | Complete provider OAuth only for non-Kenya or fallback product flows | OAuth succeeds and account is stored cleanly | Optional fallback payment flows incomplete |
| M-PESA Daraja | Partial | Connect with sandbox Daraja credentials, verify callback URL, send STK push, receive callback | Daraja credentials validate, connection becomes active, STK push succeeds, callback hits `/api/webhooks/mpesa` | Payment automation path incomplete |

---

## Webhooks and Runtime

| Surface | Configured | Test step | Pass condition | Blocker |
|---|---|---|---|---|
| Generic webhook trigger | Partial | Trigger `/api/triggers/webhook/[path]` for an active workflow | Job enqueues and workflow runs | Trigger-based automations unreliable |
| Scheduler | Partial | Let a scheduled workflow reach execution time | Scheduler enqueues only valid active workflows | Scheduled automations do not run reliably |
| Internal worker | Partial | Call `/api/internal/worker` with valid worker secret | Queue jobs are processed and unauthorized access is blocked | Queue never drains or is exposed |
| Queue dead-letter behavior | Partial | Force repeated failures on a workflow | Retries back off and terminal failures stop retrying | Infinite retry loops or silent job loss |
| Replay path | Hardened | Replay a historical run | Replay uses current validation and refreshes UI properly | Recovery is unsafe or misleading |
| Version restore path | Hardened | Restore an old version and reactivate intentionally | Restore creates a safe draft review state | Rollback can accidentally publish broken workflows |

---

## Monitoring and Operations

| Surface | Configured | Test step | Pass condition | Blocker |
|---|---|---|---|---|
| Internal services status | Partial | Call `/api/internal/services/status` with worker secret | Service readiness reflects configured env accurately | Ops visibility incomplete |
| Error logging | Partial | Force handled errors in checkout, connections, and webhooks | Failures are visible in deployment logs with enough context | Production issues become hard to diagnose |
| Health dashboards | Partial | Review health and usage pages after several real runs | Operators can understand failures, usage, and connection state | No trustworthy operational visibility |
| Backup / recovery process | External | Confirm Supabase backup and restore strategy | Data recovery path is documented and available | No incident recovery story |

---

## Final Launch Gate

Dobly is ready for public launch only when:

- `npm run validate:env` passes in production
- `npm run smoke` passes against the deployed app
- `npm run typecheck` passes
- `npm run build` passes in the deployment environment
- Paystack checkout/webhook and M-PESA callback delivery are verified with live or sandbox-safe billing data
- All exposed providers have been tested at least once end-to-end
- WhatsApp and M-PESA paths have real callback verification
- Legal pages are present and acceptable for your operating jurisdictions
- Dashboard, workflow generation, activation, replay, versions, approvals, settings, and billing all pass manual QA

At that point, Dobly is not just coded. It is launchable.
