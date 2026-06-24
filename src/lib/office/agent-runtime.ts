import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { buildAgentCognitionCycle, type RichContextItem } from "@/lib/agents/cognition";
import { buildMemorySearchText, normalizeMemoryTags, type BusinessMemoryItem } from "@/lib/business-memory";
import { executeOfficeTool, type OfficeToolExecutionResult } from "@/lib/office/tool-executor";
import { recordOfficeEvent } from "@/lib/office/events";
import type { OfficeEventRecord, OfficeRiskLevel, OfficeRuntimeKind } from "@/lib/office/types";

type JsonRecord = Record<string, unknown>;

type AgentRunState =
  | "queued"
  | "gathering_context"
  | "planning"
  | "validating"
  | "acting"
  | "evaluating"
  | "completed"
  | "escalated"
  | "failed";

type GoalStatus = "not_started" | "in_progress" | "resolved" | "blocked";
type PlannerActionType = "tool_call" | "outbound_message" | "record_update" | "escalation" | "complete";
type PlannerRiskLevel = OfficeRiskLevel;

interface OfficeWorkerRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  department_id: string;
  worker_key: string;
  name: string;
  runtime_kind: OfficeRuntimeKind;
  mission: string;
  autonomy_mode: string;
  required_tools: string[];
  permissions: JsonRecord;
  approval_policy: JsonRecord;
  memory_scope: JsonRecord;
  health_score: number;
  trust_score: number;
}

interface SourceRecordReference {
  kind: string;
  id: string;
}

interface PlannerOutput {
  understanding: string;
  goal_status: GoalStatus;
  missing_info: string[];
  relevant_facts: string[];
  proposed_action: {
    type: PlannerActionType;
    tool_name?: string | null;
    params?: JsonRecord;
    draft_message?: string | null;
    justification: string;
  };
  confidence: number;
  confidence_reason: string;
  risk_level: PlannerRiskLevel;
  needs_owner_approval: boolean;
}

interface ValidationResult {
  allowed: boolean;
  decision: "acted" | "escalated" | "prepared" | "blocked";
  reasons: string[];
  requiresOwnerApproval: boolean;
  duplicateRisk: boolean;
  conflictRisk: boolean;
  confidenceScore: number;
  actionLabel: string;
}

interface EvaluationResult {
  done: boolean;
  shouldEscalate: boolean;
  outcomeType: "resolved" | "escalated" | "failed" | "waiting" | "prepared";
  summary: string;
}

interface ContextPack {
  businessProfile: JsonRecord | null;
  sourceEvent: OfficeEventRecord | null;
  sourceRecord: JsonRecord | null;
  sourceRecordRef: SourceRecordReference | null;
  worker: OfficeWorkerRecord | null;
  memoryItems: BusinessMemoryItem[];
  recentObservations: JsonRecord[];
  recentEvents: OfficeEventRecord[];
  recentTasks: JsonRecord[];
  richContext: RichContextItem[];
  domainSummary: string[];
}

interface AgentLoopResult {
  summary: string;
  runtime: string;
  tool: OfficeToolExecutionResult;
  tool_name: string | null;
  completed_by: string;
  completed_at: string;
  agentRunId: string;
  contextPack: JsonRecord;
  plannerOutput: PlannerOutput;
  validationResult: ValidationResult;
  evaluationResult: EvaluationResult;
}

const SOURCE_RECORD_TABLES: Record<string, string> = {
  conversation: "communication_conversations",
  lead: "leads",
  support_case: "support_cases",
  finance_record: "finance_records",
  invoice: "invoices",
  operations_item: "operations_items",
  content_item: "content_items",
  customer: "customers",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toRichContextItem(title: string, summary: string, metadata?: JsonRecord): RichContextItem {
  return {
    kind: "record",
    title,
    summary,
    confidence: "medium",
    metadata,
  };
}

function cleanList(values: Array<string | null | undefined>) {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function riskBase(level: OfficeRiskLevel) {
  switch (level) {
    case "low":
      return 86;
    case "medium":
      return 74;
    case "high":
      return 58;
    case "critical":
      return 42;
    default:
      return 60;
  }
}

function buildSearchTerms(task: Record<string, any>) {
  return `${asText(task.title)} ${asText(task.summary)} ${asText(task.worker_key)} ${asText(task.department_id)}`
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((term) => term.length > 2);
}

function scoreMemory(item: BusinessMemoryItem, searchTerms: string[]) {
  const haystack = buildMemorySearchText(item);
  return searchTerms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function memoryPriorityBoost(item: BusinessMemoryItem, params: {
  task: Record<string, any>;
  worker: OfficeWorkerRecord | null;
}) {
  let boost = 0;
  const departmentId = String(params.worker?.department_id ?? params.task.department_id ?? "");
  const directive = item.tags.includes("board-directive") || item.metadata?.boardDirective === true;
  if (directive) boost += 8;
  if (item.scope === "global" || item.scope === "general_manager" || item.scope === "boardroom") boost += 2;
  if (item.scope === departmentId || String((item.metadata as JsonRecord)?.departmentId ?? "") === departmentId) boost += 4;
  if (item.kind === "policy" || item.kind === "sales_rule" || item.kind === "support_rule" || item.kind === "finance_rule" || item.kind === "escalation_rule") {
    boost += 3;
  }
  return boost;
}

async function maybeSingle(
  table: string,
  filters: Array<[string, unknown]>,
  select = "*",
): Promise<JsonRecord | null> {
  const admin = createAdminSupabaseClient();
  try {
    let query = admin.from(table).select(select);
    for (const [key, value] of filters) {
      query = query.eq(key, value);
    }
    const { data } = await query.maybeSingle();
    return (data as JsonRecord | null) ?? null;
  } catch {
    return null;
  }
}

async function maybeRows(
  table: string,
  configure?: (query: any) => any,
): Promise<JsonRecord[]> {
  const admin = createAdminSupabaseClient();
  try {
    let query = admin.from(table).select("*");
    if (configure) query = configure(query);
    const { data, error } = await query;
    if (error) return [];
    return (data as JsonRecord[]) ?? [];
  } catch {
    return [];
  }
}

function parseSourceRecord(task: Record<string, any>, sourceEvent: OfficeEventRecord | null): SourceRecordReference | null {
  const fromPayload = task.tool_payload?.sourceRecord;
  if (isRecord(fromPayload) && typeof fromPayload.kind === "string" && typeof fromPayload.id === "string") {
    return { kind: fromPayload.kind, id: fromPayload.id };
  }

  if (sourceEvent?.entityType && sourceEvent.entityId && SOURCE_RECORD_TABLES[sourceEvent.entityType]) {
    return { kind: sourceEvent.entityType, id: sourceEvent.entityId };
  }

  return null;
}

function buildDraftMessage(task: Record<string, any>, sourceRecord: JsonRecord | null) {
  const payload = isRecord(task.tool_payload) ? task.tool_payload : {};
  const existing = typeof payload.body === "string" ? payload.body.trim() : "";
  if (existing) return existing;

  const recipient =
    asText(sourceRecord?.contact_name) ||
    asText(sourceRecord?.full_name) ||
    asText(sourceRecord?.name) ||
    "there";
  const summary = asText(task.summary).replace(/\s+/g, " ").trim();
  const title = asText(task.title).replace(/\s+/g, " ").trim();

  return `Hi ${recipient}, Dobly is following up about "${title}". ${summary || "We wanted to keep this moving and make sure nothing is blocked."} Please reply here if you need anything from us.`;
}

function buildPlannerOutput(params: {
  task: Record<string, any>;
  context: ContextPack;
}): PlannerOutput {
  const { task, context } = params;
  const availableTools = cleanList([
    asText(task.tool_name) || null,
    ...(Array.isArray(context.worker?.required_tools) ? context.worker.required_tools.map(String) : []),
  ]);

  const cognition = buildAgentCognitionCycle({
    command: `${asText(task.title)}. ${asText(task.summary)}`.trim(),
    eventType: (context.sourceEvent?.eventType ?? "worker.action_proposed") as any,
    riskLevel: (task.risk_level ?? "medium") as OfficeRiskLevel,
    runtimeKind: (task.runtime_kind ?? "agent") as OfficeRuntimeKind,
    title: asText(task.title, "Office task"),
    source: context.sourceEvent?.source ?? "office.task",
    richContext: context.richContext,
    availableTools,
  });

  const relevantFacts = cleanList([
    context.businessProfile ? `Business: ${asText(context.businessProfile.business_name, "Unknown business")}.` : null,
    context.worker ? `Worker mission: ${context.worker.mission}.` : null,
    context.sourceRecordRef ? `Source record: ${context.sourceRecordRef.kind} ${context.sourceRecordRef.id}.` : null,
    ...context.domainSummary,
    ...context.memoryItems.slice(0, 3).map((item) => `${item.kind}: ${item.title}`),
  ]).slice(0, 8);

  const riskLevel = (task.risk_level ?? "medium") as OfficeRiskLevel;
  let confidence = riskBase(riskLevel);
  confidence -= cognition.observe.missingContext.length * 8;
  confidence += Math.min(12, context.memoryItems.length * 2);
  confidence += context.sourceRecord ? 6 : 0;
  confidence -= cognition.decision.mode === "ask_owner" ? 18 : 0;
  confidence -= cognition.decision.mode === "simulate_first" ? 10 : 0;
  confidence = clamp(confidence, 5, 98);

  const draftMessage =
    asText(task.tool_name) === "communication_reply" ? buildDraftMessage(task, context.sourceRecord) : null;

  const proposedAction: PlannerOutput["proposed_action"] =
    cognition.decision.mode === "ask_owner"
      ? {
          type: "escalation",
          tool_name: asText(task.tool_name) || null,
          params: isRecord(task.tool_payload) ? task.tool_payload : {},
          justification: cognition.decision.reason || "The autonomy gate says this needs the owner.",
        }
      : asText(task.tool_name) === "communication_reply"
        ? {
            type: "outbound_message",
            tool_name: "communication_reply",
            params: {
              ...(isRecord(task.tool_payload) ? task.tool_payload : {}),
              body: draftMessage,
            },
            draft_message: draftMessage,
            justification: cognition.plan.expectedOutput,
          }
        : {
            type: "tool_call",
            tool_name: asText(task.tool_name) || null,
            params: isRecord(task.tool_payload) ? task.tool_payload : {},
            justification: cognition.plan.expectedOutput,
          };

  return {
    understanding: cognition.understand.intent,
    goal_status: "in_progress",
    missing_info: cognition.observe.missingContext,
    relevant_facts: relevantFacts,
    proposed_action: proposedAction,
    confidence,
    confidence_reason:
      confidence >= 80
        ? "The request has enough context, the risk is limited, and Dobly has matching memory."
        : confidence >= 70
          ? "The request is reasonable to execute, but Dobly should stay inside guarded boundaries."
          : "The request is missing context, has higher risk, or sits beyond the current autonomy boundary.",
    risk_level: riskLevel,
    needs_owner_approval:
      Boolean(task.approval_required) ||
      cognition.decision.mode === "ask_owner" ||
      confidence < 70 ||
      riskLevel === "high" ||
      riskLevel === "critical",
  };
}

async function detectDuplicateRisk(task: Record<string, any>) {
  const executions = await maybeRows("external_action_executions", (query) =>
    query
      .eq("office_task_id", task.id)
      .in("status", ["completed", "prepared", "needs_connection"])
      .order("created_at", { ascending: false })
      .limit(1),
  );

  return executions.length > 0;
}

async function detectConflictRisk(task: Record<string, any>) {
  if (!task.source_event_id) return false;

  const siblingTasks = await maybeRows("office_tasks", (query) =>
    query
      .eq("source_event_id", task.source_event_id)
      .neq("id", task.id)
      .in("status", ["queued", "running", "waiting_approval"])
      .limit(10),
  );

  return siblingTasks.some((candidate) => String(candidate.department_id ?? "") !== String(task.department_id ?? ""));
}

function buildValidationResult(task: Record<string, any>, planner: PlannerOutput, duplicateRisk: boolean, conflictRisk: boolean): ValidationResult {
  const reasons: string[] = [];
  const financeBoundary =
    String(task.department_id ?? "").toLowerCase() === "finance" ||
    /finance|invoice|payment|receipt|reconciliation|cash|payout|mpesa|m-pesa|stripe|bank/i.test(
      `${String(task.worker_key ?? "")} ${String(task.tool_name ?? "")} ${String(task.title ?? "")} ${String(task.summary ?? "")}`,
    );
  const requiresOwnerApproval = planner.needs_owner_approval || financeBoundary;
  if (duplicateRisk) reasons.push("A prior execution exists for this task, so Dobly should avoid duplicate outward action.");
  if (conflictRisk) reasons.push("Another live office task is working on the same source event, so cross-office conflict is possible.");
  if (planner.confidence < 70) reasons.push("Confidence is below the live-action threshold.");
  if (financeBoundary) reasons.push("Finance stays human-approved: Dobly can prepare the action, but not execute it live.");
  if (requiresOwnerApproval) reasons.push("This task sits outside the current guarded autonomy boundary.");

  const blocked = duplicateRisk || conflictRisk || requiresOwnerApproval;

  return {
    allowed: !blocked,
    decision: duplicateRisk || conflictRisk ? "blocked" : requiresOwnerApproval ? "escalated" : "acted",
    reasons: reasons.length > 0 ? reasons : ["No policy conflicts detected."],
    requiresOwnerApproval,
    duplicateRisk,
    conflictRisk,
    confidenceScore: planner.confidence,
    actionLabel:
      planner.proposed_action.type === "outbound_message"
        ? "send outbound message"
        : planner.proposed_action.type === "tool_call"
          ? `execute ${planner.proposed_action.tool_name ?? "internal action"}`
          : planner.proposed_action.type,
  };
}

function buildEvaluationResult(result: OfficeToolExecutionResult, validation: ValidationResult, planner: PlannerOutput): EvaluationResult {
  if (!validation.allowed) {
    return {
      done: true,
      shouldEscalate: true,
      outcomeType: validation.duplicateRisk || validation.conflictRisk ? "prepared" : "escalated",
      summary: validation.reasons.join(" "),
    };
  }

  if (result.status === "failed") {
    return {
      done: true,
      shouldEscalate: planner.risk_level === "high" || planner.risk_level === "critical",
      outcomeType: "failed",
      summary: result.summary,
    };
  }

  if (result.status === "needs_connection" || result.status === "unsupported") {
    return {
      done: true,
      shouldEscalate: false,
      outcomeType: "prepared",
      summary: result.summary,
    };
  }

  return {
    done: true,
    shouldEscalate: false,
    outcomeType: "resolved",
    summary: result.summary,
  };
}

async function createEscalation(params: {
  userId: string;
  task: Record<string, any>;
  worker: OfficeWorkerRecord | null;
  runId: string;
  reason: string;
  planner: PlannerOutput;
  validation: ValidationResult;
  context: ContextPack;
}) {
  const admin = createAdminSupabaseClient();
  try {
    await admin.from("escalations").insert({
      user_id: params.userId,
      coworker_id: null,
      escalation_type: "uncertainty",
      reason: params.reason,
      context: {
        officeTaskId: params.task.id,
        officeAgentRunId: params.runId,
        taskTitle: params.task.title,
        planner: params.planner,
        validation: params.validation,
        sourceRecord: params.context.sourceRecordRef,
      },
      trust_level_at_time: params.worker?.trust_score ?? null,
      autonomy_level: params.worker?.autonomy_mode ?? null,
      status: "pending",
    });
  } catch {
    // Escalations are best-effort because some environments may not have this table.
  }

  await recordOfficeEvent({
    workspaceId: params.task.workspace_id ?? null,
    userId: params.userId,
    departmentId: params.task.department_id ?? "general_manager",
    workerKind: params.task.runtime_kind ?? "agent",
    eventType: "worker.action_proposed",
    source: "office.agent_runtime",
    entityType: "office_agent_run",
    entityId: params.runId,
    title: `Escalation prepared: ${asText(params.task.title, "Office task")}`,
    summary: params.reason,
    payload: {
      officeTaskId: params.task.id,
      planner: params.planner,
      validation: params.validation,
    },
    riskLevel: params.task.risk_level ?? "medium",
  }).catch(() => undefined);
}

async function createObservation(params: {
  task: Record<string, any>;
  runId: string;
  category: string;
  observation: string;
  confidence: number;
  metadata?: JsonRecord;
}) {
  const admin = createAdminSupabaseClient();
  await admin.from("office_business_observations").insert({
    workspace_id: params.task.workspace_id ?? null,
    user_id: params.task.user_id,
    run_id: params.runId,
    office_task_id: params.task.id,
    category: params.category,
    observation: params.observation,
    confidence: clamp(params.confidence, 0, 100),
    metadata: params.metadata ?? {},
  }).catch(() => undefined);
}

async function logStep(params: {
  runId: string;
  taskId: string;
  userId: string;
  stepNumber: number;
  stage: "context" | "plan" | "validate" | "act" | "evaluate" | "learn" | "escalate";
  stepType: "observation" | "reasoning" | "decision" | "tool_call" | "tool_result" | "summary" | "system";
  summary: string;
  input?: JsonRecord;
  output?: JsonRecord;
}) {
  const admin = createAdminSupabaseClient();
  await admin.from("office_agent_steps").insert({
    run_id: params.runId,
    office_task_id: params.taskId,
    user_id: params.userId,
    step_number: params.stepNumber,
    stage: params.stage,
    step_type: params.stepType,
    summary: params.summary,
    input: params.input ?? {},
    output: params.output ?? {},
  }).catch(() => undefined);
}

async function updateRun(runId: string, patch: JsonRecord) {
  const admin = createAdminSupabaseClient();
  await admin.from("office_agent_runs").update(patch).eq("id", runId);
}

async function buildContextPack(task: Record<string, any>): Promise<ContextPack> {
  const [sourceEventRow, workerRow, businessProfile, recentEventRows, recentTaskRows, observationRows, memoryRows] = await Promise.all([
    task.source_event_id ? maybeSingle("office_events", [["id", task.source_event_id]]) : Promise.resolve(null),
    maybeRows("office_workers", (query) => {
      let configured = query
        .eq("user_id", task.user_id)
        .eq("worker_key", task.worker_key)
        .limit(1);
      if (task.workspace_id) configured = configured.eq("workspace_id", task.workspace_id);
      return configured;
    }).then((rows) => rows[0] ?? null),
    maybeSingle("business_profiles", [["user_id", task.user_id]]),
    maybeRows("office_events", (query) =>
      query.eq("user_id", task.user_id).order("occurred_at", { ascending: false }).limit(8),
    ),
    maybeRows("office_tasks", (query) =>
      query.eq("user_id", task.user_id).order("created_at", { ascending: false }).limit(8),
    ),
    maybeRows("office_business_observations", (query) =>
      query.eq("user_id", task.user_id).order("updated_at", { ascending: false }).limit(10),
    ),
    maybeRows("business_memory_items", (query) =>
      query.eq("user_id", task.user_id).order("updated_at", { ascending: false }).limit(30),
    ),
  ]);

  const sourceEvent = sourceEventRow
    ? ({
        id: String(sourceEventRow.id),
        userId: String(sourceEventRow.user_id),
        workspaceId: sourceEventRow.workspace_id ? String(sourceEventRow.workspace_id) : null,
        departmentId: sourceEventRow.department_id ? String(sourceEventRow.department_id) as any : null,
        workerId: sourceEventRow.worker_id ? String(sourceEventRow.worker_id) : null,
        workerKind: String(sourceEventRow.worker_kind ?? "system") as any,
        eventType: String(sourceEventRow.event_type) as any,
        source: String(sourceEventRow.source),
        entityType: sourceEventRow.entity_type ? String(sourceEventRow.entity_type) : null,
        entityId: sourceEventRow.entity_id ? String(sourceEventRow.entity_id) : null,
        title: String(sourceEventRow.title ?? "Office event"),
        summary: sourceEventRow.summary ? String(sourceEventRow.summary) : null,
        payload: isRecord(sourceEventRow.payload) ? sourceEventRow.payload : {},
        riskLevel: String(sourceEventRow.risk_level ?? "medium") as any,
        occurredAt: String(sourceEventRow.occurred_at ?? new Date().toISOString()),
        createdAt: String(sourceEventRow.created_at ?? new Date().toISOString()),
      } satisfies OfficeEventRecord)
    : null;

  const worker = workerRow
    ? ({
        id: String(workerRow.id),
        user_id: String(workerRow.user_id),
        workspace_id: workerRow.workspace_id ? String(workerRow.workspace_id) : null,
        department_id: String(workerRow.department_id ?? "general_manager"),
        worker_key: String(workerRow.worker_key ?? task.worker_key ?? "worker"),
        name: String(workerRow.name ?? "Office worker"),
        runtime_kind: String(workerRow.runtime_kind ?? task.runtime_kind ?? "agent") as OfficeRuntimeKind,
        mission: String(workerRow.mission ?? task.summary ?? ""),
        autonomy_mode: String(workerRow.autonomy_mode ?? "guarded"),
        required_tools: Array.isArray(workerRow.required_tools) ? workerRow.required_tools.map(String) : [],
        permissions: isRecord(workerRow.permissions) ? workerRow.permissions : {},
        approval_policy: isRecord(workerRow.approval_policy) ? workerRow.approval_policy : {},
        memory_scope: isRecord(workerRow.memory_scope) ? workerRow.memory_scope : {},
        health_score: Number(workerRow.health_score ?? 0.5),
        trust_score: Number(workerRow.trust_score ?? 0.5),
      } satisfies OfficeWorkerRecord)
    : null;

  const sourceRecordRef = parseSourceRecord(task, sourceEvent);
  const sourceRecord = sourceRecordRef
    ? await maybeSingle(SOURCE_RECORD_TABLES[sourceRecordRef.kind], [["id", sourceRecordRef.id]])
    : null;

  const searchTerms = buildSearchTerms(task);
  const memoryItems = (memoryRows as unknown as JsonRecord[])
    .map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      workspace_id: row.workspace_id ? String(row.workspace_id) : null,
      kind: String(row.kind) as BusinessMemoryItem["kind"],
      scope: String(row.scope ?? "global") as BusinessMemoryItem["scope"],
      title: String(row.title ?? "Memory"),
      body: String(row.body ?? ""),
      tags: normalizeMemoryTags(row.tags),
      source: String(row.source ?? "unknown"),
      confidence: Number(row.confidence ?? 0.5),
      metadata: isRecord(row.metadata) ? row.metadata : {},
      created_at: String(row.created_at ?? new Date().toISOString()),
      updated_at: String(row.updated_at ?? new Date().toISOString()),
    }))
    .sort((a, b) => {
      const scoreA = scoreMemory(a, searchTerms) + memoryPriorityBoost(a, { task, worker });
      const scoreB = scoreMemory(b, searchTerms) + memoryPriorityBoost(b, { task, worker });
      return scoreB - scoreA;
    })
    .slice(0, 5);

  const recentObservations = observationRows.slice(0, 5);
  const recentEvents = recentEventRows
    .slice(0, 5)
    .map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      workspaceId: row.workspace_id ? String(row.workspace_id) : null,
      departmentId: row.department_id ? String(row.department_id) as any : null,
      workerId: row.worker_id ? String(row.worker_id) : null,
      workerKind: String(row.worker_kind ?? "system") as any,
      eventType: String(row.event_type) as any,
      source: String(row.source ?? "office"),
      entityType: row.entity_type ? String(row.entity_type) : null,
      entityId: row.entity_id ? String(row.entity_id) : null,
      title: String(row.title ?? "Office event"),
      summary: row.summary ? String(row.summary) : null,
      payload: isRecord(row.payload) ? row.payload : {},
      riskLevel: String(row.risk_level ?? "medium") as any,
      occurredAt: String(row.occurred_at ?? new Date().toISOString()),
      createdAt: String(row.created_at ?? new Date().toISOString()),
    }));

  const domainSummary = cleanList([
    sourceEvent?.summary ?? null,
    sourceRecord ? JSON.stringify(sourceRecord).slice(0, 220) : null,
    recentObservations[0] ? String(recentObservations[0].observation ?? "") : null,
  ]);

  const richContext: RichContextItem[] = [
    ...(businessProfile
      ? [
          {
            kind: "record",
            title: asText(businessProfile.business_name, "Business profile"),
            summary: cleanList([
              asText(businessProfile.description) || null,
              asText(businessProfile.context_summary) || null,
              asText(businessProfile.brand_voice) ? `Voice: ${asText(businessProfile.brand_voice)}` : null,
            ]).join(" "),
            confidence: "high",
            metadata: businessProfile,
          } satisfies RichContextItem,
        ]
      : []),
    ...(sourceEvent ? [toRichContextItem(sourceEvent.title, sourceEvent.summary ?? sourceEvent.source, sourceEvent.payload)] : []),
    ...(sourceRecord ? [toRichContextItem(`${sourceRecordRef?.kind ?? "record"} ${sourceRecordRef?.id ?? ""}`.trim(), JSON.stringify(sourceRecord).slice(0, 240), sourceRecord)] : []),
    ...memoryItems.map((item) => ({
      kind: "memory",
      title: item.title,
      summary: item.body.slice(0, 200),
      confidence: item.confidence >= 0.8 ? "high" : item.confidence >= 0.5 ? "medium" : "low",
      metadata: item.metadata,
      source: item.source,
    }) satisfies RichContextItem),
    ...recentObservations.map((row) => ({
      kind: "memory",
      title: String(row.category ?? "Observation"),
      summary: String(row.observation ?? ""),
      confidence: Number(row.confidence ?? 50) >= 80 ? "high" : Number(row.confidence ?? 50) >= 60 ? "medium" : "low",
      metadata: isRecord(row.metadata) ? row.metadata : {},
      source: String(row.source ?? "office_agent"),
    }) satisfies RichContextItem),
  ].slice(0, 10);

  return {
    businessProfile,
    sourceEvent,
    sourceRecord,
    sourceRecordRef,
    worker,
    memoryItems,
    recentObservations,
    recentEvents,
    recentTasks: recentTaskRows.slice(0, 5),
    richContext,
    domainSummary,
  };
}

export async function runOfficeTaskAgentLoop(params: {
  userId: string;
  taskId: string;
  task: Record<string, any>;
}): Promise<AgentLoopResult> {
  const { userId, taskId, task } = params;
  const admin = createAdminSupabaseClient();

  const { data: createdRun, error: runError } = await admin
    .from("office_agent_runs")
    .insert({
      workspace_id: task.workspace_id ?? null,
      user_id: userId,
      office_task_id: taskId,
      goal: `${asText(task.title)} ${asText(task.summary)}`.trim(),
      runtime_kind: task.runtime_kind ?? "agent",
      risk_level: task.risk_level ?? "medium",
      state: "queued",
      goal_status: "not_started",
      model_used: "dobly-guarded-runtime-v1",
    })
    .select("*")
    .single();

  if (runError || !createdRun) {
    throw new Error(`Failed to create office agent run: ${runError?.message ?? "unknown error"}`);
  }

  const runId = String(createdRun.id);
  await admin.from("office_tasks").update({ agent_run_id: runId }).eq("id", taskId);

  await updateRun(runId, { state: "gathering_context", goal_status: "in_progress", iterations: 1 });
  const contextPack = await buildContextPack(task);
  await logStep({
    runId,
    taskId,
    userId,
    stepNumber: 1,
    stage: "context",
    stepType: "observation",
    summary: "Dobly gathered business context, memory, source records, and recent office activity.",
    output: {
      memoryCount: contextPack.memoryItems.length,
      recentObservationCount: contextPack.recentObservations.length,
      hasSourceRecord: Boolean(contextPack.sourceRecordRef),
      hasBusinessProfile: Boolean(contextPack.businessProfile),
    },
  });

  await updateRun(runId, {
    state: "planning",
    context_pack: {
      sourceRecord: contextPack.sourceRecordRef,
      domainSummary: contextPack.domainSummary,
      recentEvents: contextPack.recentEvents.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        title: event.title,
      })),
      memoryItems: contextPack.memoryItems.map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
      })),
    },
    memory_summary: {
      items: contextPack.memoryItems.map((item) => item.title),
      observations: contextPack.recentObservations.map((item) => String(item.observation ?? "")),
    },
  });

  const plannerOutput = buildPlannerOutput({ task, context: contextPack });
  await logStep({
    runId,
    taskId,
    userId,
    stepNumber: 2,
    stage: "plan",
    stepType: "reasoning",
    summary: "Dobly produced a structured plan and picked the safest next action.",
    output: plannerOutput as unknown as JsonRecord,
  });

  await updateRun(runId, {
    state: "validating",
    planner_output: plannerOutput as unknown as JsonRecord,
    reasoning_summary: plannerOutput.understanding,
    confidence_score: plannerOutput.confidence,
  });

  const [duplicateRisk, conflictRisk] = await Promise.all([
    detectDuplicateRisk(task),
    detectConflictRisk(task),
  ]);
  const validationResult = buildValidationResult(task, plannerOutput, duplicateRisk, conflictRisk);
  await logStep({
    runId,
    taskId,
    userId,
    stepNumber: 3,
    stage: "validate",
    stepType: "decision",
    summary: validationResult.allowed
      ? "Dobly validated the action against confidence and conflict gates."
      : "Dobly blocked live execution and prepared an escalation or safe hold.",
    output: validationResult as unknown as JsonRecord,
  });

  await updateRun(runId, {
    state: validationResult.allowed ? "acting" : "escalated",
    validation_result: validationResult as unknown as JsonRecord,
  });

  await admin.from("office_agent_confidence_log").insert({
    run_id: runId,
    office_task_id: taskId,
    user_id: userId,
    action_proposed: validationResult.actionLabel,
    confidence_score: plannerOutput.confidence,
    confidence_reason: plannerOutput.confidence_reason,
    decision: validationResult.decision,
  }).catch(() => undefined);

  if (!validationResult.allowed) {
    const escalationReason = validationResult.reasons.join(" ");
    await createEscalation({
      userId,
      task,
      worker: contextPack.worker,
      runId,
      reason: escalationReason,
      planner: plannerOutput,
      validation: validationResult,
      context: contextPack,
    });
    await createObservation({
      task,
      runId,
      category: "autonomy_boundary",
      observation: `Dobly held "${asText(task.title)}" because ${escalationReason}`,
      confidence: plannerOutput.confidence,
      metadata: {
        sourceRecord: contextPack.sourceRecordRef,
        action: validationResult.actionLabel,
      },
    });

    const evaluationResult: EvaluationResult = {
      done: true,
      shouldEscalate: true,
      outcomeType: validationResult.duplicateRisk || validationResult.conflictRisk ? "prepared" : "escalated",
      summary: escalationReason,
    };

    await updateRun(runId, {
      state: "completed",
      outcome_type: evaluationResult.outcomeType,
      evaluation_result: evaluationResult as unknown as JsonRecord,
      execution_result: {
        summary: escalationReason,
        toolStatus: "completed",
      },
      completed_at: new Date().toISOString(),
      goal_status: "blocked",
    });

    return {
      summary: escalationReason,
      runtime: String(task.runtime_kind ?? "agent"),
      tool: {
        status: "completed",
        summary: escalationReason,
        output: {
          escalated: true,
          validation: validationResult,
        },
      },
      tool_name: plannerOutput.proposed_action.tool_name ?? (asText(task.tool_name) || null),
      completed_by: "office.agent_runtime",
      completed_at: new Date().toISOString(),
      agentRunId: runId,
      contextPack: {
        sourceRecord: contextPack.sourceRecordRef,
        memoryCount: contextPack.memoryItems.length,
      },
      plannerOutput,
      validationResult,
      evaluationResult,
    };
  }

  const toolPayload = {
    ...(isRecord(plannerOutput.proposed_action.params) ? plannerOutput.proposed_action.params : {}),
    sourceRecord: contextPack.sourceRecordRef ?? undefined,
    agentRuntime: {
      officeAgentRunId: runId,
      confidence: plannerOutput.confidence,
      relevantFacts: plannerOutput.relevant_facts,
      understanding: plannerOutput.understanding,
    },
  };

  await logStep({
    runId,
    taskId,
    userId,
    stepNumber: 4,
    stage: "act",
    stepType: "tool_call",
    summary: `Dobly executed ${plannerOutput.proposed_action.tool_name ?? "the internal action"} inside the guarded runtime.`,
    input: {
      toolName: plannerOutput.proposed_action.tool_name ?? null,
      payloadKeys: Object.keys(toolPayload),
    },
  });

  const toolResult = await executeOfficeTool({
    userId,
    workspaceId: task.workspace_id ?? null,
    taskId,
    toolName: plannerOutput.proposed_action.tool_name ?? (asText(task.tool_name) || null),
    toolPayload,
  });

  await logStep({
    runId,
    taskId,
    userId,
    stepNumber: 5,
    stage: "act",
    stepType: "tool_result",
    summary: toolResult.summary,
    output: {
      status: toolResult.status,
      output: toolResult.output,
    },
  });

  await updateRun(runId, {
    state: "evaluating",
    execution_result: {
      toolStatus: toolResult.status,
      summary: toolResult.summary,
      output: toolResult.output,
    },
  });

  const evaluationResult = buildEvaluationResult(toolResult, validationResult, plannerOutput);
  await logStep({
    runId,
    taskId,
    userId,
    stepNumber: 6,
    stage: "evaluate",
    stepType: "summary",
    summary: evaluationResult.summary,
    output: evaluationResult as unknown as JsonRecord,
  });

  if (evaluationResult.shouldEscalate) {
    await createEscalation({
      userId,
      task,
      worker: contextPack.worker,
      runId,
      reason: evaluationResult.summary,
      planner: plannerOutput,
      validation: validationResult,
      context: contextPack,
    });
  }

  await createObservation({
    task,
    runId,
    category: evaluationResult.outcomeType === "resolved" ? "successful_pattern" : "execution_learning",
    observation:
      evaluationResult.outcomeType === "resolved"
        ? `Dobly handled "${asText(task.title)}" successfully with ${plannerOutput.confidence}% confidence.`
        : `Dobly learned from "${asText(task.title)}": ${evaluationResult.summary}`,
    confidence: plannerOutput.confidence,
    metadata: {
      sourceRecord: contextPack.sourceRecordRef,
      toolStatus: toolResult.status,
      action: validationResult.actionLabel,
    },
  });

  await updateRun(runId, {
    state: "completed",
    outcome_type: evaluationResult.outcomeType,
    evaluation_result: evaluationResult as unknown as JsonRecord,
    completed_at: new Date().toISOString(),
    goal_status: evaluationResult.outcomeType === "resolved" ? "resolved" : evaluationResult.outcomeType === "failed" ? "blocked" : "in_progress",
  });

  return {
    summary:
      toolResult.status === "completed"
        ? `${asText(task.title)} was handled through the new planner/validator/executor loop and logged for future learning.`
        : toolResult.summary,
    runtime: String(task.runtime_kind ?? "agent"),
    tool: toolResult,
    tool_name: plannerOutput.proposed_action.tool_name ?? (asText(task.tool_name) || null),
    completed_by: "office.agent_runtime",
    completed_at: new Date().toISOString(),
    agentRunId: runId,
    contextPack: {
      sourceRecord: contextPack.sourceRecordRef,
      memoryCount: contextPack.memoryItems.length,
      recentObservationCount: contextPack.recentObservations.length,
    },
    plannerOutput,
    validationResult,
    evaluationResult,
  };
}
