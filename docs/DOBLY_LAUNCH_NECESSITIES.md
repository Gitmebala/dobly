# Dobly Launch Necessities

This is the production plumbing checklist that should exist around the product, separate from the AI/coworker features.

## Product analytics

Implemented:
- Browser PostHog loading through `src/components/analytics/PostHogSnippet.tsx`.
- Route-change page views through `src/components/analytics/PostHogRouteTracker.tsx`.
- Signed-in user identification through `/api/telemetry/identity`.
- Server-side event capture through `/api/telemetry/event` and `src/lib/telemetry/server.ts`.
- Analytics readiness in `/api/internal/services/status`.

Launch defaults:
- Keep `NEXT_PUBLIC_POSTHOG_AUTOCAPTURE=false` to control event volume.
- Keep `NEXT_PUBLIC_POSTHOG_SESSION_REPLAY=false` until onboarding testing needs replay.
- Set `NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT=true` if you want explicit consent before capture.

Required keys to add:
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- Optional: `POSTHOG_PROJECT_API_KEY`

## Operational visibility

Before launch, verify:
- `/api/internal/services/status` works with `x-dobly-internal: WORKER_SECRET`.
- `npm run validate:env` prints analytics status.
- `npm run smoke` passes against the deployed URL.
- Worker deployment is outside the request lifecycle and `DOBLY_WORKER_DEPLOYED=true`.

## Cost control

Keep high-volume tools off by default:
- PostHog autocapture off.
- PostHog session replay off.
- Voice and media generation only triggered by explicit user workflows.
- Server telemetry reserved for important lifecycle events, failures, activations, payments, launches, and approvals.

## Events worth tracking first

Track these before adding noise:
- `signup_completed`
- `workspace_created`
- `department_launched`
- `coworker_created`
- `connection_started`
- `connection_completed`
- `runtime_task_started`
- `runtime_task_completed`
- `runtime_task_failed`
- `approval_created`
- `approval_decided`
- `checkout_started`
- `subscription_activated`
- `onboarding_step_completed`
