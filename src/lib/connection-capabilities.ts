export type ConnectionCapabilityId =
  | "research_sources"
  | "create_visual_design"
  | "create_3d_cad"
  | "create_animation"
  | "edit_visual_design"
  | "generate_media"
  | "build_chatbot"
  | "summarize_knowledge"
  | "publish_content"
  | "manage_project_tasks"
  | "update_crm"
  | "create_invoice"
  | "collect_payment"
  | "reconcile_finance"
  | "manage_commerce"
  | "operate_browser"
  | "edit_codebase"
  | "create_document"
  | "edit_spreadsheet"
  | "manage_calendar"
  | "send_message"
  | "monitor_market"
  | "book_travel"
  | "operate_software";

export type ConnectionCostMode =
  | "included"
  | "connected_account"
  | "paid_provider"
  | "platform_paid"
  | "manual_setup";

export type ConnectionSupportLevel =
  | "executor_backed"
  | "mcp_ready"
  | "catalog_ready"
  | "runtime_provider"
  | "manual_or_draft";

export interface ConnectionServiceCapability {
  id: string;
  label: string;
  capability: ConnectionCapabilityId;
  actionId?: string;
  executorId?: string;
  costMode: ConnectionCostMode;
  riskLevel: "low" | "medium" | "high";
  approvalRequired: boolean;
  notes: string;
}

export interface ConnectionCapabilityProfile {
  providerId: string;
  label: string;
  supportLevel: ConnectionSupportLevel;
  services: ConnectionServiceCapability[];
  readinessHints: string[];
}

function service(input: ConnectionServiceCapability): ConnectionServiceCapability {
  return input;
}

const connected = "connected_account" as const;
const paid = "paid_provider" as const;
const platform = "platform_paid" as const;
const manual = "manual_setup" as const;
const included = "included" as const;

export const CONNECTION_CAPABILITY_PROFILES: ConnectionCapabilityProfile[] = [
  {
    providerId: "google",
    label: "Google Workspace",
    supportLevel: "executor_backed",
    services: [
      service({ id: "gmail.send", label: "Send Gmail", capability: "send_message", actionId: "send_email", executorId: "native.google.gmail.send", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Used by sales, support, reception, and admin coworkers for email drafts and approved sends." }),
      service({ id: "docs.create", label: "Create Google Docs", capability: "create_document", actionId: "create_document", executorId: "native.google.docs.create", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used for proposals, reports, SOPs, briefs, and client documents." }),
      service({ id: "sheets.append", label: "Update Sheets", capability: "edit_spreadsheet", actionId: "append_row", executorId: "native.google.sheets.append", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used for trackers, logs, forecasts, and lightweight databases." }),
      service({ id: "sheets.read", label: "Read and analyze Sheets", capability: "summarize_knowledge", actionId: "analyze_data", executorId: "native.google.sheets.analyze", costMode: connected, riskLevel: "low", approvalRequired: false, notes: "Used for reporting and finance/customer summaries." }),
      service({ id: "calendar.create", label: "Create Calendar events", capability: "manage_calendar", actionId: "create_event", executorId: "native.google.calendar.create-event", costMode: connected, riskLevel: "medium", approvalRequired: true, notes: "Used for booking, follow-up, and scheduling coworkers." }),
    ],
    readinessHints: ["OAuth must include Gmail, Docs, Sheets, or Calendar scopes that match the coworker's job.", "Sending email and calendar booking stay approval-gated by default."],
  },
  {
    providerId: "slack",
    label: "Slack",
    supportLevel: "executor_backed",
    services: [
      service({ id: "slack.send", label: "Send Slack messages", capability: "send_message", actionId: "send_message", executorId: "native.slack.send", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Used for team updates, routing, and coworker notifications." }),
    ],
    readinessHints: ["Workspace and channel permissions must allow posting."],
  },
  {
    providerId: "whatsapp",
    label: "WhatsApp Business",
    supportLevel: "executor_backed",
    services: [
      service({ id: "whatsapp.send", label: "Send WhatsApp messages", capability: "send_message", actionId: "send_message", executorId: "native.whatsapp.send", costMode: paid, riskLevel: "high", approvalRequired: true, notes: "Used by reception, support, sales follow-up, and customer update coworkers." }),
    ],
    readinessHints: ["Business number verification, phone number ID, templates, and message permissions are required before live sending."],
  },
  {
    providerId: "kenya_local_comms",
    label: "Kenya Calls & SMS",
    supportLevel: "runtime_provider",
    services: [
      service({ id: "kenya.sms", label: "Send local SMS", capability: "send_message", costMode: paid, riskLevel: "high", approvalRequired: true, notes: "Used for Kenya-first reception, reminders, OTPs, and customer follow-up." }),
      service({ id: "kenya.voice", label: "Route local calls", capability: "operate_software", costMode: paid, riskLevel: "high", approvalRequired: true, notes: "Used by reception coworkers for call routing and missed-call recovery." }),
    ],
    readinessHints: ["Local provider URL, keys, and business number routing must be configured."],
  },
  {
    providerId: "twilio",
    label: "Twilio",
    supportLevel: "runtime_provider",
    services: [
      service({ id: "twilio.sms", label: "Send SMS", capability: "send_message", costMode: paid, riskLevel: "high", approvalRequired: true, notes: "International fallback for SMS and phone workflows." }),
      service({ id: "twilio.voice", label: "Place or receive calls", capability: "operate_software", costMode: paid, riskLevel: "high", approvalRequired: true, notes: "International fallback for reception and voice workflows." }),
    ],
    readinessHints: ["Twilio account SID, auth token, and phone number must be configured."],
  },
  {
    providerId: "mailchimp",
    label: "Mailchimp",
    supportLevel: "executor_backed",
    services: [
      service({ id: "mailchimp.subscriber", label: "Add subscriber", capability: "update_crm", actionId: "add_subscriber", executorId: "native.mailchimp.add-subscriber", costMode: connected, riskLevel: "medium", approvalRequired: true, notes: "Used for audience growth and launch lists." }),
      service({ id: "mailchimp.campaign", label: "Send campaign", capability: "publish_content", actionId: "send_campaign", executorId: "native.mailchimp.send-campaign", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Used by marketing coworkers for approved campaign sends." }),
    ],
    readinessHints: ["Audience/list IDs and campaign permissions must be present."],
  },
  {
    providerId: "klaviyo",
    label: "Klaviyo",
    supportLevel: "executor_backed",
    services: [
      service({ id: "klaviyo.subscribe", label: "Subscribe profile", capability: "update_crm", actionId: "subscribe", executorId: "native.klaviyo.subscribe", costMode: connected, riskLevel: "medium", approvalRequired: true, notes: "Used for ecommerce customer lifecycle flows." }),
      service({ id: "klaviyo.event", label: "Track event", capability: "manage_commerce", actionId: "track_event", executorId: "native.klaviyo.track-event", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used for ecommerce automations and segmentation." }),
      service({ id: "klaviyo.campaign", label: "Send campaign", capability: "publish_content", actionId: "send_campaign", executorId: "native.klaviyo.send-campaign", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Used for approved campaigns and product announcements." }),
    ],
    readinessHints: ["Private API scopes and audience/list IDs must match the intended coworker actions."],
  },
  {
    providerId: "meta",
    label: "Meta / Instagram / Facebook",
    supportLevel: "executor_backed",
    services: [
      service({ id: "meta.post", label: "Publish social post", capability: "publish_content", actionId: "post", executorId: "native.meta.post", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Used by social media coworkers for approved Facebook and Instagram publishing." }),
      service({ id: "meta.whatsapp", label: "WhatsApp surfaces", capability: "send_message", costMode: paid, riskLevel: "high", approvalRequired: true, notes: "Used when Meta app credentials power WhatsApp Business messaging." }),
    ],
    readinessHints: ["Meta app, page/account permissions, and publishing scopes must be granted."],
  },
  {
    providerId: "linkedin",
    label: "LinkedIn",
    supportLevel: "executor_backed",
    services: [
      service({ id: "linkedin.share", label: "Share LinkedIn post", capability: "publish_content", actionId: "share_post", executorId: "native.linkedin.share-post", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Used by thought-leadership and social media coworkers." }),
    ],
    readinessHints: ["LinkedIn member or organization posting permissions must be connected."],
  },
  {
    providerId: "shopify",
    label: "Shopify",
    supportLevel: "executor_backed",
    services: [
      service({ id: "shopify.tag_customer", label: "Tag customer", capability: "manage_commerce", actionId: "tag_customer", executorId: "native.shopify.tag-customer", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used for ecommerce segmentation and customer ops." }),
      service({ id: "shopify.draft_order", label: "Create draft order", capability: "manage_commerce", actionId: "create_draft_order", executorId: "native.shopify.create-draft-order", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Used by ecommerce coworkers for quotes, wholesale orders, and recovery flows." }),
    ],
    readinessHints: ["Store URL and Admin API scopes must permit customer and order actions."],
  },
  {
    providerId: "paystack",
    label: "Paystack",
    supportLevel: "executor_backed",
    services: [
      service({ id: "paystack.link", label: "Create payment link", capability: "collect_payment", actionId: "payment_link", executorId: "native.paystack.payment-link", costMode: paid, riskLevel: "high", approvalRequired: true, notes: "Used for invoices, deposits, checkout links, and payment collection." }),
    ],
    readinessHints: ["Secret key and business account must be configured before live payment links."],
  },
  {
    providerId: "mpesa",
    label: "M-PESA Daraja",
    supportLevel: "executor_backed",
    services: [
      service({ id: "mpesa.stk", label: "Send STK push", capability: "collect_payment", actionId: "stk_push", executorId: "native.mpesa.stk-push", costMode: paid, riskLevel: "high", approvalRequired: true, notes: "Used for Kenya-first collection, deposits, and invoices." }),
    ],
    readinessHints: ["Daraja credentials, environment, shortcode, passkey, and callback URL are required."],
  },
  {
    providerId: "stripe",
    label: "Stripe",
    supportLevel: "executor_backed",
    services: [
      service({ id: "stripe.customer", label: "Create customer", capability: "update_crm", actionId: "create_customer", executorId: "native.stripe.create-customer", costMode: paid, riskLevel: "medium", approvalRequired: false, notes: "Used to keep billing customer records aligned." }),
      service({ id: "stripe.invoice", label: "Create invoice", capability: "create_invoice", actionId: "create_invoice", executorId: "native.stripe.create-invoice", costMode: paid, riskLevel: "high", approvalRequired: true, notes: "Used by finance coworkers to draft and send approved invoices." }),
      service({ id: "stripe.refund", label: "Refund charge", capability: "collect_payment", actionId: "refund_charge", executorId: "native.stripe.refund-charge", costMode: paid, riskLevel: "high", approvalRequired: true, notes: "Used by support/finance coworkers only with approval." }),
    ],
    readinessHints: ["Secret key and webhook setup must match live or test mode."],
  },
  {
    providerId: "xero",
    label: "Xero",
    supportLevel: "executor_backed",
    services: [
      service({ id: "xero.invoice", label: "Create Xero invoice", capability: "create_invoice", actionId: "create_invoice", executorId: "native.xero.create-invoice", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Used by finance coworkers for accounting-ready invoices." }),
      service({ id: "xero.reconcile", label: "Prepare reconciliation notes", capability: "reconcile_finance", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Dobly can draft reconciliation work; live posting depends on Xero scopes." }),
    ],
    readinessHints: ["Xero tenant/accounting scopes must be connected. Invoice creation is executor-backed; reconciliation is currently draft-assisted unless extended."],
  },
  {
    providerId: "quickbooks",
    label: "QuickBooks",
    supportLevel: "catalog_ready",
    services: [
      service({ id: "quickbooks.invoice", label: "Draft accounting invoice", capability: "create_invoice", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Catalog-ready path for finance coworkers; native executor still needs implementation or MCP/custom API." }),
      service({ id: "quickbooks.reconcile", label: "Prepare reconciliation", capability: "reconcile_finance", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Useful for assisted reconciliation and manual posting until a native executor is added." }),
    ],
    readinessHints: ["Use MCP/custom API or implement native QuickBooks actions before live write-back."],
  },
  {
    providerId: "wave",
    label: "Wave",
    supportLevel: "catalog_ready",
    services: [
      service({ id: "wave.invoice", label: "Draft invoice", capability: "create_invoice", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Finance coworker can draft invoice data; live posting needs API support." }),
      service({ id: "wave.reconcile", label: "Prepare reconciliation", capability: "reconcile_finance", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Assisted bookkeeping flow until live Wave execution is wired." }),
    ],
    readinessHints: ["Confirm current Wave API availability or use manual/custom API bridge."],
  },
  {
    providerId: "hubspot",
    label: "HubSpot",
    supportLevel: "executor_backed",
    services: [
      service({ id: "hubspot.contact", label: "Create contact", capability: "update_crm", actionId: "create_contact", executorId: "native.hubspot.create-contact", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used by sales and reception coworkers for lead capture." }),
      service({ id: "hubspot.deal", label: "Update deal", capability: "update_crm", actionId: "update_deal", executorId: "native.hubspot.update-deal", costMode: connected, riskLevel: "medium", approvalRequired: true, notes: "Used for pipeline updates and sales follow-up." }),
      service({ id: "hubspot.task", label: "Create CRM task", capability: "manage_project_tasks", actionId: "create_task", executorId: "native.hubspot.create-task", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used for follow-up reminders and handoffs." }),
    ],
    readinessHints: ["CRM scopes must include contacts, deals, tasks, and notes for the selected job."],
  },
  {
    providerId: "pipedrive",
    label: "Pipedrive",
    supportLevel: "executor_backed",
    services: [
      service({ id: "pipedrive.lead", label: "Create lead", capability: "update_crm", actionId: "create_lead", executorId: "native.pipedrive.create-lead", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used for inbound lead capture." }),
      service({ id: "pipedrive.deal", label: "Create deal", capability: "update_crm", actionId: "create_deal", executorId: "native.pipedrive.create-deal", costMode: connected, riskLevel: "medium", approvalRequired: true, notes: "Used for pipeline creation and qualification." }),
    ],
    readinessHints: ["API token must be able to create leads and deals."],
  },
  {
    providerId: "salesforce",
    label: "Salesforce",
    supportLevel: "executor_backed",
    services: [
      service({ id: "salesforce.lead", label: "Create lead", capability: "update_crm", actionId: "create_lead", executorId: "native.salesforce.create-lead", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used by sales/reception coworkers for lead capture." }),
      service({ id: "salesforce.opportunity", label: "Create opportunity", capability: "update_crm", actionId: "create_opportunity", executorId: "native.salesforce.create-opportunity", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Used for qualified pipeline movement." }),
    ],
    readinessHints: ["Connected app scopes must match org object permissions."],
  },
  {
    providerId: "zoho",
    label: "Zoho CRM",
    supportLevel: "executor_backed",
    services: [
      service({ id: "zoho.lead", label: "Create Zoho lead", capability: "update_crm", actionId: "create_lead", executorId: "native.zoho-crm.create-lead", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used for lead capture in Zoho CRM." }),
    ],
    readinessHints: ["Zoho CRM OAuth scopes must allow lead creation."],
  },
  {
    providerId: "zendesk",
    label: "Zendesk",
    supportLevel: "executor_backed",
    services: [
      service({ id: "zendesk.create_ticket", label: "Create ticket", capability: "update_crm", actionId: "create_ticket", executorId: "native.zendesk.create-ticket", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used by support and reception coworkers." }),
      service({ id: "zendesk.update_ticket", label: "Update ticket", capability: "update_crm", actionId: "update_ticket", executorId: "native.zendesk.update-ticket", costMode: connected, riskLevel: "medium", approvalRequired: true, notes: "Used for support follow-up and status changes." }),
    ],
    readinessHints: ["Subdomain, token, and ticket permissions must be available."],
  },
  {
    providerId: "freshdesk",
    label: "Freshdesk",
    supportLevel: "executor_backed",
    services: [
      service({ id: "freshdesk.ticket", label: "Create ticket", capability: "update_crm", actionId: "create_ticket", executorId: "native.freshdesk.create-ticket", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used by support/reception coworkers for case intake." }),
    ],
    readinessHints: ["Freshdesk domain and API token must be configured."],
  },
  {
    providerId: "intercom",
    label: "Intercom",
    supportLevel: "executor_backed",
    services: [
      service({ id: "intercom.contact", label: "Create contact", capability: "update_crm", actionId: "create_contact", executorId: "native.intercom.create-contact", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used by support and customer success coworkers." }),
    ],
    readinessHints: ["Intercom token must allow contacts or people writes."],
  },
  {
    providerId: "notion",
    label: "Notion",
    supportLevel: "executor_backed",
    services: [
      service({ id: "notion.page", label: "Create page", capability: "create_document", actionId: "create_page", executorId: "native.notion.create-page", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used for docs, wikis, SOPs, and project notes." }),
      service({ id: "notion.database", label: "Append database", capability: "edit_spreadsheet", actionId: "append_database", executorId: "native.notion.append-database", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used for lightweight CRM, task, and content databases." }),
    ],
    readinessHints: ["The integration must be shared into the target workspace/pages/databases."],
  },
  {
    providerId: "airtable",
    label: "Airtable",
    supportLevel: "executor_backed",
    services: [
      service({ id: "airtable.create", label: "Create record", capability: "edit_spreadsheet", actionId: "create_record", executorId: "native.airtable.create-record", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used for content calendars, CRM-lite, ops trackers, and research tables." }),
      service({ id: "airtable.update", label: "Update record", capability: "edit_spreadsheet", actionId: "update_record", executorId: "native.airtable.update-record", costMode: connected, riskLevel: "medium", approvalRequired: true, notes: "Used for changing tracked business records." }),
    ],
    readinessHints: ["Base/table IDs and field names must match the coworker playbook."],
  },
  {
    providerId: "docusign",
    label: "DocuSign",
    supportLevel: "executor_backed",
    services: [
      service({ id: "docusign.envelope", label: "Create envelope", capability: "create_document", actionId: "create_envelope", executorId: "native.docusign.create-envelope", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Used by legal/admin coworkers for signature workflows." }),
      service({ id: "docusign.status", label: "Check envelope status", capability: "summarize_knowledge", actionId: "get_envelope_status", executorId: "native.docusign.get-envelope-status", costMode: connected, riskLevel: "low", approvalRequired: false, notes: "Used for contract follow-up." }),
    ],
    readinessHints: ["Envelope sending requires account, template, and signer fields."],
  },
  {
    providerId: "canva",
    label: "Canva",
    supportLevel: "mcp_ready",
    services: [
      service({ id: "canva.design", label: "Create editable design", capability: "create_visual_design", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used by design and social coworkers to create brand assets." }),
      service({ id: "canva.resize", label: "Resize social formats", capability: "edit_visual_design", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used to adapt one design across social channels." }),
    ],
    readinessHints: ["Use Canva connector/MCP or a custom bridge for live design actions."],
  },
  {
    providerId: "figma",
    label: "Figma",
    supportLevel: "mcp_ready",
    services: [
      service({ id: "figma.design", label: "Create product/design files", capability: "create_visual_design", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used by design/product coworkers for UI and brand systems." }),
      service({ id: "figma.handoff", label: "Organize design handoff", capability: "edit_visual_design", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used for revisions, components, and design-system work." }),
    ],
    readinessHints: ["Use Figma connector/MCP or API token before live workspace writes."],
  },
  {
    providerId: "github",
    label: "GitHub",
    supportLevel: "mcp_ready",
    services: [
      service({ id: "github.code", label: "Read and change code", capability: "edit_codebase", costMode: connected, riskLevel: "high", approvalRequired: true, notes: "Used by engineering coworkers for issues, commits, and PRs." }),
      service({ id: "github.project", label: "Manage engineering work", capability: "manage_project_tasks", costMode: connected, riskLevel: "medium", approvalRequired: true, notes: "Used for issue/project updates." }),
    ],
    readinessHints: ["Repo permissions, branch rules, and PR approval policy should be explicit."],
  },
  {
    providerId: "zoom",
    label: "Zoom",
    supportLevel: "executor_backed",
    services: [
      service({ id: "zoom.meeting", label: "Create meeting", capability: "manage_calendar", actionId: "create_meeting", executorId: "native.zoom.create-meeting", costMode: connected, riskLevel: "medium", approvalRequired: true, notes: "Used by reception, sales, and project coworkers." }),
    ],
    readinessHints: ["Zoom account must allow meeting creation."],
  },
  {
    providerId: "calendly",
    label: "Calendly",
    supportLevel: "executor_backed",
    services: [
      service({ id: "calendly.events", label: "Read booking events", capability: "manage_calendar", actionId: "get_events", executorId: "native.calendly.get-events", costMode: connected, riskLevel: "low", approvalRequired: false, notes: "Used for scheduling awareness and follow-up." }),
    ],
    readinessHints: ["Calendly token must allow event reads. Booking writes may require a deeper integration path."],
  },
  {
    providerId: "trello",
    label: "Trello",
    supportLevel: "executor_backed",
    services: [
      service({ id: "trello.card", label: "Create card", capability: "manage_project_tasks", actionId: "create_card", executorId: "native.trello.create-card", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used by project and operations coworkers." }),
    ],
    readinessHints: ["Board and list IDs must be selected."],
  },
  {
    providerId: "asana",
    label: "Asana",
    supportLevel: "executor_backed",
    services: [
      service({ id: "asana.task", label: "Create task", capability: "manage_project_tasks", actionId: "create_task", executorId: "native.asana.create-task", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used for project delivery and follow-up tasks." }),
    ],
    readinessHints: ["Workspace/project permissions must allow task creation."],
  },
  {
    providerId: "monday",
    label: "Monday.com",
    supportLevel: "executor_backed",
    services: [
      service({ id: "monday.item", label: "Create item", capability: "manage_project_tasks", actionId: "create_item", executorId: "native.monday.create-item", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used for operations and project boards." }),
    ],
    readinessHints: ["Board and group IDs must be selected."],
  },
  {
    providerId: "clickup",
    label: "ClickUp",
    supportLevel: "executor_backed",
    services: [
      service({ id: "clickup.task", label: "Create task", capability: "manage_project_tasks", actionId: "create_task", executorId: "native.clickup.create-task", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Used by delivery and ops coworkers." }),
    ],
    readinessHints: ["Workspace/list permissions must allow task creation."],
  },
  {
    providerId: "jira",
    label: "Jira",
    supportLevel: "catalog_ready",
    services: [
      service({ id: "jira.issue", label: "Create issue", capability: "manage_project_tasks", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Catalog-ready; needs native executor, MCP, or custom API for live writes." }),
    ],
    readinessHints: ["Use MCP/custom API or add a native Jira executor before live issue creation."],
  },
  {
    providerId: "linear",
    label: "Linear",
    supportLevel: "catalog_ready",
    services: [
      service({ id: "linear.issue", label: "Create issue", capability: "manage_project_tasks", costMode: connected, riskLevel: "medium", approvalRequired: false, notes: "Catalog-ready; needs native executor, MCP, or custom API for live writes." }),
    ],
    readinessHints: ["Use MCP/custom API or add a native Linear executor before live issue creation."],
  },
  {
    providerId: "typeform",
    label: "Typeform",
    supportLevel: "executor_backed",
    services: [
      service({ id: "typeform.responses", label: "Read responses", capability: "summarize_knowledge", actionId: "get_responses", executorId: "native.typeform.get-responses", costMode: connected, riskLevel: "low", approvalRequired: false, notes: "Used by research, intake, and customer coworkers." }),
    ],
    readinessHints: ["Form access must allow response reads."],
  },
  {
    providerId: "google_forms",
    label: "Google Forms",
    supportLevel: "catalog_ready",
    services: [
      service({ id: "forms.responses", label: "Collect and summarize form responses", capability: "summarize_knowledge", costMode: connected, riskLevel: "low", approvalRequired: false, notes: "Often backed by Google Sheets until a native Forms executor is added." }),
    ],
    readinessHints: ["Connect Google and route responses into Sheets for the strongest current path."],
  },
  {
    providerId: "webhook",
    label: "Webhook / Custom API",
    supportLevel: "executor_backed",
    services: [
      service({ id: "webhook.request", label: "Call an API", capability: "operate_software", actionId: "request", executorId: "generic.http", costMode: manual, riskLevel: "high", approvalRequired: true, notes: "Universal fallback for SaaS products without native connectors." }),
      service({ id: "webhook.browser", label: "Operate software bridge", capability: "operate_browser", costMode: manual, riskLevel: "high", approvalRequired: true, notes: "Used for custom bridges and internal tools." }),
    ],
    readinessHints: ["Base URL, auth, allowed actions, and test payloads must be configured."],
  },
  {
    providerId: "anthropic",
    label: "Anthropic",
    supportLevel: "runtime_provider",
    services: [
      service({ id: "anthropic.brain", label: "Reasoning and coworker brain", capability: "summarize_knowledge", costMode: platform, riskLevel: "low", approvalRequired: false, notes: "Used as a paid runtime brain for planning, writing, classification, and chat." }),
      service({ id: "anthropic.write", label: "Draft and revise work", capability: "create_document", costMode: platform, riskLevel: "medium", approvalRequired: false, notes: "Used for documents, strategies, briefs, scripts, and customer replies before external send." }),
    ],
    readinessHints: ["ANTHROPIC_API_KEY must be configured for paid model-backed coworker reasoning."],
  },
  {
    providerId: "openai",
    label: "OpenAI",
    supportLevel: "runtime_provider",
    services: [
      service({ id: "openai.media", label: "Generate images/media", capability: "generate_media", costMode: platform, riskLevel: "medium", approvalRequired: false, notes: "Used for generated images and media creation when configured." }),
      service({ id: "openai.embeddings", label: "Create memory/search embeddings", capability: "summarize_knowledge", costMode: platform, riskLevel: "low", approvalRequired: false, notes: "Used for semantic memory and retrieval if enabled." }),
    ],
    readinessHints: ["OPENAI_API_KEY must be configured for image/media and embedding-backed memory paths."],
  },
  {
    providerId: "perplexity",
    label: "Perplexity",
    supportLevel: "runtime_provider",
    services: [
      service({ id: "perplexity.research", label: "Fresh cited research", capability: "research_sources", costMode: platform, riskLevel: "low", approvalRequired: false, notes: "Used by research, social, strategy, sales, and finance coworkers for cited web answers." }),
    ],
    readinessHints: ["PERPLEXITY_API_KEY must be configured, or Dobly should fall back to browser/search-assisted research."],
  },
  {
    providerId: "firecrawl",
    label: "Firecrawl",
    supportLevel: "runtime_provider",
    services: [
      service({ id: "firecrawl.extract", label: "Extract website content", capability: "research_sources", costMode: platform, riskLevel: "low", approvalRequired: false, notes: "Used for source extraction, competitor pages, and documentable research inputs." }),
    ],
    readinessHints: ["FIRECRAWL_API_KEY must be configured for crawling and extraction."],
  },
  {
    providerId: "elevenlabs",
    label: "ElevenLabs",
    supportLevel: "runtime_provider",
    services: [
      service({ id: "elevenlabs.voice", label: "Generate voice", capability: "generate_media", costMode: platform, riskLevel: "medium", approvalRequired: false, notes: "Used for voice notes, narrated videos, and receptionist voice experiences." }),
    ],
    readinessHints: ["ELEVENLABS_API_KEY must be configured for paid voice generation."],
  },
  {
    providerId: "file",
    label: "File",
    supportLevel: "executor_backed",
    services: [
      service({ id: "file.write", label: "Write file artifact", capability: "create_document", actionId: "write_file", executorId: "generic.file", costMode: included, riskLevel: "medium", approvalRequired: false, notes: "Used for local/exported artifacts when an external account is not needed." }),
    ],
    readinessHints: ["No external account is required, but user-visible exports should be stored in the right workspace path."],
  },
];

const PROVIDER_ALIASES = new Map<string, string>([
  ["m-pesa", "mpesa"],
  ["mpesa-daraja", "mpesa"],
  ["m_pesa", "mpesa"],
  ["google-workspace", "google"],
  ["gmail", "google"],
  ["google-gmail", "google"],
  ["google_docs", "google"],
  ["google-docs", "google"],
  ["google_sheets", "google"],
  ["google-sheets", "google"],
  ["google_calendar", "google"],
  ["google-calendar", "google"],
  ["google-drive", "google"],
  ["zoho-crm", "zoho"],
  ["monday.com", "monday"],
  ["web", "webhook"],
  ["generic-http", "webhook"],
  ["custom-api", "webhook"],
  ["custom_api", "webhook"],
  ["generic-file", "file"],
]);

const PROFILE_BY_PROVIDER = new Map(
  CONNECTION_CAPABILITY_PROFILES.map((profile) => [profile.providerId, profile]),
);

export function normalizeConnectionProviderId(providerId: string) {
  const normalized = providerId.trim().toLowerCase().replace(/\s+/g, "_");
  return PROVIDER_ALIASES.get(normalized) ?? normalized;
}

export function getConnectionCapabilityProfile(providerId: string) {
  return PROFILE_BY_PROVIDER.get(normalizeConnectionProviderId(providerId)) ?? null;
}

export function getConnectionServicesForCapabilities(providerId: string, capabilities: string[]) {
  const profile = getConnectionCapabilityProfile(providerId);
  if (!profile) return [];
  const wanted = new Set(capabilities);
  return profile.services.filter((serviceCapability) => wanted.has(serviceCapability.capability));
}

export function providerSupportsAnyCapability(providerId: string, capabilities: string[]) {
  return getConnectionServicesForCapabilities(providerId, capabilities).length > 0;
}

export function summarizeConnectionCapabilities(providerId: string, capabilities?: string[]) {
  const profile = getConnectionCapabilityProfile(providerId);
  if (!profile) return null;
  const services = capabilities?.length ? getConnectionServicesForCapabilities(providerId, capabilities) : profile.services;
  return {
    label: profile.label,
    supportLevel: profile.supportLevel,
    serviceLabels: services.map((item) => item.label),
    costModes: Array.from(new Set(services.map((item) => item.costMode))),
    approvalRequired: services.some((item) => item.approvalRequired),
    readinessHints: profile.readinessHints,
  };
}
