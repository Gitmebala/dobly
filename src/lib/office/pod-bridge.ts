import type { SupabaseClient } from "@supabase/supabase-js";
import { inferDepartmentForPod } from "@/lib/office/vertical-baselines";
import type { OfficeAutonomyMode, OfficeDepartmentId, OfficeWorkerKind, OfficeWorkerStatus } from "@/lib/office/types";
import type { PodRecord, PodSpec } from "@/lib/pods/types";

type DbClient = SupabaseClient<any, any, any>;

function inferWorkerKind(spec: PodSpec): OfficeWorkerKind {
  const hasConversation = spec.capabilities.some((capability) => capability.kind === "conversation");
  const hasReasoning = spec.capabilities.some((capability) => capability.kind === "reasoning");

  if (hasConversation && hasReasoning) return "agent";
  if (hasConversation) return "bot";
  if (hasReasoning) return "agent";
  return "automation";
}

function inferAutonomyMode(spec: PodSpec): OfficeAutonomyMode {
  if (spec.approvalPolicy.defaultMode === "allow_low_risk") return "guarded";
  return "supervised";
}

function statusForPodMode(mode: PodRecord["mode"]): OfficeWorkerStatus {
  if (mode === "active") return "active";
  if (mode === "supervised") return "shadow";
  if (mode === "paused") return "paused";
  if (mode === "archived") return "archived";
  return "draft";
}

function buildOfficeWorkerPayload(params: {
  pod: Pick<PodRecord, "id" | "user_id" | "name" | "label" | "purpose" | "mode" | "spec">;
  status?: OfficeWorkerStatus;
  workspaceId?: string | null;
}) {
  const spec = params.pod.spec;
  const departmentId = inferDepartmentForPod(spec) as OfficeDepartmentId;
  const workerKind = inferWorkerKind(spec);
  const status = params.status ?? statusForPodMode(params.pod.mode);

  return {
    workspace_id: params.workspaceId ?? null,
    user_id: params.pod.user_id,
    department_id: departmentId,
    worker_key: `pod_${params.pod.id}`,
    name: params.pod.name,
    runtime_kind: workerKind,
    mission: params.pod.purpose,
    status,
    autonomy_mode: inferAutonomyMode(spec),
    required_tools: spec.tools,
    permissions: {
      can_do_without_asking: spec.approvalPolicy.canDoWithoutAsking,
      never_do: spec.approvalPolicy.neverDo,
      pod_id: params.pod.id,
    },
    approval_policy: {
      default_mode: spec.approvalPolicy.defaultMode,
      always_ask_for: spec.approvalPolicy.alwaysAskFor,
      rules: spec.rules,
    },
    memory_scope: {
      enabled: spec.memory.enabled,
      scopes: spec.memory.scopes,
      first_facts_to_learn: spec.memory.firstFactsToLearn,
    },
    health_score: status === "draft" ? 0.5 : 0.72,
    trust_score: status === "draft" ? 0.5 : 0.58,
    last_active_at: status === "draft" ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function upsertOfficeWorkerForPod(
  supabase: DbClient,
  params: {
    pod: Pick<PodRecord, "id" | "user_id" | "name" | "label" | "purpose" | "mode" | "spec">;
    status?: OfficeWorkerStatus;
    workspaceId?: string | null;
  },
) {
  const payload = buildOfficeWorkerPayload(params);
  const { data, error } = await supabase
    .from("office_workers")
    .upsert(payload, {
      onConflict: "user_id,workspace_id,worker_key",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to sync Pod into Homebase: ${error?.message ?? "unknown error"}`);
  }

  return data as Record<string, unknown>;
}

export async function recordPodOfficeEvent(
  supabase: DbClient,
  params: {
    pod: Pick<PodRecord, "id" | "user_id" | "name" | "mode" | "spec">;
    workerId?: string | null;
    eventType: "worker.action_proposed" | "worker.action_executed" | "briefing.created";
    title: string;
    summary: string;
    workspaceId?: string | null;
  },
) {
  const departmentId = inferDepartmentForPod(params.pod.spec);
  const { error } = await supabase.from("office_events").insert({
    workspace_id: params.workspaceId ?? null,
    user_id: params.pod.user_id,
    department_id: departmentId,
    worker_id: params.workerId ?? null,
    worker_kind: inferWorkerKind(params.pod.spec),
    event_type: params.eventType,
    source: "pod.bridge",
    entity_type: "pod",
    entity_id: params.pod.id,
    title: params.title,
    summary: params.summary,
    payload: {
      pod_id: params.pod.id,
      mode: params.pod.mode,
      label: params.pod.name,
    },
    risk_level: "low",
  });

  if (error) {
    throw new Error(`Failed to record Homebase event: ${error.message}`);
  }
}

export async function createLaunchTaskForPod(
  supabase: DbClient,
  params: {
    pod: Pick<PodRecord, "id" | "user_id" | "name" | "purpose" | "mode" | "spec">;
    workerId?: string | null;
    workspaceId?: string | null;
  },
) {
  const departmentId = inferDepartmentForPod(params.pod.spec);
  const workerKind = inferWorkerKind(params.pod.spec);
  const requiresApproval = params.pod.spec.approvalPolicy.defaultMode !== "allow_low_risk";

  const { data, error } = await supabase
    .from("office_tasks")
    .insert({
      workspace_id: params.workspaceId ?? null,
      user_id: params.pod.user_id,
      source_event_id: null,
      department_id: departmentId,
      worker_key: `pod_${params.pod.id}`,
      runtime_kind: workerKind,
      title: `${params.pod.name}: first supervised run`,
      summary: `Run the first safe check for this worker: ${params.pod.purpose}`,
      risk_level: requiresApproval ? "medium" : "low",
      status: requiresApproval ? "waiting_approval" : "queued",
      approval_required: requiresApproval,
      tool_name: params.pod.spec.tools[0] ?? null,
      tool_payload: {
        pod_id: params.pod.id,
        simulations: params.pod.spec.simulations,
        first_metrics: params.pod.spec.reporting.metrics,
      },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create Homebase launch task: ${error?.message ?? "unknown error"}`);
  }

  return data as Record<string, unknown>;
}
