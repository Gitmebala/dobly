export type DoblyMarket = "KE" | "GLOBAL";

export type ProviderDomain =
  | "checkout"
  | "subscription_renewal"
  | "customer_collection"
  | "payout"
  | "sms"
  | "voice"
  | "whatsapp"
  | "email"
  | "research"
  | "language_model"
  | "vector_memory"
  | "document_processing"
  | "media_generation";

export interface MarketProviderRoute {
  provider: string;
  mode: "managed" | "connected_customer" | "self_hosted" | "manual";
  priority: number;
  paidRail: boolean;
  note: string;
}

export interface DoblyMarketStrategy {
  market: DoblyMarket;
  currency: "KES" | "USD";
  locale: string;
  routes: Record<ProviderDomain, MarketProviderRoute[]>;
}

const commonRoutes: Pick<
  Record<ProviderDomain, MarketProviderRoute[]>,
  "whatsapp" | "email" | "research" | "language_model" | "vector_memory" | "document_processing" | "media_generation"
> = {
  whatsapp: [
    { provider: "meta", mode: "connected_customer", priority: 1, paidRail: true, note: "Use the customer's approved WhatsApp Business account." },
  ],
  email: [
    { provider: "google", mode: "connected_customer", priority: 1, paidRail: false, note: "Send through the customer's connected Gmail account." },
    { provider: "microsoft", mode: "connected_customer", priority: 2, paidRail: false, note: "Send through the customer's connected Microsoft account." },
    { provider: "resend", mode: "managed", priority: 3, paidRail: true, note: "Managed transactional fallback after domain verification." },
  ],
  research: [
    { provider: "dobly_web", mode: "self_hosted", priority: 1, paidRail: false, note: "Direct-source fetch, public datasets, extraction, ranking, and citations." },
    { provider: "perplexity", mode: "managed", priority: 2, paidRail: true, note: "Premium fallback for deep web research." },
  ],
  language_model: [
    { provider: "dobly_economy_model", mode: "managed", priority: 1, paidRail: true, note: "Small model route for routine classification, drafting, and extraction." },
    { provider: "anthropic", mode: "managed", priority: 2, paidRail: true, note: "Stronger reasoning route when task complexity justifies it." },
    { provider: "openai", mode: "managed", priority: 3, paidRail: true, note: "Fallback model and specialist media route." },
  ],
  vector_memory: [
    { provider: "pgvector", mode: "self_hosted", priority: 1, paidRail: false, note: "Store embeddings with Dobly's PostgreSQL data." },
  ],
  document_processing: [
    { provider: "dobly_documents", mode: "self_hosted", priority: 1, paidRail: false, note: "Use local parsers, OCR, and document-generation libraries first." },
  ],
  media_generation: [
    { provider: "dobly_templates", mode: "self_hosted", priority: 1, paidRail: false, note: "Template and connected-design-tool route first." },
    { provider: "openai", mode: "managed", priority: 2, paidRail: true, note: "Paid image generation when original creative output is required." },
  ],
};

export const MARKET_STRATEGIES: Record<DoblyMarket, DoblyMarketStrategy> = {
  KE: {
    market: "KE",
    currency: "KES",
    locale: "en-KE",
    routes: {
      checkout: [
        { provider: "intasend", mode: "managed", priority: 1, paidRail: true, note: "Kenya-first M-Pesa and card checkout." },
        { provider: "mpesa", mode: "managed", priority: 2, paidRail: true, note: "Direct Daraja STK collection fallback." },
        { provider: "paystack", mode: "managed", priority: 3, paidRail: true, note: "Configurable regional fallback." },
        { provider: "stripe", mode: "managed", priority: 4, paidRail: true, note: "International fallback only." },
      ],
      subscription_renewal: [
        { provider: "intasend", mode: "managed", priority: 1, paidRail: true, note: "Use a supported mandate when available." },
        { provider: "mpesa", mode: "managed", priority: 2, paidRail: true, note: "One-tap monthly STK renewal with reminders and grace period." },
      ],
      customer_collection: [
        { provider: "mpesa", mode: "connected_customer", priority: 1, paidRail: true, note: "Customer-owned Daraja collection for coworker payment tasks." },
        { provider: "intasend", mode: "managed", priority: 2, paidRail: true, note: "Managed collection links and checkout." },
      ],
      payout: [
        { provider: "intasend", mode: "managed", priority: 1, paidRail: true, note: "Kenya payout rail after merchant approval and funding." },
        { provider: "mpesa", mode: "connected_customer", priority: 2, paidRail: true, note: "Customer-owned B2C route where configured." },
      ],
      sms: [
        { provider: "kenya_sms", mode: "managed", priority: 1, paidRail: true, note: "Local sender and pricing route." },
        { provider: "africas_talking", mode: "managed", priority: 2, paidRail: true, note: "Kenya/Africa messaging fallback." },
        { provider: "twilio", mode: "managed", priority: 3, paidRail: true, note: "International fallback only." },
      ],
      voice: [
        { provider: "africas_talking", mode: "managed", priority: 1, paidRail: true, note: "Kenya voice transport." },
        { provider: "twilio", mode: "managed", priority: 2, paidRail: true, note: "International voice fallback." },
      ],
      ...commonRoutes,
    },
  },
  GLOBAL: {
    market: "GLOBAL",
    currency: "USD",
    locale: "en",
    routes: {
      checkout: [{ provider: "stripe", mode: "managed", priority: 1, paidRail: true, note: "International card checkout." }],
      subscription_renewal: [{ provider: "stripe", mode: "managed", priority: 1, paidRail: true, note: "International recurring billing." }],
      customer_collection: [{ provider: "stripe", mode: "connected_customer", priority: 1, paidRail: true, note: "Connected international collection." }],
      payout: [{ provider: "stripe", mode: "connected_customer", priority: 1, paidRail: true, note: "Connected payout where supported." }],
      sms: [{ provider: "twilio", mode: "managed", priority: 1, paidRail: true, note: "International SMS." }],
      voice: [{ provider: "twilio", mode: "managed", priority: 1, paidRail: true, note: "International voice." }],
      ...commonRoutes,
    },
  },
};

export function normalizeMarket(value?: string | null): DoblyMarket {
  return String(value ?? "KE").toUpperCase() === "KE" ? "KE" : "GLOBAL";
}

export function getMarketStrategy(value?: string | null) {
  return MARKET_STRATEGIES[normalizeMarket(value)];
}

export function getMarketProviderRoutes(domain: ProviderDomain, market?: string | null) {
  return [...getMarketStrategy(market).routes[domain]].sort((left, right) => left.priority - right.priority);
}
