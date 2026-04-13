# Dobly Launch Board

Last updated: April 4, 2026

Use this board during deployment week. Update `Done`, `Owner`, and `Notes` as tasks move.

## Platform And Launch Ops

| Done | Owner | Item | Notes |
|---|---|---|---|
| Working | Engineering | Production env vars completed and validated | Validator exists; live env values still need to be added and verified. |
| Working | Engineering | Typecheck, build, and smoke tests pass in the deploy environment | Final pass depends on real deploy env and real provider callbacks. |
| Working | Ops | Production domain, DNS, TLS, redirects, and callback URLs verified | All product, billing, OAuth, and legal links should use one clean production URL. |
| Working | Ops | Error monitoring, alert ownership, and on-call contact defined | The app has readiness checks, but launch-day ownership still needs to be explicit. |

## Commercial And Company Ops

| Done | Owner | Item | Notes |
|---|---|---|---|
| External | Founder | Company formation, banking, tax IDs, and bookkeeping stack in place | Outside the repo, but required before scaling paid subscriptions. |
| Working | Engineering | Stripe live products, prices, checkout, and webhook events verified | Code exists; live dashboard setup and end-to-end verification remain. |
| Working | Founder | Cancellation, renewal, refund, and billing-support expectations documented | Terms exist, but subscription operations policy still needs sharpening. |
| Working | Ops | Customer support inbox and escalation ownership confirmed | Contact links exist; response ownership and timing still need a rule. |

## Legal, Privacy, And Trust

| Done | Owner | Item | Notes |
|---|---|---|---|
| Yes | Legal | Terms, privacy, and cookie pages are live | Linked from signup and footer. |
| Yes | Engineering | Public security page and vulnerability disclosure path are live | Security page and `security.txt` are now in the repo. |
| Yes | Legal | Subprocessors and core data-handling dependencies are published | Public subprocessor list is now live in-app. |
| Working | Founder | DPA workflow and data-access or deletion request process are defined | Needs an actual operational handling process, not just policy text. |

## Security And Resilience

| Done | Owner | Item | Notes |
|---|---|---|---|
| External | Founder | MFA and least-privilege access are enforced for admin accounts | Must be completed in every provider dashboard, not just the app. |
| Working | Ops | Backup and restore process is documented and tested | Needs a real production restore drill. |
| Working | Ops | Incident response and customer communication playbook exist | Still needs a practical step-by-step operating runbook. |
| Yes | Engineering | `security.txt` is published under `.well-known` | Standardized disclosure path now exists. |

## Product QA And Provider Verification

| Done | Owner | Item | Notes |
|---|---|---|---|
| Working | Engineering | Route-by-route manual QA completed across landing, auth, billing, settings, and workflows | Needs to be recorded against the live deployment. |
| Working | Engineering | Accessibility pass completed for keyboard flow, focus, contrast, and reduced motion | Should be done deliberately, not assumed. |
| Working | Engineering | Mobile and tablet responsive QA completed on critical pages | Test real phone widths before launch. |
| Working | Engineering | Live provider verification completed for Stripe, OAuth providers, WhatsApp, and M-PESA | Code paths are in place; real credentials and callbacks are still the final step. |
