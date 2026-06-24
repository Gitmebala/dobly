import "server-only";
import { buildDoblyOperatingSpec, type DoblyOperatingSpec } from "@/lib/dobly-operating-system";
import { getDepartmentExecutionPack, inferDoblyExecutionIntent, type DoblyExecutionIntent } from "@/lib/dobly-inference";
import { createSoftwareExecutionRun } from "@/lib/software-execution-runs";
import { listSoftwareExecutionTools } from "@/lib/software-execution";
import { runResearchRuntime } from "@/lib/runtime/research";
import { runMediaRuntime } from "@/lib/runtime/media";
import { runVoiceHardeningCheck } from "@/lib/runtime/voice-hardening";
import { runMemorySynthesis } from "@/lib/runtime/memory-synthesis";
import { executePublishingRuntime } from "@/lib/runtime/publishing-execution";
import { executePaymentsCommerceRuntime } from "@/lib/runtime/payments-commerce";
import {
  createPersonalWatcher,
  evaluatePersonalWatcher,
  type PersonalWatcherCategory,
} from "@/lib/runtime/personal-watchers";
import {
  previewDoblyExecutionStrategy,
  resolveDoblyExecutionStrategy,
  type DoblyExecutionStrategyKind,
} from "@/lib/runtime/execution-strategy";
import { executeUniversalMcpPath } from "@/lib/runtime/universal-mcp-execution";
import type { UniversalExecutionPath } from "@/lib/runtime/universal-mcp";

type JsonRecord = Record<string, unknown>;

export type DoblyCommandRoute =
  | "software_execution"
  | "universal_mcp"
  | "research"
  | "media"
  | "voice_hardening"
  | "personal_watcher"
  | "memory_synthesis";

export interface DoblyCommandInput {
  userId: string;
  workspaceId?: string | null;
  prompt: string;
  context?: JsonRecord;
  approved?: boolean;
  intent?: DoblyExecutionIntent | null;
}

export interface DoblyCommandPlan {
  route: DoblyCommandRoute;
  confidence: number;
  reason: string;
  toolId?: string;
  watcherCategory?: PersonalWatcherCategory;
  requiresApproval?: boolean;
  intent: DoblyExecutionIntent;
  departmentPack?: ReturnType<typeof getDepartmentExecutionPack>;
  strategyKind?: DoblyExecutionStrategyKind;
  strategyLabel?: string;
  operatingSpec: DoblyOperatingSpec;
}

const SOFTWARE_TOOL_KEYWORDS: Array<{ toolId: string; patterns: string[] }> = [
  { toolId: "figma_design", patterns: ["figma", "wireframe", "ui mockup", "design system"] },
  { toolId: "github_repo_ops", patterns: ["github", "repo", "pull request", "codebase", "commit", "issue"] },
  { toolId: "fusion_modeling", patterns: ["autodesk", "fusion", "cad", "3d model", "mechanical design", "turbine design"] },
  { toolId: "notion_workspace_ops", patterns: ["notion"] },
  { toolId: "spreadsheet_modeling", patterns: ["spreadsheet", "excel", "sheet", "financial model"] },
  { toolId: "document_production", patterns: ["docx", "document", "proposal", "contract", "report"] },
  { toolId: "browser_software_ops", patterns: ["portal", "website admin", "browser", "log in", "dashboard"] },
  { toolId: "social_publishing_ops", patterns: ["post to instagram", "publish", "schedule posts", "social media"] },
  { toolId: "finance_backoffice_ops", patterns: ["invoice", "accounting", "reconcile", "quickbooks", "xero"] },
  { toolId: "commerce_backoffice_ops", patterns: ["shopify", "order", "inventory", "fulfillment"] },
  { toolId: "crm_sales_ops", patterns: ["crm", "hubspot", "salesforce", "lead", "pipeline"] },
  { toolId: "travel_planning_ops", patterns: ["flight", "hotel", "itinerary", "travel"] },
];

function includesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

function explicitIntentOverrides(intent?: DoblyExecutionIntent | null) {
  return intent
    ? {
        departmentId: intent.departmentId,
        workTypeId: intent.workTypeId,
        outputTypeId: intent.outputTypeId,
        triggerTypeId: intent.triggerTypeId,
        trustLevelId: intent.trustLevelId,
        memoryScopeId: intent.memoryScopeId,
      }
    : undefined;
}

function preferredToolForIntent(intent: DoblyExecutionIntent) {
  if (intent.outputTypeId === "code_context_package") return "github_repo_ops";
  if (intent.outputTypeId === "spreadsheet_report") return "spreadsheet_modeling";
  if (intent.outputTypeId === "document" || intent.outputTypeId === "presentation") return "document_production";
  if (intent.outputTypeId === "image_design") return "figma_design";
  if (intent.outputTypeId === "video") return "creative_media_ops";
  if (intent.departmentId === "finance") return "finance_backoffice_ops";
  if (intent.departmentId === "sales") return "crm_sales_ops";
  if (intent.departmentId === "marketing" && intent.outputTypeId === "message") return "social_publishing_ops";
  if (intent.departmentId === "operations" && (intent.outputTypeId === "task" || intent.outputTypeId === "alert")) return "commerce_backoffice_ops";
  if (intent.departmentId === "engineering_product" && intent.workTypeId === "build") return "github_repo_ops";
  return null;
}

function pickSoftwareTool(prompt: string, intent?: DoblyExecutionIntent | null) {
  const lower = prompt.toLowerCase();
  const configuredIds = new Set(listSoftwareExecutionTools().map((tool) => tool.id));
  const intentToolId = intent ? preferredToolForIntent(intent) : null;
  if (intentToolId && configuredIds.has(intentToolId)) {
    return { toolId: intentToolId, patterns: ["intent-mapped"] };
  }
  return SOFTWARE_TOOL_KEYWORDS.find((candidate) => configuredIds.has(candidate.toolId) && includesAny(lower, candidate.patterns));
}

function classifyWatcherCategory(prompt: string): PersonalWatcherCategory {
  const lower = prompt.toLowerCase();
  if (includesAny(lower, ["stock", "share price", "portfolio", "crypto", "market", "sell", "buy"])) return "markets";
  if (includesAny(lower, ["flight", "hotel", "visa", "trip", "travel"])) return "travel";
  if (includesAny(lower, ["subscription", "renewal", "plan", "membership"])) return "subscriptions";
  if (includesAny(lower, ["bill", "rent", "payment due", "utilities"])) return "bills";
  if (includesAny(lower, ["news", "policy", "regulation", "competitor"])) return "news";
  if (includesAny(lower, ["health", "sleep", "workout", "medicine"])) return "health";
  if (includesAny(lower, ["calendar", "meeting", "appointment", "birthday"])) return "calendar";
  return "custom";
}

export function planDoblyCommand(input: Pick<DoblyCommandInput, "prompt" | "intent">): DoblyCommandPlan {
  const prompt = input.prompt.trim();
  const lower = prompt.toLowerCase();
  const softwareAvailability = Object.fromEntries(listSoftwareExecutionTools().map((tool) => [tool.id, tool.configured])) as Record<string, boolean>;
  const inferredIntent = inferDoblyExecutionIntent({
    prompt,
    explicit: explicitIntentOverrides(input.intent),
    availability: {
      softwareTools: softwareAvailability,
      runtimes: {
        research: true,
        media: true,
        publishing: true,
        memory_synthesis: true,
      },
    },
  });
  const strategyPreview = previewDoblyExecutionStrategy({
    prompt,
    intent: inferredIntent,
    availability: {
      softwareTools: softwareAvailability,
      runtimes: {
        research: true,
        media: true,
        publishing: true,
        payments_commerce: true,
        memory_synthesis: true,
      },
    },
  });
  const operatingSpec = buildDoblyOperatingSpec({
    prompt,
    intent: inferredIntent,
    availability: {
      softwareTools: softwareAvailability,
      runtimes: {
        research: true,
        media: true,
        publishing: true,
        payments_commerce: true,
        memory_synthesis: true,
      },
    },
  });
  const softwareTool = strategyPreview.primary.toolId
    ? { toolId: strategyPreview.primary.toolId, patterns: ["strategy-preview"] }
    : pickSoftwareTool(prompt, inferredIntent);
  const departmentPack = getDepartmentExecutionPack(inferredIntent.departmentId);
  const fallbackRoute: DoblyCommandRoute =
    inferredIntent.route === "publishing"
      ? "media"
      : inferredIntent.route === "payments_commerce" || inferredIntent.route === "software_execution"
        ? "software_execution"
        : inferredIntent.route === "memory_synthesis"
          ? "memory_synthesis"
          : inferredIntent.route === "media"
            ? "media"
            : "research";

  if (softwareTool) {
    return {
      route: "software_execution",
      confidence: Math.max(0.88, inferredIntent.confidence),
      reason: `${strategyPreview.primary.reason} Prompt maps to ${inferredIntent.departmentId} / ${inferredIntent.workTypeId} and a software path suited for ${softwareTool.toolId}.`,
      toolId: softwareTool.toolId,
      requiresApproval: inferredIntent.trustLevelId === "approval_required" || inferredIntent.trustLevelId === "human_only",
      intent: { ...inferredIntent, preferredToolId: softwareTool.toolId, route: "software_execution" },
      departmentPack,
      strategyKind: strategyPreview.primary.kind,
      strategyLabel: strategyPreview.primary.label,
      operatingSpec,
    };
  }

  if (includesAny(lower, ["watch", "monitor", "alert me", "notify me", "tell me when", "keep an eye"])) {
    return {
      route: "personal_watcher",
      confidence: Math.max(0.82, inferredIntent.confidence),
      reason: `Prompt asks Dobly to keep watching something over time for ${inferredIntent.departmentId}.`,
      watcherCategory: classifyWatcherCategory(prompt),
      requiresApproval: false,
      intent: { ...inferredIntent, route: "research" },
      departmentPack,
      strategyKind: strategyPreview.primary.kind,
      strategyLabel: strategyPreview.primary.label,
      operatingSpec,
    };
  }

  if (includesAny(lower, ["research", "find out", "look up", "sources", "best", "compare", "investigate", "crawl", "scrape"])) {
    return {
      route: "research",
      confidence: Math.max(0.8, inferredIntent.confidence),
      reason: `Prompt asks for fresh research or source-backed investigation for ${inferredIntent.departmentId}.`,
      requiresApproval: false,
      intent: { ...inferredIntent, route: "research" },
      departmentPack,
      strategyKind: strategyPreview.primary.kind,
      strategyLabel: strategyPreview.primary.label,
      operatingSpec,
    };
  }

  if (
    inferredIntent.outputTypeId === "video" ||
    inferredIntent.outputTypeId === "image_design" ||
    inferredIntent.route === "media" ||
    inferredIntent.route === "publishing" ||
    includesAny(lower, ["video", "image", "carousel", "post", "caption", "creative", "reel", "tiktok", "instagram", "publish"])
  ) {
    return {
      route: lower.includes("publish") || lower.includes("post ") ? "media" : "media",
      confidence: Math.max(0.8, inferredIntent.confidence),
      reason: `Prompt asks for media creation or social publishing inside ${inferredIntent.departmentId}.`,
      requiresApproval: inferredIntent.trustLevelId === "approval_required" || lower.includes("publish") || lower.includes("post "),
      intent: { ...inferredIntent, route: "media" },
      departmentPack,
      strategyKind: strategyPreview.primary.kind,
      strategyLabel: strategyPreview.primary.label,
      operatingSpec,
    };
  }

  if (includesAny(lower, ["voice", "call", "receptionist", "phone agent", "twilio", "elevenlabs"])) {
    return {
      route: "voice_hardening",
      confidence: 0.75,
      reason: "Prompt is about voice/call agent readiness.",
      requiresApproval: false,
      intent: { ...inferredIntent, route: "research" },
      departmentPack,
      strategyKind: strategyPreview.primary.kind,
      strategyLabel: strategyPreview.primary.label,
      operatingSpec,
    };
  }

  if (includesAny(lower, ["memory", "remember", "learn from", "summarize what dobly knows", "synthesize"])) {
    return {
      route: "memory_synthesis",
      confidence: 0.72,
      reason: "Prompt asks Dobly to consolidate or reuse saved knowledge.",
      requiresApproval: false,
      intent: { ...inferredIntent, route: "memory_synthesis" },
      departmentPack,
      strategyKind: strategyPreview.primary.kind,
      strategyLabel: strategyPreview.primary.label,
      operatingSpec,
    };
  }

  return {
    route: fallbackRoute,
    confidence: inferredIntent.confidence,
    reason: `${strategyPreview.primary.reason} Defaulted from Dobly intent inference: ${inferredIntent.departmentId} / ${inferredIntent.workTypeId} / ${inferredIntent.outputTypeId}.`,
    requiresApproval: inferredIntent.trustLevelId === "approval_required" || inferredIntent.trustLevelId === "human_only",
    toolId: inferredIntent.preferredToolId ?? undefined,
    intent: inferredIntent,
    departmentPack,
    strategyKind: strategyPreview.primary.kind,
    strategyLabel: strategyPreview.primary.label,
    operatingSpec,
  };
}

function mediaFormats(prompt: string) {
  const lower = prompt.toLowerCase();
  const formats: Array<"short_video" | "image" | "carousel" | "voiceover" | "social_post"> = [];
  if (includesAny(lower, ["video", "reel", "tiktok", "short"])) formats.push("short_video");
  if (includesAny(lower, ["image", "poster", "thumbnail"])) formats.push("image");
  if (lower.includes("carousel")) formats.push("carousel");
  if (includesAny(lower, ["voiceover", "voice over"])) formats.push("voiceover");
  if (includesAny(lower, ["post", "caption", "social"])) formats.push("social_post");
  return formats.length ? formats : undefined;
}

function mediaChannels(prompt: string) {
  const lower = prompt.toLowerCase();
  return ["instagram", "tiktok", "linkedin", "x", "facebook", "youtube"].filter((channel) =>
    lower.includes(channel),
  );
}

function withOperatingSpecContext(context: JsonRecord | undefined, operatingSpec: DoblyOperatingSpec) {
  return {
    ...(context ?? {}),
    doblyOperatingSpec: operatingSpec,
  };
}

export async function executeDoblyCommand(input: DoblyCommandInput) {
  const previewPlan = planDoblyCommand(input);
  const strategy = await resolveDoblyExecutionStrategy({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    prompt: input.prompt,
    intent: input.intent ?? previewPlan.intent,
  });
  const plan: DoblyCommandPlan = {
    ...previewPlan,
    intent: strategy.intent,
    strategyKind: strategy.primary.kind,
    strategyLabel: strategy.primary.label,
    operatingSpec: buildDoblyOperatingSpec({
      prompt: input.prompt,
      context: input.context ?? {},
      intent: strategy.intent,
    }),
    reason: strategy.primary.reason,
    route:
      strategy.primary.route === "universal_mcp"
        ? "universal_mcp"
        : strategy.primary.route === "research" || strategy.primary.route === "media" || strategy.primary.route === "memory_synthesis"
          ? strategy.primary.route
          : previewPlan.route,
    toolId: strategy.primary.toolId ?? previewPlan.toolId,
    requiresApproval: strategy.primary.requiresApproval,
  };

  if (strategy.primary.route === "publishing" || plan.intent.route === "publishing") {
    const result = await executePublishingRuntime({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      providers: mediaChannels(input.prompt).filter((provider): provider is "instagram" | "facebook" | "linkedin" | "x" | "youtube" | "tiktok" =>
        ["instagram", "facebook", "linkedin", "x", "youtube", "tiktok"].includes(provider),
      ).length
        ? mediaChannels(input.prompt).filter((provider): provider is "instagram" | "facebook" | "linkedin" | "x" | "youtube" | "tiktok" =>
            ["instagram", "facebook", "linkedin", "x", "youtube", "tiktok"].includes(provider),
          )
        : ["instagram"],
      caption: input.prompt,
      mediaUrls: Array.isArray(input.context?.mediaUrls) ? input.context.mediaUrls.map(String) : [],
      scheduleAt: typeof input.context?.scheduleAt === "string" ? input.context.scheduleAt : null,
      dryRun: Boolean(input.context?.dryRun),
      approved: input.approved ?? false,
    });
    return { plan, result };
  }

  if (strategy.primary.route === "payments_commerce" || plan.intent.route === "payments_commerce") {
    const result = await executePaymentsCommerceRuntime({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      provider: "stripe",
      action: "payment_link",
      payload: { prompt: input.prompt, ...withOperatingSpecContext(input.context, plan.operatingSpec) },
      dryRun: Boolean(input.context?.dryRun),
      approved: input.approved ?? false,
    });
    return { plan, result };
  }

  if (strategy.primary.kind === "universal_user_mcp" && strategy.primary.path) {
    const universalPath = strategy.primary.path as UniversalExecutionPath;
    const result = await executeUniversalMcpPath({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      prompt: input.prompt,
      context: withOperatingSpecContext(input.context, plan.operatingSpec),
      approved: input.approved ?? false,
      path: universalPath,
      intent: plan.intent,
    });
    return { plan, strategy, result };
  }

  if (plan.route === "software_execution" && plan.toolId) {
    const result = await createSoftwareExecutionRun({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      toolId: plan.toolId,
      task: input.prompt,
      context: withOperatingSpecContext(input.context, plan.operatingSpec),
      approved: input.approved ?? false,
      intent: plan.intent,
    });
    return { plan, strategy, result };
  }

  if (plan.route === "personal_watcher") {
    const watcher = await createPersonalWatcher({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      name: input.prompt.slice(0, 120),
      category: plan.watcherCategory ?? "custom",
      strategy: input.prompt,
      cadence: String(input.context?.cadence ?? "manual"),
      dataSources: Array.isArray(input.context?.dataSources) ? input.context.dataSources.map(String) : [],
      triggerRules: typeof input.context?.triggerRules === "object" ? (input.context.triggerRules as JsonRecord) : {},
      notificationChannels: Array.isArray(input.context?.notificationChannels)
        ? input.context.notificationChannels.map(String)
        : [],
    });
    const evaluation = await evaluatePersonalWatcher({ userId: input.userId, watcherId: watcher.id });
    return { plan, strategy, result: { watcher, evaluation } };
  }

  if (plan.route === "media") {
    const result = await runMediaRuntime({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      brief: input.prompt,
      formats: mediaFormats(input.prompt),
      channels: mediaChannels(input.prompt),
      brandKit: typeof input.context?.brandKit === "object" ? (input.context.brandKit as JsonRecord) : {},
      publish: input.prompt.toLowerCase().includes("publish") || input.prompt.toLowerCase().includes("post "),
      approved: input.approved ?? false,
    });
    return { plan, strategy, result };
  }

  if (plan.route === "voice_hardening") {
    const result = await runVoiceHardeningCheck({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      expectedUseCase: input.prompt.toLowerCase().includes("reception") ? "reception" : "custom",
    });
    return { plan, strategy, result };
  }

  if (plan.route === "memory_synthesis") {
    const result = await runMemorySynthesis({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      scope: "all",
      writeBack: Boolean(input.context?.writeBack),
    });
    return { plan, strategy, result };
  }

  const result = await runResearchRuntime({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
      query: input.prompt,
      mode: input.prompt.toLowerCase().includes("crawl") || input.prompt.toLowerCase().includes("scrape") ? "crawl" : "answer",
      urls: Array.isArray(input.context?.urls) ? input.context.urls.map(String) : [],
      context: {
        ...withOperatingSpecContext(input.context, plan.operatingSpec),
        doblyIntent: plan.intent,
        departmentPack: plan.departmentPack,
      },
    });

  return { plan, strategy, result };
}
