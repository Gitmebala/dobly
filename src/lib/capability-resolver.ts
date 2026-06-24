import { findOperationalConnection } from "@/lib/connection-readiness";
import { getConnectionProvider } from "@/lib/connection-catalog";
import { isProviderVerifiedLive } from "@/lib/integration-contract";
import type { Connection, WorkflowBlueprint } from "@/types";
import type { DoblyVerticalDefinition } from "@/lib/verticals";

export type DoblyCapabilityId =
  | "web_research"
  | "scheduled_runs"
  | "outbound_email"
  | "marketing_email"
  | "crm_records"
  | "calendar_booking"
  | "team_alerting"
  | "customer_messaging"
  | "payment_tracking"
  | "store_operations"
  | "social_publishing"
  | "task_tracking"
  | "document_knowledge"
  | "custom_api";

export type DoblyCapabilityStatus =
  | "dobly_now"
  | "connected_now"
  | "unlock_one"
  | "draft_ready";

export interface DoblyCapabilityResolution {
  id: DoblyCapabilityId;
  title: string;
  user_need: string;
  status: DoblyCapabilityStatus;
  status_label: string;
  summary: string;
  required_for_live: boolean;
  delivered_by_dobly: boolean;
  connected_provider_id?: string | null;
  connected_provider_label?: string | null;
  recommended_provider_id?: string | null;
  recommended_provider_label?: string | null;
  unlock_options: string[];
  fallback_path: string;
}

interface CapabilityDefinition {
  id: DoblyCapabilityId;
  title: string;
  userNeed: string;
  keywords: string[];
  categoryHints?: string[];
  verticalHints?: string[];
  providerIds: string[];
  requiredForLive: boolean;
  deliveredByDobly: boolean;
  doblyPath: string;
  unlockPath: string;
  draftPath: string;
}

const CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "web_research",
    title: "Web research",
    userNeed: "Find, compare, and summarize live information",
    keywords: ["research", "search", "news", "web", "monitor", "competitor", "trend", "ai news"],
    categoryHints: ["Data & Reporting", "Sales & Marketing"],
    verticalHints: ["research-monitoring", "weekly-business-reporting"],
    providerIds: ["webhook"],
    requiredForLive: false,
    deliveredByDobly: true,
    doblyPath: "Dobly can research, compare findings, and write the brief using its own research stack.",
    unlockPath: "If you want company-specific sources later, add a custom API, database, or document system.",
    draftPath: "Dobly can still prepare the monitoring logic and reporting cadence now.",
  },
  {
    id: "scheduled_runs",
    title: "Scheduled execution",
    userNeed: "Run this work on a routine without manual prompting",
    keywords: ["every morning", "daily", "weekly", "schedule", "every", "recurring", "each day"],
    categoryHints: ["Productivity", "Data & Reporting", "Life & Personal Admin"],
    providerIds: [],
    requiredForLive: false,
    deliveredByDobly: true,
    doblyPath: "Dobly handles scheduling and recurring execution natively.",
    unlockPath: "No extra provider is required unless the run needs an external destination.",
    draftPath: "The timing can be set now and refined later.",
  },
  {
    id: "outbound_email",
    title: "Email delivery",
    userNeed: "Send summaries, follow-ups, and updates by email",
    keywords: ["email", "send me", "send summary", "inbox", "reply", "follow-up by email"],
    categoryHints: ["Customer Communication", "Productivity", "Life & Personal Admin"],
    providerIds: ["google", "microsoft", "yahoo"],
    requiredForLive: true,
    deliveredByDobly: true,
    doblyPath: "Dobly can prepare the email, schedule it, and keep the run logic live before a branded inbox is connected.",
    unlockPath: "To send from your own inbox, unlock Gmail, Outlook, or Yahoo Mail.",
    draftPath: "Dobly can stage the message and reporting flow now, then connect delivery later.",
  },
  {
    id: "marketing_email",
    title: "Campaign email sending",
    userNeed: "Send customer or subscriber campaigns",
    keywords: ["campaign", "newsletter", "marketing email", "broadcast", "subscriber", "lead magnet"],
    categoryHints: ["Sales & Marketing"],
    verticalHints: ["social-growth-automation", "lead-intake-follow-up"],
    providerIds: ["mailchimp", "klaviyo", "google", "shopify"],
    requiredForLive: true,
    deliveredByDobly: false,
    doblyPath: "Dobly can write the sequence, segment logic, and reporting before a delivery app is chosen.",
    unlockPath: "Use whichever email tool you already have, such as Mailchimp, Klaviyo, Gmail, or Shopify Email.",
    draftPath: "Dobly can fully prepare the campaign and launch once one sender is unlocked.",
  },
  {
    id: "crm_records",
    title: "Lead and customer records",
    userNeed: "Save, update, and track people or deal records",
    keywords: ["crm", "lead", "customer", "pipeline", "deal", "contact", "record"],
    categoryHints: ["Sales & Marketing", "Customer Communication"],
    verticalHints: ["lead-intake-follow-up", "client-onboarding", "recruiting-hiring-ops"],
    providerIds: ["hubspot", "salesforce", "airtable", "notion"],
    requiredForLive: false,
    deliveredByDobly: true,
    doblyPath: "Dobly can keep the workflow, qualification, and notes moving even before a CRM is connected.",
    unlockPath: "When you want records synced into your main system, unlock HubSpot, Salesforce, Airtable, or Notion.",
    draftPath: "Dobly can still build and run the intake logic now.",
  },
  {
    id: "calendar_booking",
    title: "Calendar booking",
    userNeed: "Check availability and book time",
    keywords: ["calendar", "book", "appointment", "meeting", "availability", "schedule call"],
    categoryHints: ["Productivity", "Customer Communication"],
    verticalHints: ["ai-receptionist", "inbox-calendar-assistant"],
    providerIds: ["google", "microsoft", "calendly"],
    requiredForLive: true,
    deliveredByDobly: false,
    doblyPath: "Dobly can qualify, collect details, and prepare booking options before live calendar access is added.",
    unlockPath: "For live booking, unlock Google Calendar, Microsoft Calendar, or Calendly.",
    draftPath: "Dobly can still handle the intake and confirmation flow now.",
  },
  {
    id: "team_alerting",
    title: "Team notifications",
    userNeed: "Alert the team when something important happens",
    keywords: ["alert", "notify", "team", "slack", "teams", "channel", "escalate internally"],
    categoryHints: ["HR & Operations", "Customer Communication"],
    providerIds: ["slack", "microsoft-teams", "discord", "telegram"],
    requiredForLive: false,
    deliveredByDobly: true,
    doblyPath: "Dobly can surface approvals and updates in-app immediately.",
    unlockPath: "If you want alerts in your team chat, unlock Slack, Teams, Discord, or Telegram.",
    draftPath: "In-app updates are enough to keep the system moving until team alerts are connected.",
  },
  {
    id: "customer_messaging",
    title: "Customer messaging",
    userNeed: "Message customers through chat, SMS, or WhatsApp",
    keywords: ["whatsapp", "sms", "message customer", "text", "dm", "chat"],
    categoryHints: ["Customer Communication", "Social Media"],
    verticalHints: ["ai-receptionist", "social-growth-automation", "support-triage"],
    providerIds: ["whatsapp", "kenya_local_comms", "twilio", "slack", "meta"],
    requiredForLive: true,
    deliveredByDobly: false,
    doblyPath: "Dobly can write the messaging logic, qualification path, and reporting now.",
    unlockPath: "For live customer messaging, unlock WhatsApp, Twilio SMS, or the relevant social account.",
    draftPath: "Dobly can still prepare the workflow and ask for the channel later.",
  },
  {
    id: "payment_tracking",
    title: "Payment and invoice checks",
    userNeed: "Track payment status and follow through on money-related work",
    keywords: ["payment", "invoice", "billing", "paid", "overdue", "refund", "subscription"],
    categoryHints: ["Finance & Invoicing", "E-commerce"],
    verticalHints: ["invoice-payment-follow-up", "ecommerce-operations"],
    providerIds: ["paystack", "mpesa", "quickbooks", "xero", "stripe"],
    requiredForLive: true,
    deliveredByDobly: false,
    doblyPath: "Dobly can create reminder logic, escalation rules, and reports before finance access is live.",
    unlockPath: "For live payment checks, unlock Stripe, QuickBooks, Xero, or M-Pesa.",
    draftPath: "Dobly can still prepare the collections flow and reports now.",
  },
  {
    id: "store_operations",
    title: "Store and order operations",
    userNeed: "Read or update orders, inventory, or storefront activity",
    keywords: ["store", "shopify", "order", "inventory", "product", "cart", "fulfillment"],
    categoryHints: ["E-commerce"],
    verticalHints: ["ecommerce-operations"],
    providerIds: ["shopify", "paystack", "mpesa", "stripe"],
    requiredForLive: true,
    deliveredByDobly: false,
    doblyPath: "Dobly can model the handling logic, notifications, and recovery steps before store access is live.",
    unlockPath: "For live order and inventory work, unlock Shopify or the payment platform you already use.",
    draftPath: "Dobly can still stage the operational flow now.",
  },
  {
    id: "social_publishing",
    title: "Social publishing and engagement",
    userNeed: "Post, monitor, or handle inbound social activity",
    keywords: ["instagram", "tiktok", "post", "social", "comment", "dm", "content"],
    categoryHints: ["Social Media", "Sales & Marketing"],
    verticalHints: ["social-growth-automation"],
    providerIds: ["meta", "webhook"],
    requiredForLive: true,
    deliveredByDobly: false,
    doblyPath: "Dobly can draft content, qualification flows, approvals, and reports before the account is connected.",
    unlockPath: "For live posting or inbound handling, unlock the social account or route through a custom integration.",
    draftPath: "Dobly can fully prepare the logic and publish queue first.",
  },
  {
    id: "task_tracking",
    title: "Task and project tracking",
    userNeed: "Create or update tasks and keep work moving",
    keywords: ["task", "project", "asana", "trello", "clickup", "linear", "jira"],
    categoryHints: ["Productivity", "HR & Operations"],
    verticalHints: ["freelancer-project-coordination", "client-onboarding"],
    providerIds: ["asana", "trello", "linear", "jira"],
    requiredForLive: false,
    deliveredByDobly: true,
    doblyPath: "Dobly can manage the coordination logic, summaries, and status inside the workflow first.",
    unlockPath: "When you want external task sync, unlock Asana, Trello, Linear, or Jira.",
    draftPath: "Dobly can still coordinate the work and produce updates now.",
  },
  {
    id: "document_knowledge",
    title: "Document and knowledge access",
    userNeed: "Read reference material and use company knowledge",
    keywords: ["document", "knowledge", "faq", "notion", "drive", "policy", "sop"],
    categoryHints: ["HR & Operations", "Customer Communication", "Data & Reporting"],
    providerIds: ["notion", "airtable", "google"],
    requiredForLive: false,
    deliveredByDobly: true,
    doblyPath: "Dobly can run with the prompt and saved workspace memory before extra knowledge sources are connected.",
    unlockPath: "To ground it in company docs later, unlock Notion, Airtable, or Google.",
    draftPath: "The system can still be built and improved once documents are added.",
  },
  {
    id: "custom_api",
    title: "Custom business system access",
    userNeed: "Work with an internal app or niche external system",
    keywords: ["api", "internal tool", "custom", "webhook", "database", "erp"],
    categoryHints: ["Other", "HR & Operations", "Data & Reporting"],
    providerIds: ["webhook"],
    requiredForLive: false,
    deliveredByDobly: false,
    doblyPath: "Dobly can still build the orchestration, approvals, and reporting around the custom step.",
    unlockPath: "When you are ready, unlock a custom API or webhook connection.",
    draftPath: "Dobly can prepare the whole flow while the custom endpoint is still being set up.",
  },
];

function normalize(value: string) {
  return value.toLowerCase();
}

function buildCorpus(blueprint: WorkflowBlueprint, prompt: string, vertical?: DoblyVerticalDefinition | null) {
  return [
    prompt,
    blueprint.name,
    blueprint.description,
    blueprint.category,
    blueprint.trigger,
    ...(blueprint.integrations ?? []),
    ...(blueprint.setup_steps ?? []),
    ...(blueprint.steps ?? []).flatMap((step) => [step.tool, step.action, step.description]),
    ...(vertical?.toolkit ?? []),
    ...(vertical?.workflowLogic ?? []),
    ...(vertical?.responsibilities ?? []),
  ]
    .filter(Boolean)
    .map((value) => normalize(String(value)));
}

function inferCapabilities(corpus: string[], category?: string, vertical?: DoblyVerticalDefinition | null) {
  const inferred = CAPABILITIES.filter((capability) => {
    const keywordHit = capability.keywords.some((keyword) =>
      corpus.some((entry) => entry.includes(keyword)),
    );
    const categoryHit = capability.categoryHints?.includes(category ?? "") ?? false;
    const verticalHit = vertical ? capability.verticalHints?.includes(vertical.id) ?? false : false;
    return keywordHit || categoryHit || verticalHit;
  });

  const withDefaults = inferred.some((item) => item.id === "scheduled_runs")
    ? inferred
    : [CAPABILITIES.find((item) => item.id === "scheduled_runs")!, ...inferred];

  return Array.from(new Map(withDefaults.map((item) => [item.id, item])).values());
}

function statusLabel(status: DoblyCapabilityStatus) {
  switch (status) {
    case "dobly_now":
      return "Handled by Dobly now";
    case "connected_now":
      return "Ready with current stack";
    case "unlock_one":
      return "Needs one unlock";
    case "draft_ready":
      return "Can be prepared now";
  }
}

export function resolveDoblyCapabilities({
  prompt,
  blueprint,
  connections,
  vertical,
}: {
  prompt: string;
  blueprint: WorkflowBlueprint;
  connections: Connection[];
  vertical?: DoblyVerticalDefinition | null;
}) {
  const corpus = buildCorpus(blueprint, prompt, vertical);
  const inferred = inferCapabilities(corpus, blueprint.category, vertical);

  const items: DoblyCapabilityResolution[] = inferred.map((capability) => {
    const executableProviderIds = capability.providerIds.filter((providerId) => isProviderVerifiedLive(providerId));
    const connectedProviderId =
      executableProviderIds.find((providerId) => findOperationalConnection(connections, providerId)) ?? null;
    const connectedProvider = connectedProviderId ? getConnectionProvider(connectedProviderId) : null;
    const recommendedProviderId = executableProviderIds[0] ?? null;
    const recommendedProvider = recommendedProviderId ? getConnectionProvider(recommendedProviderId) : null;
    const unlockOptions = executableProviderIds
      .map((providerId) => getConnectionProvider(providerId)?.label)
      .filter((value): value is string => Boolean(value));

    let status: DoblyCapabilityStatus = "draft_ready";
    let summary = capability.draftPath;

    if (connectedProvider) {
      status = "connected_now";
      summary = `${capability.userNeed} is already covered by ${connectedProvider.label}.`;
    } else if (capability.deliveredByDobly) {
      status = "dobly_now";
      summary = capability.doblyPath;
    } else if (unlockOptions.length > 0) {
      status = "unlock_one";
      summary = capability.unlockPath;
    }

    return {
      id: capability.id,
      title: capability.title,
      user_need: capability.userNeed,
      status,
      status_label: statusLabel(status),
      summary,
      required_for_live: capability.requiredForLive,
      delivered_by_dobly: capability.deliveredByDobly,
      connected_provider_id: connectedProviderId,
      connected_provider_label: connectedProvider?.label ?? null,
      recommended_provider_id: recommendedProviderId,
      recommended_provider_label: recommendedProvider?.label ?? null,
      unlock_options: unlockOptions,
      fallback_path: capability.draftPath,
    };
  });

  const promptCorpus = [normalize(prompt)];
  const neededNow = items.filter((item) => {
    if (!item.required_for_live || ["dobly_now", "connected_now"].includes(item.status)) return false;
    return item.recommended_provider_id
      ? promptCorpus.some((entry) => providerExplicitlyMentioned(item.recommended_provider_id!, entry))
      : false;
  });

  return {
    items,
    summary: {
      ready_now: items.filter((item) => item.status === "connected_now" || item.status === "dobly_now").length,
      one_unlock: items.filter((item) => item.status === "unlock_one").length,
      draft_ready: items.filter((item) => item.status === "draft_ready").length,
    },
    needed_now_provider_ids: Array.from(
      new Set(
        neededNow
          .map((item) => item.recommended_provider_id)
          .filter((value): value is string => Boolean(value)),
      ),
    ),
  };
}

function providerExplicitlyMentioned(providerId: string, prompt: string) {
  const provider = getConnectionProvider(providerId);
  const label = provider?.label.toLowerCase();
  const aliases = [providerId.toLowerCase(), label].filter((value): value is string => Boolean(value));
  return aliases.some((alias) => prompt.includes(alias));
}
