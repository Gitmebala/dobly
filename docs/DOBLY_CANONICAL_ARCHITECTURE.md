# Dobly Canonical Architecture

Dobly has one product model now:

**Spaces -> Operators -> Loops -> Runs -> Approvals -> Artifacts -> Connections -> Memory**

## Product Promise

Tell Dobly what you want handled. Dobly creates the Operator and keeps the work moving.

## Canonical Objects

- **Spaces**: business, work, life, family, or project contexts.
- **Operators**: the main user-facing object. An Operator owns a mission, outcome, tools, guardrails, memory policy, approval mode, and capabilities.
- **Loops**: recurring or event-based systems an Operator runs.
- **Runs**: durable executions picked up by the queue/worker runtime.
- **Approvals**: unified gates for risky actions.
- **Artifacts**: outputs Dobly creates and versions.
- **Connections**: accounts, APIs, MCP servers, browser sessions, OAuth apps, and internal capabilities.
- **Memory**: approved knowledge Dobly can reuse.

## Layer Consolidation

- Old workflows become Loop blueprints.
- Old automations become scheduled Loops.
- Old agents and coworkers become Operators.
- Homebase becomes the command center, not a separate product concept.
- Runtime workers, queues, approvals, artifacts, research, media, voice, memory, and MCP stay hidden engine infrastructure.
- Universal MCP is not the product wedge. It is how Operators can use software when needed.

## User-Facing Language

- Say **Operator** when the user is creating something to handle work.
- Say **Loop** only when describing recurring or event-based behavior.
- Do not say worker, coworker, API, MCP, node, webhook, or automation in primary user-facing flows unless it is a technical/admin screen.
