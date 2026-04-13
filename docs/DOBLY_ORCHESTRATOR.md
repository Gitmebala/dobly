# Dobly Orchestrator

The Dobly Orchestrator is the "main agent" for multi-source workflows.

Example:
- every day at 8:00 AM
- collect data from web pages, APIs, files, and inboxes
- normalize the records
- assemble a report
- generate the final document
- email the result

## Responsibility

The Orchestrator should not replace every connector.
Its job is to:

1. plan the execution order
2. coordinate collection steps
3. merge outputs from different steps
4. create structured artifacts
5. trigger the final delivery action

## Typical pipeline

1. Trigger fires
2. Data collection steps run
3. Dobly Orchestrator merges the collected payloads
4. Orchestrator produces:
   - markdown
   - JSON summary
   - email-ready text
   - document blocks
5. Delivery step sends/stores the result

## Needed future features

- artifact builders
- report templates
- document rendering
- AI summarization over step outputs
- approval checkpoints
- "rerun from collection" and "rerun from assembly"

## Important distinction

- Connectors do the retrieval and delivery
- The Orchestrator does the thinking, sorting, and assembling
