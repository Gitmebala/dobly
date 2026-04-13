import type { PlanId } from "@/types";

export type ConnectionCategory =
  | "communication"
  | "commerce"
  | "social"
  | "workspace"
  | "infrastructure";

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

export const CONNECTION_PROVIDERS: ConnectionProviderDefinition[] = [
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
      { key: "accessToken", label: "Access token", placeholder: "Paste Microsoft access token", secret: true },
      { key: "refreshToken", label: "Refresh token", placeholder: "Paste refresh token", secret: true },
    ],
  },
  {
    id: "yahoo",
    label: "Yahoo Mail",
    category: "communication",
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
      { key: "accessToken", label: "Access token", placeholder: "Paste Yahoo access token", secret: true },
      { key: "refreshToken", label: "Refresh token", placeholder: "Paste refresh token", secret: true },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp Business",
    category: "communication",
    launchReady: false,
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
    id: "meta",
    label: "Meta / Instagram",
    category: "social",
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
    id: "notion",
    label: "Notion",
    category: "workspace",
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
    category: "workspace",
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
    id: "hubspot",
    label: "HubSpot",
    category: "workspace",
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
    id: "webhook",
    label: "Webhook / API",
    category: "infrastructure",
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
  { id: "communication", label: "Communication", copy: "Email, messages, alerts, and team coordination." },
  { id: "commerce", label: "Commerce and payments", copy: "Orders, billing, receipts, subscriptions, and payment flows." },
  { id: "social", label: "Social and audience", copy: "Customer-facing workflows across Instagram and Meta." },
  { id: "workspace", label: "Workspace and ops", copy: "Calendars, databases, docs, CRM, and record systems." },
  { id: "infrastructure", label: "Webhook and API", copy: "Custom systems Dobly can talk to directly." },
];

export function getConnectionProvider(providerId: string) {
  return CONNECTION_PROVIDERS.find((provider) => provider.id === providerId) ?? null;
}

export function getProviderFlow(provider: ConnectionProviderDefinition, planId: PlanId) {
  if (planId === "pro" || planId === "agency") {
    return {
      flow: provider.proFlow,
      advancedAllowed: Boolean(provider.advancedFields?.length),
    };
  }

  return {
    flow: provider.starterFlow,
    advancedAllowed: false,
  };
}

export function isConnectionProviderLaunchReady(providerId: string) {
  return CONNECTION_PROVIDERS.some((provider) => provider.id === providerId && provider.launchReady);
}

export function getLaunchReadyConnectionProviders() {
  return CONNECTION_PROVIDERS.filter((provider) => provider.launchReady);
}
