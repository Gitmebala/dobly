# Dobly Repo Structure Guide

This file explains how the current Dobly codebase is laid out, what the major folders are for, and what the important files define.

It is written for the repo as it exists today:
- part workflow builder
- part Dobly operating system
- part launch/marketing site
- part internal experimentation

The goal is not to pretend the structure is perfectly clean. The goal is to make it understandable enough that we can improve it confidently.

## 1. What this repo is

At a high level, this repo currently contains four products mixed together:

1. The public marketing site
2. The authenticated dashboard
3. The legacy workflow/automation platform
4. The newer Dobly "business engine / office / homebase" direction

That means the structure is functional, but it has overlap:
- older workflow concepts still exist
- newer Dobly operating-model concepts are layered on top
- docs describe the future architecture while the app still contains both old and new systems

## 2. Top-level folder map

```text
MOTION/
├─ docs/          Product, launch, environment, and architecture docs
├─ mobile/        Separate mobile app workspace
├─ public/        Static assets and embeddable browser assets
├─ scripts/       Local maintenance, validation, smoke, and worker scripts
├─ src/           Main web app source code
├─ supabase/      SQL schema and incremental schema files
├─ middleware.ts  Auth/session protection for web routes
├─ next.config.ts Next.js config and security headers
├─ package.json   App scripts and dependencies
└─ README.md      Setup and deployment overview
```

## 3. Root files

### [package.json](/C:/Users/balam/Desktop/MOTION/package.json)
Defines the app name, dependencies, and the main scripts:
- `dev`, `build`, `start`
- `typecheck`
- `validate:env`
- `smoke`
- `office:worker`

This is the fastest file to check when you want to know how the repo is meant to run.

### [README.md](/C:/Users/balam/Desktop/MOTION/README.md)
Defines the current setup story:
- Next.js app
- Supabase auth/data
- Anthropic
- Stripe
- Resend
- OAuth providers
- M-PESA / Daraja support

### [middleware.ts](/C:/Users/balam/Desktop/MOTION/middleware.ts)
Defines route protection and auth redirects.

What it does:
- refreshes Supabase auth on requests
- protects dashboard and selected API routes
- redirects logged-out users to `/auth/login`
- redirects logged-in users away from login/signup pages

### [next.config.ts](/C:/Users/balam/Desktop/MOTION/next.config.ts)
Defines global Next.js behavior and security headers.

Important things here:
- CSP
- HSTS
- permissions policy
- image host allowlist
- `reactStrictMode`

### [.env.example](/C:/Users/balam/Desktop/MOTION/.env.example)
Defines the environment variables the system expects.

### [components.json](/C:/Users/balam/Desktop/MOTION/components.json)
Defines the shadcn/ui component setup used by the frontend.

### Log and temp files in root
Files like:
- `.codex-dev-3002.log`
- `build-run.log`
- `dev-run.log`
- `tmpclaude-*`
- `tsconfig.tsbuildinfo`

These are not product source. They are runtime, debug, or temporary artifacts and should not drive architecture decisions.

## 4. `src/` overview

```text
src/
├─ app/         Next.js App Router pages and API routes
├─ components/  Reusable React UI pieces
├─ lib/         Business logic, connectors, runtime, orchestration, and helpers
├─ pages/       Legacy Pages Router remnants
└─ types/       Shared TypeScript types
```

This is the real product core.

## 5. `src/app/` - pages and API surfaces

`src/app` is the main Next.js App Router area.

### Core app files

#### [src/app/layout.tsx](/C:/Users/balam/Desktop/MOTION/src/app/layout.tsx)
Defines the global HTML shell for the whole app:
- fonts
- metadata
- theme bootstrapping
- analytics snippet
- `AppChrome`

#### [src/app/globals.css](/C:/Users/balam/Desktop/MOTION/src/app/globals.css)
Defines the global design tokens and base styling.

#### [src/app/page.tsx](/C:/Users/balam/Desktop/MOTION/src/app/page.tsx)
Defines the homepage / public landing entry.

#### [src/app/loading.tsx](/C:/Users/balam/Desktop/MOTION/src/app/loading.tsx)
Defines the global loading UI.

#### [src/app/error.tsx](/C:/Users/balam/Desktop/MOTION/src/app/error.tsx)
Defines the global error UI.

#### [src/app/not-found.tsx](/C:/Users/balam/Desktop/MOTION/src/app/not-found.tsx)
Defines the 404 page.

### Main route groups inside `src/app/`

#### `auth/`
Authentication UI pages:
- login
- signup
- forgot/reset password
- auth callback handling

#### `dashboard/`
The main authenticated product UI.

This is the most important product folder in the repo right now, and it contains both:
- older workflow-builder pages
- newer Dobly office / command-center pages

#### `api/`
The backend HTTP surface for the app.

This contains API routes for:
- auth
- workflows
- approvals
- connections
- billing
- chat/widget
- business memory
- departments
- coworkers
- office/homebase
- webhooks
- internal worker/scheduler services

#### `admin/`
Admin-facing product pages.

#### `for/`, `pricing/`, `privacy/`, `security/`, `terms/`, `subprocessors/`, `cookies/`
Marketing and legal pages.

## 6. `src/app/dashboard/` - the main product surface

This folder is where the product story is most mixed.

There are effectively two dashboard layers:

1. The older workflow automation dashboard
2. The newer Dobly command-center / office / homebase dashboard

### Important dashboard files

#### [src/app/dashboard/layout.tsx](/C:/Users/balam/Desktop/MOTION/src/app/dashboard/layout.tsx)
Defines the authenticated dashboard shell:
- auth check
- profile lookup
- sidebar
- mobile dock

This is the shared wrapper for most logged-in pages.

#### [src/app/dashboard/page.tsx](/C:/Users/balam/Desktop/MOTION/src/app/dashboard/page.tsx)
Defines the current main dashboard entry.

What it does:
- loads Supabase user/profile
- builds Homebase dashboard data via `buildHomebaseDashboardData`
- renders `DoblyCommandCenter`

This is one of the clearest signs that the product is moving from workflow builder to operational command center.

#### [src/app/dashboard/DoblyDashboardPage.tsx](/C:/Users/balam/Desktop/MOTION/src/app/dashboard/DoblyDashboardPage.tsx)
Defines another Dobly dashboard entry built from:
- workflows
- runs
- approvals
- connections
- versions
- workspace snapshot logic

This is more snapshot-oriented and still tied to the workflow platform data model.

#### [src/app/dashboard/DoblyDashboardClient.tsx](/C:/Users/balam/Desktop/MOTION/src/app/dashboard/DoblyDashboardClient.tsx)
Client UI for the snapshot-style dashboard.

#### [src/app/dashboard/DoblyLayout.tsx](/C:/Users/balam/Desktop/MOTION/src/app/dashboard/DoblyLayout.tsx)
Alternative or evolving dashboard layout abstraction.

### Key dashboard subfolders

#### `workflows/`
Legacy and still-important workflow platform UI:
- workflow list
- workflow builder/config
- connections
- runs
- executions
- versions
- audit
- costs
- templates
- schedules

#### `departments/`
Department-oriented operational UI.

#### `coworkers/`
Worker/coworker management UI.

#### `memory/`
Business memory UI.

#### `briefings/`
Executive / owner-facing summaries.

#### `channels/`
Business channel setup and management.

#### `pods/`
Pod-oriented operational surfaces.

#### `reports/`, `analytics/`, `health/`, `approvals/`
Visibility, performance, and governance views.

### Practical interpretation

If you are trying to understand the product direction:
- `dashboard/workflows/*` tells you where Dobly came from
- `dashboard/departments/*`, `dashboard/coworkers/*`, `dashboard/memory/*`, and `dashboard/page.tsx` tell you where Dobly is trying to go

## 7. `src/app/api/` - backend route structure

This is the server-side HTTP API surface used by the frontend and integrations.

### Naming convention

In Next.js App Router:
- every `route.ts` file defines an API endpoint
- nested folders define the URL path

Example:
- `src/app/api/workflows/[id]/run/route.ts`
- becomes `/api/workflows/:id/run`

### Main API domains

#### `api/workflows/`
Workflow CRUD and execution endpoints.

Represents the older and still-central workflow runtime.

#### `api/connections/` and `api/oauth/`
Connection setup, verification, and OAuth provider flows.

This is the integrations layer.

#### `api/approvals/`
Approval queue and decision endpoints.

This is a key trust/governance layer.

#### `api/office/`
The newer Dobly operational layer.

Important subareas:
- `boardroom`
- `command`
- `departments`
- `events`
- `general-manager`
- `snapshot`
- `tasks`
- `workers`

This is where the repo starts looking like a business operating system rather than just a workflow app.

#### `api/coworkers/`
Coworker lifecycle, health, shadow mode, and simulation endpoints.

This is important for the governed-autonomy direction.

#### `api/business-memory/`
Institutional memory endpoints.

#### `api/briefings/`
Summary and briefing endpoints.

#### `api/departments/`, `api/department-records/`, `api/signals/`, `api/standards/`
Operational intelligence and structured business-state surfaces.

#### `api/webhooks/`
Inbound webhook endpoints for third-party systems.

Notable integrations visible in the folder structure:
- Stripe
- Twilio
- WhatsApp
- Meta
- M-PESA

#### `api/internal/`
Internal service routes for agents, scheduler, worker execution, and status checks.

This is infrastructure-facing rather than end-user-facing.

## 8. `src/components/` - reusable UI

This folder contains the React building blocks for the app.

### Main component areas

#### `components/dashboard/`
The most important component folder right now.

Notable files:

##### [src/components/dashboard/DoblyCommandCenter.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/DoblyCommandCenter.tsx)
Main command-center style dashboard component.

##### [src/components/dashboard/HomebaseGraph.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/HomebaseGraph.tsx)
Defines the visual "living map" style graph of departments, workers, and recent events.

What it currently does:
- places departments on a graph
- places workers around departments
- places recent event nodes
- draws connections between the operating rooms

This is one of the most important product-surface files in the repo because it is the seed of the "living business map."

##### [src/components/dashboard/HomebaseCommandCenter.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/HomebaseCommandCenter.tsx)
Command-center UI around homebase data.

##### [src/components/dashboard/HomebaseCockpit.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/HomebaseCockpit.tsx)
Cockpit-style business overview surface.

##### [src/components/dashboard/DoblySidebar.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/DoblySidebar.tsx)
Primary dashboard navigation for the newer Dobly shell.

##### [src/components/dashboard/Sidebar.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/Sidebar.tsx)
Older sidebar component still present in the repo.

##### [src/components/dashboard/DepartmentBuilderClient.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/DepartmentBuilderClient.tsx)
Department configuration UI.

##### [src/components/dashboard/BusinessMemoryClient.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/BusinessMemoryClient.tsx)
Institutional memory management UI.

##### [src/components/dashboard/BusinessChannelsClient.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/BusinessChannelsClient.tsx)
Business channels configuration UI.

##### [src/components/dashboard/HireOfficeWorkerButton.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/HireOfficeWorkerButton.tsx)
Action surface for adding office workers/coworkers.

##### [src/components/dashboard/OfficeTaskDecisionButtons.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/OfficeTaskDecisionButtons.tsx)
Approval and decision controls for office tasks.

##### [src/components/dashboard/OfficeTaskRunButton.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/OfficeTaskRunButton.tsx)
Task execution trigger UI.

##### [src/components/dashboard/PodLaunchButton.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/PodLaunchButton.tsx)
Pod launch UI.

##### [src/components/dashboard/WorkflowEditor.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/WorkflowEditor.tsx)
Legacy workflow editing UI that still matters because the workflow system is still in the product.

#### `components/landing/`
Homepage and marketing-site sections.

Examples:
- hero surfaces
- feature sections
- use cases
- product comparison blocks

#### `components/shared/`
Cross-app shared layout and chrome components.

Notable file:
- [src/components/shared/AppChrome.tsx](/C:/Users/balam/Desktop/MOTION/src/components/shared/AppChrome.tsx)

#### `components/connections/`
Connection onboarding/setup UI.

#### `components/ui/`
Low-level UI primitives and wrappers.

## 9. `src/lib/` - the actual system brain

This is the densest folder in the repo. If `src/app` is the surface, `src/lib` is the operating logic.

The library layer currently mixes:
- classic helpers
- workflow generation/runtime logic
- connectors/integrations
- operational office/homebase logic
- trust/safety logic
- product-theory models

### A. Core product modeling files

#### [src/lib/dobly-operating-model.ts](/C:/Users/balam/Desktop/MOTION/src/lib/dobly-operating-model.ts)
Defines Dobly work talents and the shape of an operating model.

What it contains:
- work talent taxonomy
- operating-model interface
- prompt-to-talent inference
- contracts for approvals, updates, learning, access

This file is important because it tries to define what Dobly actually is at the product-model level.

#### [src/lib/dobly-product-model.ts](/C:/Users/balam/Desktop/MOTION/src/lib/dobly-product-model.ts)
Defines or supports the higher-level Dobly product abstraction.

#### [src/lib/dobly-core.ts](/C:/Users/balam/Desktop/MOTION/src/lib/dobly-core.ts)
Core Dobly domain logic and shared primitives.

#### [src/lib/dobly-ops.ts](/C:/Users/balam/Desktop/MOTION/src/lib/dobly-ops.ts)
Builds workspace-level summaries and generation briefs from:
- profile
- business profile
- workflows
- approvals
- connections
- versions

This bridges current workflow data into a Dobly-flavored operating summary.

### B. Generation and workflow-definition files

#### [src/lib/generation.ts](/C:/Users/balam/Desktop/MOTION/src/lib/generation.ts)
Analyzes user prompts and classifies them into models like:
- automation
- agent
- pipeline
- hybrid
- report

It also:
- detects likely segment/vertical
- proposes clarifying questions
- suggests provider connections

This is the prompt-to-system design layer.

#### [src/lib/workflow-definition.ts](/C:/Users/balam/Desktop/MOTION/src/lib/workflow-definition.ts)
Defines the structure of a workflow blueprint/definition.

#### [src/lib/starter-templates.ts](/C:/Users/balam/Desktop/MOTION/src/lib/starter-templates.ts)
Defines starter templates for workflow or operating setup.

#### [src/lib/versioning.ts](/C:/Users/balam/Desktop/MOTION/src/lib/versioning.ts)
Versioning logic for workflow definitions and changes.

### C. Execution/runtime files

#### [src/lib/execution.ts](/C:/Users/balam/Desktop/MOTION/src/lib/execution.ts)
General workflow execution logic.

#### [src/lib/execution-engine.ts](/C:/Users/balam/Desktop/MOTION/src/lib/execution-engine.ts)
Defines a more explicit worker execution engine:
- worker sandbox
- worker lifecycle manager
- worker instance loop

This is part of the repo's evolution from simple workflow runs to more persistent worker behavior.

#### `src/lib/runtime/`
Runtime support files:
- `planner.ts`
- `records.ts`
- `state.ts`

These appear to support runtime planning, state tracking, and records.

#### [src/lib/queue.ts](/C:/Users/balam/Desktop/MOTION/src/lib/queue.ts)
Queue-related execution support.

#### [src/lib/worker-state.ts](/C:/Users/balam/Desktop/MOTION/src/lib/worker-state.ts)
Tracks or defines worker state.

### D. Office / homebase / operating-system files

This is one of the most important clusters in the repo.

#### `src/lib/office/`
Contains the main operational-business runtime.

Key files:

##### [src/lib/office/homebase.ts](/C:/Users/balam/Desktop/MOTION/src/lib/office/homebase.ts)
Builds the main command-center data model:
- departments
- workers
- tasks
- events
- room visuals
- snapshot aggregation

This is a key translation layer between database state and the dashboard command center.

##### [src/lib/office/departments.ts](/C:/Users/balam/Desktop/MOTION/src/lib/office/departments.ts)
Defines office departments and worker templates.

##### [src/lib/office/events.ts](/C:/Users/balam/Desktop/MOTION/src/lib/office/events.ts)
Loads and shapes office event records.

##### [src/lib/office/snapshot.ts](/C:/Users/balam/Desktop/MOTION/src/lib/office/snapshot.ts)
Builds office snapshot summaries.

##### [src/lib/office/runtime.ts](/C:/Users/balam/Desktop/MOTION/src/lib/office/runtime.ts)
Defines the office runtime behavior.

##### [src/lib/office/agent-runtime.ts](/C:/Users/balam/Desktop/MOTION/src/lib/office/agent-runtime.ts)
Agent-oriented office runtime behavior.

##### [src/lib/office/tool-executor.ts](/C:/Users/balam/Desktop/MOTION/src/lib/office/tool-executor.ts)
Tool execution support inside the office model.

##### [src/lib/office/intelligence.ts](/C:/Users/balam/Desktop/MOTION/src/lib/office/intelligence.ts)
Business-intelligence style logic for the office model.

##### [src/lib/office/pod-bridge.ts](/C:/Users/balam/Desktop/MOTION/src/lib/office/pod-bridge.ts)
Bridge logic between office and pods.

### E. Memory, signals, simulation, and safety

#### [src/lib/business-memory.ts](/C:/Users/balam/Desktop/MOTION/src/lib/business-memory.ts)
Defines the institutional memory model:
- memory kinds
- scopes
- metadata shape
- tag normalization
- memory search text

This is one of the most strategically important files in the repo because it encodes the beginnings of Dobly's non-transferable business memory.

#### `src/lib/signals/`
Signal-oriented logic for business monitoring.

#### `src/lib/shadow-mode/service.ts`
Shadow-mode support for governed autonomy.

#### `src/lib/simulations/service.ts`
Simulation support for previewing actions before execution.

#### [src/lib/verification-layer.ts](/C:/Users/balam/Desktop/MOTION/src/lib/verification-layer.ts)
Defines verification and safety concepts:
- verification results
- safety policies
- action checks
- hallucination / fact-checking patterns

This is part of the trust architecture.

#### `src/lib/safety/`
Additional safety-related logic.

### F. Integrations and connectors

#### `src/lib/connectors/`
Connector implementation layer.

Subfolders:
- `generic/`
- `native/`

Examples of visible native providers:
- Google
- HubSpot
- Shopify
- Stripe

#### [src/lib/connections.ts](/C:/Users/balam/Desktop/MOTION/src/lib/connections.ts)
Shared connection logic.

#### [src/lib/connection-catalog.ts](/C:/Users/balam/Desktop/MOTION/src/lib/connection-catalog.ts)
Catalog of available integrations/providers.

#### [src/lib/connection-requirements.ts](/C:/Users/balam/Desktop/MOTION/src/lib/connection-requirements.ts)
What each provider needs in order to connect or run.

#### [src/lib/oauth-service.ts](/C:/Users/balam/Desktop/MOTION/src/lib/oauth-service.ts)
OAuth flow logic.

#### `src/lib/providers/`
Provider-specific abstractions and helpers.

#### `src/lib/webhooks/`
Webhook-related helpers.

### G. Billing, workspaces, and admin

#### [src/lib/workspaces.ts](/C:/Users/balam/Desktop/MOTION/src/lib/workspaces.ts)
Defines workspace membership, roles, permissions, and seat checks.

This is important because the repo is no longer just single-user workflow automation. It is moving toward team/workspace operation.

#### `src/lib/billing/`
Plan and entitlement logic.

#### [src/lib/plans.ts](/C:/Users/balam/Desktop/MOTION/src/lib/plans.ts)
Plan definitions.

#### [src/lib/stripe.ts](/C:/Users/balam/Desktop/MOTION/src/lib/stripe.ts)
Stripe integration support.

#### `src/lib/admin/`
Admin support logic.

### H. Records and reporting

#### [src/lib/record-actions.ts](/C:/Users/balam/Desktop/MOTION/src/lib/record-actions.ts)
Structured action recording.

#### [src/lib/record-outcomes.ts](/C:/Users/balam/Desktop/MOTION/src/lib/record-outcomes.ts)
Structured outcome recording.

#### [src/lib/executive-reporting.ts](/C:/Users/balam/Desktop/MOTION/src/lib/executive-reporting.ts)
Executive-facing reporting logic.

#### [src/lib/business-health-dashboard.ts](/C:/Users/balam/Desktop/MOTION/src/lib/business-health-dashboard.ts)
Business health aggregation logic.

## 10. `src/types/`

Contains the shared TypeScript data models used across the frontend and backend.

Important file:

### [src/types/index.ts](/C:/Users/balam/Desktop/MOTION/src/types/index.ts)
Shared types for workflows, runs, connections, approvals, and other core records.

## 11. `supabase/` - database schema

This folder contains the database structure for the product.

### Important files

#### [supabase/schema.sql](/C:/Users/balam/Desktop/MOTION/supabase/schema.sql)
The main baseline schema.

Visible core entities near the top:
- `profiles`
- `business_profiles`
- `workflows`
- `workflow_runs`
- `usage_logs`

It also enables RLS and defines policies.

#### [supabase/dobly_operating_system_schema.sql](/C:/Users/balam/Desktop/MOTION/supabase/dobly_operating_system_schema.sql)
Schema additions for the newer Dobly operating-system model.

#### [supabase/business_memory_items.sql](/C:/Users/balam/Desktop/MOTION/supabase/business_memory_items.sql)
Business memory schema additions.

#### [supabase/business_channel_connections.sql](/C:/Users/balam/Desktop/MOTION/supabase/business_channel_connections.sql)
Business channel connection schema additions.

#### [supabase/workspace_members.sql](/C:/Users/balam/Desktop/MOTION/supabase/workspace_members.sql)
Workspace membership schema additions.

#### [supabase/usage_events.sql](/C:/Users/balam/Desktop/MOTION/supabase/usage_events.sql)
Usage-event schema additions.

#### [supabase/briefings_user_schema_migration.sql](/C:/Users/balam/Desktop/MOTION/supabase/briefings_user_schema_migration.sql)
Briefing-related schema migration.

### Practical interpretation

The database tells the same story as the frontend:
- older workflow tables still exist and matter
- newer business-memory, workspace, office, and operating-system tables are being layered in

## 12. `docs/` - product thinking and launch docs

This folder is important because it contains a lot of the repo's real product intent.

Notable docs:

### [docs/DOBLY_OPERATING_SYSTEM_ARCHITECTURE.md](/C:/Users/balam/Desktop/MOTION/docs/DOBLY_OPERATING_SYSTEM_ARCHITECTURE.md)
Explains the target architectural direction:
- desk-centric
- state-centric
- memory-centric
- compiled first
- agent-assisted where necessary

### [docs/DOBLY_FULL_PRODUCT_BUILD_MAP.md](/C:/Users/balam/Desktop/MOTION/docs/DOBLY_FULL_PRODUCT_BUILD_MAP.md)
Likely a larger product build plan.

### [docs/NAVIGATION_ARCHITECTURE.md](/C:/Users/balam/Desktop/MOTION/docs/NAVIGATION_ARCHITECTURE.md)
Navigation structure thinking.

### [docs/UI_DESIGN_SYSTEM.md](/C:/Users/balam/Desktop/MOTION/docs/UI_DESIGN_SYSTEM.md)
Design system guidance.

### [docs/STACK_AND_SETUP.md](/C:/Users/balam/Desktop/MOTION/docs/STACK_AND_SETUP.md)
Technical stack/setup guide.

### [docs/DOBLY_LAUNCH_SETUP.md](/C:/Users/balam/Desktop/MOTION/docs/DOBLY_LAUNCH_SETUP.md)
Launch preparation/setup guide.

### [docs/LAUNCH_READINESS.md](/C:/Users/balam/Desktop/MOTION/docs/LAUNCH_READINESS.md)
Launch-readiness checklist.

### Why this folder matters

The codebase does not yet fully match the product thesis in the docs.
So when we plan cleanup or launch, we need to compare:
- what the docs say Dobly should become
- what the code currently supports

## 13. `scripts/`

Utility scripts for running and validating the project.

### [scripts/clean-next.mjs](/C:/Users/balam/Desktop/MOTION/scripts/clean-next.mjs)
Cleans Next.js build/cache artifacts.

### [scripts/validate-env.mjs](/C:/Users/balam/Desktop/MOTION/scripts/validate-env.mjs)
Checks whether required environment variables are present.

### [scripts/smoke-test.mjs](/C:/Users/balam/Desktop/MOTION/scripts/smoke-test.mjs)
Basic smoke-test script.

### [scripts/office-worker.mjs](/C:/Users/balam/Desktop/MOTION/scripts/office-worker.mjs)
Worker-oriented runtime script for the office model.

## 14. `public/`

Static web assets.

Notable assets already visible:
- `dobly-hero-scene.svg`
- `dobly-widget.js`
- `dobly-dashboard-ui-proposal.svg`

This suggests the repo includes both branded visuals and at least one embeddable/web widget surface.

## 15. `mobile/`

This is a separate mobile app workspace, likely Expo/React Native based on the folder names:
- `.expo`
- `android`
- `assets`
- `components`
- `src`

It should be treated as its own product surface, not as part of the main web app structure.

## 16. Naming conventions that matter

### In `src/app/`
- `page.tsx` = route page
- `layout.tsx` = shared wrapper for child routes
- `loading.tsx` = loading UI
- `error.tsx` = error boundary UI
- `route.ts` = API endpoint

### In `src/components/`
- most files are presentational or interactive UI components
- files ending in `Client.tsx` usually hold client-side stateful UI

### In `src/lib/`
- plain `.ts` files usually define business rules, runtime logic, adapters, or domain models

## 17. Messy areas to be aware of

These are the main structure issues visible right now.

### 1. Two overlapping product models
The repo still contains both:
- workflow-builder logic
- Dobly office/business-engine logic

That is why the dashboard and lib layers feel crowded.

### 2. Duplicate or competing dashboard abstractions
Examples:
- `layout.tsx` and `DoblyLayout.tsx`
- `Sidebar.tsx` and `DoblySidebar.tsx`
- `page.tsx` and `DoblyDashboardPage.tsx`

This suggests migration is in progress rather than complete.

### 3. Docs are ahead of code
The architecture docs describe a cleaner future model than the codebase currently expresses.

### 4. Stray/generated-looking directories
There appear to be odd paths such as:
- `src/{app`

That likely means there are accidental or malformed directories from a previous generation or file operation and they should be audited before launch.

### 5. Root clutter
The root has many logs and temporary artifacts. That makes the repo feel more chaotic than it needs to.

## 18. The shortest mental model

If you need a fast way to think about the repo, use this:

- `src/app/page.tsx` and `src/components/landing/*` = public website
- `src/app/dashboard/*` and `src/components/dashboard/*` = product UI
- `src/app/api/*` = backend HTTP surface
- `src/lib/*` = the real business logic
- `supabase/*` = the database contract
- `docs/*` = the future product/launch thesis

And inside the product itself:

- `workflows` = where Dobly started
- `office/homebase/departments/coworkers/memory` = where Dobly is heading

## 19. What to read first if you are trying to improve Dobly

If we are going to make Dobly better from here, these are the highest-signal files to read first:

1. [src/app/dashboard/page.tsx](/C:/Users/balam/Desktop/MOTION/src/app/dashboard/page.tsx)
2. [src/components/dashboard/DoblyCommandCenter.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/DoblyCommandCenter.tsx)
3. [src/components/dashboard/HomebaseGraph.tsx](/C:/Users/balam/Desktop/MOTION/src/components/dashboard/HomebaseGraph.tsx)
4. [src/lib/office/homebase.ts](/C:/Users/balam/Desktop/MOTION/src/lib/office/homebase.ts)
5. [src/lib/business-memory.ts](/C:/Users/balam/Desktop/MOTION/src/lib/business-memory.ts)
6. [src/lib/dobly-operating-model.ts](/C:/Users/balam/Desktop/MOTION/src/lib/dobly-operating-model.ts)
7. [src/lib/generation.ts](/C:/Users/balam/Desktop/MOTION/src/lib/generation.ts)
8. [src/app/api/office/*](/C:/Users/balam/Desktop/MOTION/src/app/api/office)
9. [supabase/dobly_operating_system_schema.sql](/C:/Users/balam/Desktop/MOTION/supabase/dobly_operating_system_schema.sql)
10. [docs/DOBLY_OPERATING_SYSTEM_ARCHITECTURE.md](/C:/Users/balam/Desktop/MOTION/docs/DOBLY_OPERATING_SYSTEM_ARCHITECTURE.md)

## 20. Bottom line

The repo is not random. It has a real shape.

That shape is:
- a mature enough Next.js app
- a real workflow platform foundation
- a newer operating-system layer being built on top
- a strong product thesis that is only partially reflected in the current file structure

That is actually a good place to be.
It means the next step is not "start over."
The next step is:
- clarify ownership of the major folders
- collapse duplicate surfaces
- promote the Dobly operating-system path to the primary architecture
- remove root and directory noise before launch
