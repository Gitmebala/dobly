import {
  BUSINESS_STARTER_TEMPLATES,
  PERSONAL_STARTER_TEMPLATES,
  STARTER_TEMPLATES,
} from "@/lib/starter-templates";

export const DOBLY_PROMPT_EXAMPLES = [
  {
    audience: "business",
    prompt:
      "Build me a sales assistant that researches leads, qualifies them, and sends a shortlist every morning.",
  },
  {
    audience: "business",
    prompt:
      "Make me an AI receptionist that answers calls, books appointments, and escalates urgent callers.",
  },
  {
    audience: "personal",
    prompt:
      "Build me a personal assistant that watches my email, calendar, and reminders and gives me a clean morning brief.",
  },
  {
    audience: "personal",
    prompt:
      "Create an investment watcher that alerts me when important changes happen across the assets I care about.",
  },
];

export const DOBLY_PLATFORM_PILLARS = [
  {
    title: "Plain language first",
    body: "Tell Dobly what you need handled. It turns that into the right operating system underneath.",
  },
  {
    title: "Real work, not trigger chains",
    body: "Dobly takes in work, coordinates the next steps, acts where it is allowed, and pauses when the work turns risky.",
  },
  {
    title: "Work and life in one system",
    body: "Businesses run sales, support, finance, and ops. Individuals run planning, monitoring, and personal admin.",
  },
  {
    title: "Secure by default",
    body: "Enterprise-ready controls are built in: audit trails, approval gates, and least-privilege access.",
  },
];

export const DOBLY_BUSINESS_CONNECTION_LAYERS = [
  {
    title: "Channels",
    items: ["Phone", "WhatsApp", "Email", "Web chat", "Internal chat"],
  },
  {
    title: "Systems",
    items: ["CRM", "Calendar", "Docs", "Tasks", "Payments", "Support tools"],
  },
  {
    title: "Knowledge",
    items: ["FAQs", "Pricing", "SOPs", "Policies", "Scripts", "Playbooks"],
  },
  {
    title: "Actions",
    items: ["Answer", "Schedule", "Follow up", "Send", "Update", "Escalate", "Report"],
  },
];

export const DOBLY_PRIORITY_CONNECTIONS = [
  "Google Workspace",
  "Microsoft 365",
  "Slack",
  "Microsoft Teams",
  "HubSpot",
  "Salesforce",
  "Stripe",
  "QuickBooks",
  "Xero",
  "Shopify",
  "Google Drive",
  "OneDrive",
  "Dropbox",
  "Notion",
  "Airtable",
  "Linear",
  "Jira",
  "Zendesk",
  "Zoom",
  "DocuSign",
];

export const DOBLY_SECURITY_PILLARS = [
  "Secrets stay on the server",
  "Data is isolated per account",
  "Usage and actions are rate limited",
  "Risky work is gated",
  "Connections only get the access needed",
  "Run history is auditable",
];

export const DOBLY_PERSONAL_TEMPLATE_PREVIEW = PERSONAL_STARTER_TEMPLATES;
export const DOBLY_BUSINESS_TEMPLATE_PREVIEW = BUSINESS_STARTER_TEMPLATES;
export const DOBLY_ALL_TEMPLATES = STARTER_TEMPLATES;
