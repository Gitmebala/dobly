import { normalizeConnectionProviderId } from "@/lib/connection-capabilities";

export type IntegrationReadiness = "verified_live" | "code_ready" | "draft_only" | "disabled";

export interface IntegrationContract {
  providerId: string;
  readiness: IntegrationReadiness;
  reason: string;
}

const CONTRACTS: IntegrationContract[] = [
  {
    providerId: "google",
    readiness: "code_ready",
    reason: "OAuth and native executors cover Gmail send, Google Docs create, Sheets read/write/analyze, and Calendar event creation.",
  },
  {
    providerId: "slack",
    readiness: "code_ready",
    reason: "OAuth token and chat.postMessage executor are wired.",
  },
  {
    providerId: "hubspot",
    readiness: "code_ready",
    reason: "OAuth token and CRM contact/deal/task/note executors are wired.",
  },
  {
    providerId: "whatsapp",
    readiness: "code_ready",
    reason: "Manual Meta token plus phone number id can send WhatsApp text messages.",
  },
  {
    providerId: "kenya_local_comms",
    readiness: "code_ready",
    reason: "Kenya-first SMS routing, phone verification, and local voice setup requests are wired with Twilio as international fallback.",
  },
  {
    providerId: "mpesa",
    readiness: "code_ready",
    reason: "Daraja credentials and STK push executor are wired.",
  },
  {
    providerId: "paystack",
    readiness: "code_ready",
    reason: "Secret-key payment link execution and Kenya-first checkout configuration are wired.",
  },
  {
    providerId: "canva",
    readiness: "code_ready",
    reason: "Canva OAuth uses PKCE, stores user tokens, and routes design work through Dobly's tool gateway or Canva connector.",
  },
  {
    providerId: "webhook",
    readiness: "code_ready",
    reason: "Generic HTTP executor is wired when the workflow has a real URL.",
  },
  {
    providerId: "notion",
    readiness: "draft_only",
    reason: "Executor exists, but OAuth/manual token handling and parent/database setup still need a verified happy path.",
  },
  {
    providerId: "airtable",
    readiness: "draft_only",
    reason: "Executor exists, but base/table selection and OAuth setup still need a verified happy path.",
  },
  {
    providerId: "stripe",
    readiness: "draft_only",
    reason: "Executors exist, but OAuth returns access tokens while live invoice/refund code expects secret-key execution.",
  },
  {
    providerId: "shopify",
    readiness: "draft_only",
    reason: "Executors exist, but OAuth setup still contains store-domain placeholders and needs a verified install flow.",
  },
  {
    providerId: "mailchimp",
    readiness: "draft_only",
    reason: "Executor expects API-key style datacenter tokens while OAuth stores access tokens.",
  },
  {
    providerId: "zendesk",
    readiness: "draft_only",
    reason: "Executor exists, but OAuth setup still contains subdomain placeholders.",
  },
  {
    providerId: "salesforce",
    readiness: "draft_only",
    reason: "Executor exists, but instance URL mapping from OAuth metadata must be verified.",
  },
  {
    providerId: "pipedrive",
    readiness: "draft_only",
    reason: "Executor exists, but request authentication needs verified Pipedrive API/OAuth handling.",
  },
  {
    providerId: "xero",
    readiness: "draft_only",
    reason: "Executor exists, but tenant discovery and OAuth setup need a verified happy path.",
  },
  {
    providerId: "zoho-crm",
    readiness: "draft_only",
    reason: "Executor exists, but OAuth setup is not registered yet.",
  },
  {
    providerId: "monday",
    readiness: "draft_only",
    reason: "Executor exists, but OAuth/setup is not registered yet.",
  },
  {
    providerId: "clickup",
    readiness: "draft_only",
    reason: "Executor exists, but OAuth/setup is not registered yet.",
  },
  {
    providerId: "freshdesk",
    readiness: "draft_only",
    reason: "Executor exists, but account domain and setup path need verification.",
  },
  {
    providerId: "docusign",
    readiness: "draft_only",
    reason: "Executor exists, but OAuth/setup and account id mapping need verification.",
  },
  {
    providerId: "typeform",
    readiness: "draft_only",
    reason: "Executor exists, but OAuth/setup is not registered yet.",
  },
  {
    providerId: "calendly",
    readiness: "draft_only",
    reason: "Read executor exists, but live booking creation is not wired.",
  },
  {
    providerId: "trello",
    readiness: "draft_only",
    reason: "Executor exists, but API key/token setup needs verification.",
  },
  {
    providerId: "asana",
    readiness: "draft_only",
    reason: "Executor exists, but setup/project selection needs verification.",
  },
  {
    providerId: "linkedin",
    readiness: "draft_only",
    reason: "Executor exists, but person/company identity mapping needs verification.",
  },
  {
    providerId: "zoom",
    readiness: "draft_only",
    reason: "Executor exists, but OAuth scopes/account setup need verification.",
  },
  {
    providerId: "intercom",
    readiness: "draft_only",
    reason: "Executor exists, but OAuth/setup is not registered yet.",
  },
  {
    providerId: "square",
    readiness: "draft_only",
    reason: "Executor exists, but OAuth/setup is not registered yet.",
  },
  {
    providerId: "meta",
    readiness: "draft_only",
    reason: "Executor exists, but social publishing requires media/container rules beyond a generic text post.",
  },
];

const CONTRACT_BY_PROVIDER = new Map(
  CONTRACTS.flatMap((contract) => [
    [contract.providerId, contract] as const,
    [normalizeConnectionProviderId(contract.providerId), contract] as const,
  ]),
);

export function getIntegrationContract(providerId: string) {
  return CONTRACT_BY_PROVIDER.get(providerId) ?? CONTRACT_BY_PROVIDER.get(normalizeConnectionProviderId(providerId)) ?? {
    providerId,
    readiness: "disabled",
    reason: "No verified runtime contract exists for this provider yet.",
  } satisfies IntegrationContract;
}

export function isProviderVerifiedLive(providerId: string) {
  const contract = getIntegrationContract(providerId);
  if (contract.readiness === "verified_live") return true;
  if (contract.readiness !== "code_ready") return false;

  const verified = new Set(
    (process.env.NEXT_PUBLIC_DOBLY_VERIFIED_PROVIDERS ?? "")
      .split(",")
      .map((value) => normalizeConnectionProviderId(value.trim()))
      .filter(Boolean),
  );
  if (verified.has(normalizeConnectionProviderId(providerId))) return true;

  return process.env.NODE_ENV !== "production";
}

export function getVerifiedLiveProviderIds() {
  return CONTRACTS.filter((contract) => isProviderVerifiedLive(contract.providerId)).map((contract) => contract.providerId);
}
