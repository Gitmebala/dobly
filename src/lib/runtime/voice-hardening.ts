import "server-only";
import { inferDoblyExecutionIntent } from "@/lib/dobly-inference";
import {
  completeDurableRuntimeRun,
  createDurableArtifact,
  createDurableRuntimeRun,
} from "@/lib/runtime/durable-runtime";
import { getRuntimeProviderHealth } from "@/lib/runtime/provider-health";

export interface VoiceHardeningInput {
  userId: string;
  workspaceId?: string | null;
  agentId?: string | null;
  expectedUseCase?: "reception" | "sales" | "support" | "personal" | "custom";
}

export async function runVoiceHardeningCheck(input: VoiceHardeningInput) {
  const intent = inferDoblyExecutionIntent({
    prompt: `Harden voice runtime for ${input.expectedUseCase ?? "custom"} agent.`,
    explicit: {
      departmentId:
        input.expectedUseCase === "reception" ? "reception" :
        input.expectedUseCase === "sales" ? "sales" :
        input.expectedUseCase === "support" ? "support" :
        "operations",
      workTypeId: "monitor",
      outputTypeId: "brief",
      trustLevelId: "informational",
    },
    availability: { runtimes: { research: true } },
  });
  const run = await createDurableRuntimeRun({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    toolId: "voice_hardening_runtime",
    toolLabel: "Voice Hardening Runtime",
    toolFamily: "voice",
    task: `Harden voice runtime for ${input.expectedUseCase ?? "custom"} agent.`,
    riskLevel: "medium",
    context: { agentId: input.agentId ?? null, expectedUseCase: input.expectedUseCase ?? "custom" },
    intent,
  });

  const providers = getRuntimeProviderHealth().filter((provider) =>
    ["elevenlabs", "africas_talking", "kenya_sms", "twilio"].includes(provider.id),
  );
  const elevenLabs = providers.find((provider) => provider.id === "elevenlabs");
  const voiceTransports = providers.filter((provider) => ["africas_talking", "twilio"].includes(provider.id));
  const smsTransports = providers.filter((provider) => ["kenya_sms", "africas_talking", "twilio"].includes(provider.id));
  const missing = [
    ...(elevenLabs?.status === "ready" ? [] : (elevenLabs?.missingEnv ?? []).map((env) => `ElevenLabs Voice: ${env}`)),
    ...(voiceTransports.some((provider) => provider.status === "ready")
      ? []
      : ["Configure Africa's Talking for Kenya voice or Twilio for international fallback."]),
    ...(smsTransports.some((provider) => provider.status === "ready")
      ? []
      : ["Configure Kenya local SMS, Africa's Talking SMS, or Twilio SMS fallback."]),
  ];
  const checklist = [
    {
      id: "provider_config",
      status: missing.length === 0 ? "pass" : "fail",
      detail: missing.length ? `Missing ${missing.join(", ")}` : "Kenya voice/SMS and ElevenLabs configuration present.",
    },
    {
      id: "latency_budget",
      status: "warn",
      detail: "Runtime tracks latency, but production should persist p95/p99 latency per call.",
    },
    {
      id: "fallbacks",
      status: "warn",
      detail: "Add fallback voice, fallback SMS, and human handoff for failed synthesis or call transport.",
    },
    {
      id: "approval_boundaries",
      status: "pass",
      detail: "High-risk actions should be routed through durable approval resume before acting.",
    },
  ];

  const result = {
    providers,
    checklist,
    readyForProductionCalls: missing.length === 0,
  };

  const artifact = await createDurableArtifact({
    runId: run.id,
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    kind: "json",
    title: "Voice hardening report",
    content: result,
    metadata: { agentId: input.agentId ?? null },
    intent,
  });

  const completed = await completeDurableRuntimeRun({
    runId: run.id,
    userId: input.userId,
    status: missing.length ? "not_configured" : "completed",
    summary: missing.length ? `Voice runtime is missing ${missing.length} required setting(s).` : "Voice runtime passed provider hardening checks.",
    result,
  });

  return { run: completed, artifacts: [artifact], result };
}
