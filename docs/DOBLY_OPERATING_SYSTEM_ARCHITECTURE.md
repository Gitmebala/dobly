# Dobly Operating System Architecture

## Executive decision

The proposed Dobly model is better than the current workflow-platform direction, but only after one important correction:

`Dobly should not be built as freeform agents everywhere.`

The best architecture is:

`Owner intent -> compiled operating spec -> desks -> deterministic execution by default -> agent judgment only where needed -> memory and learning feed back into the next run`

This gives Dobly:
- lower serving cost
- stronger reliability
- clearer trust boundaries
- deeper business memory
- stronger switching costs

## Current method vs proposed method

### Current repo method

Strengths:
- prompt-to-workflow generation
- good connector thinking
- useful operator concepts
- real execution infrastructure already started

Weaknesses:
- still too workflow-centric
- too horizontal
- not centered enough on desks, signals, briefings, and standards
- product language still under-describes the real ambition

### Proposed method

Strengths:
- monopoly-grade product framing
- stronger emotional value
- stronger moat through business memory
- much better fit for the small-business owner reality

Risks if taken too literally:
- agent sprawl
- high runtime cost
- brittle autonomy
- weak explainability

### Chosen method

Dobly should be:
- desk-centric
- state-centric
- memory-centric
- compiled first
- agent-assisted where necessary

## Core product primitives

Dobly’s core nouns should be:
- workspace
- desk
- standard
- operating_spec
- customer
- supplier
- conversation
- lead
- booking
- order
- invoice
- payment
- signal
- briefing
- escalation
- approval
- decision
- memory_item
- learned_rule
- run

Workflows still exist, but as implementation details inside a larger operating model.

## Core product truth

The owner should not be building flows.
The owner should be setting standards.

Examples:
- every lead gets a meaningful response within 5 minutes
- every overdue invoice gets followed up correctly
- every supplier problem gets surfaced before it hurts customers

Dobly translates those standards into runtime behavior.

## Runtime architecture

### 1. Intent intake

Inputs:
- plain-English owner prompt
- inbound business event
- recurring scheduled trigger
- proactive signal

Outputs:
- desk ownership
- job classification
- operating model choice

Operating model choices:
- automation
- bounded agent
- hybrid
- report/briefing

### 2. Compiler

Dobly should compile prompts into durable operating specs.

Compiler responsibilities:
- classify the job
- infer owned entities
- identify desk ownership
- define deterministic steps
- isolate judgment points
- assign approvals and escalations
- define memory reads and writes
- choose connector lanes

### 3. Desk runtime

Each desk should own:
- entities
- standards
- playbooks
- allowed actions
- escalation boundaries
- memory scope
- metrics

### 4. Execution fabric

Execution lanes:
- native API
- browser
- generic HTTP/webhook
- local/desktop
- voice

Rule:
- cheapest reliable lane wins

### 5. Memory architecture

Use four layers:
- short-term run memory
- operational structured memory
- semantic retrieval memory
- synthesized learned memory

Recommended stack:
- Upstash Redis
- Supabase Postgres
- Pinecone or pgvector
- Supabase summary tables

### 6. Model routing

Best choice:
- small fast router model
- mid-tier operational reasoning model
- high-tier compilation and edge-case model

Most executions should never touch the most expensive model.

### 7. Learning loop

Every run should log:
- context
- actions
- outcomes
- overrides
- success/failure

Periodic jobs should:
- extract stable patterns
- promote them to deterministic rules
- update timing heuristics
- improve escalation thresholds
- enrich business memory

### 8. Trust architecture

Trust must be staged:
- stage 1: propose only
- stage 2: low-risk auto, medium-risk review
- stage 3: broad autonomy with edge-case escalation
- stage 4: owner decision patterns encoded into the system

## UI model

### Web
Use for:
- onboarding
- business memory
- desk configuration
- analytics
- auditability
- signal review

### Mobile
Use for:
- morning briefing
- operation feed
- approvals
- escalations
- light desk control

## Final product statement

Dobly should be built as:

`the operating system that turns owner intent into persistent business execution, while learning how the business works better over time`
