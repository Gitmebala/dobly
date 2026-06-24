# OpenSwarm Adaptation Plan For Dobly

## Decision

OpenSwarm is a useful reference model for `specialist agents + orchestration + output generation`.

Dobly should borrow that layer, but not copy its product framing wholesale.

The right synthesis is:

`Dobly = company memory + operating standards + bounded specialist agents + connected execution`

OpenSwarm is strongest where it provides:
- specialist output agents
- orchestration patterns
- tool-connected task routing
- one-prompt-to-many-deliverables workflows

Dobly is strongest where this repo already goes further:
- workspace memory
- desk and department structure
- approvals and auditability
- connector governance
- durable operating state
- business-specific execution surfaces

## What To Borrow

Use OpenSwarm as inspiration for a `creative and knowledge swarm` inside Dobly.

Best candidates:
- research agent
- data analyst agent
- slides agent
- docs agent
- image generation agent
- video generation agent
- orchestrator pattern for multi-output jobs

These fit Dobly especially well for requests like:
- "Research the market, write the brief, make the deck, and draft the launch email."
- "Analyze this month's numbers, create charts, write the report, and prepare board slides."
- "Turn product notes into docs, visuals, and campaign assets."

## What Not To Copy

Dobly should not become a generic swarm shell.

Avoid:
- freeform agent sprawl
- every task becoming multi-agent by default
- weak permission boundaries
- memory that lives only inside prompts
- output generation detached from the business graph

OpenSwarm is a strong output engine.
Dobly should remain a stronger operating system.

## Product Positioning

The market message should be:

`Dobly is the platform where a business keeps its memory, runs its departments, and generates the artifacts needed to move the company forward.`

That is stronger than:
- invoice maker
- email summarizer
- workflow builder
- generic chat agent

## Recommended Architecture

### 1. Keep Dobly's core runtime

Continue centering:
- workspace
- department
- operator
- business memory
- signals
- approvals
- runs
- standards

### 2. Add a specialist creation layer

Create a new capability family under Dobly for:
- deep research
- analytics
- slide generation
- document generation
- image generation
- video generation
- code generation

This layer should be callable from:
- `/dashboard/generate`
- operator chat
- department workflows
- boardroom and briefing surfaces
- office task execution

### 3. Put orchestration behind the compiler

Dobly should decide when to use one specialist versus a small swarm.

Routing rule:
- single bounded task -> one operator
- multi-artifact request -> orchestrated specialist run
- business-critical process -> deterministic workflow with agent checkpoints

### 4. Make outputs first-class artifacts

Every generated output should write back into Dobly as an artifact with:
- source request
- owning department
- linked entities
- memory references used
- approval state
- outcome metadata

That is how the system becomes a company brain instead of a disposable generator.

## Suggested Implementation Phases

### Phase 1: Product story

Tighten UI and copy around:
- company brain
- living institutional memory
- multi-department execution
- research, docs, slides, image, video, code outputs

### Phase 2: Capability contracts

Extend existing capability and operator contracts to include:
- `research`
- `analytics`
- `slides`
- `docs`
- `images`
- `video`
- `code`

### Phase 3: Artifact pipeline

Standardize generated output storage through a shared artifact contract so every specialist writes into the same system.

### Phase 4: Orchestrated runs

Add a planner that can compose specialist jobs into one run, for example:
- research -> brief -> deck -> email
- analyze -> report -> chart pack -> board summary
- transcript -> doc -> visual assets -> publishing plan

### Phase 5: Memory feedback

Log:
- which source materials were used
- which outputs were approved
- which outputs were edited by humans
- what final artifacts performed best

Then use that to improve future runs.

## Concrete Repo Fit

This repo already contains strong foundations for the adaptation:
- `src/lib/business-memory.ts`
- `src/lib/runtime/`
- `src/lib/office/`
- `src/lib/pods/`
- `src/lib/skills/`
- `src/app/api/runtime/`
- `src/app/api/office/`
- `src/app/api/generate/route.ts`

That means the best next move is not a rewrite.
It is a careful expansion of the capability model and output orchestration.

## Bottom Line

Use OpenSwarm as a reference for specialist-agent composition and artifact generation.

Keep Dobly differentiated by making those agents live inside:
- business memory
- operating standards
- department ownership
- approvals
- audit trails
- reusable execution infrastructure

That is how Dobly becomes not just an agent tool, but the place a company actually runs from.
