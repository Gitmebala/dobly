import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { buildDoblyOperatingSpec } from "@/lib/dobly-operating-system";
import { ensureOutcomeContract } from "@/lib/outcome-contracts";
import { inferCapabilitiesFromText, type DoblyCapability } from "@/lib/runtime/capabilities";
import { enqueueOutcomeContractGeneration, enqueueRuntimeCommand } from "@/lib/runtime/job-queue";
import { buildOperatorBrainTrace } from "@/lib/operator-brain";
import { checkUsageEntitlement, recordUsageEvent } from "@/lib/billing/entitlements";
import {
  buildOperatorQualityContract,
  ensureOperatorQualityProfile,
} from "@/lib/operator-quality";
import {
  buildCoworkerOperatingProfile,
  buildRecipeLoops,
  inferCoworkerRecipe,
  mergeCapabilities,
} from "@/lib/coworker-recipes";

type JsonRecord = Record<string, unknown>;

export type DoblyOperatorKind = "business" | "work" | "life" | "custom";
export type DoblyOperatorStatus = "draft" | "active" | "paused" | "archived";
export type DoblyOperatorApprovalMode = "ask_first" | "approve_risky" | "supervised" | "trusted";
export type DoblyLoopCadence = "manual" | "always_on" | "hourly" | "daily" | "weekly" | "market_open" | "event_based";

export interface DoblyOperatorRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  kind: DoblyOperatorKind;
  status: DoblyOperatorStatus;
  mission: string;
  outcome: string;
  scope: string;
  approval_mode: DoblyOperatorApprovalMode;
  capability_tags: DoblyCapability[];
  connected_tool_ids: string[];
  memory_policy: JsonRecord;
  guardrails: JsonRecord;
  metrics: JsonRecord;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoblyLoopRecord {
  id: string;
  operator_id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  cadence: DoblyLoopCadence;
  trigger: string;
  playbook: string;
  status: "active" | "paused" | "archived";
  last_run_at: string | null;
  next_run_at: string | null;
  metadata: JsonRecord;
  created_at: string;
  updated_at: string;
}

export interface OperatorWithLoops extends DoblyOperatorRecord {
  loops: DoblyLoopRecord[];
}

function uniqueCapabilities(parts: string[]) {
  return Array.from(new Set(parts.flatMap((part) => inferCapabilitiesFromText(part)))) as DoblyCapability[];
}

function defaultKind(text: string): DoblyOperatorKind {
  const lower = text.toLowerCase();
  if (["business", "lead", "sales", "invoice", "support", "customer", "shopify", "content"].some((word) => lower.includes(word))) return "business";
  if (["manager", "project", "report", "client", "team", "work"].some((word) => lower.includes(word))) return "work";
  if (["travel", "stock", "market", "bill", "health", "life", "personal"].some((word) => lower.includes(word))) return "life";
  return "custom";
}

function defaultLoops(input: {
  operatorName: string;
  mission: string;
  loops?: Array<Partial<Pick<DoblyLoopRecord, "name" | "cadence" | "trigger" | "playbook">>>;
}) {
  if (input.loops?.length) {
    return input.loops.map((loop) => ({
      name: loop.name ?? `${input.operatorName} loop`,
      cadence: loop.cadence ?? "event_based",
      trigger: loop.trigger ?? "When the user asks Dobly to handle this outcome.",
      playbook: loop.playbook ?? input.mission,
    }));
  }

  return [
    {
      name: `${input.operatorName} command loop`,
      cadence: "event_based" as const,
      trigger: "When a matching request, message, schedule, signal, or connected-tool event appears.",
      playbook: input.mission,
    },
  ];
}

export async function listDoblyOperators(input: {
  userId: string;
  workspaceId?: string | null;
  includeArchived?: boolean;
}): Promise<OperatorWithLoops[]> {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("dobly_operators")
    .select("*, dobly_operator_loops(*)")
    .eq("user_id", input.userId)
    .order("updated_at", { ascending: false });

  if (input.workspaceId) query = query.eq("workspace_id", input.workspaceId);
  if (!input.includeArchived) query = query.neq("status", "archived");

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    ...row,
    loops: row.dobly_operator_loops ?? [],
  })) as OperatorWithLoops[];
}

export async function getDoblyOperator(input: {
  userId: string;
  operatorId: string;
}): Promise<OperatorWithLoops> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dobly_operators")
    .select("*, dobly_operator_loops(*)")
    .eq("id", input.operatorId)
    .eq("user_id", input.userId)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Operator not found.");
  return { ...(data as any), loops: (data as any).dobly_operator_loops ?? [] } as OperatorWithLoops;
}

export async function createDoblyOperator(input: {
  userId: string;
  workspaceId?: string | null;
  name: string;
  mission: string;
  outcome?: string;
  scope?: string;
  kind?: DoblyOperatorKind;
  approvalMode?: DoblyOperatorApprovalMode;
  capabilityTags?: DoblyCapability[];
  connectedToolIds?: string[];
  guardrails?: JsonRecord;
  memoryPolicy?: JsonRecord;
  qualitySelections?: Record<string, string>;
  qualityCustomizations?: Record<string, string>;
  loops?: Array<Partial<Pick<DoblyLoopRecord, "name" | "cadence" | "trigger" | "playbook">>>;
}) {
  const admin = createAdminSupabaseClient();
  const inferredCapabilityTags = input.capabilityTags?.length
    ? input.capabilityTags
    : uniqueCapabilities([input.name, input.mission, input.outcome ?? "", input.scope ?? ""]);
  const coworkerRecipe = inferCoworkerRecipe(
    [input.name, input.mission, input.outcome ?? "", input.scope ?? ""].filter(Boolean).join("\n"),
    inferredCapabilityTags,
  );
  const coworkerProfile = buildCoworkerOperatingProfile(coworkerRecipe);
  const capabilityTags = mergeCapabilities(inferredCapabilityTags, coworkerRecipe.capabilities);
  const operatingSpec = buildDoblyOperatingSpec({
    prompt: [input.name, input.mission, input.outcome ?? "", input.scope ?? ""].filter(Boolean).join("\n"),
  });
  const guardrails = {
    externalActionsNeedApproval: operatingSpec.autonomy.externalActionsNeedApproval,
    moneyMovementNeedsApproval: operatingSpec.autonomy.moneyMovementNeedsApproval,
    publishingNeedsApproval: operatingSpec.autonomy.publishingNeedsApproval,
    codeChangesNeedReview: operatingSpec.autonomy.codeChangesNeedReview,
    escalationTriggers: operatingSpec.watchPolicy.escalationTriggers,
    ...(input.guardrails ?? {}),
    coworkerOperatingProfile: coworkerProfile,
  };
  const memoryPolicy = {
    rememberPreferences: true,
    proposeMemoryUpdates: true,
    neverStoreSecretsAsMemory: true,
    rememberEveryRunReceipt: true,
    rememberCorrectionsAsExamples: true,
    roleMemoryRules: coworkerRecipe.memoryRules,
    readScopes: operatingSpec.memoryPolicy.readScopes,
    writeCandidates: operatingSpec.memoryPolicy.writeCandidates,
    promoteLearnedRules: operatingSpec.memoryPolicy.promoteLearnedRules,
    ...(input.memoryPolicy ?? {}),
    coworkerOperatingProfile: coworkerProfile,
  };

  const { data: operator, error } = await admin
    .from("dobly_operators")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      name: input.name,
      kind: input.kind ?? coworkerRecipe.kind ?? defaultKind(`${input.name} ${input.mission}`),
      mission: input.mission,
      outcome: input.outcome ?? operatingSpec.operatorShape.outcomeStatement,
      scope: input.scope ?? operatingSpec.operatorShape.missionStatement,
      approval_mode: input.approvalMode ?? operatingSpec.autonomy.defaultApprovalMode,
      capability_tags: capabilityTags,
      connected_tool_ids: input.connectedToolIds ?? [],
      guardrails,
      memory_policy: memoryPolicy,
      metrics: {
        coworkerRecipeId: coworkerRecipe.id,
        coworkerFamily: coworkerRecipe.family,
        coworkerOffice: coworkerRecipe.office,
        coworkerDepartment: coworkerRecipe.department,
        abilityStack: coworkerRecipe.abilityStack,
        executionModes: coworkerProfile.executionModes,
        expectedOutputs: coworkerRecipe.outputs,
        qualityBar: coworkerRecipe.qualityBar,
        operatingArchetypeId: operatingSpec.archetypeId,
        operatingMode: operatingSpec.operatingMode,
        operatingPhases: operatingSpec.phases.map((phase) => phase.id),
        deliverables: operatingSpec.deliverables,
        watchSignals: operatingSpec.watchPolicy.signals,
      },
    })
    .select("*")
    .single();

  if (error || !operator) throw new Error(error?.message ?? "Failed to create Operator.");

  const qualityProfile = await ensureOperatorQualityProfile({
    userId: input.userId,
    operatorId: operator.id,
    workspaceId: input.workspaceId ?? null,
    operatorKind: String(operator.kind),
    mission: String(operator.mission),
    outcome: String(operator.outcome),
    selectedPresets: input.qualitySelections ?? null,
    customOverrides: input.qualityCustomizations ?? null,
  });
  const qualityContract = buildOperatorQualityContract({
    profile: qualityProfile.profile,
    prompt: input.mission,
  });

  const loops = defaultLoops({
    operatorName: input.name,
    mission: input.mission,
    loops: input.loops ?? [
      ...buildRecipeLoops(coworkerRecipe, input.name, input.mission),
      {
        name: `${input.name} mission loop`,
        cadence: operatingSpec.operatorShape.loopCadence,
        trigger: operatingSpec.watchPolicy.shouldKeepWatching
          ? `Watch for ${operatingSpec.watchPolicy.signals.join(", ") || "meaningful business signals"} and run when action is needed.`
          : "When a matching request, message, schedule, signal, or connected-tool event appears.",
        playbook: operatingSpec.phases.map((phase) => `${phase.label}: ${phase.purpose}`).join("\n"),
      },
    ],
  });
  const { error: loopError } = await admin.from("dobly_operator_loops").insert(
    loops.map((loop) => ({
      operator_id: operator.id,
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      ...loop,
    })),
  );
  if (loopError) throw new Error(loopError.message);

  await enqueueOutcomeContractGeneration({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    entityType: "operator",
    entityId: operator.id,
    name: String(operator.name),
    mission: String(operator.mission),
    outcome: String(operator.outcome),
    capabilityTags: capabilityTags,
    tools: input.connectedToolIds ?? [],
    guardrails: (operator as JsonRecord).guardrails as JsonRecord,
    approvalMode: String((operator as JsonRecord).approval_mode ?? "approve_risky"),
    standards: {
      operatorQualityContract: qualityContract,
      operatorQualityProfileId: qualityProfile.id,
    },
    minimumScore: 0.84,
  }).catch(() => undefined);

  return getDoblyOperator({ userId: input.userId, operatorId: operator.id });
}

export async function runDoblyOperator(input: {
  userId: string;
  operatorId: string;
  prompt: string;
  workspaceId?: string | null;
  loopId?: string | null;
  approved?: boolean;
  conversationId?: string | null;
  sourceMessageId?: string | null;
}) {
  const operator = await getDoblyOperator({ userId: input.userId, operatorId: input.operatorId });
  if (operator.status === "archived") throw new Error("This Operator is archived.");
  if (operator.status === "paused") throw new Error("This Operator is paused.");
  const entitlement = await checkUsageEntitlement({
    userId: input.userId,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    metric: "automation_runs",
  });
  if (!entitlement.allowed) {
    throw new Error(`${entitlement.reason ?? "Your plan has no run capacity left."} Upgrade or wait for the next billing window to run more Operator work.`);
  }

  const qualityProfile = await ensureOperatorQualityProfile({
    userId: input.userId,
    operatorId: operator.id,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    operatorKind: operator.kind,
    mission: operator.mission,
    outcome: operator.outcome,
  });
  const qualityContract = buildOperatorQualityContract({
    profile: qualityProfile.profile,
    prompt: input.prompt,
  });

  const outcomeContractState = await ensureOutcomeContract({
    userId: input.userId,
    entityType: "operator",
    entityId: operator.id,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    name: operator.name,
    mission: operator.mission,
    outcome: operator.outcome,
    prompt: input.prompt,
    capabilityTags: operator.capability_tags,
    tools: operator.connected_tool_ids,
    guardrails: operator.guardrails,
    approvalMode: operator.approval_mode,
    standards: {
      operatorQualityContract: qualityContract,
      operatorQualityProfileId: qualityProfile.id,
    },
    minimumScore: 0.84,
  });

  if (!outcomeContractState.contract.critique.passes) {
    throw new Error("Dobly paused this run because the Standard of Done is not sharp enough yet. Refresh the outcome contract before running this Operator live.");
  }

  const brain = await buildOperatorBrainTrace({
    userId: input.userId,
    operatorId: operator.id,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    prompt: input.prompt,
    persist: true,
    outcomeContract: outcomeContractState.contract,
  });

  const runtimeQualityContract = buildOperatorQualityContract({
    profile: qualityProfile.profile,
    prompt: input.prompt,
    intent: outcomeContractState.contract.intent,
  });

  const job = await enqueueRuntimeCommand({
    userId: input.userId,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    prompt: input.prompt,
    approved: input.approved ?? brain.autonomy.decision === "act",
    priority: operator.approval_mode === "trusted" ? 45 : 55,
    context: {
      operatorId: operator.id,
      operatorBrainTraceId: brain.id ?? null,
      operatorName: operator.name,
      operatorMission: operator.mission,
      operatorOutcome: operator.outcome,
      operatorApprovalMode: operator.approval_mode,
      operatorAutonomyDecision: brain.autonomy,
      operatorBrainPlan: brain.plan,
      operatorSelfCheck: brain.selfCheck,
      operatorMemoryReasoning: brain.memoryReasoning,
      operatorMissingInfo: brain.missingInfo,
      operatorRiskAssessment: brain.riskAssessment,
      operatorToolJudgment: brain.toolJudgment,
      operatorOutcomeTracking: brain.outcome,
      operatorIntelligenceReport: brain.intelligenceReport,
      operatorOutcomeContract: outcomeContractState.contract,
      operatorQualityProfileId: qualityProfile.id,
      operatorQualityProfile: qualityProfile.profile,
      operatorQualityContract: runtimeQualityContract,
      loopId: input.loopId ?? null,
      conversationId: input.conversationId ?? null,
      sourceMessageId: input.sourceMessageId ?? null,
      sourceSurface: input.conversationId ? "operator_chat" : "operator_run",
      capabilityTags: operator.capability_tags,
      guardrails: operator.guardrails,
    },
    intent: outcomeContractState.contract.intent as unknown as JsonRecord,
  });

  const admin = createAdminSupabaseClient();
  await admin.from("dobly_operators").update({ last_run_at: new Date().toISOString() }).eq("id", operator.id);
  await recordUsageEvent({
    userId: input.userId,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    metric: "automation_runs",
    source: "dobly_operator.run",
    metadata: { operatorId: operator.id, jobId: job.id, loopId: input.loopId ?? null },
  }).catch(() => undefined);
  if (input.loopId) {
    await admin.from("dobly_operator_loops").update({ last_run_at: new Date().toISOString() }).eq("id", input.loopId).eq("operator_id", operator.id);
  }

  return { operator, brain, job };
}
