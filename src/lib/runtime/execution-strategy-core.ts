import type { DoblyExecutionIntent } from "../dobly-inference.ts";

export type DoblyExecutionStrategyKind =
  | "native_outcome_engine"
  | "static_core_mcp"
  | "universal_user_mcp"
  | "approval_only";

export interface StrategyToolStatus {
  id: string;
  label: string;
  family: string;
  outputType: string;
  approvalRequired: boolean;
  configured: boolean;
}

export interface DoblyExecutionStrategyCandidate {
  id: string;
  kind: DoblyExecutionStrategyKind;
  label: string;
  score: number;
  reason: string;
  route:
    | "research"
    | "media"
    | "publishing"
    | "payments_commerce"
    | "software_execution"
    | "memory_synthesis"
    | "approval_only"
    | "universal_mcp";
  producesArtifactsDirectly: boolean;
  changesWorldState: boolean;
  requiresApproval: boolean;
  capabilityState: "live" | "assisted" | "planned";
  engineId?: string;
  toolId?: string;
  tool?: StrategyToolStatus;
  path?: unknown;
}

interface NativeOutcomeEngineDefinition {
  id: string;
  label: string;
  route: DoblyExecutionStrategyCandidate["route"];
  supports(intent: DoblyExecutionIntent, prompt: string): boolean;
  producesArtifactsDirectly: boolean;
  changesWorldState: boolean;
  baseScore(intent: DoblyExecutionIntent, prompt: string): number;
}

const SOFTWARE_TOOL_KEYWORDS: Array<{ toolId: string; patterns: string[] }> = [
  { toolId: "figma_design", patterns: ["figma", "wireframe", "ui mockup", "design system"] },
  { toolId: "github_repo_ops", patterns: ["github", "repo", "pull request", "codebase", "commit", "issue"] },
  { toolId: "fusion_modeling", patterns: ["autodesk", "fusion", "cad", "3d model", "mechanical design", "turbine design"] },
  { toolId: "notion_workspace_ops", patterns: ["notion"] },
  { toolId: "spreadsheet_modeling", patterns: ["spreadsheet", "excel", "sheet", "financial model"] },
  { toolId: "document_production", patterns: ["docx", "document", "proposal", "contract", "report", "deck", "slides"] },
  { toolId: "browser_software_ops", patterns: ["portal", "website admin", "browser", "log in", "dashboard"] },
  { toolId: "social_publishing_ops", patterns: ["post to instagram", "publish", "schedule posts", "social media"] },
  { toolId: "finance_backoffice_ops", patterns: ["invoice", "accounting", "reconcile", "quickbooks", "xero"] },
  { toolId: "commerce_backoffice_ops", patterns: ["shopify", "order", "inventory", "fulfillment"] },
  { toolId: "crm_sales_ops", patterns: ["crm", "hubspot", "salesforce", "lead", "pipeline"] },
  { toolId: "travel_planning_ops", patterns: ["flight", "hotel", "itinerary", "travel"] },
];

const NATIVE_OUTCOME_ENGINES: NativeOutcomeEngineDefinition[] = [
  {
    id: "research_dossier_engine",
    label: "Research Dossier Engine",
    route: "research",
    supports: (intent, prompt) =>
      intent.route === "research" ||
      intent.workTypeId === "research" ||
      /\bresearch\b|\bcompare\b|find out|look up|\binvestigate\b|\bsources\b|\bcrawl\b|\bscrape\b/i.test(prompt),
    producesArtifactsDirectly: true,
    changesWorldState: false,
    baseScore: (intent) => (intent.workTypeId === "research" ? 92 : intent.outputTypeId === "brief" ? 86 : 76),
  },
  {
    id: "media_generation_engine",
    label: "Media Generation Engine",
    route: "media",
    supports: (intent) => intent.route === "media" || intent.outputTypeId === "video" || intent.outputTypeId === "image_design",
    producesArtifactsDirectly: true,
    changesWorldState: false,
    baseScore: (intent) => (intent.outputTypeId === "video" || intent.outputTypeId === "image_design" ? 91 : 80),
  },
  {
    id: "publishing_release_engine",
    label: "Publishing Release Engine",
    route: "publishing",
    supports: (intent, prompt) =>
      intent.route === "publishing" || /\bpublish\b|\bpost live\b|\bschedule post\b|\bpost to\b/i.test(prompt),
    producesArtifactsDirectly: true,
    changesWorldState: true,
    baseScore: (_intent, prompt) => (/\bpublish\b|\bpost live\b|\bschedule post\b/i.test(prompt) ? 90 : 78),
  },
  {
    id: "payments_guarded_engine",
    label: "Payments and Commerce Guardrail Engine",
    route: "payments_commerce",
    supports: (intent) => intent.route === "payments_commerce" || intent.departmentId === "finance",
    producesArtifactsDirectly: false,
    changesWorldState: true,
    baseScore: (intent) => (intent.departmentId === "finance" ? 88 : 74),
  },
  {
    id: "memory_synthesis_engine",
    label: "Memory Synthesis Engine",
    route: "memory_synthesis",
    supports: (intent, prompt) =>
      intent.route === "memory_synthesis" || /\bmemory\b|\bremember\b|\bsynthesize\b|\blearn from\b/i.test(prompt),
    producesArtifactsDirectly: true,
    changesWorldState: false,
    baseScore: () => 82,
  },
];

function includesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

function explicitToolMention(prompt: string) {
  return /\bfigma\b|\bgithub\b|\bnotion\b|\bfusion\b|\bexcel\b|\bshopify\b|\bhubspot\b|\bsalesforce\b|\bquickbooks\b|\bxero\b/i.test(prompt);
}

function wantsDirectArtifact(intent: DoblyExecutionIntent) {
  return [
    "brief",
    "document",
    "presentation",
    "spreadsheet_report",
    "image_design",
    "video",
    "code_context_package",
  ].includes(intent.outputTypeId);
}

function isExternalSystemHeavy(intent: DoblyExecutionIntent, prompt: string) {
  return (
    intent.trustLevelId === "approval_required" ||
    intent.trustLevelId === "human_only" ||
    /\bsend\b|\bpublish\b|\bpost live\b|\bcharge\b|\brefund\b|\bbook\b|\bupdate crm\b|\blog in\b|\bportal\b/i.test(prompt)
  );
}

function scoreStaticTool(prompt: string, intent: DoblyExecutionIntent, tool: StrategyToolStatus) {
  const lower = prompt.toLowerCase();
  let score = 44;

  if (tool.id === intent.preferredToolId) score += 28;
  if (SOFTWARE_TOOL_KEYWORDS.some((candidate) => candidate.toolId === tool.id && includesAny(lower, candidate.patterns))) score += 18;
  if (explicitToolMention(lower)) score += 10;
  if (intent.outputTypeId === "document" && tool.id === "document_production") score += 12;
  if (intent.outputTypeId === "presentation" && tool.id === "document_production") score += 12;
  if (intent.outputTypeId === "spreadsheet_report" && tool.id === "spreadsheet_modeling") score += 12;
  if (intent.outputTypeId === "code_context_package" && tool.id === "github_repo_ops") score += 14;
  if (intent.outputTypeId === "image_design" && tool.id === "figma_design") score += 14;
  if (intent.outputTypeId === "video" && tool.id === "creative_media_ops") score += 12;
  if (intent.departmentId === "finance" && tool.id === "finance_backoffice_ops") score += 14;
  if (intent.departmentId === "sales" && tool.id === "crm_sales_ops") score += 12;
  if (intent.departmentId === "operations" && tool.id === "commerce_backoffice_ops") score += 10;
  if (tool.approvalRequired && wantsDirectArtifact(intent) && !isExternalSystemHeavy(intent, lower)) score -= 6;
  if (!tool.configured) score = 0;

  return score;
}

function nativeCandidates(prompt: string, intent: DoblyExecutionIntent): DoblyExecutionStrategyCandidate[] {
  const lower = prompt.toLowerCase();
  return NATIVE_OUTCOME_ENGINES
    .filter((engine) => engine.supports(intent, lower))
    .map((engine) => {
      let score = engine.baseScore(intent, lower);
      if (wantsDirectArtifact(intent) && engine.producesArtifactsDirectly) score += 6;
      if (explicitToolMention(lower) && !engine.changesWorldState) score -= 8;
      if (isExternalSystemHeavy(intent, lower) && !engine.changesWorldState) score -= 10;
      if (intent.trustLevelId === "human_only" && engine.changesWorldState) score -= 4;
      return {
        id: engine.id,
        kind: intent.trustLevelId === "human_only" && engine.route === "payments_commerce" ? "approval_only" : "native_outcome_engine",
        label: engine.label,
        score,
        reason:
          engine.producesArtifactsDirectly
            ? "Dobly can materialize the requested outcome directly through a native execution engine."
            : "Dobly should handle the guarded system action through a purpose-built runtime instead of a generic tool path.",
        route: engine.route,
        producesArtifactsDirectly: engine.producesArtifactsDirectly,
        changesWorldState: engine.changesWorldState,
        requiresApproval: intent.trustLevelId === "approval_required" || intent.trustLevelId === "human_only" || engine.changesWorldState,
        capabilityState: "live",
        engineId: engine.id,
      } satisfies DoblyExecutionStrategyCandidate;
    });
}

function staticCoreCandidates(prompt: string, intent: DoblyExecutionIntent, tools: StrategyToolStatus[]) {
  const lower = prompt.toLowerCase();
  return tools
    .filter((tool) => tool.configured)
    .map((tool) => {
      const score = scoreStaticTool(prompt, intent, tool);
      return {
        id: tool.id,
        kind: "static_core_mcp",
        label: tool.label,
        score,
        reason:
          explicitToolMention(lower) || isExternalSystemHeavy(intent, lower)
            ? "The request explicitly points at real software or external state, so Dobly should use a Dobly-owned core MCP path."
            : "Dobly has a core MCP path that can execute this work inside a managed software system.",
        route: "software_execution",
        producesArtifactsDirectly: ["document", "spreadsheet", "design_file", "media_asset", "generic_artifact", "code_change"].includes(tool.outputType),
        changesWorldState: tool.family === "browser" || tool.family === "crm" || tool.family === "commerce" || tool.family === "finance" || tool.family === "marketing",
        requiresApproval: tool.approvalRequired || intent.trustLevelId === "approval_required" || intent.trustLevelId === "human_only",
        capabilityState: "live",
        toolId: tool.id,
        tool,
      } satisfies DoblyExecutionStrategyCandidate;
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);
}

function choosePrimary(prompt: string, intent: DoblyExecutionIntent, candidates: DoblyExecutionStrategyCandidate[]) {
  const lower = prompt.toLowerCase();
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const bestApprovalOnly = sorted.find((candidate) => candidate.kind === "approval_only");
  const bestNative = sorted.find((candidate) => candidate.kind === "native_outcome_engine");
  const bestStatic = sorted.find((candidate) => candidate.kind === "static_core_mcp");
  const bestUniversal = sorted.find((candidate) => candidate.kind === "universal_user_mcp");

  if (intent.trustLevelId === "human_only") {
    return bestApprovalOnly ?? bestNative ?? bestStatic ?? bestUniversal ?? sorted[0];
  }

  if (explicitToolMention(lower) || isExternalSystemHeavy(intent, lower)) {
    if (wantsDirectArtifact(intent) && bestNative && bestNative.score >= (bestStatic?.score ?? 0) - 8) {
      return bestNative;
    }
    return bestUniversal ?? bestStatic ?? bestNative ?? sorted[0];
  }

  if (wantsDirectArtifact(intent) && bestNative && (!bestStatic || bestNative.score >= bestStatic.score - 4)) {
    return bestNative;
  }

  if (bestUniversal && (!bestStatic || bestUniversal.score >= bestStatic.score + 4)) {
    return bestUniversal;
  }

  return bestStatic ?? bestNative ?? bestUniversal ?? sorted[0];
}

export { choosePrimary };

export function previewDoblyExecutionStrategyCore(input: {
  prompt: string;
  intent: DoblyExecutionIntent;
  tools: StrategyToolStatus[];
}) {
  const candidates = [
    ...nativeCandidates(input.prompt, input.intent),
    ...staticCoreCandidates(input.prompt, input.intent, input.tools),
  ].sort((a, b) => b.score - a.score);
  const primary = choosePrimary(input.prompt, input.intent, candidates);
  return {
    intent: input.intent,
    primary,
    candidates,
    usedUniversalConnections: false,
  };
}
