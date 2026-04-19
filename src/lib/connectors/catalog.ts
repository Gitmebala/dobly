import type { WorkflowActionStep } from "@/types";

export interface ConnectorActionCatalogItem {
  id: string;
  label: string;
  description: string;
  lane: NonNullable<WorkflowActionStep["lane"]>;
  runtimeAction: WorkflowActionStep["actionType"];
  connectorId: string;
  connectorActionId: string;
  defaultConfig: Record<string, unknown>;
}

export interface ConnectorCatalogItem {
  id: string;
  label: string;
  provider: string;
  lane: NonNullable<WorkflowActionStep["lane"]>;
  connectionRequired: boolean;
  description: string;
  actions: ConnectorActionCatalogItem[];
}

export const CONNECTOR_CATALOG: ConnectorCatalogItem[] = [
  {
    id: "orchestrator",
    label: "Dobly Orchestrator",
    provider: "dobly",
    lane: "native",
    connectionRequired: false,
    description: "Collects previous step outputs and assembles a report or document.",
    actions: [
      {
        id: "assemble_report",
        label: "Assemble report",
        description: "Merge previous outputs into a final markdown/document artifact.",
        lane: "native",
        runtimeAction: "orchestrate_document",
        connectorId: "orchestrator",
        connectorActionId: "assemble_report",
        defaultConfig: {
          prompt:
            "Build a useful daily summary with sections, highlights, anomalies, and action items.",
          writeArtifacts: true,
          artifactBasePath: "outputs/reports/dobly-report",
        },
      },
    ],
  },
  {
    id: "gmail",
    label: "Gmail",
    provider: "google",
    lane: "native",
    connectionRequired: true,
    description: "Send messages from a connected Google account.",
    actions: [
      {
        id: "send_email",
        label: "Send email",
        description: "Send an email with a connected Gmail account.",
        lane: "native",
        runtimeAction: "send_email",
        connectorId: "generic-email",
        connectorActionId: "send",
        defaultConfig: {
          to: "{{trigger.email}}",
          subject: "New Dobly workflow email",
          text: "Hello from Dobly",
        },
      },
    ],
  },
  {
    id: "google_sheets",
    label: "Google Sheets",
    provider: "google",
    lane: "native",
    connectionRequired: true,
    description: "Append rows to Google Sheets.",
    actions: [
      {
        id: "append_row",
        label: "Append row",
        description: "Append data to a Google Sheet.",
        lane: "native",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { email: "{{trigger.email}}", workflow: "{{workflow.title}}" },
        },
      },
    ],
  },
  {
    id: "outlook",
    label: "Outlook",
    provider: "microsoft",
    lane: "native",
    connectionRequired: true,
    description: "Email and calendar actions with Microsoft accounts.",
    actions: [
      {
        id: "send_email",
        label: "Send Outlook email",
        description: "Send email through Outlook/Microsoft 365.",
        lane: "native",
        runtimeAction: "send_email",
        connectorId: "generic-email",
        connectorActionId: "send",
        defaultConfig: {
          to: "{{trigger.email}}",
          subject: "Sent from Dobly",
          text: "Hello from Outlook via Dobly",
        },
      },
    ],
  },
  {
    id: "slack",
    label: "Slack",
    provider: "slack",
    lane: "native",
    connectionRequired: true,
    description: "Post updates to Slack.",
    actions: [
      {
        id: "send_message",
        label: "Send Slack message",
        description: "Post a message to a Slack destination.",
        lane: "native",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { text: "{{workflow.title}} completed" },
        },
      },
    ],
  },
  {
    id: "shopify",
    label: "Shopify",
    provider: "shopify",
    lane: "native",
    connectionRequired: true,
    description: "React to orders and customers.",
    actions: [
      {
        id: "tag_customer",
        label: "Tag customer",
        description: "Tag a customer from a workflow.",
        lane: "native",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { customer: "{{trigger.customer_id}}", tag: "dobly" },
        },
      },
    ],
  },
  {
    id: "mpesa",
    label: "M-PESA",
    provider: "mpesa",
    lane: "native",
    connectionRequired: true,
    description: "Send STK push payment prompts through a connected Daraja account.",
    actions: [
      {
        id: "stk_push",
        label: "Send STK push",
        description: "Prompt a customer to authorize a payment on their phone.",
        lane: "native",
        runtimeAction: "webhook_request",
        connectorId: "mpesa-daraja",
        connectorActionId: "stk_push",
        defaultConfig: {
          phoneNumber: "{{trigger.phone}}",
          amount: "{{trigger.amount}}",
          accountReference: "{{workflow.title}}",
          transactionDesc: "Dobly automation payment",
        },
      },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    provider: "whatsapp",
    lane: "native",
    connectionRequired: true,
    description: "Send WhatsApp notifications.",
    actions: [
      {
        id: "send_message",
        label: "Send WhatsApp message",
        description: "Send a WhatsApp outbound message.",
        lane: "native",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { to: "{{trigger.phone}}", message: "Thanks from Dobly" },
        },
      },
    ],
  },
  {
    id: "discord",
    label: "Discord",
    provider: "discord",
    lane: "native",
    connectionRequired: true,
    description: "Send workflow updates into Discord channels.",
    actions: [
      {
        id: "send_message",
        label: "Send Discord message",
        description: "Post an update to a Discord webhook or bot destination.",
        lane: "native",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { content: "{{workflow.title}} requires attention" },
        },
      },
    ],
  },
  {
    id: "telegram",
    label: "Telegram",
    provider: "telegram",
    lane: "native",
    connectionRequired: true,
    description: "Push updates into Telegram chats or bots.",
    actions: [
      {
        id: "send_message",
        label: "Send Telegram message",
        description: "Send a Telegram message from a connected bot or chat.",
        lane: "native",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { text: "{{workflow.title}} completed", chat_id: "{{trigger.chat_id}}" },
        },
      },
    ],
  },
  {
    id: "twilio",
    label: "Twilio",
    provider: "twilio",
    lane: "native",
    connectionRequired: true,
    description: "Trigger SMS and voice-adjacent messaging actions.",
    actions: [
      {
        id: "send_sms",
        label: "Send SMS",
        description: "Send an SMS through a connected Twilio setup.",
        lane: "native",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { to: "{{trigger.phone}}", body: "Update from Dobly" },
        },
      },
    ],
  },
  {
    id: "claude",
    label: "Claude",
    provider: "anthropic",
    lane: "native",
    connectionRequired: true,
    description: "Use Anthropic as a service connector in workflows.",
    actions: [
      {
        id: "generate_text",
        label: "Generate text",
        description: "Call an AI model and return text output.",
        lane: "native",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { prompt: "{{trigger.prompt}}" },
        },
      },
    ],
  },
  {
    id: "resend",
    label: "Resend",
    provider: "resend",
    lane: "native",
    connectionRequired: true,
    description: "Transactional email through Resend.",
    actions: [
      {
        id: "send_email",
        label: "Send Resend email",
        description: "Send an email using a Resend-backed action.",
        lane: "native",
        runtimeAction: "send_email",
        connectorId: "generic-email",
        connectorActionId: "send",
        defaultConfig: {
          to: "{{trigger.email}}",
          subject: "New Dobly message",
          text: "Hello from Dobly",
        },
      },
    ],
  },
  {
    id: "quickbooks",
    label: "QuickBooks",
    provider: "quickbooks",
    lane: "native",
    connectionRequired: true,
    description: "Sync invoices and accounting records.",
    actions: [
      {
        id: "create_invoice",
        label: "Create invoice",
        description: "Create or mirror an invoice in QuickBooks.",
        lane: "native",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { customer: "{{trigger.customer}}", amount: "{{trigger.amount}}" },
        },
      },
    ],
  },
  {
    id: "xero",
    label: "Xero",
    provider: "xero",
    lane: "native",
    connectionRequired: true,
    description: "Update bookkeeping or billing records in Xero.",
    actions: [
      {
        id: "create_bill",
        label: "Create bill",
        description: "Create a bill or accounting record in Xero.",
        lane: "native",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { supplier: "{{trigger.vendor}}", amount: "{{trigger.amount}}" },
        },
      },
    ],
  },
  {
    id: "trello",
    label: "Trello",
    provider: "trello",
    lane: "native",
    connectionRequired: true,
    description: "Create or move operational cards in Trello.",
    actions: [
      {
        id: "create_card",
        label: "Create card",
        description: "Create a Trello card for a new task or event.",
        lane: "native",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { name: "{{workflow.title}}", desc: "{{trigger.summary}}" },
        },
      },
    ],
  },
  {
    id: "asana",
    label: "Asana",
    provider: "asana",
    lane: "native",
    connectionRequired: true,
    description: "Create tasks and route project work into Asana.",
    actions: [
      {
        id: "create_task",
        label: "Create task",
        description: "Create an Asana task from workflow data.",
        lane: "native",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { name: "{{workflow.title}}", notes: "{{trigger.summary}}" },
        },
      },
    ],
  },
  {
    id: "salesforce",
    label: "Salesforce",
    provider: "salesforce",
    lane: "native",
    connectionRequired: true,
    description: "Create or update CRM objects inside Salesforce.",
    actions: [
      {
        id: "create_lead",
        label: "Create lead",
        description: "Create a Salesforce lead from incoming data.",
        lane: "native",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { email: "{{trigger.email}}", name: "{{trigger.name}}" },
        },
      },
    ],
  },
  {
    id: "postgres",
    label: "PostgreSQL",
    provider: "postgres",
    lane: "generic",
    connectionRequired: true,
    description: "Write structured records into a PostgreSQL-backed workflow target.",
    actions: [
      {
        id: "insert_row",
        label: "Insert row",
        description: "Insert workflow data into a PostgreSQL endpoint or worker.",
        lane: "generic",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { payload: "{{trigger}}", workflow: "{{workflow.title}}" },
        },
      },
    ],
  },
  {
    id: "supabase",
    label: "Supabase",
    provider: "supabase",
    lane: "generic",
    connectionRequired: true,
    description: "Update tables or event endpoints in connected Supabase projects.",
    actions: [
      {
        id: "insert_record",
        label: "Insert record",
        description: "Send a record to a Supabase table or edge function.",
        lane: "generic",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { record: "{{trigger}}", source: "{{workflow.title}}" },
        },
      },
    ],
  },
  {
    id: "webhook",
    label: "Webhook",
    provider: "webhook",
    lane: "generic",
    connectionRequired: false,
    description: "Call any HTTP endpoint.",
    actions: [
      {
        id: "request",
        label: "HTTP request",
        description: "Send JSON to any external HTTP endpoint.",
        lane: "generic",
        runtimeAction: "webhook_request",
        connectorId: "generic-http",
        connectorActionId: "request",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { workflow: "{{workflow.title}}", trigger: "{{trigger}}" },
        },
      },
    ],
  },
  {
    id: "file",
    label: "File",
    provider: "file",
    lane: "generic",
    connectionRequired: false,
    description: "Write JSON or text files.",
    actions: [
      {
        id: "write_file",
        label: "Write file",
        description: "Write data to a file in the Dobly workspace.",
        lane: "generic",
        runtimeAction: "file_write",
        connectorId: "generic-file",
        connectorActionId: "write",
        defaultConfig: {
          path: "outputs/workflow.json",
          mode: "write",
          content: { workflow: "{{workflow.title}}", trigger: "{{trigger}}" },
        },
      },
    ],
  },
  {
    id: "formatter",
    label: "Formatter",
    provider: "formatter",
    lane: "generic",
    connectionRequired: false,
    description: "Create or reshape text before later actions.",
    actions: [
      {
        id: "compose_text",
        label: "Compose text",
        description: "Create text for a later email, browser, or webhook step.",
        lane: "generic",
        runtimeAction: "compose_text",
        connectorId: "builtin-core",
        connectorActionId: "compose-text",
        defaultConfig: { template: "Hello {{trigger.email}}" },
      },
      {
        id: "delay",
        label: "Delay",
        description: "Wait before the next action.",
        lane: "generic",
        runtimeAction: "delay",
        connectorId: "builtin-core",
        connectorActionId: "delay",
        defaultConfig: { amount: 5, unit: "minutes" },
      },
      {
        id: "branch",
        label: "Branch",
        description: "Stop or continue the workflow based on a condition.",
        lane: "generic",
        runtimeAction: "branch",
        connectorId: "builtin-core",
        connectorActionId: "branch",
        defaultConfig: { left: "{{trigger.status}}", operator: "equals", right: "paid" },
      },
    ],
  },
];

export function getConnector(id: string) {
  return CONNECTOR_CATALOG.find((item) => item.id === id) ?? null;
}

export function getConnectorAction(connectorId: string, actionId: string) {
  return getConnector(connectorId)?.actions.find((item) => item.id === actionId) ?? null;
}
