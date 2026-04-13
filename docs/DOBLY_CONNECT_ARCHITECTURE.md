# Dobly Connect Architecture

Dobly Connect is the execution model for broad automation coverage:

- 40% native API connectors
- 30% browser automation connectors
- 20% generic HTTP / webhook / file / email connectors
- 10% desktop / local-agent connectors

## Execution lanes

### Native
Best for Google, Microsoft, Slack, Shopify, WhatsApp, Resend, Stripe, GitHub, Notion.

Properties:
- OAuth or API-key backed
- Typed input/output
- Stable triggers/actions

### Browser
Best for tools with weak, expensive, or missing APIs.

Properties:
- Runs through a user-authorized browser agent
- Uses page models and task instructions
- Keeps actions bound to user-owned sessions

### Generic
Best for long-tail compatibility.

Properties:
- HTTP requests
- Webhook triggers
- File writes / exports
- Email sends

### Local
Best for desktop apps, legacy software, and machine-bound workflows.

Properties:
- Runs on a user device
- Uses the Dobly local agent
- Supports UI automation and local files

## Core building blocks

1. Connector SDK
2. Credential platform
3. Queue + worker runtime
4. Trigger engine
5. Agent task layer
6. Schema-driven editor
7. Versioning and observability

## Agent model

Browser and local tasks are delegated through `agent_devices` and `agent_tasks`.

Flow:
1. Workflow execution encounters a browser/local step
2. Dobly creates an `agent_task`
3. An authorized Dobly agent claims the task
4. Agent executes locally
5. Agent reports completion back to Dobly

## Security model

- Never bypass platform controls
- Browser/local agents are user-authorized
- Secrets remain encrypted server-side
- High-risk actions should support user approval
- All runs and agent tasks are logged

## Near-term roadmap

1. Finish Google native actions
2. Add Slack and Shopify native connectors
3. Build browser agent prototype
4. Build local agent prototype
5. Add field mapping and richer visual builder
