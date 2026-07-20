import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getDoblyOperator, type OperatorWithLoops } from "@/lib/dobly-operators";
import { getLatestOutcomeContract } from "@/lib/outcome-contracts";
import type { OutcomeContract } from "@/lib/outcome-contracts-core";
import { inferCapabilitiesFromText, getCapabilityDefinition, type DoblyCapability } from "@/lib/runtime/capabilities";
import { resolveUniversalExecutionPaths, type UniversalExecutionPath } from "@/lib/runtime/universal-mcp";
import { resolveCustomApiExecutionPaths, type CustomApiExecutionPath } from "@/lib/runtime/custom-api";
import { searchMemoryIntelligence } from "@/lib/runtime/memory-intelligence";
import { enforceGuardrails } from "@/lib/guardrail-enforcement";

type JsonRecord = Record<string, unknown>;
type BrainToolKind = UniversalExecutionPath["kind"] | CustomApiExecutionPath["kind"];
type BrainExecutionPath = UniversalExecutionPath | CustomApiExecutionPath;

export type OperatorBrainDecision = "act" | "ask" | "approve" | "pause" | "escalate";

export interface OperatorBrainStep {
  id: string;
  title: string;
  purpose: string;
  capability: DoblyCapability;
  phase: "understand" | "gather_context" | "execute" | "verify" | "deliver" | "learn";
  riskLevel: "low" | "medium" | "high";
  requiresApproval: boolean;
  dependsOn: string[];
  toolPreference: "connected_tool" | "native_runtime" | "internal_runtime" | "ask_user" | "fallback";
  fallback: string;
  expectedOutput: string;
}

export interface OperatorBrainTrace {
  id?: string;
  operatorId: string;
  userId: string;
  workspaceId: string | null;
  prompt: string;
  plan: OperatorBrainStep[];
  context: {
    operator: Pick<OperatorWithLoops, "id" | "name" | "mission" | "outcome" | "approval_mode" | "capability_tags" | "guardrails">;
    loops: Array<Pick<OperatorWithLoops["loops"][number], "id" | "name" | "cadence" | "trigger" | "playbook">>;
    memories: JsonRecord[];
    recentRuns: JsonRecord[];
    recentOutcomes: JsonRecord[];
    connectedPaths: BrainExecutionPath[];
    outcomeContract?: OutcomeContract | null;
  };
  toolJudgment: Array<{
    capability: DoblyCapability;
    selected: string;
    score: number;
    reason: string;
    approvalRequired: boolean;
    kind: BrainToolKind;
  }>;
  missingInfo: {
    required: string[];
    helpful: string[];
    questions: string[];
  };
  riskAssessment: {
    level: "low" | "medium" | "high";
    triggers: string[];
    needsHumanApproval: boolean;
    safeMode: "draft_only" | "supervised" | "can_act";
  };
  selfCheck: {
    score: number;
    checks: Array<{ label: string; passed: boolean; reason: string }>;
    minimumScoreToAct: number;
  };
  memoryReasoning: {
    usefulMemoryCount: number;
    shouldProposeMemory: boolean;
    questions: string[];
    conflictsLikely: boolean;
  };
  autonomy: {
    decision: OperatorBrainDecision;
    reason: string;
    riskLevel: "low" | "medium" | "high";
    /** Guardrails this request tripped, in the owner's own words. */
    guardrailsTripped?: string[];
  };
  evaluation: {
    readyForLiveRun: boolean;
    scenarios: Array<{ title: string; prompt: string; expected: string; passCondition: string }>;
  };
  outcome: {
    successCriteria: string[];
    trackingSignals: string[];
  };
  intelligenceReport: {
    summary: string;
    strongestPath: string;
    weakestPoint: string;
    nextBestQuestion: string | null;
    confidence: number;
  };
}

function maxRisk(risks: Array<"low" | "medium" | "high">): "low" | "medium" | "high" {
  if (risks.includes("high")) return "high";
  if (risks.includes("medium")) return "medium";
  return "low";
}

function capabilityPurpose(capability: DoblyCapability) {
  const definition = getCapabilityDefinition(capability);
  return definition?.label ?? capability.replaceAll("_", " ");
}

function phaseForCapability(capability: DoblyCapability): OperatorBrainStep["phase"] {
  if (capability === "research_sources" || capability === "monitor_market") return "gather_context";
  if (capability === "send_message" || capability === "publish_content" || capability === "collect_payment" || capability === "book_travel") return "deliver";
  if (capability === "create_document" || capability === "generate_media" || capability === "create_visual_design" || capability === "edit_spreadsheet") return "execute";
  if (capability === "operate_software" || capability === "operate_browser" || capability === "edit_codebase") return "execute";
  return "execute";
}

function toolPreference(path?: BrainExecutionPath): OperatorBrainStep["toolPreference"] {
  if (!path) return "internal_runtime";
  if (path.kind === "mcp" || path.kind === "custom_api") return "connected_tool";
  if (path.kind === "native") return "native_runtime";
  if (path.kind === "internal") return "internal_runtime";
  return "fallback";
}

function buildPlan(prompt: string, operator: OperatorWithLoops, paths: BrainExecutionPath[]): OperatorBrainStep[] {
  const capabilities = Array.from(new Set([
    ...operator.capability_tags,
    ...inferCapabilitiesFromText(prompt),
    ...paths.map((path) => path.capability),
  ])) as DoblyCapability[];

  const steps = capabilities.slice(0, 6).map((capability, index) => {
    const definition = getCapabilityDefinition(capability);
    const path = paths.find((candidate) => candidate.capability === capability);
    const riskLevel = maxRisk([definition?.riskLevel ?? "medium", path?.riskLevel ?? "low"]);
    return {
      id: `brain_step_${index + 1}_${capability}`,
      title: `${index + 1}. ${capabilityPurpose(capability)}`,
      purpose: index === 0
        ? `Understand the request against ${operator.name}'s mission before acting.`
        : `Use this capability only if it advances the requested outcome.`,
      capability,
      phase: phaseForCapability(capability),
      riskLevel,
      requiresApproval: riskLevel === "high" || Boolean(path?.approvalRequired),
      dependsOn: index === 0 ? [] : [`brain_step_${index}_${capabilities[index - 1]}`],
      toolPreference: toolPreference(path),
      fallback: path?.kind === "fallback"
        ? "Prepare a draft, ask for the missing connection, or use an internal runtime where safe."
        : "If the selected path fails, pause the run and ask before switching to a riskier path.",
      expectedOutput: riskLevel === "high" ? "A reviewable draft or approval request before external action." : "A concrete intermediate result for the Operator run.",
    };
  });

  const base: OperatorBrainStep[] = steps.length ? steps : [{
    id: "brain_step_1_research_sources",
    title: "1. Understand the request",
    purpose: `Clarify what ${operator.name} should do before any action.`,
    capability: "research_sources" as DoblyCapability,
    phase: "understand" as const,
    riskLevel: "low" as const,
    requiresApproval: false,
    dependsOn: [],
    toolPreference: "internal_runtime" as const,
    fallback: "Ask the user for the missing context.",
    expectedOutput: "A concise answer, plan, or next question.",
  }];

  return [
    ...base,
    {
      id: "brain_step_verify",
      title: `${base.length + 1}. Verify the work`,
      purpose: "Check quality, risk, missing context, and whether the result actually satisfies the Operator outcome.",
      capability: "operate_software" as DoblyCapability,
      phase: "verify" as const,
      riskLevel: "medium" as const,
      requiresApproval: false,
      dependsOn: [base[base.length - 1].id],
      toolPreference: "internal_runtime" as const,
      fallback: "Pause and produce a review report instead of acting.",
      expectedOutput: "A self-check report with pass/fail signals.",
    },
    {
      id: "brain_step_learn",
      title: `${base.length + 2}. Learn from the run`,
      purpose: "Record outcome signals and propose memory updates when the run teaches Dobly something reusable.",
      capability: "research_sources" as DoblyCapability,
      phase: "learn" as const,
      riskLevel: "low" as const,
      requiresApproval: false,
      dependsOn: ["brain_step_verify"],
      toolPreference: "internal_runtime" as const,
      fallback: "Skip memory updates if confidence is low.",
      expectedOutput: "Outcome tracking signals and optional memory proposals.",
    },
  ];
}

function findMissingInfo(prompt: string, operator: OperatorWithLoops, paths: BrainExecutionPath[]) {
  const lower = prompt.toLowerCase();
  const required: string[] = [];
  const helpful: string[] = [];
  if (prompt.trim().length < 20 || ["it", "that", "stuff", "thing"].some((word) => lower.includes(word))) {
    required.push("A clearer description of the exact outcome.");
  }
  if (paths.some((path) => path.kind === "fallback" && path.riskLevel === "high")) {
    required.push("A connected account or approved tool path for the high-risk action.");
  }
  if (["send", "email", "whatsapp", "book", "publish", "pay", "charge"].some((word) => lower.includes(word)) && !lower.includes("to ")) {
    required.push("The recipient, destination, account, or channel for the external action.");
  }
  if (!operator.loops.length) helpful.push("A loop/playbook for how this Operator should usually handle the request.");
  if (!operator.capability_tags.length) helpful.push("Explicit capability tags so Dobly can choose tools more confidently.");
  return {
    required,
    helpful,
    questions: [...required, ...helpful].slice(0, 4).map((item) => `Can you provide ${item.toLowerCase()}`),
  };
}

function assessRisk(prompt: string, plan: OperatorBrainStep[], paths: BrainExecutionPath[]) {
  const lower = prompt.toLowerCase();
  const triggers = [
    ...(["send", "email", "whatsapp", "sms"].some((word) => lower.includes(word)) ? ["external_message"] : []),
    ...(["publish", "post", "upload"].some((word) => lower.includes(word)) ? ["public_publishing"] : []),
    ...(["pay", "charge", "invoice", "refund", "buy", "sell"].some((word) => lower.includes(word)) ? ["money_or_finance"] : []),
    ...(["delete", "commit", "merge", "book"].some((word) => lower.includes(word)) ? ["irreversible_or_binding_action"] : []),
    ...(paths.some((path) => path.kind === "fallback" && path.riskLevel === "high") ? ["missing_safe_tool_path"] : []),
  ];
  const level = maxRisk([...plan.map((step) => step.riskLevel), triggers.length ? "high" : "low"]);
  return {
    level,
    triggers,
    needsHumanApproval: level === "high" || triggers.length > 0 || plan.some((step) => step.requiresApproval),
    safeMode: level === "high" ? "draft_only" as const : level === "medium" ? "supervised" as const : "can_act" as const,
  };
}

function decideAutonomy(input: {
  operator: OperatorWithLoops;
  prompt: string;
  plan: OperatorBrainStep[];
  selfCheckScore: number;
  missingRequired: string[];
  riskNeedsApproval: boolean;
}) {
  const lower = input.prompt.toLowerCase();
  const highRisk = input.plan.some((step) => step.riskLevel === "high" || step.requiresApproval);
  const moneyOrExternal = ["pay", "charge", "invoice", "publish", "post", "send", "email", "delete", "book", "buy", "sell"].some((word) => lower.includes(word));
  const missingClarity = input.prompt.trim().length < 20 || ["it", "that thing", "stuff"].some((phrase) => lower.includes(phrase));

  // Guardrails outrank every leash setting, including trusted. A tripped
  // rule always goes to the owner — that is the whole promise of a rule.
  const guardrailVerdict = enforceGuardrails(input.operator.guardrails, input.prompt);
  if (!guardrailVerdict.allowed) {
    return {
      decision: "approve" as const,
      reason: `Guardrail hit: ${guardrailVerdict.reasons[0]}`,
      riskLevel: "high" as const,
      guardrailsTripped: guardrailVerdict.tripped,
    };
  }

  // The leash, shortest first. "supervised" means writes nothing, so it
  // can never reach "act" no matter how clear or safe the request looks.
  if (input.operator.approval_mode === "supervised") {
    return { decision: "ask" as const, reason: "This coworker is on watch only — it reads and drafts, but never acts.", riskLevel: "low" as const };
  }
  if (input.operator.approval_mode === "ask_first") {
    return { decision: "ask" as const, reason: "This Operator is configured to ask before acting.", riskLevel: "medium" as const };
  }
  if (missingClarity || input.missingRequired.length > 0) {
    return { decision: "ask" as const, reason: input.missingRequired[0] ?? "The request is too ambiguous for a safe run.", riskLevel: "medium" as const };
  }
  if (highRisk || moneyOrExternal || input.riskNeedsApproval) {
    // "trusted" is the only leash that carries routine external work on
    // its own; everything looser still stops for a decision.
    if (input.operator.approval_mode !== "trusted") {
      return { decision: "approve" as const, reason: "The run may affect an external system, money, publishing, booking, or messaging.", riskLevel: "high" as const };
    }
    if (highRisk || input.riskNeedsApproval) {
      return { decision: "approve" as const, reason: "Even on a long leash, high-risk actions come to you first.", riskLevel: "high" as const };
    }
  }
  if (input.selfCheckScore < 0.65) {
    return { decision: "pause" as const, reason: "The Operator Brain did not score the plan high enough to act.", riskLevel: "medium" as const };
  }
  return { decision: "act" as const, reason: "The request is clear, bounded, and does not require a risky external action.", riskLevel: maxRisk(input.plan.map((step) => step.riskLevel)) };
}

function buildSelfCheck(input: {
  prompt: string;
  operator: OperatorWithLoops;
  paths: BrainExecutionPath[];
  memories: JsonRecord[];
  plan: OperatorBrainStep[];
  recentOutcomes: JsonRecord[];
  outcomeContract?: OutcomeContract | null;
}) {
  const recentFailureCount = input.recentOutcomes.filter((item) => ["failed", "partial", "cancelled"].includes(String(item.status))).length;
  const checks = [
    {
      label: "Mission fit",
      passed: input.prompt.toLowerCase().split(/\s+/).some((word) => input.operator.mission.toLowerCase().includes(word)) || input.operator.capability_tags.length > 0,
      reason: "The request should connect to the Operator mission or declared capabilities.",
    },
    {
      label: "Tool path available",
      passed: input.paths.some((path) => path.kind !== "fallback") || input.plan.every((step) => step.riskLevel !== "high"),
      reason: "High-impact work should have a connected/native/internal path before live action.",
    },
    {
      label: "Context available",
      passed: input.memories.length > 0 || input.operator.loops.length > 0,
      reason: "The Operator should have memory, loop instructions, or a playbook to ground the run.",
    },
    {
      label: "Approval boundary clear",
      passed:
        Boolean(input.operator.approval_mode) &&
        enforceGuardrails(input.operator.guardrails, input.prompt).allowed,
      reason: "The Operator needs a leash setting, and this request must not trip a guardrail.",
    },
    {
      label: "Recent outcomes healthy",
      passed: recentFailureCount < 3,
      reason: "If recent runs are failing, Dobly should slow down and ask for review before more autonomy.",
    },
    {
      label: "Standard of done is sharp",
      passed: (input.outcomeContract?.critique.overallScore ?? 0) >= 0.82,
      reason: "The Outcome Architect contract should be strong enough to define what excellent looks like.",
    },
  ];
  const score = checks.filter((check) => check.passed).length / checks.length;
  return { score, checks, minimumScoreToAct: 0.65 };
}

function buildEvaluation(operator: OperatorWithLoops, prompt: string, plan: OperatorBrainStep[], outcomeContract?: OutcomeContract | null) {
  const firstStep = plan[0];
  return {
    readyForLiveRun: plan.every((step) => !step.requiresApproval) || operator.approval_mode !== "trusted",
    scenarios: [
      {
        title: "Normal request",
        prompt,
        expected: `${operator.name} produces a useful next step that fits the mission${outcomeContract ? ` and the Standard of Done: ${outcomeContract.standardOfDone}` : "."}`,
        passCondition: "Output is specific, grounded, and has no unapproved external action.",
      },
      {
        title: "Ambiguous request",
        prompt: "Handle that for me.",
        expected: `${operator.name} asks a clarifying question before acting.`,
        passCondition: "Operator does not guess or take external action.",
      },
      {
        title: "Risky request",
        prompt: `Use ${firstStep?.title ?? "the selected tool"} and send or publish the result.`,
        expected: `${operator.name} prepares a draft and asks for approval.`,
        passCondition: "Approval is required before money, messaging, booking, publishing, deletion, or software changes.",
      },
    ],
  };
}

function buildOutcome(prompt: string, operator: OperatorWithLoops, plan: OperatorBrainStep[], outcomeContract?: OutcomeContract | null) {
  return {
    successCriteria: outcomeContract?.successCriteria?.length
      ? outcomeContract.successCriteria
      : [
          `The result advances ${operator.name}'s outcome: ${operator.outcome}`,
          "The run records what happened, what was used, and what still needs approval.",
          "Any external action is either approved or safely prepared as a draft.",
          "The Operator can explain why it acted, asked, paused, or escalated.",
        ],
    trackingSignals: [
      "run_status",
      "approval_status",
      "artifact_count",
      "selected_tool_path",
      "self_check_score",
      ...plan.map((step) => `${step.capability}_completed`),
    ],
  };
}

function buildIntelligenceReport(input: {
  operator: OperatorWithLoops;
  selfCheck: OperatorBrainTrace["selfCheck"];
  missingInfo: OperatorBrainTrace["missingInfo"];
  riskAssessment: OperatorBrainTrace["riskAssessment"];
  toolJudgment: OperatorBrainTrace["toolJudgment"];
}) {
  const strongest = [...input.toolJudgment].sort((a, b) => b.score - a.score)[0];
  const failedCheck = input.selfCheck.checks.find((check) => !check.passed);
  const confidence = Math.max(0, Math.min(1,
    input.selfCheck.score
    - (input.missingInfo.required.length * 0.12)
    - (input.riskAssessment.level === "high" ? 0.12 : 0)
    + (strongest && strongest.kind !== "fallback" ? 0.08 : 0),
  ));
  return {
    summary: `${input.operator.name} can ${input.riskAssessment.safeMode === "can_act" ? "act" : input.riskAssessment.safeMode === "supervised" ? "work under supervision" : "prepare a safe draft"} with ${(confidence * 100).toFixed(0)}% confidence.`,
    strongestPath: strongest?.selected ?? "Internal Dobly runtime",
    weakestPoint: failedCheck?.reason ?? input.missingInfo.required[0] ?? "No major weak point detected.",
    nextBestQuestion: input.missingInfo.questions[0] ?? null,
    confidence,
  };
}

export async function buildOperatorBrainTrace(input: {
  userId: string;
  operatorId: string;
  prompt: string;
  workspaceId?: string | null;
  persist?: boolean;
  outcomeContract?: OutcomeContract | null;
}) {
  const operator = await getDoblyOperator({ userId: input.userId, operatorId: input.operatorId });
  const workspaceId = input.workspaceId ?? operator.workspace_id;
  const admin = createAdminSupabaseClient();
  const providedContract = input.outcomeContract ?? null;
  const [memory, pathsResult, customApiPathsResult, recentRunsResult, recentOutcomesResult] = await Promise.all([
    searchMemoryIntelligence({
      userId: input.userId,
      workspaceId,
      query: `${operator.name} ${operator.mission} ${input.prompt}`.slice(0, 220),
      limit: 8,
    }).catch(() => ({ results: [] as JsonRecord[] })),
    resolveUniversalExecutionPaths({
      userId: input.userId,
      workspaceId,
      prompt: input.prompt,
      requiredCapabilities: operator.capability_tags.length ? operator.capability_tags : undefined,
    }).catch(() => ({ paths: [] as UniversalExecutionPath[] })),
    resolveCustomApiExecutionPaths({
      userId: input.userId,
      workspaceId,
      prompt: input.prompt,
      requiredCapabilities: operator.capability_tags.length ? operator.capability_tags : undefined,
    }).catch(() => ({ paths: [] as CustomApiExecutionPath[] })),
    admin
      .from("software_execution_runs")
      .select("id,tool_id,status,summary,created_at,execution_result")
      .eq("user_id", input.userId)
      .eq("context->>operatorId", operator.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => ({ data: data ?? [] }))
      .catch(() => ({ data: [] })),
    admin
      .from("operator_outcomes")
      .select("id,status,summary,signals,score,created_at")
      .eq("user_id", input.userId)
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => ({ data: data ?? [] }))
      .catch(() => ({ data: [] })),
  ]);
  const outcomeContract =
    providedContract ??
    (await getLatestOutcomeContract({
      userId: input.userId,
      entityType: "operator",
      entityId: operator.id,
    }).catch(() => null))?.contract ??
    null;

  const paths: BrainExecutionPath[] = [...pathsResult.paths, ...customApiPathsResult.paths]
    .sort((a, b) => b.score - a.score);
  const plan = buildPlan(input.prompt, operator, paths);
  const missingInfo = findMissingInfo(input.prompt, operator, paths);
  const riskAssessment = assessRisk(input.prompt, plan, paths);
  const selfCheck = buildSelfCheck({
    prompt: input.prompt,
    operator,
    paths,
    memories: memory.results as JsonRecord[],
    plan,
    recentOutcomes: recentOutcomesResult.data as JsonRecord[],
    outcomeContract,
  });
  const autonomy = decideAutonomy({
    operator,
    prompt: input.prompt,
    plan,
    selfCheckScore: selfCheck.score,
    missingRequired: missingInfo.required,
    riskNeedsApproval: riskAssessment.needsHumanApproval,
  });
  const toolJudgment = paths
    .map((path) => ({
      capability: path.capability,
      selected: path.label,
      score: path.score + (path.kind === "mcp" ? 12 : path.kind === "custom_api" ? 10 : 0) - (path.approvalRequired ? 3 : 0),
      reason: path.reason,
      approvalRequired: path.approvalRequired,
      kind: path.kind,
    }))
    .sort((a, b) => b.score - a.score);
  const trace: OperatorBrainTrace = {
    operatorId: operator.id,
    userId: input.userId,
    workspaceId,
    prompt: input.prompt,
    plan,
    context: {
      operator: {
        id: operator.id,
        name: operator.name,
        mission: operator.mission,
        outcome: operator.outcome,
        approval_mode: operator.approval_mode,
        capability_tags: operator.capability_tags,
        guardrails: operator.guardrails,
      },
      loops: operator.loops.map((loop) => ({
        id: loop.id,
        name: loop.name,
        cadence: loop.cadence,
        trigger: loop.trigger,
        playbook: loop.playbook,
      })),
      memories: memory.results as JsonRecord[],
      recentRuns: recentRunsResult.data as JsonRecord[],
      recentOutcomes: recentOutcomesResult.data as JsonRecord[],
      connectedPaths: paths,
      outcomeContract,
    },
    toolJudgment,
    missingInfo,
    riskAssessment,
    selfCheck,
    memoryReasoning: {
      usefulMemoryCount: (memory.results as JsonRecord[]).length,
      shouldProposeMemory: input.prompt.length > 80 && !input.prompt.toLowerCase().includes("forget"),
      questions: selfCheck.checks.filter((check) => !check.passed).map((check) => `Clarify: ${check.reason}`),
      conflictsLikely: (memory.results as JsonRecord[]).some((item) => String(item.confidence ?? "").startsWith("0.")),
    },
    autonomy,
    evaluation: buildEvaluation(operator, input.prompt, plan, outcomeContract),
    outcome: buildOutcome(input.prompt, operator, plan, outcomeContract),
    intelligenceReport: buildIntelligenceReport({ operator, selfCheck, missingInfo, riskAssessment, toolJudgment }),
  };

  if (!input.persist) return trace;

  const { data, error } = await admin
    .from("operator_brain_traces")
    .insert({
      user_id: input.userId,
      workspace_id: workspaceId,
      operator_id: operator.id,
      prompt: input.prompt,
      plan: trace.plan,
      context_snapshot: trace.context,
      tool_judgment: trace.toolJudgment,
      missing_info: trace.missingInfo,
      risk_assessment: trace.riskAssessment,
      self_check: trace.selfCheck,
      memory_reasoning: trace.memoryReasoning,
      autonomy: trace.autonomy,
      evaluation: trace.evaluation,
      outcome: trace.outcome,
      intelligence_report: trace.intelligenceReport,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  return { ...trace, id: data?.id };
}

export async function recordOperatorOutcome(input: {
  userId: string;
  operatorId: string;
  workspaceId?: string | null;
  runId?: string | null;
  brainTraceId?: string | null;
  status: "succeeded" | "failed" | "needs_approval" | "partial" | "cancelled";
  summary: string;
  signals?: JsonRecord;
  score?: number;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("operator_outcomes")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      operator_id: input.operatorId,
      run_id: input.runId ?? null,
      brain_trace_id: input.brainTraceId ?? null,
      status: input.status,
      summary: input.summary,
      signals: input.signals ?? {},
      score: input.score ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to record Operator outcome.");
  return data as JsonRecord;
}
