import "server-only";
import { getRuntimeProviderHealth } from "@/lib/runtime/provider-health";
import { listSoftwareExecutionTools } from "@/lib/software-execution";

export function getDoblyRuntimeSetupStatus() {
  const providers = getRuntimeProviderHealth();
  const softwareTools = listSoftwareExecutionTools();
  const readyProviders = providers.filter((provider) => provider.status === "ready").length;
  const readySoftwareTools = softwareTools.filter((tool) => tool.configured).length;
  const total = providers.length + softwareTools.length;
  const ready = readyProviders + readySoftwareTools;

  const categories = [
    {
      id: "research",
      label: "Research",
      ready: providers.some((provider) => provider.id === "perplexity" && provider.status === "ready"),
      enables: ["fresh research", "citations", "research-to-action plans"],
    },
    {
      id: "media",
      label: "Media and Publishing",
      ready: providers.some((provider) => provider.id === "openai" && provider.status === "ready"),
      enables: ["image generation", "content packages", "publishing prep"],
    },
    {
      id: "voice",
      label: "Voice",
      ready: providers.some((provider) => provider.id === "elevenlabs" && provider.status === "ready") &&
        providers.some((provider) => ["africas_talking", "twilio"].includes(provider.id) && provider.status === "ready"),
      enables: ["AI receptionist", "phone transport", "voice hardening checks"],
    },
    {
      id: "software",
      label: "Software Execution",
      ready: readySoftwareTools > 0,
      enables: ["MCP-operated tools", "approval-gated software actions", "artifact capture"],
    },
    {
      id: "watchers",
      label: "Personal Watchers",
      ready: providers.some((provider) => provider.id === "perplexity" && provider.status === "ready"),
      enables: ["market watchers", "travel watchers", "news and subscription checks"],
    },
  ];

  return {
    readinessScore: total === 0 ? 0 : Math.round((ready / total) * 100),
    ready,
    total,
    categories,
    providers,
    softwareTools,
    missingRequiredEnv: providers.flatMap((provider) => provider.missingEnv),
    nextBestUnlock:
      categories.find((category) => !category.ready)?.label ??
      softwareTools.find((tool) => !tool.configured)?.label ??
      "Dobly runtime core",
  };
}
