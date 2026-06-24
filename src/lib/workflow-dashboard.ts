import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Approval, WorkflowRun, WorkflowRunEvent, WorkflowVersion } from "@/types";

type JsonRecord = Record<string, unknown>;

export interface WorkflowRunSummary {
  id: string;
  workflowId: string;
  workflowName: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
  triggerType: string;
  stepResults: Array<Record<string, unknown>>;
  durationMs: number | null;
  successCount: number;
  failedCount: number;
}

export interface WorkflowAuditEntry {
  id: string;
  occurredAt: string;
  kind: "run_event" | "version" | "approval";
  title: string;
  detail: string;
  status: string;
  workflowName: string;
}

export interface WorkflowActivityEvent extends WorkflowRunEvent {
  workflowName: string;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function getDurationMs(startedAt: string, finishedAt: string | null) {
  if (!finishedAt) return null;
  const started = new Date(startedAt).getTime();
  const finished = new Date(finishedAt).getTime();
  return Number.isFinite(started) && Number.isFinite(finished) ? Math.max(0, finished - started) : null;
}

export async function getWorkflowRunSummaries(userId: string) {
  const supabase = await createServerSupabaseClient();
  const [{ data: runs }, { data: workflows }] = await Promise.all([
    supabase
      .from("workflow_runs")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(100),
    supabase.from("workflows").select("id,title").eq("user_id", userId),
  ]);

  const workflowNames = new Map<string, string>(
    (workflows ?? []).map((workflow: any) => [String(workflow.id), String(workflow.title ?? "Workflow")]),
  );

  return ((runs ?? []) as WorkflowRun[]).map((run) => {
    const stepResults = asArray(run.step_results) as Array<Record<string, unknown>>;
    const successCount = stepResults.filter((step) => step.status === "success").length;
    const failedCount = stepResults.filter((step) => step.status === "failed").length;
    return {
      id: run.id,
      workflowId: run.workflow_id,
      workflowName: String(workflowNames.get(run.workflow_id) ?? "Workflow"),
      status: run.status,
      startedAt: run.started_at,
      finishedAt: run.finished_at,
      errorMessage: run.error_message,
      triggerType: run.trigger_type,
      stepResults,
      durationMs: getDurationMs(run.started_at, run.finished_at),
      successCount,
      failedCount,
    } satisfies WorkflowRunSummary;
  });
}

export async function getWorkflowRunDetail(userId: string, runId: string) {
  const supabase = await createServerSupabaseClient();
  const [{ data: run }, { data: events }, { data: workflows }] = await Promise.all([
    supabase
      .from("workflow_runs")
      .select("*")
      .eq("user_id", userId)
      .eq("id", runId)
      .single(),
    supabase
      .from("workflow_run_events")
      .select("*")
      .eq("user_id", userId)
      .eq("run_id", runId)
      .order("created_at", { ascending: true }),
    supabase.from("workflows").select("id,title").eq("user_id", userId),
  ]);

  if (!run) return null;
  const workflowName = String(
    (workflows ?? []).find((workflow: any) => workflow.id === run.workflow_id)?.title ?? "Workflow",
  );

  return {
    run: run as WorkflowRun,
    workflowName,
    events: (events ?? []) as WorkflowRunEvent[],
  };
}

export async function getWorkflowCostInsights(userId: string) {
  const [runs, usageSummary] = await Promise.all([
    getWorkflowRunSummaries(userId),
    (async () => {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase
        .from("usage_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    })(),
  ]);

  const byWorkflow = new Map<string, WorkflowRunSummary[]>();
  for (const run of runs) {
    const list = byWorkflow.get(run.workflowId) ?? [];
    list.push(run);
    byWorkflow.set(run.workflowId, list);
  }

  const workflowRows = Array.from(byWorkflow.entries()).map(([workflowId, workflowRuns]) => {
    const workflowName = workflowRuns[0]?.workflowName ?? "Workflow";
    const totalExecutions = workflowRuns.length;
    const successfulExecutions = workflowRuns.filter((run) => run.status === "success").length;
    const failedExecutions = workflowRuns.filter((run) => run.status === "failed").length;
    const totalDurationMs = workflowRuns.reduce((sum, run) => sum + (run.durationMs ?? 0), 0);
    const intelligenceSteps = workflowRuns.reduce(
      (sum, run) =>
        sum +
        run.stepResults.filter((step) => {
          const output =
            step.output && typeof step.output === "object" ? (step.output as Record<string, unknown>) : null;
          return String(output?._execution_type ?? "") === "intelligence";
        }).length,
      0,
    );
    const estimatedSpend = totalExecutions * 0.02 + intelligenceSteps * 0.01;
    const timeSavedHours = Number(((totalExecutions * 6) / 60).toFixed(1));
    const manualCostEstimate = Number((timeSavedHours * 12).toFixed(2));

    return {
      workflowId,
      workflowName,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      totalDurationMs,
      averageDurationMs: totalExecutions > 0 ? Math.round(totalDurationMs / totalExecutions) : 0,
      estimatedSpend,
      timeSavedHours,
      manualCostEstimate,
    };
  });

  const totalEstimatedSpend = workflowRows.reduce((sum, row) => sum + row.estimatedSpend, 0);
  const totalExecutions = workflowRows.reduce((sum, row) => sum + row.totalExecutions, 0);
  const totalTimeSavedHours = workflowRows.reduce((sum, row) => sum + row.timeSavedHours, 0);
  const totalManualValue = workflowRows.reduce((sum, row) => sum + row.manualCostEstimate, 0);

  return {
    workflows: workflowRows.sort((a, b) => b.totalExecutions - a.totalExecutions),
    summary: {
      totalEstimatedSpend,
      totalExecutions,
      totalTimeSavedHours,
      totalManualValue,
      roiPercent:
        totalManualValue > 0
          ? Math.max(0, Math.round(((totalManualValue - totalEstimatedSpend) / totalManualValue) * 100))
          : 0,
      usageLogCount: usageSummary.length,
    },
  };
}

export async function getWorkflowCollaborationInsights(userId: string) {
  const supabase = await createServerSupabaseClient();
  const [{ data: approvals }, { data: versions }, { data: events }, { data: workflows }] = await Promise.all([
    supabase.from("approvals").select("*").eq("user_id", userId).order("requested_at", { ascending: false }).limit(50),
    supabase.from("workflow_versions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("workflow_run_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("workflows").select("id,title,status").eq("user_id", userId),
  ]);

  const workflowNames = new Map<string, string>(
    (workflows ?? []).map((workflow: any) => [String(workflow.id), String(workflow.title ?? "Workflow")]),
  );

  return {
    approvals: (approvals ?? []) as Approval[],
    versions: (versions ?? []) as WorkflowVersion[],
    events: ((events ?? []) as WorkflowRunEvent[]).map((event) => ({
      ...event,
      workflowName: String(workflowNames.get(event.workflow_id) ?? "Workflow"),
    })) as WorkflowActivityEvent[],
    workflows: workflows ?? [],
  };
}

export async function getWorkflowAuditEntries(userId: string) {
  const collaboration = await getWorkflowCollaborationInsights(userId);

  const entries: WorkflowAuditEntry[] = [
    ...collaboration.events.map((event) => ({
      id: `event-${event.id}`,
      occurredAt: event.created_at,
      kind: "run_event" as const,
      title: String(event.event_type).replaceAll(".", " "),
      detail:
        typeof (event.event_data as JsonRecord | undefined)?.summary === "string"
          ? String((event.event_data as JsonRecord).summary)
          : JSON.stringify(event.event_data ?? {}).slice(0, 220),
      status: "logged",
      workflowName: String((event as WorkflowActivityEvent).workflowName ?? "Workflow"),
    })),
    ...collaboration.versions.map((version) => ({
      id: `version-${version.id}`,
      occurredAt: version.created_at,
      kind: "version" as const,
      title: `Version ${version.version_number} saved`,
      detail: `${version.title} (${version.status})`,
      status: version.status,
      workflowName: version.title,
    })),
    ...collaboration.approvals.map((approval) => ({
      id: `approval-${approval.id}`,
      occurredAt: approval.requested_at,
      kind: "approval" as const,
      title: approval.title,
      detail: approval.message,
      status: approval.status,
      workflowName: collaboration.workflows.find((workflow: any) => workflow.id === approval.workflow_id)?.title ?? "Workflow",
    })),
  ];

  return entries.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}
