import { getMarketProviderRoutes, type DoblyMarket, type ProviderDomain } from "@/lib/billing/market-strategy";

export type BillableCapability =
  | "coworker.plan"
  | "ai.routine"
  | "ai.reasoning"
  | "research.standard"
  | "research.deep"
  | "software.read"
  | "software.write"
  | "media.template"
  | "media.generate"
  | "document.process"
  | "memory.write"
  | "email.send"
  | "sms.send"
  | "whatsapp.send"
  | "voice.minute"
  | "payment.collect";

export interface CostRoute {
  id: string;
  capability: BillableCapability;
  provider: string;
  market: DoblyMarket | "GLOBAL";
  estimatedMinor: number;
  unit: string;
  paidRail: boolean;
  quality: "economy" | "standard" | "premium";
  note: string;
}

export const COST_ROUTES: CostRoute[] = [
  { id: "plan-internal", capability: "coworker.plan", provider: "dobly", market: "GLOBAL", estimatedMinor: 0, unit: "plan", paidRail: false, quality: "standard", note: "Internal planning and orchestration." },
  { id: "ai-routine-economy", capability: "ai.routine", provider: "dobly_economy_model", market: "GLOBAL", estimatedMinor: 40, unit: "action", paidRail: true, quality: "economy", note: "Short routine model call with compressed context." },
  { id: "ai-reasoning-anthropic", capability: "ai.reasoning", provider: "anthropic", market: "GLOBAL", estimatedMinor: 350, unit: "action", paidRail: true, quality: "premium", note: "Reasoning estimate; settled from measured token usage when available." },
  { id: "research-direct", capability: "research.standard", provider: "dobly_web", market: "GLOBAL", estimatedMinor: 20, unit: "task", paidRail: false, quality: "standard", note: "Direct-source retrieval and public data route." },
  { id: "research-perplexity", capability: "research.deep", provider: "perplexity", market: "GLOBAL", estimatedMinor: 600, unit: "task", paidRail: true, quality: "premium", note: "Premium deep-research fallback." },
  { id: "software-read", capability: "software.read", provider: "connected_customer", market: "GLOBAL", estimatedMinor: 0, unit: "action", paidRail: false, quality: "standard", note: "Read through a customer-owned connected account." },
  { id: "software-write", capability: "software.write", provider: "connected_customer", market: "GLOBAL", estimatedMinor: 5, unit: "action", paidRail: false, quality: "standard", note: "Write through a customer-owned connected account." },
  { id: "media-template", capability: "media.template", provider: "dobly_templates", market: "GLOBAL", estimatedMinor: 10, unit: "asset", paidRail: false, quality: "standard", note: "Template or connected design route." },
  { id: "media-generate", capability: "media.generate", provider: "openai", market: "GLOBAL", estimatedMinor: 900, unit: "asset", paidRail: true, quality: "premium", note: "Original image generation estimate." },
  { id: "document-process", capability: "document.process", provider: "dobly_documents", market: "GLOBAL", estimatedMinor: 10, unit: "document", paidRail: false, quality: "standard", note: "Local parser/OCR route." },
  { id: "memory-write", capability: "memory.write", provider: "pgvector", market: "GLOBAL", estimatedMinor: 2, unit: "item", paidRail: false, quality: "standard", note: "PostgreSQL-backed memory write." },
  { id: "email-google", capability: "email.send", provider: "google", market: "GLOBAL", estimatedMinor: 0, unit: "message", paidRail: false, quality: "standard", note: "Customer-connected Gmail route." },
  { id: "sms-kenya", capability: "sms.send", provider: "kenya_sms", market: "KE", estimatedMinor: 150, unit: "message", paidRail: true, quality: "standard", note: "Conservative Kenya SMS estimate until live tariff reconciliation." },
  { id: "sms-at", capability: "sms.send", provider: "africas_talking", market: "KE", estimatedMinor: 200, unit: "message", paidRail: true, quality: "standard", note: "Africa's Talking fallback estimate." },
  { id: "sms-twilio", capability: "sms.send", provider: "twilio", market: "GLOBAL", estimatedMinor: 1_500, unit: "message", paidRail: true, quality: "premium", note: "International fallback estimate." },
  { id: "whatsapp-meta", capability: "whatsapp.send", provider: "meta", market: "GLOBAL", estimatedMinor: 300, unit: "conversation", paidRail: true, quality: "standard", note: "Template/category cost is settled from provider data." },
  { id: "voice-at", capability: "voice.minute", provider: "africas_talking", market: "KE", estimatedMinor: 1_500, unit: "minute", paidRail: true, quality: "standard", note: "Kenya voice transport estimate before destination adjustment." },
  { id: "voice-twilio", capability: "voice.minute", provider: "twilio", market: "GLOBAL", estimatedMinor: 3_000, unit: "minute", paidRail: true, quality: "premium", note: "International voice fallback estimate." },
  { id: "payment-mpesa", capability: "payment.collect", provider: "mpesa", market: "KE", estimatedMinor: 0, unit: "collection", paidRail: true, quality: "standard", note: "Collection fees are reconciled from settlement data, not charged before callback." },
];

const DOMAIN_BY_CAPABILITY: Partial<Record<BillableCapability, ProviderDomain>> = {
  "research.standard": "research",
  "research.deep": "research",
  "email.send": "email",
  "sms.send": "sms",
  "whatsapp.send": "whatsapp",
  "voice.minute": "voice",
  "payment.collect": "customer_collection",
  "media.generate": "media_generation",
  "media.template": "media_generation",
  "document.process": "document_processing",
};

export function getCostRoutes(capability: BillableCapability, market: DoblyMarket = "KE") {
  const candidates = COST_ROUTES.filter(
    (route) => route.capability === capability && (route.market === "GLOBAL" || route.market === market),
  );
  const domain = DOMAIN_BY_CAPABILITY[capability];
  if (!domain) return candidates;
  const priorities = new Map(getMarketProviderRoutes(domain, market).map((route) => [route.provider, route.priority]));
  return candidates.sort(
    (left, right) =>
      (priorities.get(left.provider) ?? 999) - (priorities.get(right.provider) ?? 999) ||
      left.estimatedMinor - right.estimatedMinor,
  );
}

export function chooseCostRoute(input: {
  capability: BillableCapability;
  market?: DoblyMarket;
  preferredProvider?: string | null;
  allowPremium?: boolean;
}) {
  const routes = getCostRoutes(input.capability, input.market ?? "KE");
  const preferred = input.preferredProvider
    ? routes.find((route) => route.provider === input.preferredProvider)
    : null;
  if (preferred && (input.allowPremium !== false || preferred.quality !== "premium")) return preferred;
  return routes.find((route) => input.allowPremium !== false || route.quality !== "premium") ?? routes[0] ?? null;
}

export function estimateCapabilityCost(input: {
  capability: BillableCapability;
  quantity?: number;
  market?: DoblyMarket;
  preferredProvider?: string | null;
  allowPremium?: boolean;
}) {
  const route = chooseCostRoute(input);
  if (!route) throw new Error(`No cost route is configured for ${input.capability}.`);
  return {
    route,
    estimatedMinor: Math.max(0, Math.ceil(route.estimatedMinor * Math.max(0, input.quantity ?? 1))),
  };
}
