import { getConnectionProvider } from "@/lib/connection-catalog";
import type { WorkflowBlueprint, WorkflowCategory } from "@/types";

export type ProviderMode = "required" | "optional";

export interface ManagedCapability {
  id: string;
  label: string;
  description: string;
}

export interface ProviderRecommendation {
  providerId: string;
  mode: ProviderMode;
  reason: string;
  label: string;
  description: string;
}

const PROVIDER_ALIASES: Record<string, string[]> = {
  google: ["google", "gmail", "google sheets", "sheets", "calendar"],
  microsoft: ["microsoft", "outlook", "office", "microsoft 365"],
  yahoo: ["yahoo", "yahoo mail"],
  whatsapp: ["whatsapp"],
  slack: ["slack"],
  discord: ["discord"],
  telegram: ["telegram"],
  twilio: ["twilio", "sms"],
  shopify: ["shopify", "storefront"],
  stripe: ["stripe"],
  mpesa: ["mpesa", "m-pesa", "daraja"],
  quickbooks: ["quickbooks"],
  xero: ["xero"],
  notion: ["notion"],
  airtable: ["airtable"],
  hubspot: ["hubspot"],
  calendly: ["calendly"],
  trello: ["trello"],
  asana: ["asana"],
  salesforce: ["salesforce"],
  webhook: ["webhook", "api", "internal api", "custom api"],
  postgres: ["postgres", "postgresql"],
  supabase: ["supabase"],
};

const CATEGORY_OPTIONAL_PROVIDERS: Record<WorkflowCategory, string[]> = {
  "Customer Communication": ["google", "whatsapp", "slack", "hubspot", "salesforce", "twilio"],
  "Sales & Marketing": ["hubspot", "salesforce", "google", "whatsapp", "slack", "shopify"],
  "Finance & Invoicing": ["stripe", "mpesa", "quickbooks", "xero", "google"],
  "Social Media": ["meta", "slack", "airtable", "notion"],
  "E-commerce": ["shopify", "stripe", "whatsapp", "hubspot", "slack"],
  "Productivity": ["google", "notion", "airtable", "trello", "asana", "calendly"],
  "Life & Personal Admin": ["google", "whatsapp", "telegram", "calendly"],
  "Data & Reporting": ["google", "airtable", "notion", "webhook"],
  "HR & Operations": ["slack", "google", "notion", "airtable", "calendly", "trello", "asana"],
  Other: ["google", "slack", "webhook", "notion"],
};

const CATEGORY_MANAGED_CAPABILITIES: Record<WorkflowCategory, ManagedCapability[]> = {
  "Customer Communication": [
    { id: "managed-replies", label: "Dobly drafting and replies", description: "Dobly can draft responses, summaries, follow-up copy, and structured handoff notes without requiring the user's inbox first." },
    { id: "managed-routing", label: "Dobly lead routing", description: "Dobly can qualify, route, and prioritize requests before asking for CRM or channel connections." },
    { id: "managed-approvals", label: "Dobly approvals", description: "Dobly can collect approvals and operator decisions in-app before any external message delivery is wired in." },
  ],
  "Sales & Marketing": [
    { id: "managed-intake", label: "Dobly intake and qualification", description: "Dobly can run forms, qualification logic, enrichment prompts, and opportunity scoring before a CRM is connected." },
    { id: "managed-sequences", label: "Dobly follow-up logic", description: "Dobly can design multi-step follow-up timing, reminders, and copy before outbound systems are chosen." },
    { id: "managed-reports", label: "Dobly campaign summaries", description: "Dobly can compile pipeline summaries, sales notes, and next-step briefs from workflow data it already sees." },
  ],
  "Finance & Invoicing": [
    { id: "managed-docs", label: "Dobly document generation", description: "Dobly can generate invoices, receipts, approval packets, and reminders before accounting systems are connected." },
    { id: "managed-reminders", label: "Dobly billing reminders", description: "Dobly can track due dates, reminder cadence, and escalation policy without needing a live finance connection at setup time." },
    { id: "managed-approvals-finance", label: "Dobly finance approval routing", description: "Dobly can manage review and approval checkpoints in-app before money movement is wired live." },
  ],
  "Social Media": [
    { id: "managed-content", label: "Dobly content drafting", description: "Dobly can create captions, calendar plans, review queues, and approval-ready post drafts without direct social connections." },
    { id: "managed-review", label: "Dobly approval workflow", description: "Dobly can keep review, revisions, and publishing checklists internal until posting is actually needed." },
  ],
  "E-commerce": [
    { id: "managed-confirmations", label: "Dobly order messaging logic", description: "Dobly can plan confirmation, exception handling, fulfillment messaging, and recovery logic before store access is connected." },
    { id: "managed-reports-commerce", label: "Dobly commerce reporting", description: "Dobly can assemble summaries, anomaly notes, and team digests from workflow output without requiring every downstream system." },
  ],
  "Productivity": [
    { id: "managed-briefs", label: "Dobly brief and summary generation", description: "Dobly can generate agendas, project briefs, summaries, and updates internally before tools are connected." },
    { id: "managed-reminders-productivity", label: "Dobly reminders and checklists", description: "Dobly can manage nudges, routines, and internal schedules before external calendars or task systems are added." },
  ],
  "Life & Personal Admin": [
    { id: "managed-personal", label: "Dobly personal admin orchestration", description: "Dobly can coordinate reminders, summaries, and decision support without needing every personal account connected upfront." },
  ],
  "Data & Reporting": [
    { id: "managed-analysis", label: "Dobly analysis and reporting", description: "Dobly can assemble reports, compare changes, summarize trends, and write artifacts using workflow outputs it already has." },
    { id: "managed-artifacts", label: "Dobly document artifacts", description: "Dobly can create markdown, HTML, and JSON report artifacts without asking for an external destination." },
  ],
  "HR & Operations": [
    { id: "managed-intake-ops", label: "Dobly request intake", description: "Dobly can gather requests, classify them, and prepare the next action without immediately wiring your whole operations stack." },
    { id: "managed-handoffs", label: "Dobly handoffs and runbooks", description: "Dobly can keep escalation notes, runbooks, and internal follow-through visible even before ticketing or project tools are connected." },
  ],
  Other: [
    { id: "managed-generic", label: "Dobly orchestration layer", description: "Dobly can still handle intake, reasoning, summaries, approvals, and document output even when the final destination system is not connected yet." },
  ],
};

const CATEGORY_KEYWORDS: Array<{ category: WorkflowCategory; keywords: string[] }> = [
  {
    category: "Customer Communication",
    keywords: ["support", "customer", "reply", "inbox", "message", "chat", "whatsapp", "sms", "call"],
  },
  {
    category: "Sales & Marketing",
    keywords: ["lead", "sales", "pipeline", "prospect", "crm", "follow-up", "campaign", "booking"],
  },
  {
    category: "Finance & Invoicing",
    keywords: ["invoice", "billing", "payment", "refund", "receipt", "finance", "reconcile"],
  },
  {
    category: "E-commerce",
    keywords: ["order", "fulfillment", "delivery", "store", "shop", "commerce", "checkout"],
  },
  {
    category: "Productivity",
    keywords: ["calendar", "task", "brief", "summary", "project", "routine", "checklist"],
  },
  {
    category: "Data & Reporting",
    keywords: ["report", "dashboard", "analytics", "data", "metrics", "summary", "extract"],
  },
  {
    category: "HR & Operations",
    keywords: ["approval", "handoff", "ops", "operations", "request", "onboarding", "internal"],
  },
  {
    category: "Social Media",
    keywords: ["social", "post", "instagram", "facebook", "content", "caption"],
  },
  {
    category: "Life & Personal Admin",
    keywords: ["personal", "family", "reminder", "weekly", "home", "travel"],
  },
];

function normalize(value: string) {
  return value.toLowerCase();
}

function getCorpus(blueprint: WorkflowBlueprint, prompt = "") {
  return [
    prompt,
    blueprint.name,
    blueprint.description,
    blueprint.trigger,
    ...(blueprint.integrations ?? []),
    ...(blueprint.setup_steps ?? []),
    ...(blueprint.steps ?? []).flatMap((step) => [step.tool, step.action, step.description]),
  ]
    .filter(Boolean)
    .map((value) => normalize(String(value)));
}

function providerMentioned(providerId: string, corpus: string[]) {
  const aliases = PROVIDER_ALIASES[providerId] ?? [providerId];
  return aliases.some((alias) => corpus.some((entry) => entry.includes(alias)));
}

function inferCategoryFromCorpus(corpus: string[]): WorkflowCategory {
  let bestCategory: WorkflowCategory = "Other";
  let bestScore = 0;

  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    const score = keywords.reduce(
      (count, keyword) => count + (corpus.some((entry) => entry.includes(keyword)) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }

  return bestCategory;
}

export function getPromptConnectionStrategy(prompt: string) {
  const corpus = [normalize(prompt)];
  const likelyCategory = inferCategoryFromCorpus(corpus);
  const requiredProviderIds = Object.keys(PROVIDER_ALIASES).filter((providerId) =>
    providerMentioned(providerId, corpus),
  );
  const optionalProviderIds = (CATEGORY_OPTIONAL_PROVIDERS[likelyCategory] ?? []).filter(
    (providerId) => !requiredProviderIds.includes(providerId),
  );

  const requiredProviders: ProviderRecommendation[] = [];
  for (const providerId of requiredProviderIds) {
    const provider = getConnectionProvider(providerId);
    if (!provider) continue;
    requiredProviders.push({
      providerId,
      mode: "required",
      label: provider.label,
      description: provider.description,
      reason: `${provider.label} was explicitly mentioned in the prompt, so it may need a live customer-owned connection.`,
    });
  }

  const optionalProviders: ProviderRecommendation[] = [];
  for (const providerId of optionalProviderIds) {
    const provider = getConnectionProvider(providerId);
    if (!provider) continue;
    optionalProviders.push({
      providerId,
      mode: "optional",
      label: provider.label,
      description: provider.description,
      reason: `${provider.label} is common for this kind of workflow, but it should stay optional until launch needs it.`,
    });
  }

  return {
    likelyCategory,
    requiredProviders,
    optionalProviders,
    managedCapabilities:
      CATEGORY_MANAGED_CAPABILITIES[likelyCategory] ?? CATEGORY_MANAGED_CAPABILITIES.Other,
  };
}

export function getWorkflowConnectionStrategy(blueprint: WorkflowBlueprint, prompt = "") {
  const corpus = getCorpus(blueprint, prompt);
  const category = blueprint.category ?? "Other";
  const requiredProviderIds = Object.keys(PROVIDER_ALIASES).filter((providerId) =>
    providerMentioned(providerId, corpus),
  );
  const optionalCandidateIds = CATEGORY_OPTIONAL_PROVIDERS[category] ?? [];
  const optionalProviderIds = optionalCandidateIds.filter((providerId) => !requiredProviderIds.includes(providerId));

  const requiredProviders: ProviderRecommendation[] = [];
  for (const providerId of requiredProviderIds) {
    const provider = getConnectionProvider(providerId);
    if (!provider) continue;
    requiredProviders.push({
      providerId,
      mode: "required",
      label: provider.label,
      description: provider.description,
      reason: `This workflow explicitly references ${provider.label} or a capability that normally has to run inside that account.`,
    });
  }

  const optionalProviders: ProviderRecommendation[] = [];
  for (const providerId of optionalProviderIds) {
    const provider = getConnectionProvider(providerId);
    if (!provider) continue;
    optionalProviders.push({
      providerId,
      mode: "optional",
      label: provider.label,
      description: provider.description,
      reason: `${provider.label} is often useful for this type of workflow, but Dobly can usually design and stage the system before you connect it.`,
    });
  }

  return {
    requiredProviders,
    optionalProviders,
    managedCapabilities: CATEGORY_MANAGED_CAPABILITIES[category] ?? CATEGORY_MANAGED_CAPABILITIES.Other,
  };
}
