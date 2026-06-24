import { CONNECTION_PROVIDERS, isConnectionProviderLaunchReady } from "@/lib/connection-catalog";
import { resolveDoblyCapabilities } from "@/lib/capability-resolver";
import { resolveCoworkerCapabilities } from "@/lib/coworker-capabilities";
import { isProviderVerifiedLive } from "@/lib/integration-contract";
import type { WorkflowBlueprint } from "@/types";

const INTEGRATION_ALIASES: Record<string, string[]> = {
  google: ["google", "gmail", "sheets", "calendar", "google sheets"],
  microsoft: ["microsoft", "outlook", "office 365", "microsoft 365"],
  yahoo: ["yahoo", "yahoo mail"],
  whatsapp: ["whatsapp", "whatsapp business"],
  kenya_local_comms: ["sms", "call", "calls", "phone", "business phone", "business number", "reception", "receptionist", "kenya calls", "kenya sms"],
  slack: ["slack"],
  shopify: ["shopify"],
  paystack: ["paystack", "checkout", "card payment"],
  mpesa: ["m-pesa", "mpesa", "m pesa", "daraja", "stk push", "intasend", "pesapal"],
  stripe: ["stripe"],
  meta: ["meta", "instagram", "facebook", "instagram business"],
  canva: ["canva", "design", "graphic", "presentation", "slides"],
  notion: ["notion"],
  airtable: ["airtable"],
  hubspot: ["hubspot", "hub spot"],
  webhook: ["webhook", "api", "http request", "custom api"],
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function getRequiredProviderIdsForWorkflow(blueprint: WorkflowBlueprint, prompt?: string) {
  const capabilityPlan = resolveDoblyCapabilities({
    prompt: prompt ?? blueprint.description ?? blueprint.name ?? "",
    blueprint,
    connections: [],
  });
  const corpus = [
    ...(blueprint.integrations ?? []),
    blueprint.trigger,
    blueprint.description,
    prompt ?? "",
    ...(blueprint.steps ?? []).flatMap((step) => [step.tool, step.action, step.description]),
  ]
    .filter(Boolean)
    .map((value) => normalize(String(value)));

  const required = new Set<string>();
  const allConnections = [];

  for (const provider of CONNECTION_PROVIDERS.filter((item) => isConnectionProviderLaunchReady(item.id))) {
    const aliases = INTEGRATION_ALIASES[provider.id] ?? [provider.id, provider.label.toLowerCase()];
    if (aliases.some((alias) => corpus.some((entry) => entry.includes(alias)))) {
      required.add(provider.id);
    }
  }

  for (const providerId of capabilityPlan.needed_now_provider_ids) {
    if (isProviderVerifiedLive(providerId)) required.add(providerId);
  }

  const coworkerCapabilities = resolveCoworkerCapabilities({
    prompt: corpus.join(" "),
    connections: allConnections,
  });
  for (const providerId of coworkerCapabilities.requiredConnectionProviderIds) {
    if (isConnectionProviderLaunchReady(providerId)) required.add(providerId);
  }

  return Array.from(required);
}

export function getRequiredProvidersById(providerIds: string[]) {
  const wanted = new Set(providerIds);
  return CONNECTION_PROVIDERS.filter((provider) => wanted.has(provider.id));
}
