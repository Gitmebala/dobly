import type { PlanId } from "@/types";

export type ConnectionCategory =
  | "communication"
  | "commerce"
  | "sales-crm"
  | "support"
  | "documents"
  | "marketing"
  | "operations"
  | "custom";

export type EasySetupMethod = "oauth" | "otp" | "guided" | "store" | "email-link";

export interface ConnectionFieldDefinition {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  help?: string;
}

export interface ConnectionFlowDefinition {
  method: EasySetupMethod;
  title: string;
  description: string;
  ctaLabel: string;
  helper?: string;
  fields?: ConnectionFieldDefinition[];
  oauthHref?: string;
}

export interface ConnectionProviderDefinition {
  id: string;
  label: string;
  category: ConnectionCategory;
  description: string;
  useCases: string[];
  launchReady?: boolean;
  starterFlow: ConnectionFlowDefinition;
  proFlow: ConnectionFlowDefinition;
  advancedFields?: ConnectionFieldDefinition[];
}

const secureFields = {
  token: { key: "accessToken", label: "Access token", placeholder: "Paste access token", secret: true },
  refresh: { key: "refreshToken", label: "Refresh token", placeholder: "Paste refresh token", secret: true },
  secret: { key: "secret", label: "Secret", placeholder: "Paste secret", secret: true },
};

export const CONNECTION_PROVIDERS: ConnectionProviderDefinition[] = [
  // ==================== COMMUNICATION ====================
  {
    id: "google",
    label: "Google",
    category: "communication",
    launchReady: true,
    description: "Send Gmail, update Sheets, and use Calendar events without touching setup complexity.",
    useCases: ["Email delivery", "Sheet updates", "Calendar triggers"],
    starterFlow: {
      method: "oauth",
      title: "Connect your Google account",
      description: "Sign in with Google once. Dobly handles Gmail, Sheets, and Calendar access behind the scenes.",
      ctaLabel: "Continue with Google",
      oauthHref: "/api/oauth/google/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect your Google workspace",
      description: "Use the standard Google sign-in flow. Advanced teams can map multiple Google accounts later.",
      ctaLabel: "Continue with Google",
      oauthHref: "/api/oauth/google/start",
    },
  },
  {
    id: "microsoft",
    label: "Microsoft",
    category: "communication",
    description: "Use Outlook and Microsoft 365 without asking customers to know developer credentials.",
    useCases: ["Outlook email", "Calendar reminders", "Office workflows"],
    starterFlow: {
      method: "oauth",
      title: "Connect your Microsoft account",
      description: "Sign in with Microsoft once. Dobly handles Outlook and Microsoft 365 access behind the scenes.",
      ctaLabel: "Continue with Microsoft",
      oauthHref: "/api/oauth/microsoft/start",
      helper: "No tokens or developer settings required on Starter.",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Microsoft 365",
      description: "Use the Microsoft sign-in flow first. Pro and Agency can still switch to manual setup below if needed.",
      ctaLabel: "Continue with Microsoft",
      oauthHref: "/api/oauth/microsoft/start",
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Microsoft email", placeholder: "you@outlook.com" },
      secureFields.token,
      secureFields.refresh,
    ],
  },
  {
    id: "yahoo",
    label: "Yahoo Mail",
    category: "communication",
    launchReady: true,
    description: "Connect Yahoo inboxes with a simple ownership-first flow.",
    useCases: ["Send email", "Inbox workflows"],
    starterFlow: {
      method: "email-link",
      title: "Verify your Yahoo email",
      description: "Enter the Yahoo address you want Dobly to use. We send a secure verification link and finish the rest for you.",
      ctaLabel: "Send verification link",
      fields: [{ key: "accountIdentifier", label: "Yahoo email", placeholder: "you@yahoo.com" }],
    },
    proFlow: {
      method: "email-link",
      title: "Connect Yahoo Mail",
      description: "Use simple email verification first. Advanced users can open manual setup if needed.",
      ctaLabel: "Send verification link",
      fields: [{ key: "accountIdentifier", label: "Yahoo email", placeholder: "you@yahoo.com" }],
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Yahoo email", placeholder: "you@yahoo.com" },
      secureFields.token,
      secureFields.refresh,
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp Business",
    category: "communication",
    launchReady: true,
    description: "Use your business number for reminders, confirmations, alerts, and approval requests.",
    useCases: ["Customer messages", "Approval alerts", "Operational reminders"],
    starterFlow: {
      method: "otp",
      title: "Verify your WhatsApp number",
      description: "Enter the number Dobly should use. Verification confirms ownership first, then Dobly can use that number in supported messaging flows.",
      ctaLabel: "Send verification code",
      fields: [
        { key: "accountIdentifier", label: "WhatsApp number", placeholder: "+254 7XX XXX XXX" },
        { key: "businessName", label: "Business name", placeholder: "Dobly Flowers" },
      ],
      helper: "Starter never sees Meta tokens or phone number IDs.",
    },
    proFlow: {
      method: "otp",
      title: "Connect WhatsApp Business",
      description: "Verify the number first. Pro and Agency can still use guided advanced setup if the messaging setup is more complex.",
      ctaLabel: "Send verification code",
      fields: [
        { key: "accountIdentifier", label: "WhatsApp number", placeholder: "+254 7XX XXX XXX" },
        { key: "businessName", label: "Business name", placeholder: "Dobly Flowers" },
      ],
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Display label", placeholder: "Main business number" },
      { key: "accessToken", label: "Meta access token", placeholder: "Paste Meta token", secret: true },
      { key: "phoneNumberId", label: "Phone number ID", placeholder: "WhatsApp phone number ID" },
    ],
  },
  {
    id: "slack",
    label: "Slack",
    category: "communication",
    launchReady: true,
    description: "Send updates to the right channels without extra technical steps.",
    useCases: ["Alerts", "Escalations", "Team routing"],
    starterFlow: {
      method: "oauth",
      title: "Connect Slack",
      description: "Sign in to the Slack workspace you want Dobly to post into.",
      ctaLabel: "Continue with Slack",
      oauthHref: "/api/oauth/slack/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Slack workspace",
      description: "Use Slack sign-in first. Pro and Agency can later map multiple channels and workspaces.",
      ctaLabel: "Continue with Slack",
      oauthHref: "/api/oauth/slack/start",
    },
  },
  {
    id: "twilio",
    label: "Twilio",
    category: "communication",
    launchReady: true,
    description: "Power SMS, voice alerts, and programmable messaging from a verified business number.",
    useCases: ["SMS reminders", "Voice alerts", "Programmatic messaging"],
    starterFlow: {
      method: "guided",
      title: "Connect Twilio",
      description: "Add the number or project you want to use first, then layer credentials only when you need them.",
      ctaLabel: "Start Twilio setup",
      fields: [{ key: "accountIdentifier", label: "Project label", placeholder: "Main Twilio account" }],
    },
    proFlow: {
      method: "guided",
      title: "Connect Twilio account",
      description: "Start guided. Pro and Agency can reveal SID and token fields when needed.",
      ctaLabel: "Start Twilio setup",
      fields: [{ key: "accountIdentifier", label: "Project label", placeholder: "Main Twilio account" }],
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Account label", placeholder: "Main Twilio account" },
      { key: "accessToken", label: "Account SID", placeholder: "AC..." },
      { key: "secret", label: "Auth token", placeholder: "Twilio auth token", secret: true },
    ],
  },
  {
    id: "mailchimp",
    label: "Mailchimp",
    category: "communication",
    launchReady: true,
    description: "Email marketing, segmentation, and automation for customer journeys.",
    useCases: ["Email campaigns", "Newsletter delivery", "Subscriber management"],
    starterFlow: {
      method: "oauth",
      title: "Connect Mailchimp",
      description: "Sign in with your Mailchimp account. Dobly handles list and campaign setup behind the scenes.",
      ctaLabel: "Continue with Mailchimp",
      oauthHref: "/api/oauth/mailchimp/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Mailchimp",
      description: "Use Mailchimp sign-in first. Pro and Agency can work with multiple lists and advanced automation.",
      ctaLabel: "Continue with Mailchimp",
      oauthHref: "/api/oauth/mailchimp/start",
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Mailchimp account", placeholder: "Main email account" },
      { key: "accessToken", label: "API key", placeholder: "Your Mailchimp API key", secret: true },
    ],
  },
  {
    id: "klaviyo",
    label: "Klaviyo",
    category: "communication",
    launchReady: true,
    description: "E-commerce email and SMS workflows for Shopify stores and beyond.",
    useCases: ["Abandoned cart", "Post-purchase", "Customer segments"],
    starterFlow: {
      method: "oauth",
      title: "Connect Klaviyo",
      description: "Sign in with Klaviyo. Dobly handles list and metric setup automatically.",
      ctaLabel: "Continue with Klaviyo",
      oauthHref: "/api/oauth/klaviyo/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Klaviyo",
      description: "Use Klaviyo sign-in. Pro and Agency can work with advanced flows.",
      ctaLabel: "Continue with Klaviyo",
      oauthHref: "/api/oauth/klaviyo/start",
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Klaviyo account", placeholder: "Main account" },
      { key: "accessToken", label: "Private API key", placeholder: "Klaviyo private key", secret: true },
    ],
  },
  {
    id: "zoom",
    label: "Zoom",
    category: "communication",
    launchReady: true,
    description: "Automate video meetings, webinars, and scheduling without manual setup.",
    useCases: ["Meeting automation", "Webinar hosting", "Recording distribution"],
    starterFlow: {
      method: "oauth",
      title: "Connect Zoom",
      description: "Sign in with your Zoom account. Dobly handles meeting setup automatically.",
      ctaLabel: "Continue with Zoom",
      oauthHref: "/api/oauth/zoom/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Zoom",
      description: "Use Zoom sign-in. Pro and Agency can handle webinar automation.",
      ctaLabel: "Continue with Zoom",
      oauthHref: "/api/oauth/zoom/start",
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Zoom account", placeholder: "Main account" },
      { key: "accessToken", label: "JWT token", placeholder: "Zoom JWT", secret: true },
    ],
  },
  {
    id: "intercom",
    label: "Intercom",
    category: "communication",
    launchReady: true,
    description: "Customer messaging, support, and engagement in one place.",
    useCases: ["Customer support", "Lead messages", "Customer feedback"],
    starterFlow: {
      method: "oauth",
      title: "Connect Intercom",
      description: "Sign in with Intercom. Dobly handles conversation routing automatically.",
      ctaLabel: "Continue with Intercom",
      oauthHref: "/api/oauth/intercom/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Intercom",
      description: "Use Intercom sign-in. Pro and Agency can work with custom workflows.",
      ctaLabel: "Continue with Intercom",
      oauthHref: "/api/oauth/intercom/start",
    },
  },

  // ==================== COMMERCE & PAYMENTS ====================
  {
    id: "shopify",
    label: "Shopify",
    category: "commerce",
    launchReady: true,
    description: "React to orders, customers, abandoned carts, and store events.",
    useCases: ["Order workflows", "Customer tagging", "Store triggers"],
    starterFlow: {
      method: "store",
      title: "Connect your Shopify store",
      description: "Type your store URL. Dobly sends you through the normal Shopify approval flow and comes back connected.",
      ctaLabel: "Continue to Shopify",
      fields: [{ key: "shop", label: "Shop domain", placeholder: "your-store.myshopify.com" }],
    },
    proFlow: {
      method: "store",
      title: "Connect Shopify",
      description: "Enter the store domain first, then approve access in Shopify.",
      ctaLabel: "Continue to Shopify",
      fields: [{ key: "shop", label: "Shop domain", placeholder: "your-store.myshopify.com" }],
    },
  },
  {
    id: "stripe",
    label: "Stripe",
    category: "commerce",
    description: "Use payment events, subscriptions, and billing moments as automation triggers.",
    useCases: ["Payment triggers", "Billing alerts", "Invoice workflows"],
    starterFlow: {
      method: "oauth",
      title: "Connect your Stripe account",
      description: "Use Stripe's normal connect flow once. Dobly keeps the billing and webhook setup behind the scenes.",
      ctaLabel: "Continue with Stripe",
      oauthHref: "/api/oauth/stripe/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Stripe",
      description: "Use Stripe sign-in first. Advanced teams can still use manual keys if they really need that.",
      ctaLabel: "Continue with Stripe",
      oauthHref: "/api/oauth/stripe/start",
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Account label", placeholder: "Main Stripe account" },
      { key: "secret", label: "Secret key", placeholder: "sk_live_...", secret: true },
    ],
  },
  {
    id: "square",
    label: "Square",
    category: "commerce",
    launchReady: true,
    description: "Connect payments, invoicing, and point-of-sale for retail and services.",
    useCases: ["Payment processing", "Invoice automation", "Sales triggers"],
    starterFlow: {
      method: "oauth",
      title: "Connect Square",
      description: "Sign in with your Square account. Dobly handles payments and invoices automatically.",
      ctaLabel: "Continue with Square",
      oauthHref: "/api/oauth/square/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Square",
      description: "Use Square sign-in. Pro and Agency can work with multiple locations.",
      ctaLabel: "Continue with Square",
      oauthHref: "/api/oauth/square/start",
    },
  },
  {
    id: "mpesa",
    label: "M-PESA",
    category: "commerce",
    launchReady: true,
    description: "Connect Safaricom Daraja so Dobly can use supported M-PESA payment actions and callback-aware flows.",
    useCases: ["STK push", "Collections", "Payment-aware flows"],
    starterFlow: {
      method: "guided",
      title: "Set up M-PESA with Daraja",
      description: "Use your Daraja credentials, shortcode, and callback URL once. Dobly stores them securely and validates the connection before it goes live.",
      ctaLabel: "Start Daraja setup",
      fields: [
        { key: "accountIdentifier", label: "Business shortcode", placeholder: "174379 or your paybill/till" },
        { key: "environment", label: "Environment", placeholder: "sandbox" },
        { key: "callbackUrl", label: "Callback URL", placeholder: "https://your-app.com/api/webhooks/mpesa" },
        { key: "accessToken", label: "Consumer key", placeholder: "Paste Daraja consumer key", secret: true },
        { key: "secret", label: "Consumer secret", placeholder: "Paste Daraja consumer secret", secret: true },
        { key: "refreshToken", label: "Passkey", placeholder: "Paste Daraja passkey", secret: true },
      ],
      helper: "Use sandbox while testing. Switch to production when your Daraja app is live.",
    },
    proFlow: {
      method: "guided",
      title: "Connect M-PESA with Daraja",
      description: "Use the same guided Daraja setup first. Pro and Agency can still work with advanced credential fields below.",
      ctaLabel: "Start Daraja setup",
      fields: [
        { key: "accountIdentifier", label: "Business shortcode", placeholder: "174379 or your paybill/till" },
        { key: "environment", label: "Environment", placeholder: "sandbox" },
        { key: "callbackUrl", label: "Callback URL", placeholder: "https://your-app.com/api/webhooks/mpesa" },
        { key: "accessToken", label: "Consumer key", placeholder: "Paste Daraja consumer key", secret: true },
        { key: "secret", label: "Consumer secret", placeholder: "Paste Daraja consumer secret", secret: true },
        { key: "refreshToken", label: "Passkey", placeholder: "Paste Daraja passkey", secret: true },
      ],
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Business shortcode", placeholder: "174379 or your paybill/till" },
      { key: "environment", label: "Environment", placeholder: "sandbox or production", help: "Use sandbox for testing and production for live traffic." },
      { key: "callbackUrl", label: "Callback URL", placeholder: "https://your-app.com/api/webhooks/mpesa", help: "Daraja will send payment results here." },
      { key: "accessToken", label: "Consumer key", placeholder: "Paste Daraja consumer key", secret: true },
      { key: "secret", label: "Consumer secret", placeholder: "Paste Daraja consumer secret", secret: true },
      { key: "refreshToken", label: "Passkey", placeholder: "Paste Daraja passkey", secret: true },
    ],
  },
  {
    id: "quickbooks",
    label: "QuickBooks",
    category: "commerce",
    launchReady: true,
    description: "Connect accounting records for invoice, receipt, and cashflow automation.",
    useCases: ["Invoice sync", "Expense routing", "Accounting updates"],
    starterFlow: {
      method: "guided",
      title: "Connect QuickBooks",
      description: "Start with the company or ledger you want linked. Dobly can add credential detail later when needed.",
      ctaLabel: "Start QuickBooks setup",
      fields: [{ key: "accountIdentifier", label: "Company label", placeholder: "Main QuickBooks company" }],
    },
    proFlow: {
      method: "guided",
      title: "Connect QuickBooks account",
      description: "Use a guided setup first, then reveal client details or tokens only if needed.",
      ctaLabel: "Start QuickBooks setup",
      fields: [{ key: "accountIdentifier", label: "Company label", placeholder: "Main QuickBooks company" }],
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Company label", placeholder: "Main QuickBooks company" },
      secureFields.token,
      secureFields.refresh,
    ],
  },
  {
    id: "xero",
    label: "Xero",
    category: "commerce",
    launchReady: true,
    description: "Connect bookkeeping and invoicing workflows for finance-aware operations.",
    useCases: ["Invoice sync", "Payment reconciliation", "Bookkeeping updates"],
    starterFlow: {
      method: "guided",
      title: "Connect Xero",
      description: "Add the organization you want Dobly to work with, then complete the secure accounting setup.",
      ctaLabel: "Start Xero setup",
      fields: [{ key: "accountIdentifier", label: "Organization label", placeholder: "Main Xero org" }],
    },
    proFlow: {
      method: "guided",
      title: "Connect Xero organization",
      description: "Start guided. Advanced teams can reveal manual credentials later if needed.",
      ctaLabel: "Start Xero setup",
      fields: [{ key: "accountIdentifier", label: "Organization label", placeholder: "Main Xero org" }],
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Organization label", placeholder: "Main Xero org" },
      secureFields.token,
      secureFields.refresh,
    ],
  },
  {
    id: "wave",
    label: "Wave",
    category: "commerce",
    launchReady: true,
    description: "Free accounting, invoicing, and expense management for small businesses.",
    useCases: ["Invoice automation", "Expense tracking", "Financial reports"],
    starterFlow: {
      method: "oauth",
      title: "Connect Wave",
      description: "Sign in with your Wave account. Dobly handles invoicing and accounting automatically.",
      ctaLabel: "Continue with Wave",
      oauthHref: "/api/oauth/wave/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Wave",
      description: "Use Wave sign-in. Pro and Agency can work with multiple businesses.",
      ctaLabel: "Continue with Wave",
      oauthHref: "/api/oauth/wave/start",
    },
  },

  // ==================== CRM & SALES ====================
  {
    id: "salesforce",
    label: "Salesforce",
    category: "sales-crm",
    launchReady: true,
    description: "Use enterprise CRM objects, lead stages, and account movement inside workflows.",
    useCases: ["Lead routing", "Opportunity updates", "Account sync"],
    starterFlow: {
      method: "guided",
      title: "Connect Salesforce",
      description: "Tell Dobly which org or business unit you want to connect first, then continue securely.",
      ctaLabel: "Start Salesforce setup",
      fields: [{ key: "accountIdentifier", label: "Org label", placeholder: "Main Salesforce org" }],
    },
    proFlow: {
      method: "guided",
      title: "Connect Salesforce org",
      description: "Begin with a guided setup. Advanced fields are there when your org needs them.",
      ctaLabel: "Start Salesforce setup",
      fields: [{ key: "accountIdentifier", label: "Org label", placeholder: "Main Salesforce org" }],
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Org label", placeholder: "Main Salesforce org" },
      { key: "baseUrl", label: "Instance URL", placeholder: "https://your-instance.salesforce.com" },
      secureFields.token,
      secureFields.refresh,
    ],
  },
  {
    id: "hubspot",
    label: "HubSpot",
    category: "sales-crm",
    description: "Use CRM records and deal movement as workflow triggers without scaring normal users away.",
    useCases: ["Lead routing", "Deal updates", "CRM sync"],
    starterFlow: {
      method: "oauth",
      title: "Connect HubSpot",
      description: "Use HubSpot sign-in once. Dobly handles the CRM connection details behind the scenes.",
      ctaLabel: "Continue with HubSpot",
      oauthHref: "/api/oauth/hubspot/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect HubSpot",
      description: "Use HubSpot sign-in first. Advanced teams can still add a private app token later.",
      ctaLabel: "Continue with HubSpot",
      oauthHref: "/api/oauth/hubspot/start",
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Portal name", placeholder: "Main HubSpot portal" },
      { key: "accessToken", label: "Private app token", placeholder: "Paste HubSpot token", secret: true },
    ],
  },
  {
    id: "pipedrive",
    label: "Pipedrive",
    category: "sales-crm",
    launchReady: true,
    description: "Sales pipeline automation for deal movement and lead scoring.",
    useCases: ["Deal tracking", "Lead assignment", "Sales alerts"],
    starterFlow: {
      method: "oauth",
      title: "Connect Pipedrive",
      description: "Sign in with your Pipedrive account. Dobly handles deal and lead automation.",
      ctaLabel: "Continue with Pipedrive",
      oauthHref: "/api/oauth/pipedrive/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Pipedrive",
      description: "Use Pipedrive sign-in. Pro and Agency can work with custom fields.",
      ctaLabel: "Continue with Pipedrive",
      oauthHref: "/api/oauth/pipedrive/start",
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Pipedrive account", placeholder: "Main account" },
      { key: "accessToken", label: "API token", placeholder: "Pipedrive API token", secret: true },
    ],
  },
  {
    id: "zoho-crm",
    label: "Zoho CRM",
    category: "sales-crm",
    launchReady: true,
    description: "Affordable enterprise CRM with sales automation and lead management.",
    useCases: ["Lead management", "Deal automation", "Sales workflow"],
    starterFlow: {
      method: "oauth",
      title: "Connect Zoho CRM",
      description: "Sign in with your Zoho account. Dobly handles CRM workflows automatically.",
      ctaLabel: "Continue with Zoho",
      oauthHref: "/api/oauth/zoho-crm/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Zoho CRM",
      description: "Use Zoho sign-in. Pro and Agency can work with custom modules.",
      ctaLabel: "Continue with Zoho",
      oauthHref: "/api/oauth/zoho-crm/start",
    },
  },
  {
    id: "monday",
    label: "monday.com",
    category: "operations",
    launchReady: true,
    description: "Work OS for project tracking, resource management, and ops automation.",
    useCases: ["Project tracking", "Team coordination", "Resource allocation"],
    starterFlow: {
      method: "oauth",
      title: "Connect monday.com",
      description: "Sign in with your monday.com account. Dobly handles board automation.",
      ctaLabel: "Continue with monday.com",
      oauthHref: "/api/oauth/monday/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect monday.com",
      description: "Use monday.com sign-in. Pro and Agency can work with custom automations.",
      ctaLabel: "Continue with monday.com",
      oauthHref: "/api/oauth/monday/start",
    },
  },
  {
    id: "clickup",
    label: "ClickUp",
    category: "operations",
    launchReady: true,
    description: "All-in-one workspace for tasks, docs, goals, and team collaboration.",
    useCases: ["Task automation", "Team workflows", "Goal tracking"],
    starterFlow: {
      method: "oauth",
      title: "Connect ClickUp",
      description: "Sign in with ClickUp. Dobly handles task and project automation.",
      ctaLabel: "Continue with ClickUp",
      oauthHref: "/api/oauth/clickup/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect ClickUp",
      description: "Use ClickUp sign-in. Pro and Agency can work with advanced features.",
      ctaLabel: "Continue with ClickUp",
      oauthHref: "/api/oauth/clickup/start",
    },
  },

  // ==================== SUPPORT & SERVICE ====================
  {
    id: "zendesk",
    label: "Zendesk",
    category: "support",
    launchReady: true,
    description: "Ticketing and support automation for help desks and customer service teams.",
    useCases: ["Ticket automation", "Support routing", "Customer escalation"],
    starterFlow: {
      method: "oauth",
      title: "Connect Zendesk",
      description: "Sign in with your Zendesk account. Dobly handles ticket workflows automatically.",
      ctaLabel: "Continue with Zendesk",
      oauthHref: "/api/oauth/zendesk/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Zendesk",
      description: "Use Zendesk sign-in. Pro and Agency can work with advanced routing.",
      ctaLabel: "Continue with Zendesk",
      oauthHref: "/api/oauth/zendesk/start",
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Zendesk subdomain", placeholder: "your-company" },
      { key: "accessToken", label: "API token", placeholder: "Zendesk API token", secret: true },
    ],
  },
  {
    id: "freshdesk",
    label: "Freshdesk",
    category: "support",
    launchReady: true,
    description: "Cloud-based help desk software for support ticket automation.",
    useCases: ["Ticket management", "Support automation", "Customer service"],
    starterFlow: {
      method: "oauth",
      title: "Connect Freshdesk",
      description: "Sign in with Freshdesk. Dobly handles ticket automation.",
      ctaLabel: "Continue with Freshdesk",
      oauthHref: "/api/oauth/freshdesk/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Freshdesk",
      description: "Use Freshdesk sign-in. Pro and Agency can work with advanced workflows.",
      ctaLabel: "Continue with Freshdesk",
      oauthHref: "/api/oauth/freshdesk/start",
    },
  },

  // ==================== DOCUMENTS & COMPLIANCE ====================
  {
    id: "docusign",
    label: "DocuSign",
    category: "documents",
    launchReady: true,
    description: "E-signature and document automation for legally binding agreements.",
    useCases: ["Contract signing", "Document approval", "Legal workflows"],
    starterFlow: {
      method: "oauth",
      title: "Connect DocuSign",
      description: "Sign in with your DocuSign account. Dobly handles signature workflows.",
      ctaLabel: "Continue with DocuSign",
      oauthHref: "/api/oauth/docusign/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect DocuSign",
      description: "Use DocuSign sign-in. Pro and Agency can work with advanced templates.",
      ctaLabel: "Continue with DocuSign",
      oauthHref: "/api/oauth/docusign/start",
    },
  },
  {
    id: "notion",
    label: "Notion",
    category: "documents",
    description: "Create records and docs in Notion with a setup flow normal operators can handle.",
    useCases: ["Lead tracking", "Knowledge updates", "Ops databases"],
    starterFlow: {
      method: "oauth",
      title: "Connect your Notion workspace",
      description: "Use Notion sign-in once. Dobly will ask you to pick the workspace and carry the rest.",
      ctaLabel: "Continue with Notion",
      oauthHref: "/api/oauth/notion/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Notion",
      description: "Use Notion sign-in first. Advanced users can still switch to manual secrets if needed.",
      ctaLabel: "Continue with Notion",
      oauthHref: "/api/oauth/notion/start",
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Workspace name", placeholder: "Main operations workspace" },
      { key: "secret", label: "Integration token", placeholder: "Paste Notion secret", secret: true },
    ],
  },
  {
    id: "airtable",
    label: "Airtable",
    category: "documents",
    description: "Connect Airtable bases for operational records and lead flows.",
    useCases: ["CRM tables", "Operational records", "Lead capture"],
    starterFlow: {
      method: "oauth",
      title: "Connect Airtable",
      description: "Use Airtable sign-in once. Dobly keeps the token handling and base access behind the scenes.",
      ctaLabel: "Continue with Airtable",
      oauthHref: "/api/oauth/airtable/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Airtable",
      description: "Use Airtable sign-in first. Advanced users can still open manual token setup if needed.",
      ctaLabel: "Continue with Airtable",
      oauthHref: "/api/oauth/airtable/start",
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Base label", placeholder: "Main sales base" },
      { key: "accessToken", label: "Personal access token", placeholder: "Paste Airtable token", secret: true },
    ],
  },
  {
    id: "google-forms",
    label: "Google Forms",
    category: "documents",
    launchReady: true,
    description: "Create surveys, feedback forms, and lead capture without technical setup.",
    useCases: ["Survey collection", "Lead capture", "Feedback forms"],
    starterFlow: {
      method: "oauth",
      title: "Connect Google Forms",
      description: "Sign in with Google. Dobly handles form automation.",
      ctaLabel: "Continue with Google",
      oauthHref: "/api/oauth/google-forms/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Google Forms",
      description: "Use Google sign-in. Pro and Agency can work with advanced flows.",
      ctaLabel: "Continue with Google",
      oauthHref: "/api/oauth/google-forms/start",
    },
  },
  {
    id: "typeform",
    label: "Typeform",
    category: "documents",
    launchReady: true,
    description: "Beautiful, conversational forms for surveys, feedback, and lead capture.",
    useCases: ["Lead qualification", "Feedback collection", "Surveys"],
    starterFlow: {
      method: "oauth",
      title: "Connect Typeform",
      description: "Sign in with Typeform. Dobly handles form automation.",
      ctaLabel: "Continue with Typeform",
      oauthHref: "/api/oauth/typeform/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Typeform",
      description: "Use Typeform sign-in. Pro and Agency can work with advanced workflows.",
      ctaLabel: "Continue with Typeform",
      oauthHref: "/api/oauth/typeform/start",
    },
  },

  // ==================== MARKETING & ANALYTICS ====================
  {
    id: "meta",
    label: "Meta / Instagram",
    category: "marketing",
    description: "Connect your Instagram or Facebook business presence without sending customers into developer settings.",
    useCases: ["Comment workflows", "Lead capture", "Social replies"],
    starterFlow: {
      method: "oauth",
      title: "Connect your Instagram business account",
      description: "Sign in with Meta and choose the business account you want Dobly to automate.",
      ctaLabel: "Continue with Meta",
      oauthHref: "/api/oauth/meta/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Meta business assets",
      description: "Use Meta sign-in first. Advanced setups can still switch to manual details below.",
      ctaLabel: "Continue with Meta",
      oauthHref: "/api/oauth/meta/start",
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Business account", placeholder: "Instagram business name" },
      { key: "accessToken", label: "Meta access token", placeholder: "Paste Meta token", secret: true },
      { key: "pageId", label: "Page or business ID", placeholder: "Meta page ID" },
    ],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    category: "marketing",
    launchReady: true,
    description: "B2B lead capture, company profiles, and professional networking automation.",
    useCases: ["Lead generation", "Company insights", "B2B outreach"],
    starterFlow: {
      method: "oauth",
      title: "Connect LinkedIn",
      description: "Sign in with your LinkedIn account. Dobly handles lead automation.",
      ctaLabel: "Continue with LinkedIn",
      oauthHref: "/api/oauth/linkedin/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect LinkedIn",
      description: "Use LinkedIn sign-in. Pro and Agency can work with advanced targeting.",
      ctaLabel: "Continue with LinkedIn",
      oauthHref: "/api/oauth/linkedin/start",
    },
  },
  {
    id: "google-analytics",
    label: "Google Analytics",
    category: "marketing",
    launchReady: true,
    description: "Website analytics and user behavior insights for data-driven decisions.",
    useCases: ["Traffic analysis", "Conversion tracking", "User behavior"],
    starterFlow: {
      method: "oauth",
      title: "Connect Google Analytics",
      description: "Sign in with Google. Dobly handles analytics access.",
      ctaLabel: "Continue with Google",
      oauthHref: "/api/oauth/google-analytics/start",
    },
    proFlow: {
      method: "oauth",
      title: "Connect Google Analytics",
      description: "Use Google sign-in. Pro and Agency can work with multiple properties.",
      ctaLabel: "Continue with Google",
      oauthHref: "/api/oauth/google-analytics/start",
    },
  },

  // ==================== OPERATIONS & SCHEDULING ====================
  {
    id: "calendly",
    label: "Calendly",
    category: "operations",
    launchReady: true,
    description: "Use bookings and meeting changes as clean scheduling triggers.",
    useCases: ["Meeting booked", "Reschedule alerts", "Availability routing"],
    starterFlow: {
      method: "guided",
      title: "Connect Calendly",
      description: "Start with the team or event type you want to automate around, then finish secure setup only if necessary.",
      ctaLabel: "Start Calendly setup",
      fields: [{ key: "accountIdentifier", label: "Workspace label", placeholder: "Main scheduling workspace" }],
    },
    proFlow: {
      method: "guided",
      title: "Connect Calendly workspace",
      description: "Start with a guided setup, then add token details only when needed.",
      ctaLabel: "Start Calendly setup",
      fields: [{ key: "accountIdentifier", label: "Workspace label", placeholder: "Main scheduling workspace" }],
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Workspace label", placeholder: "Main scheduling workspace" },
      { key: "accessToken", label: "Personal access token", placeholder: "Calendly PAT", secret: true },
    ],
  },
  {
    id: "trello",
    label: "Trello",
    category: "operations",
    launchReady: true,
    description: "Turn boards and cards into simple operational workflows.",
    useCases: ["Task updates", "Card routing", "Ops tracking"],
    starterFlow: {
      method: "guided",
      title: "Connect Trello",
      description: "Pick the board or workspace you want Dobly to work with, then finish secure details only if needed.",
      ctaLabel: "Start Trello setup",
      fields: [{ key: "accountIdentifier", label: "Board or workspace", placeholder: "Fulfillment board" }],
    },
    proFlow: {
      method: "guided",
      title: "Connect Trello workspace",
      description: "Start guided. Advanced users can add API credentials below if needed.",
      ctaLabel: "Start Trello setup",
      fields: [{ key: "accountIdentifier", label: "Board or workspace", placeholder: "Fulfillment board" }],
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Board or workspace", placeholder: "Fulfillment board" },
      { key: "accessToken", label: "API key", placeholder: "Trello API key", secret: true },
      { key: "secret", label: "Token", placeholder: "Trello token", secret: true },
    ],
  },
  {
    id: "asana",
    label: "Asana",
    category: "operations",
    launchReady: true,
    description: "Coordinate project work, owner assignments, and task updates.",
    useCases: ["Project updates", "Task sync", "Owner routing"],
    starterFlow: {
      method: "guided",
      title: "Connect Asana",
      description: "Start with the workspace or project you want linked. Dobly can reveal credential detail only when necessary.",
      ctaLabel: "Start Asana setup",
      fields: [{ key: "accountIdentifier", label: "Workspace or project", placeholder: "Operations project" }],
    },
    proFlow: {
      method: "guided",
      title: "Connect Asana workspace",
      description: "Use guided setup first, then add manual token details if needed.",
      ctaLabel: "Start Asana setup",
      fields: [{ key: "accountIdentifier", label: "Workspace or project", placeholder: "Operations project" }],
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Workspace or project", placeholder: "Operations project" },
      { key: "accessToken", label: "Personal access token", placeholder: "Asana PAT", secret: true },
    ],
  },

  // ==================== CUSTOM / ADVANCED ====================
  {
    id: "webhook",
    label: "Webhook / API",
    category: "custom",
    launchReady: true,
    description: "Custom systems for advanced users who need Dobly to talk to internal APIs.",
    useCases: ["Custom API calls", "Internal tools", "Long-tail integrations"],
    starterFlow: {
      method: "guided",
      title: "Request a custom connection",
      description: "Starter users do not need raw webhook setup. Tell Dobly what tool you need and we guide the safest next step.",
      ctaLabel: "Request custom connection",
      fields: [{ key: "accountIdentifier", label: "Tool name", placeholder: "My internal booking app" }],
    },
    proFlow: {
      method: "guided",
      title: "Set up a custom webhook or API",
      description: "Use guided setup first. Pro and Agency can reveal advanced webhook details when they need them.",
      ctaLabel: "Start custom setup",
      fields: [{ key: "accountIdentifier", label: "Connection label", placeholder: "Main internal API" }],
    },
    advancedFields: [
      { key: "accountIdentifier", label: "Connection label", placeholder: "Main internal API" },
      { key: "baseUrl", label: "Base URL", placeholder: "https://api.example.com" },
      { key: "secret", label: "Webhook secret", placeholder: "Shared secret", secret: true },
    ],
  },
];

export const CONNECTION_GROUPS: Array<{ id: ConnectionCategory; label: string; copy: string }> = [
  { id: "communication", label: "Communication & Messaging", copy: "Email, SMS, chat, video, and customer messaging for outreach and alerts." },
  { id: "commerce", label: "Commerce & Payments", copy: "E-commerce stores, payments, invoicing, subscriptions, and accounting." },
  { id: "sales-crm", label: "CRM & Sales", copy: "Lead management, deal tracking, customer databases, and sales workflows." },
  { id: "support", label: "Support & Service", copy: "Ticketing, help desks, and customer support automation." },
  { id: "documents", label: "Documents & Compliance", copy: "E-signatures, forms, surveys, databases, and document storage." },
  { id: "marketing", label: "Marketing & Analytics", copy: "Email campaigns, social media, analytics, and audience insights." },
  { id: "operations", label: "Operations & Scheduling", copy: "Project management, scheduling, task tracking, and team workflows." },
  { id: "custom", label: "Custom & Advanced", copy: "Custom APIs, webhooks, and internal tool integrations for advanced users." },
];

export function getConnectionProvider(providerId: string) {
  return CONNECTION_PROVIDERS.find((provider) => provider.id === providerId) ?? null;
}

export function getProviderFlow(provider: ConnectionProviderDefinition, planId: PlanId) {
  if (planId === "pro" || planId === "agency") {
    return { flow: provider.proFlow, advancedAllowed: Boolean(provider.advancedFields?.length) };
  }

  return { flow: provider.starterFlow, advancedAllowed: false };
}

export function isConnectionProviderLaunchReady(providerId: string) {
  return CONNECTION_PROVIDERS.some((provider) => provider.id === providerId && provider.launchReady);
}

export function getLaunchReadyConnectionProviders() {
  return CONNECTION_PROVIDERS.filter((provider) => provider.launchReady);
}
