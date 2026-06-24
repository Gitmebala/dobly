import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { OFFICE_WORKER_TEMPLATES } from "@/lib/office/departments";
import { recordOfficeEvent } from "@/lib/office/events";
import { buildOfficeWorkerExecutionPlan } from "@/lib/office/capabilities";
import { executeOfficeTool } from "@/lib/office/tool-executor";
import { runOfficeTaskAgentLoop } from "@/lib/office/agent-runtime";
import { recordUsageEvent } from "@/lib/billing/entitlements";
import { applyOfficeTaskOutcomeToSourceRecord } from "@/lib/record-outcomes";
import { assessAutonomyGate } from "@/lib/safety/autonomy";
import type {
  OfficeEventRecord,
  OfficeEventType,
  OfficeRiskLevel,
  OfficeTaskIntent,
  OfficeTaskStatus,
  OfficeWorkerKind,
} from "@/lib/office/types";

function riskRank(level: OfficeRiskLevel) {
  return level === "critical" ? 4 : level === "high" ? 3 : level === "medium" ? 2 : 1;
}

function inferTaskRisk(eventType: OfficeEventType, sourceRisk: OfficeRiskLevel): OfficeRiskLevel {
  if (sourceRisk === "critical" || sourceRisk === "high") return sourceRisk;
  if (
    eventType === "payment.received" ||
    eventType === "invoice.overdue" ||
    eventType === "integration.failed" ||
    eventType === "worker.failed"
  ) {
    return "medium";
  }
  if (eventType === "message.received" || eventType === "content.idea_received") return "low";
  return sourceRisk;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const STALE_RUNNING_MINUTES = 15;

function backoffRunAt(attemptCount: number) {
  const delayMinutes = Math.min(60, Math.max(1, 2 ** Math.max(0, attemptCount - 1)));
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
}

export function buildTaskIntentsForEvent(event: OfficeEventRecord): OfficeTaskIntent[] {
  const matchingWorkers = OFFICE_WORKER_TEMPLATES.filter((worker) =>
    worker.handles.includes(event.eventType)
  );

  return matchingWorkers.map((worker) => {
    const riskLevel = inferTaskRisk(event.eventType, event.riskLevel);
    const autonomyGate = assessAutonomyGate({
      workerKind: worker.kind,
      riskLevel,
      departmentId: worker.departmentId,
      workerKey: worker.key,
      eventType: event.eventType,
      title: event.title,
      summary: event.summary,
    });
    return {
      runtime: worker.kind,
      departmentId: worker.departmentId,
      workerKey: worker.key,
      title: `${worker.name}: ${event.title}`,
      summary: `${worker.mission} Triggered by ${event.eventType}.`,
      riskLevel,
      requiresApproval: autonomyGate.requiresApproval,
      toolName: worker.requiredTools[0] ?? undefined,
      toolPayload: {
        eventId: event.id,
        eventType: event.eventType,
        source: event.source,
        payload: event.payload,
        autonomyGate,
      },
    };
  });
}

async function createOfficeTask(params: {
  event: OfficeEventRecord;
  intent: OfficeTaskIntent;
  status: OfficeTaskStatus;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("office_tasks")
    .insert({
      workspace_id: params.event.workspaceId,
      user_id: params.event.userId,
      source_event_id: params.event.id,
      department_id: params.intent.departmentId,
      worker_key: params.intent.workerKey,
      runtime_kind: params.intent.runtime,
      title: params.intent.title,
      summary: params.intent.summary,
      risk_level: params.intent.riskLevel,
      status: params.status,
      approval_required: params.intent.requiresApproval,
      tool_name: params.intent.toolName ?? null,
      tool_payload: params.intent.toolPayload ?? {},
      max_attempts: DEFAULT_MAX_ATTEMPTS,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create office task: ${error?.message ?? "unknown error"}`);
  }

  return data as Record<string, unknown>;
}

export async function queueOfficeTask(input: {
  workspaceId?: string | null;
  userId: string;
  departmentId: string;
  workerKey: string;
  runtimeKind: OfficeWorkerKind | "system";
  title: string;
  summary: string;
  riskLevel: OfficeRiskLevel;
  requiresApproval: boolean;
  toolName?: string | null;
  toolPayload?: Record<string, unknown>;
  source: string;
  workerId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  eventTitle?: string | null;
  eventSummary?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const status: OfficeTaskStatus = input.requiresApproval ? "waiting_approval" : "queued";
  const { data, error } = await admin
    .from("office_tasks")
    .insert({
      workspace_id: input.workspaceId ?? null,
      user_id: input.userId,
      source_event_id: null,
      department_id: input.departmentId,
      worker_key: input.workerKey,
      runtime_kind: input.runtimeKind,
      title: input.title,
      summary: input.summary,
      risk_level: input.riskLevel,
      status,
      approval_required: input.requiresApproval,
      tool_name: input.toolName ?? null,
      tool_payload: input.toolPayload ?? {},
      max_attempts: DEFAULT_MAX_ATTEMPTS,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to queue office task: ${error?.message ?? "unknown error"}`);
  }

  await recordOfficeEvent({
    workspaceId: input.workspaceId ?? null,
    userId: input.userId,
    departmentId: input.departmentId as any,
    workerId: input.workerId ?? null,
    workerKind: input.runtimeKind,
    eventType: "worker.action_proposed",
    source: input.source,
    entityType: input.entityType ?? "office_task",
    entityId: input.entityId ?? String((data as any).id ?? ""),
    title: input.eventTitle ?? input.title,
    summary:
      input.eventSummary ??
      (input.requiresApproval
        ? "Dobly prepared the coordination work and is waiting for approval before the coworker acts."
        : "Dobly routed the coordination work to a coworker."),
    payload: {
      task: data,
      handoff: (input.toolPayload ?? {}).handoff ?? null,
      coordination: (input.toolPayload ?? {}).coordination ?? null,
    },
    riskLevel: input.riskLevel,
  }).catch(() => undefined);

  return data as Record<string, unknown>;
}

export async function dispatchOfficeEvent(event: OfficeEventRecord) {
  const intents = buildTaskIntentsForEvent(event);
  const tasks: Record<string, unknown>[] = [];

  for (const intent of intents) {
    const status: OfficeTaskStatus = intent.requiresApproval ? "waiting_approval" : "queued";
    const task = await createOfficeTask({ event, intent, status });
    tasks.push(task);

    await recordOfficeEvent({
      workspaceId: event.workspaceId,
      userId: event.userId,
      departmentId: intent.departmentId,
      workerKind: intent.runtime,
      eventType: "worker.action_proposed",
      source: "office.runtime",
      entityType: "office_task",
      entityId: typeof task.id === "string" ? task.id : null,
      title: intent.title,
      summary: intent.requiresApproval
        ? "Dobly prepared the action and is waiting for owner approval because the autonomy gate blocked auto-run."
        : "Dobly queued the action for execution.",
      payload: {
        task,
        intent,
        sourceEventId: event.id,
      },
      riskLevel: intent.riskLevel,
    });
  }

  return { intents, tasks };
}

export async function ingestAndDispatchOfficeEvent(
  input: Parameters<typeof recordOfficeEvent>[0],
) {
  const event = await recordOfficeEvent(input);
  const dispatch = await dispatchOfficeEvent(event);
  return { event, ...dispatch };
}

export async function markOfficeTaskDecision(params: {
  userId: string;
  taskId: string;
  decision: "approved" | "rejected" | "cancelled";
  note?: string | null;
  modifiedSummary?: string | null;
  modifiedPayload?: Record<string, unknown> | null;
}) {
  const admin = createAdminSupabaseClient();
  const nextStatus: OfficeTaskStatus =
    params.decision === "approved" ? "queued" : params.decision === "rejected" ? "cancelled" : "cancelled";
  const approvedEdits =
    params.decision === "approved"
      ? {
          ...(params.modifiedSummary ? { summary: params.modifiedSummary } : {}),
          ...(params.modifiedPayload ? { tool_payload: params.modifiedPayload } : {}),
        }
      : {};

  const { data, error } = await admin
    .from("office_tasks")
    .update({
      status: nextStatus,
      decision_note: params.note ?? null,
      decided_at: new Date().toISOString(),
      ...approvedEdits,
    })
    .eq("id", params.taskId)
    .eq("user_id", params.userId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to decide office task: ${error?.message ?? "unknown error"}`);
  }

  await recordOfficeEvent({
    workspaceId: (data as any).workspace_id ?? null,
    userId: params.userId,
    departmentId: (data as any).department_id,
    workerKind: (data as any).runtime_kind ?? "system",
    eventType: params.decision === "approved" ? "worker.action_approved" : "worker.action_rejected",
    source: "office.owner_decision",
    entityType: "office_task",
    entityId: params.taskId,
    title: `${params.decision === "approved" ? "Approved" : "Rejected"}: ${(data as any).title}`,
    summary: params.note ?? null,
    payload: { task: data, decision: params.decision },
    riskLevel: (data as any).risk_level ?? "medium",
  });

  return data as Record<string, unknown>;
}

export async function executeQueuedOfficeTask(params: {
  userId: string;
  taskId: string;
}) {
  const admin = createAdminSupabaseClient();

  const { data: task, error: loadError } = await admin
    .from("office_tasks")
    .select("*")
    .eq("id", params.taskId)
    .eq("user_id", params.userId)
    .single();

  if (loadError || !task) {
    throw new Error(`Failed to load office task: ${loadError?.message ?? "unknown error"}`);
  }

  if (!["queued", "running"].includes(String((task as any).status))) {
    throw new Error("Only queued tasks can be executed.");
  }

  const startedAt = new Date().toISOString();
  const attemptCount = Number((task as any).attempt_count ?? 0) + 1;
  const maxAttempts = Number((task as any).max_attempts ?? DEFAULT_MAX_ATTEMPTS);
  await admin
    .from("office_tasks")
    .update({
      status: "running",
      started_at: startedAt,
      attempt_count: attemptCount,
      locked_by: "office.runtime",
      locked_at: startedAt,
      last_heartbeat_at: startedAt,
      updated_at: startedAt,
    })
    .eq("id", params.taskId)
    .eq("user_id", params.userId);

  const result = await buildDeterministicTaskResult(params.userId, params.taskId, task as Record<string, any>);
  const completedAt = new Date().toISOString();
  const toolFailed = result.tool.status === "failed";
  const willRetry = toolFailed && attemptCount < maxAttempts;
  const finalStatus: OfficeTaskStatus = toolFailed ? (willRetry ? "queued" : "failed") : "completed";
  const sourceRecordOutcome = await applyOfficeTaskOutcomeToSourceRecord({
    userId: params.userId,
    workspaceId: (task as any).workspace_id ?? null,
    taskId: params.taskId,
    taskTitle: String((task as any).title ?? "Office task"),
    task: task as Record<string, any>,
    result,
  }).catch((error) => ({
    error: error instanceof Error ? error.message : "Could not update source record.",
  }));

  const { data, error } = await admin
    .from("office_tasks")
    .update({
      status: finalStatus,
      result: {
        ...result,
        sourceRecordOutcome,
      },
      completed_at: finalStatus === "completed" ? completedAt : null,
      next_run_at: willRetry ? backoffRunAt(attemptCount) : null,
      locked_by: null,
      locked_at: null,
      last_heartbeat_at: completedAt,
      updated_at: completedAt,
      last_error: toolFailed ? result.tool.summary : null,
    })
    .eq("id", params.taskId)
    .eq("user_id", params.userId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to complete office task: ${error?.message ?? "unknown error"}`);
  }

  await recordOfficeEvent({
    workspaceId: (data as any).workspace_id ?? null,
    userId: params.userId,
    departmentId: (data as any).department_id,
    workerKind: (data as any).runtime_kind ?? "system",
    eventType: toolFailed ? "worker.failed" : "worker.action_executed",
    source: "office.runtime",
    entityType: "office_task",
    entityId: params.taskId,
    title: `${toolFailed ? (willRetry ? "Retry scheduled" : "Failed") : "Completed"}: ${(data as any).title}`,
    summary: result.summary,
    payload: { task: data, result },
    riskLevel: (data as any).risk_level ?? "low",
  });

  return data as Record<string, unknown>;
}

async function recoverStaleRunningTasks(params: {
  userId?: string | null;
  workerId: string;
}) {
  const admin = createAdminSupabaseClient();
  const cutoff = new Date(Date.now() - STALE_RUNNING_MINUTES * 60_000).toISOString();
  let query = admin
    .from("office_tasks")
    .select("id,user_id,attempt_count,max_attempts,title")
    .eq("status", "running")
    .lt("locked_at", cutoff)
    .limit(25);

  if (params.userId) query = query.eq("user_id", params.userId);

  const { data: staleTasks, error } = await query;
  if (error) return { recovered: 0, failed: 0 };

  let recovered = 0;
  let failed = 0;
  for (const task of staleTasks ?? []) {
    const taskId = String((task as any).id);
    const userId = String((task as any).user_id);
    const attempts = Number((task as any).attempt_count ?? 0);
    const maxAttempts = Number((task as any).max_attempts ?? DEFAULT_MAX_ATTEMPTS);
    const finalFailed = attempts >= maxAttempts;
    const now = new Date().toISOString();

    await admin
      .from("office_tasks")
      .update({
        status: finalFailed ? "failed" : "queued",
        next_run_at: finalFailed ? null : backoffRunAt(attempts),
        locked_by: null,
        locked_at: null,
        last_error: `Recovered stale running lease from ${params.workerId}.`,
        updated_at: now,
      })
      .eq("id", taskId)
      .eq("user_id", userId);

    if (finalFailed) failed += 1;
    else recovered += 1;

    await recordOfficeEvent({
      userId,
      workerKind: "system",
      eventType: finalFailed ? "worker.failed" : "worker.action_proposed",
      source: "office.lease_recovery",
      entityType: "office_task",
      entityId: taskId,
      title: finalFailed ? `Task failed after stale lease: ${(task as any).title}` : `Task recovered for retry: ${(task as any).title}`,
      summary: finalFailed
        ? "The task exceeded its retry budget after a stale running lease."
        : "The always-on worker found a stale running lease and returned the task to the queue.",
      payload: { taskId, attempts, maxAttempts, workerId: params.workerId },
      riskLevel: finalFailed ? "medium" : "low",
    }).catch(() => undefined);
  }

  return { recovered, failed };
}

async function markOfficeTaskRuntimeFailure(params: {
  userId: string;
  taskId: string;
  workerId: string;
  error: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data: task } = await admin
    .from("office_tasks")
    .select("attempt_count,max_attempts")
    .eq("id", params.taskId)
    .eq("user_id", params.userId)
    .maybeSingle();
  const attempts = Number((task as any)?.attempt_count ?? 1);
  const maxAttempts = Number((task as any)?.max_attempts ?? DEFAULT_MAX_ATTEMPTS);
  const retry = attempts < maxAttempts;
  const now = new Date().toISOString();

  await admin
    .from("office_tasks")
    .update({
      status: retry ? "queued" : "failed",
      next_run_at: retry ? backoffRunAt(attempts) : null,
      locked_by: null,
      locked_at: null,
      last_error: params.error,
      updated_at: now,
    })
    .eq("id", params.taskId)
    .eq("user_id", params.userId);

  return { retry, attempts, maxAttempts };
}

export async function processQueuedOfficeTasks(params: {
  limit?: number;
  workerId?: string;
  userId?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const limit = Math.max(1, Math.min(50, params.limit ?? 10));
  const workerId = params.workerId ?? "dobly-office-worker";
  const recovery = await recoverStaleRunningTasks({ userId: params.userId, workerId });

  let query = admin
    .from("office_tasks")
    .select("id,user_id,status,risk_level,approval_required,created_at,next_run_at,attempt_count,max_attempts")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit * 3);

  if (params.userId) {
    query = query.eq("user_id", params.userId);
  }

  const { data: tasks, error } = await query;
  if (error) {
    throw new Error(`Failed to load queued office tasks: ${error.message}`);
  }

  const results: Array<{
    taskId: string;
    userId: string;
    status: "completed" | "failed" | "skipped";
    error?: string;
  }> = [];

  const nowMs = Date.now();
  const runnableTasks = (tasks ?? [])
    .filter((task: any) => !task.next_run_at || new Date(String(task.next_run_at)).getTime() <= nowMs)
    .filter((task: any) => Number(task.attempt_count ?? 0) < Number(task.max_attempts ?? DEFAULT_MAX_ATTEMPTS))
    .slice(0, limit);

  for (const task of runnableTasks) {
    const taskId = String((task as any).id);
    const userId = String((task as any).user_id);

    try {
      if ((task as any).approval_required && riskRank((task as any).risk_level ?? "medium") >= riskRank("high")) {
        results.push({ taskId, userId, status: "skipped", error: "High-risk task still requires owner approval." });
        continue;
      }

      await executeQueuedOfficeTask({ userId, taskId });
      results.push({ taskId, userId, status: "completed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Office task failed";
      const failure = await markOfficeTaskRuntimeFailure({ userId, taskId, workerId, error: message }).catch(() => ({
        retry: false,
        attempts: 0,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
      }));
      results.push({
        taskId,
        userId,
        status: failure.retry ? "skipped" : "failed",
        error: failure.retry
          ? `${message}. Retrying (${failure.attempts}/${failure.maxAttempts}).`
          : message,
      });

      await recordOfficeEvent({
        userId,
        workerKind: "system",
        eventType: "worker.failed",
        source: "office.always_on_worker",
        entityType: "office_task",
        entityId: taskId,
        title: `Always-on worker failed task ${taskId}`,
        summary: `${workerId}: ${message}`,
        payload: { taskId, workerId, error: message },
        riskLevel: "medium",
      }).catch(() => undefined);
    }
  }

  return {
    workerId,
    scanned: tasks?.length ?? 0,
    runnable: runnableTasks.length,
    recovered: recovery.recovered,
    recoveryFailed: recovery.failed,
    processed: results.filter((result) => result.status === "completed").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    results,
  };
}

export async function hireOfficeWorkerFromTemplate(params: {
  userId: string;
  templateKey: string;
  workspaceId?: string | null;
}) {
  const template = OFFICE_WORKER_TEMPLATES.find((item) => item.key === params.templateKey);
  if (!template) {
    throw new Error("Unknown office worker template.");
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("office_workers")
    .upsert(
      {
        workspace_id: params.workspaceId ?? null,
        user_id: params.userId,
        department_id: template.departmentId,
        worker_key: template.key,
        name: template.name,
        runtime_kind: template.kind,
        mission: template.mission,
        status: "shadow",
        autonomy_mode: template.defaultAutonomy,
        required_tools: template.requiredTools,
        permissions: {
          proposes: template.proposes,
          never_does: template.neverDoes,
        },
        approval_policy: {
          default_autonomy: template.defaultAutonomy,
          never_does: template.neverDoes,
        },
        memory_scope: {
          handles: template.handles,
        },
        health_score: 0.68,
        trust_score: 0.55,
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,workspace_id,worker_key",
      },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to hire office worker: ${error?.message ?? "unknown error"}`);
  }

  await recordOfficeEvent({
    workspaceId: params.workspaceId ?? null,
    userId: params.userId,
    departmentId: template.departmentId,
    workerId: (data as any).id ?? null,
    workerKind: template.kind,
    eventType: "worker.action_executed",
    source: "office.hiring",
    entityType: "office_worker",
    entityId: (data as any).id ?? null,
    title: `${template.name} joined ${template.departmentId.replaceAll("_", " ")}`,
    summary: `${template.name} is now running in ${template.defaultAutonomy} mode.`,
    payload: { template },
    riskLevel: "low",
  });

  return data as Record<string, unknown>;
}

async function buildDeterministicTaskResult(userId: string, taskId: string, task: Record<string, any>) {
  const runtime = String(task.runtime_kind ?? "automation");
  const title = String(task.title ?? "Office task");
  const agentLoop = await runOfficeTaskAgentLoop({
    userId,
    taskId,
    task,
  });
  const executionPlan = buildOfficeWorkerExecutionPlan(task);
  const tool = agentLoop.tool;

  await recordUsageEvent({
    userId,
    workspaceId: task.workspace_id ?? null,
    metric: runtime === "automation" ? "automation_runs" : "ai_actions",
    source: `office.runtime.${runtime}`,
    metadata: {
      taskId,
      workerKey: task.worker_key ?? null,
      departmentId: task.department_id ?? null,
      toolName: task.tool_name ?? null,
      toolStatus: tool.status,
    },
  }).catch(() => undefined);

  return {
    summary:
      tool.status === "needs_connection"
        ? tool.summary
        : tool.status === "failed"
          ? tool.summary
          : agentLoop.summary || `${title} completed through Dobly's guarded office runtime.`,
    runtime,
    executionPlan,
    tool,
    tool_name: task.tool_name ?? null,
    completed_by: "office.runtime",
    completed_at: new Date().toISOString(),
    agentRunId: agentLoop.agentRunId,
    plannerOutput: agentLoop.plannerOutput,
    validationResult: agentLoop.validationResult,
    evaluationResult: agentLoop.evaluationResult,
    contextPack: agentLoop.contextPack,
  };
}
