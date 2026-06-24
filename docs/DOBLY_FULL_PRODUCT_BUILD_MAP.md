# Dobly Full Product Build Map

Dobly is not a single agent builder. Dobly is the business Homebase where channels, workers, automations, memory,
approvals, reports, and strategy are packaged into departments.

## Product Thesis

Retell gives a business an AI caller.
Airtable gives a business workflow/data building blocks.
Zapier gives a business app-to-app automations.
Twin-style tools give a business AI workers.
Dobly gives a business the Homebase where those capabilities become departments that run the company.

## Core Product Objects

- Homebase: the business operating cockpit.
- Department: a business function such as Reception, Sales, Marketing, Support, Finance, or Operations.
- Worker: a voice agent, chatbot, automation, AI worker, content worker, approval worker, or reporting worker inside a department.
- Channel: a connected business account or communication rail such as phone, SMS, WhatsApp, email, calendar, CRM, Notion, Canva, or payments.
- Memory: structured and semantic business knowledge used by every worker.
- Approval: a decision gate for risky, sensitive, expensive, customer-facing, or irreversible actions.
- General Manager: the cross-department coordinator that creates briefings, spots risk, and recommends next moves.
- Boardroom: the strategy layer for cross-business recommendations and scenario thinking.

## Launch Departments

### Reception

Owns calls, website chat, WhatsApp, lead capture, booking, routing, missed-call recovery, and escalation.

Workers:
- AI phone receptionist
- WhatsApp receptionist
- Website chatbot
- Booking handoff worker
- Missed-call follow-up automation

Channels:
- Business phone
- SMS
- WhatsApp Business
- Website chat
- Gmail/Outlook
- Calendar
- CRM

### Sales

Owns lead qualification, follow-up, pipeline updates, callbacks, proposals, and conversion reminders.

Workers:
- Lead qualification agent
- Sales follow-up automation
- Callback worker
- CRM update worker
- Proposal reminder worker

Channels:
- Phone
- SMS
- WhatsApp
- Email
- Calendar
- CRM

### Marketing / Content

Owns content ideas, campaigns, newsletters, social drafts, repurposing, Canva/asset workflows, and publishing approvals.

Workers:
- Content strategist
- Social post drafter
- Campaign planner
- Newsletter drafter
- Canva handoff worker
- Publishing approval worker

Channels:
- Notion
- Canva
- Email campaign tools
- Instagram/Facebook
- LinkedIn
- Website/blog CMS

### Support

Owns FAQs, ticket triage, complaint detection, refund routing, handoff, and customer recovery.

Workers:
- Support chatbot
- WhatsApp support worker
- Ticket triage worker
- Complaint escalation worker
- Knowledge-base answer worker

Channels:
- Website chat
- WhatsApp
- Email
- Ticketing tools
- CRM

### Finance

Owns invoice reminders, payment follow-up, reconciliation, receipts, finance alerts, and approval-required money actions.

Workers:
- Invoice chaser
- Payment reminder automation
- Reconciliation worker
- Finance risk escalation worker

Channels:
- Stripe
- M-PESA
- QuickBooks/Xero
- Email
- SMS/WhatsApp

### Operations

Owns supplier follow-ups, task coordination, order tracking, inventory reminders, project updates, and handoffs.

Workers:
- Task coordinator
- Supplier follow-up worker
- Order tracking automation
- Project update worker
- Internal reminder worker

Channels:
- Notion/Airtable
- Slack
- Project tools
- Email
- Sheets

## Build Sequence

1. Business Channel Setup: phone, SMS, WhatsApp, email, calendar, CRM, content tools.
2. Department Builder: create departments from templates with default worker bundles.
3. Worker Builder: voice agent, chatbot, automation, content worker, approval worker.
4. Business Memory: business profile, services, FAQs, tone, policies, customers, decisions, examples.
5. Runtime Kernel: event intake, worker dispatch, deterministic execution, retries, logs.
6. Approval Layer: approve, reject, modify, explain, and learn from owner decisions.
7. Voice Runtime: inbound calls, outbound calls, call transfer, booking, transcripts, post-call analysis.
8. Chat Runtime: website chatbot, WhatsApp chatbot, email assistant, handoff.
9. Automation Runtime: triggers, schedules, conditions, actions, records, failure recovery.
10. General Manager: daily briefing, cross-department status, risks, recommendations.
11. Boardroom: strategy reviews, scenarios, growth/cash/ops recommendations.
12. Analytics: department health, worker trust, time saved, revenue/cash impact, unresolved risk.
13. Billing and Usage: plans, included usage, overages for voice/SMS/AI.
14. Mobile Companion: approvals, urgent alerts, briefings, voice command, quick status.

## User-Facing Principle

Never expose raw infrastructure language when a business action is clearer.

Use:
- Connect Business Number
- Turn On Business Texting
- Connect WhatsApp
- Connect Gmail
- Activate Reception
- Test Sales Worker

Avoid:
- Configure API
- Hosted SMS
- A2P 10DLC
- Webhooks
- OAuth scopes
- Porting/SIP

Dobly can track those technical states internally, but the customer should experience setup as connect, verify, test,
activate.
