import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";
import { appendOperatorChatMessage, ensureOperatorConversation, recordOperatorChatEvent } from "@/lib/operator-chat";
import {
  inferImplicitHandoffBranches,
  inferImplicitHandoffRoute,
  nextHandoffDepartment,
} from "@/lib/office/coordination-logic";
import { OFFICE_WORKER_TEMPLATES } from "@/lib/office/departments";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { recordOfficeEvent } from "@/lib/office/events";
import type { DepartmentRecordKind } from "@/lib/department-records";
import type { OfficeDepartmentId, OfficeRiskLevel, OfficeWorkerKind } from "@/lib/office/types";
import type { OfficeToolExecutionResult } from "@/lib/office/tool-executor";

interface SourceRecordRef {
  kind: DepartmentRecordKind;
  id: string;
}

interface SourceRecordOutcomeInput {
  userId: string;
  workspaceId?: string | null;
  taskId: string;
  taskTitle: string;
  task: Record<string, any>;
  result: {
    summary: string;
    tool: OfficeToolExecutionResult;
  };
}

const RECORD_TABLES: Record<DepartmentRecordKind, string> = {
  conversation: "communication_conversations",
  lead: "leads",
  support_case: "support_cases",
  finance_record: "finance_records",
  invoice: "invoices",
  operations_item: "operations_items",
  content_item: "content_items",
  engineering_item: "action_candidates",
  customer: "customers",
};

function asSourceRecord(value: unknown): SourceRecordRef | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const kind = String(record.kind ?? "") as DepartmentRecordKind;
  const id = String(record.id ?? "");
  if (!kind || !id || !(kind in RECORD_TABLES)) return null;
  return { kind, id };
}

function appendText(existing: unknown, addition: string, limit = 2400) {
  const base = typeof existing === "string" ? existing.trim() : "";
  return [base, addition].filter(Boolean).join("\n").slice(0, limit);
}

function outcomeLine(input: SourceRecordOutcomeInput) {
  const toolStatus = input.result.tool.status.replaceAll("_", " ");
  return `[${new Date().toISOString()}] ${input.taskTitle}: ${input.result.summary} Tool status: ${toolStatus}.`;
}

function nextStatusForRecord(kind: DepartmentRecordKind, toolStatus: OfficeToolExecutionResult["status"]) {
  const sent = toolStatus === "completed";
  const needsConnection = toolStatus === "needs_connection" || toolStatus === "unsupported";

  if (kind === "lead") return sent ? "contacted" : "new";
  if (kind === "support_case") return sent ? "waiting_customer" : "waiting_internal";
  if (kind === "finance_record") return sent ? "queued_followup" : needsConnection ? "needs_review" : "needs_review";
  if (kind === "operations_item") return sent ? "done" : "blocked";
  if (kind === "conversation") return sent ? "waiting_customer" : "waiting_owner";
  if (kind === "content_item") return sent ? "needs_review" : "failed";
  if (kind === "engineering_item") return sent ? "approved" : needsConnection ? "open" : "open";
  return null;
}

async function loadExisting(table: string, id: string) {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from(table).select("*").eq("id", id).maybeSingle();
  return (data ?? null) as Record<string, any> | null;
}

function buildRecordUpdate(params: {
  kind: DepartmentRecordKind;
  existing: Record<string, any> | null;
  input: SourceRecordOutcomeInput;
}) {
  const now = new Date().toISOString();
  const line = outcomeLine(params.input);
  const nextStatus = nextStatusForRecord(params.kind, params.input.result.tool.status);
  const common = { updated_at: now };

  if (params.kind === "lead") {
    return {
      ...common,
      ...(nextStatus ? { status: nextStatus } : {}),
      owner_notes: appendText(params.existing?.owner_notes, line),
    };
  }

  if (params.kind === "support_case") {
    return {
      ...common,
      ...(nextStatus ? { status: nextStatus } : {}),
      next_action:
        params.input.result.tool.status === "completed"
          ? "Wait for the customer response, then resolve or escalate."
          : "Connection or execution issue. Review before contacting the customer.",
      resolution_summary: appendText(params.existing?.resolution_summary, line),
    };
  }

  if (params.kind === "finance_record") {
    return {
      ...common,
      ...(nextStatus ? { status: nextStatus } : {}),
      next_action:
        params.input.result.tool.status === "completed"
          ? "Watch for payment confirmation or reference."
          : "Fix connection/context before retrying finance follow-up.",
      summary: appendText(params.existing?.summary, line, 3200),
    };
  }

  if (params.kind === "invoice") {
    return {
      ...common,
      notes: appendText(params.existing?.notes, line),
    };
  }

  if (params.kind === "operations_item") {
    return {
      ...common,
      ...(nextStatus ? { status: nextStatus } : {}),
      next_action:
        params.input.result.tool.status === "completed"
          ? "Confirm the operational handoff is complete."
          : "Review blocker and retry coordination.",
      summary: appendText(params.existing?.summary, line, 3200),
    };
  }

  if (params.kind === "conversation") {
    return {
      ...common,
      ...(nextStatus ? { status: nextStatus } : {}),
      summary: appendText(params.existing?.summary, line, 3200),
      last_message_at: now,
    };
  }

  if (params.kind === "content_item") {
    return {
      ...common,
      ...(nextStatus ? { status: nextStatus } : {}),
      metadata: {
        ...(params.existing?.metadata ?? {}),
        last_dobly_action: {
          taskId: params.input.taskId,
          status: params.input.result.tool.status,
          summary: params.input.result.summary,
          at: now,
        },
      },
    };
  }

  if (params.kind === "engineering_item") {
    return {
      ...common,
      ...(nextStatus ? { status: nextStatus } : {}),
      summary: appendText(params.existing?.summary, line, 3200),
    };
  }

  if (params.kind === "customer") {
    return {
      ...common,
      relationship_summary: appendText(params.existing?.relationship_summary, line),
      last_seen_at: now,
    };
  }

  return common;
}

type HandoffAssignee = {
  departmentId: OfficeDepartmentId;
  workerKey: string;
  workerId: string | null;
  workerName: string;
  runtimeKind: OfficeWorkerKind | "system";
};

const DEPARTMENT_KEYWORDS: Record<OfficeDepartmentId, string[]> = {
  reception: ["reception", "chatbot", "website", "inbox", "message", "visitor", "front desk"],
  marketing: ["marketing", "content", "campaign", "social", "creative", "animation", "ad"],
  creative: ["creative", "design", "deck", "slide", "video", "asset", "brand", "canva", "figma"],
  sales: ["sales", "lead", "pipeline", "proposal", "follow-up", "follow up"],
  finance: ["finance", "invoice", "payment", "cash", "collections", "reconciliation"],
  support: ["support", "customer", "ticket", "complaint", "recovery"],
  engineering: ["engineering", "product", "github", "bug", "release", "qa", "issue", "code"],
  operations: ["operations", "supplier", "fulfillment", "delivery", "inventory", "coordination"],
  admin: ["admin", "calendar", "reminder", "booking", "assistant"],
  projects: ["project", "deliverable", "handoff", "dependency"],
  hr: ["hr", "people", "onboarding", "leave"],
  growth: ["growth", "experiment", "partnership", "opportunity"],
  analytics: ["analytics", "briefing", "anomaly", "signal", "research"],
  compliance: ["compliance", "policy", "risk", "audit", "consent"],
  integrations: ["integration", "webhook", "api", "connection"],
  training_room: ["training", "knowledge", "memory"],
  filing_cabinet: ["filing", "records", "memory"],
  general_manager: ["general manager", "gm", "coordination", "cross-department"],
  boardroom: ["board", "strategy", "executive", "decision"],
};

function asDepartmentId(value: unknown): OfficeDepartmentId | null {
  return typeof value === "string" && value.trim().length > 0 ? (value.trim() as OfficeDepartmentId) : null;
}

async function pickAssignee(params: { userId: string; workspaceId?: string | null; departmentId: OfficeDepartmentId }) {
  const admin = createAdminSupabaseClient();
  const { data: liveWorker } = await admin
    .from("office_workers")
    .select("id, worker_key, name, runtime_kind, status")
    .eq("user_id", params.userId)
    .eq("department_id", params.departmentId)
    .in("status", ["active", "shadow"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
    .catch(() => ({ data: null }));

  if (liveWorker) {
    return {
      departmentId: params.departmentId,
      workerKey: String((liveWorker as any).worker_key ?? "worker"),
      workerId: String((liveWorker as any).id ?? ""),
      workerName: String((liveWorker as any).name ?? "Coworker"),
      runtimeKind: String((liveWorker as any).runtime_kind ?? "agent") as OfficeWorkerKind,
    } satisfies HandoffAssignee;
  }

  const template = OFFICE_WORKER_TEMPLATES.find((worker) => worker.departmentId === params.departmentId);
  if (!template) return null;

  return {
    departmentId: params.departmentId,
    workerKey: template.key,
    workerId: null,
    workerName: template.name,
    runtimeKind: template.kind,
  } satisfies HandoffAssignee;
}

function operatorMatchesDepartment(operator: OperatorWithLoops, departmentId: OfficeDepartmentId) {
  const haystack = [
    operator.name,
    operator.kind,
    operator.mission,
    operator.outcome,
    ...(operator.capability_tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return (DEPARTMENT_KEYWORDS[departmentId] ?? []).some((keyword) => haystack.includes(keyword));
}

async function notifyDownstreamOperator(params: {
  userId: string;
  workspaceId?: string | null;
  assignee: HandoffAssignee;
  currentTask: Record<string, any>;
  nextTaskId: string;
  summary: string;
  handoff: Record<string, unknown>;
}) {
  const operators = await listDoblyOperators({
    userId: params.userId,
    workspaceId: params.workspaceId ?? null,
  }).catch((): OperatorWithLoops[] => []);
  const operator =
    operators.find((candidate) => candidate.status === "active" && operatorMatchesDepartment(candidate, params.assignee.departmentId)) ??
    operators.find((candidate) => operatorMatchesDepartment(candidate, params.assignee.departmentId));
  if (!operator) return false;

  const conversation = await ensureOperatorConversation({
    userId: params.userId,
    operatorId: operator.id,
    workspaceId: params.workspaceId ?? operator.workspace_id,
    title: `${operator.name} Chat`,
  });

  await appendOperatorChatMessage({
    conversationId: conversation.id,
    userId: params.userId,
    workspaceId: params.workspaceId ?? operator.workspace_id,
    operatorId: operator.id,
    role: "system",
    intent: "system",
    body: `A downstream handoff just arrived from ${String(params.currentTask.department_id ?? "another department").replaceAll("_", " ")}. ${params.summary}`,
    metadata: {
      source: "office.handoff_runtime",
      officeTaskId: params.nextTaskId,
      handoff: params.handoff,
    },
  }).catch(() => undefined);

  await recordOperatorChatEvent({
    conversationId: conversation.id,
    userId: params.userId,
    workspaceId: params.workspaceId ?? operator.workspace_id,
    operatorId: operator.id,
    eventType: "handoff_received",
    title: "Downstream handoff received",
    summary: params.summary,
    severity: "info",
    payload: {
      officeTaskId: params.nextTaskId,
      handoff: params.handoff,
    },
  }).catch(() => undefined);

  return true;
}

async function createDownstreamHandoffTask(input: {
  userId: string;
  workspaceId?: string | null;
  currentTask: Record<string, any>;
  result: SourceRecordOutcomeInput["result"];
  sourceRecord: SourceRecordRef | null;
  branchLabel?: string | null;
  branchRoute?: OfficeDepartmentId[] | null;
}) {
  const currentDepartmentId = asDepartmentId(input.currentTask.department_id);
  if (!currentDepartmentId) return null;

  const toolPayload =
    input.currentTask.tool_payload && typeof input.currentTask.tool_payload === "object"
      ? (input.currentTask.tool_payload as Record<string, any>)
      : {};
  const existingCoordination =
    toolPayload.coordination && typeof toolPayload.coordination === "object"
      ? (toolPayload.coordination as Record<string, unknown>)
      : {};

  const routed = nextHandoffDepartment({
    route: input.branchRoute ?? existingCoordination.route ?? existingCoordination.departmentIds,
    currentDepartmentId,
    currentIndex: existingCoordination.currentIndex,
  });
  const implicitRoute =
    !input.branchRoute && routed.route.length === 0
      ? inferImplicitHandoffRoute({
          currentDepartmentId,
          sourceRecordKind: input.sourceRecord?.kind ?? null,
        })
      : [];
  const fallback = nextHandoffDepartment({
    route: implicitRoute,
    currentDepartmentId,
  });
  const route = routed.route.length ? routed.route : fallback.route;
  const nextDepartmentId = routed.nextDepartmentId ?? fallback.nextDepartmentId;
  const nextIndex = routed.nextDepartmentId ? routed.currentIndex + 1 : fallback.currentIndex + 1;
  if (!nextDepartmentId) return null;

  const assignee = await pickAssignee({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    departmentId: nextDepartmentId,
  });
  if (!assignee) return null;

  const stageId = `${String(existingCoordination.id ?? input.currentTask.id)}:${nextDepartmentId}:${nextIndex}`;
  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin
    .from("office_tasks")
    .select("id")
    .eq("user_id", input.userId)
    .contains("tool_payload", { stageId })
    .in("status", ["queued", "running", "waiting_approval"])
    .limit(1)
    .maybeSingle()
    .catch(() => ({ data: null }));
  if (existing?.id) return null;

  const handoff = {
    fromDepartment: currentDepartmentId,
    toDepartment: nextDepartmentId,
    assignedWorkerId: assignee.workerId,
    assignedWorkerName: assignee.workerName,
    route,
    stageIndex: nextIndex,
    completedTaskId: String(input.currentTask.id ?? ""),
  };
  const coordination = {
    ...existingCoordination,
    route,
    departmentIds: route,
    currentIndex: nextIndex,
    previousTaskId: String(input.currentTask.id ?? ""),
    stageId,
  };
  const requiresApproval =
    ["high", "critical"].includes(String(input.currentTask.risk_level ?? "")) && input.currentTask.approval_required === true;
  const summary = `Downstream handoff after ${String(input.currentTask.title ?? "coordination task")} completed. ${input.result.summary}`;

  const { data: task, error } = await admin
    .from("office_tasks")
    .insert({
      workspace_id: input.workspaceId ?? null,
      user_id: input.userId,
      source_event_id: null,
      department_id: nextDepartmentId,
      worker_key: assignee.workerKey,
      runtime_kind: assignee.runtimeKind,
      title: input.branchLabel
        ? `Handoff (${input.branchLabel.replaceAll("_", " ")}): ${String(input.currentTask.title ?? "Office task")}`
        : `Handoff: ${String(input.currentTask.title ?? "Office task")}`,
      summary,
      risk_level: (input.currentTask.risk_level ?? "medium") as OfficeRiskLevel,
      status: requiresApproval ? "waiting_approval" : "queued",
      approval_required: requiresApproval,
      tool_name: input.currentTask.tool_name ?? null,
      tool_payload: {
        ...toolPayload,
        stageId,
        sourceRecord: input.sourceRecord,
        coordination,
        handoff,
      },
      max_attempts: Number(input.currentTask.max_attempts ?? 3),
    })
    .select("*")
    .single();

  if (error || !task) {
    throw new Error(`Failed to create downstream handoff task: ${error?.message ?? "unknown error"}`);
  }

  await recordOfficeEvent({
    workspaceId: input.workspaceId ?? null,
    userId: input.userId,
    departmentId: nextDepartmentId,
    workerId: assignee.workerId,
    workerKind: assignee.runtimeKind,
    eventType: "worker.action_proposed",
    source: "office.handoff_runtime",
    entityType: "office_task",
    entityId: String((task as any).id ?? ""),
    title: `Handoff assigned to ${assignee.workerName}`,
    summary,
    payload: {
      task,
      handoff,
      coordination,
    },
    riskLevel: (input.currentTask.risk_level ?? "medium") as OfficeRiskLevel,
  }).catch(() => undefined);

  const operatorNotified = await notifyDownstreamOperator({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    assignee,
    currentTask: input.currentTask,
    nextTaskId: String((task as any).id ?? ""),
    summary,
    handoff,
  }).catch(() => false);

  return {
    task,
    handoff,
    operatorNotified,
  };
}

async function createDownstreamHandoffTasks(input: {
  userId: string;
  workspaceId?: string | null;
  currentTask: Record<string, any>;
  result: SourceRecordOutcomeInput["result"];
  sourceRecord: SourceRecordRef | null;
}) {
  const currentDepartmentId = asDepartmentId(input.currentTask.department_id);
  const branches = currentDepartmentId
    ? inferImplicitHandoffBranches({
        currentDepartmentId,
        sourceRecordKind: input.sourceRecord?.kind ?? null,
        summary: `${String(input.currentTask.title ?? "")} ${String(input.currentTask.summary ?? "")} ${String(input.result.summary ?? "")}`,
      })
    : [];

  const uniqueBranches = branches.filter(
    (branch, index, all) => all.findIndex((candidate) => candidate.label === branch.label) === index,
  );
  const branchTargets = uniqueBranches.length
    ? uniqueBranches
    : ([{ label: "primary", route: null }] as Array<{ label: string; route: OfficeDepartmentId[] | null }>);

  const created: Array<Awaited<ReturnType<typeof createDownstreamHandoffTask>>> = [];
  for (const branch of branchTargets) {
    const handoff = await createDownstreamHandoffTask({
      ...input,
      branchLabel: branch.label,
      branchRoute: branch.route,
    }).catch(() => null);
    if (handoff) created.push(handoff);
  }

  return created;
}

export async function applyOfficeTaskOutcomeToSourceRecord(input: SourceRecordOutcomeInput) {
  const sourceRecord = asSourceRecord(input.task.tool_payload?.sourceRecord);
  let data: Record<string, any> | null = null;

  if (sourceRecord) {
    const table = RECORD_TABLES[sourceRecord.kind];
    const existing = await loadExisting(table, sourceRecord.id);
    const update = buildRecordUpdate({
      kind: sourceRecord.kind,
      existing,
      input,
    });

    const admin = createAdminSupabaseClient();
    const { data: updatedRow, error } = await admin
      .from(table)
      .update(update)
      .eq("id", sourceRecord.id)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to apply task outcome to ${sourceRecord.kind}: ${error.message}`);
    }

    data = updatedRow as Record<string, any> | null;

    await recordOfficeEvent({
      workspaceId: input.workspaceId ?? null,
      userId: input.userId,
      departmentId: input.task.department_id ?? "general_manager",
      workerKind: input.task.runtime_kind ?? "system",
      eventType: "worker.action_executed",
      source: "department.record_outcome",
      entityType: sourceRecord.kind,
      entityId: sourceRecord.id,
      title: `${sourceRecord.kind.replaceAll("_", " ")} updated from task outcome`,
      summary: input.result.summary,
      payload: {
        taskId: input.taskId,
        sourceRecord,
        toolStatus: input.result.tool.status,
        update,
      },
      riskLevel: input.task.risk_level ?? "low",
    });
  }

  const downstreamHandoffs =
    input.result.tool.status === "completed"
      ? await createDownstreamHandoffTasks({
          userId: input.userId,
          workspaceId: input.workspaceId ?? null,
          currentTask: input.task,
          result: input.result,
          sourceRecord,
        }).catch(() => [])
      : [];

  return {
    sourceRecord,
    updated: data,
    downstreamHandoffs,
  };
}
