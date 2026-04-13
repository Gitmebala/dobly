import { CONNECTION_PROVIDERS, isConnectionProviderLaunchReady } from "@/lib/connection-catalog";
import type { WorkflowBlueprint } from "@/types";

const INTEGRATION_ALIASES: Record<string, string[]> = {
  google: ["google", "gmail", "sheets", "calendar", "google sheets"],
  microsoft: ["microsoft", "outlook", "office 365", "microsoft 365"],
  yahoo: ["yahoo", "yahoo mail"],
  whatsapp: ["whatsapp", "whatsapp business"],
  slack: ["slack"],
  shopify: ["shopify"],
  stripe: ["stripe"],
  mpesa: ["m-pesa", "mpesa", "m pesa", "intasend", "pesapal"],
  meta: ["meta", "instagram", "facebook", "instagram business"],
  notion: ["notion"],
  airtable: ["airtable"],
  hubspot: ["hubspot", "hub spot"],
  webhook: ["webhook", "api", "http request", "custom api"],
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function getRequiredProviderIdsForWorkflow(blueprint: WorkflowBlueprint, prompt?: string) {
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

  for (const provider of CONNECTION_PROVIDERS.filter((item) => isConnectionProviderLaunchReady(item.id))) {
    const aliases = INTEGRATION_ALIASES[provider.id] ?? [provider.id, provider.label.toLowerCase()];
    if (aliases.some((alias) => corpus.some((entry) => entry.includes(alias)))) {
      required.add(provider.id);
    }
  }

  return Array.from(required);
}

export function getRequiredProvidersById(providerIds: string[]) {
  const wanted = new Set(providerIds);
  return CONNECTION_PROVIDERS.filter((provider) => wanted.has(provider.id));
}
