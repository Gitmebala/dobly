import { createHash } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { AgentMemory, Report, Workflow, WorkflowRun } from "@/types";

type JsonRecord = Record<string, unknown>;

export interface WorkflowRuntimeState {
  agentId: string | null;
  automationId: string | null;
  memory: Record<string, JsonRecord>;
  recentRuns: WorkflowRun[];
  recentReports: Report[];
  dedupeFingerprint: string;
  duplicateRunId: string | null;
}

function getPathValue(input: unknown, path: string) {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, input);
}

function computeFingerprint(workflow: Workflow, triggerPayload: JsonRecord) {
  const runtime = workflow.blueprint.definition?.runtime;
  const keys = runtime?.dedupeKeys?.length ? runtime.dedupeKeys : ["trigger.id", "trigger.reference"];
  const picked = Object.fromEntries(
    keys.map((key) => {
      const normalizedPath = key.replace(/^trigger\./, "");
      return [key, getPathValue(triggerPayload, normalizedPath) ?? null];
    })
  );

  const hasSignal = Object.values(picked).some(
    (value) => value !== null && value !== undefined && String(value).trim() !== ""
  );
  if (!hasSignal) {
    return "";
  }

  return createHash("sha256")
    .update(JSON.stringify({ workflowId: workflow.id, picked }))
    .digest("hex");
}

export async function loadWorkflowRuntimeState(workflow: Workflow, triggerPayload: JsonRecord) {
  const admin = createAdminSupabaseClient();
  const fingerprint = computeFingerprint(workflow, triggerPayload);
  const runtime = workflow.blueprint.definition?.runtime;
  const dedupeWindowMinutes = runtime?.dedupeWindowMinutes ?? 0;
  const thresholdIso =
    dedupeWindowMinutes > 0
      ? new Date(Date.now() - dedupeWindowMinutes * 60_000).toISOString()
      : null;

  const [agentResult, automationResult, runsResult, reportsResult] = await Promise.all([
    admin.from("agents").select("id").eq("workflow_id", workflow.id).maybeSingle().catch(() => ({ data: null })),
    admin.from("automations").select("id").eq("workflow_id", workflow.id).maybeSingle().catch(() => ({ data: null })),
    admin
      .from("workflow_runs")
      .select("*")
      .eq("workflow_id", workflow.id)
      .order("started_at", { ascending: false })
      .limit(8)
      .catch(() => ({ data: [] })),
    admin
      .from("reports")
      .select("*")
      .eq("workflow_id", workflow.id)
      .order("created_at", { ascending: false })
      .limit(6)
      .catch(() => ({ data: [] })),
  ]);

  const agentId = agentResult.data?.id ?? null;
  const automationId = automationResult.data?.id ?? null;

  let memoryRows: AgentMemory[] = [];
  if (agentId) {
    const memoryResult = await admin
      .from("agent_memory")
      .select("*")
      .eq("agent_id", agentId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .catch(() => ({ data: [] }));
    memoryRows = (memoryResult.data ?? []) as AgentMemory[];
  }

  const memory = Object.fromEntries(
    memoryRows.map((row) => [row.key, row.value ?? {}])
  );
  const recentRuns = (runsResult.data ?? []) as WorkflowRun[];
  const duplicateRun =
    thresholdIso && dedupeWindowMinutes > 0 && fingerprint
      ? recentRuns.find((run) => {
          if (run.status !== "success" || !run.finished_at || run.finished_at < thresholdIso) {
            return false;
          }
          const trigger = (run.trigger_payload ?? {}) as JsonRecord;
          return computeFingerprint(workflow, trigger) === fingerprint;
        })
      : null;

  return {
    agentId,
    automationId,
    memory,
    recentRuns,
    recentReports: (reportsResult.data ?? []) as Report[],
    dedupeFingerprint: fingerprint,
    duplicateRunId: duplicateRun?.id ?? null,
  } satisfies WorkflowRuntimeState;
}

export async function persistWorkflowMemory(params: {
  agentId: string | null;
  workflow: Workflow;
  triggerPayload: JsonRecord;
  stepOutputs: Record<string, JsonRecord>;
  summary: string;
}) {
  if (!params.agentId) return;
  const admin = createAdminSupabaseClient();
  const runtime = params.workflow.blueprint.definition?.runtime;
  const memoryRows = [
    {
      agent_id: params.agentId,
      memory_type: "working_context",
      key: "recent_summary",
      value: { summary: params.summary, updated_at: new Date().toISOString() },
      source: "workflow_run",
      confidence: 0.9,
    },
    {
      agent_id: params.agentId,
      memory_type: "working_context",
      key: "last_trigger",
      value: params.triggerPayload,
      source: "workflow_trigger",
      confidence: 0.85,
    },
    {
      agent_id: params.agentId,
      memory_type: "working_context",
      key: "last_step_outputs",
      value: params.stepOutputs,
      source: "workflow_steps",
      confidence: 0.75,
    },
    ...(runtime?.observationGoal
      ? [
          {
            agent_id: params.agentId,
            memory_type: "instruction",
            key: "observation_goal",
            value: { text: runtime.observationGoal },
            source: "workflow_definition",
            confidence: 0.95,
          },
        ]
      : []),
  ];

  await admin.from("agent_memory").upsert(memoryRows, {
    onConflict: "agent_id,memory_type,key",
  });
}

export async function createWorkflowReport(params: {
  userId: string;
  workflowId: string;
  runId: string;
  agentId: string | null;
  automationId: string | null;
  reportType: string;
  title: string;
  body: string;
  deliveryStatus?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  await admin.from("reports").insert({
    user_id: params.userId,
    workflow_id: params.workflowId,
    run_id: params.runId,
    agent_id: params.agentId,
    automation_id: params.automationId,
    report_type: params.reportType,
    title: params.title,
    body: params.body,
    delivery_status: params.deliveryStatus ?? "stored",
  });
}
