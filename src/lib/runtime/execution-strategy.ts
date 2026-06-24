import { inferDoblyExecutionIntent, type DoblyExecutionIntent } from "../dobly-inference.ts";
import { listSoftwareExecutionTools, type SoftwareExecutionToolStatus } from "../software-execution.ts";
import { resolveUniversalExecutionPaths, type UniversalExecutionPath } from "./universal-mcp.ts";
import {
  choosePrimary,
  previewDoblyExecutionStrategyCore,
  type DoblyExecutionStrategyCandidate,
  type DoblyExecutionStrategyKind,
} from "./execution-strategy-core.ts";

export type { DoblyExecutionStrategyCandidate, DoblyExecutionStrategyKind } from "./execution-strategy-core.ts";

export interface DoblyExecutionStrategyResolution {
  intent: DoblyExecutionIntent;
  primary: DoblyExecutionStrategyCandidate;
  candidates: DoblyExecutionStrategyCandidate[];
  usedUniversalConnections: boolean;
}

type PreviewAvailability = {
  softwareTools?: Partial<Record<string, boolean>>;
  runtimes?: Partial<Record<string, boolean>>;
};

function explicitToolMention(prompt: string) {
  return /\bfigma\b|\bgithub\b|\bnotion\b|\bfusion\b|\bexcel\b|\bshopify\b|\bhubspot\b|\bsalesforce\b|\bquickbooks\b|\bxero\b/i.test(prompt);
}

function previewIntent(prompt: string, intent?: DoblyExecutionIntent | null, availability?: PreviewAvailability) {
  const runtimeAvailability = (availability?.runtimes ?? {}) as Partial<Record<
    "research" | "media" | "publishing" | "payments_commerce" | "memory_synthesis",
    boolean
  >>;
  return (
    intent ??
    inferDoblyExecutionIntent({
      prompt,
      availability: {
        softwareTools: availability?.softwareTools,
        runtimes: runtimeAvailability,
      },
    })
  );
}


export function previewDoblyExecutionStrategy(input: {
  prompt: string;
  intent?: DoblyExecutionIntent | null;
  availability?: PreviewAvailability;
}) {
  const intent = previewIntent(input.prompt, input.intent, input.availability);
  return previewDoblyExecutionStrategyCore({
    prompt: input.prompt,
    intent,
    tools: listSoftwareExecutionTools().map((tool) => ({
      id: tool.id,
      label: tool.label,
      family: tool.family,
      outputType: tool.outputType,
      approvalRequired: tool.approvalRequired,
      configured: tool.configured,
    })),
  }) satisfies DoblyExecutionStrategyResolution;
}

export async function resolveDoblyExecutionStrategy(input: {
  userId: string;
  workspaceId?: string | null;
  prompt: string;
  intent?: DoblyExecutionIntent | null;
}) {
  const preview = previewDoblyExecutionStrategy({
    prompt: input.prompt,
    intent: input.intent ?? null,
    availability: {
      softwareTools: Object.fromEntries(listSoftwareExecutionTools().map((tool) => [tool.id, tool.configured])),
      runtimes: {
        research: true,
        media: true,
        publishing: true,
        payments_commerce: true,
        memory_synthesis: true,
      },
    },
  });

  const universal: { capabilities: string[]; paths: UniversalExecutionPath[] } = await resolveUniversalExecutionPaths({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    prompt: input.prompt,
    requiredCapabilities: [],
  }).catch(() => ({ capabilities: [], paths: [] }));

  const universalCandidates = universal.paths
    .filter((path): path is UniversalExecutionPath & { connection: NonNullable<UniversalExecutionPath["connection"]>; tool: NonNullable<UniversalExecutionPath["tool"]> } =>
      path.kind === "mcp" && Boolean(path.connection) && Boolean(path.tool),
    )
    .map((path) => {
      const explicitBoost = explicitToolMention(input.prompt.toLowerCase()) ? 8 : 0;
      return {
        id: `universal:${path.connection.id}:${path.tool.name}`,
        kind: "universal_user_mcp",
        label: path.label,
        score: path.score + 8 + explicitBoost,
        reason: "A user-connected MCP server can act inside the user's own tool account without requiring a Dobly-managed static integration.",
        route: "universal_mcp",
        producesArtifactsDirectly: true,
        changesWorldState: path.riskLevel !== "low" || path.approvalRequired,
        requiresApproval: path.approvalRequired,
        capabilityState: "live",
        path,
      } satisfies DoblyExecutionStrategyCandidate;
    });

  const candidates = [...preview.candidates, ...universalCandidates].sort((a, b) => b.score - a.score);
  const primary = choosePrimary(input.prompt, preview.intent, candidates);
  return {
    intent: preview.intent,
    primary,
    candidates,
    usedUniversalConnections: universalCandidates.length > 0,
  } satisfies DoblyExecutionStrategyResolution;
}

export function summarizeMcpStrategy() {
  const tools = listSoftwareExecutionTools();
  return {
    staticCore: {
      description: "Dobly-owned, env-backed MCP servers used as shared platform capabilities.",
      configuredToolIds: tools.filter((tool) => tool.configured).map((tool) => tool.id),
      unconfiguredToolIds: tools.filter((tool) => !tool.configured).map((tool) => tool.id),
    },
    universalUserConnections: {
      description: "User-specific MCP servers stored in Dobly state and discovered at runtime per workspace.",
      requiresDatabaseConnectionRecords: true,
      usesEnvVars: false,
    },
  };
}
