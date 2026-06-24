import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type {
  ActionCandidateRecord,
  OperatingStateRecord,
  PressureEventRecord,
  StateEvaluationRecord,
} from "@/types";

type StateHealth = OperatingStateRecord["health_status"];
type StateSeverity = PressureEventRecord["severity"];
type ActionMode = ActionCandidateRecord["execution_mode"];

interface EnsureWorkspaceResult {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
}

interface CreateOperatingStateParams {
  userId: string;
  workspaceId?: string | null;
  deskId?: string | null;
  coworkerId?: string | null;
  deskKey?: string | null;
  deskName?: string | null;
  title: string;
  objective: string;
  desiredCondition: string;
  stateType?: OperatingStateRecord["state_type"];
  targetMetric?: string | null;
  targetConfig?: Record<string, unknown>;
  watchConfig?: Record<string, unknown>;
  actionPlaybook?: Record<string, unknown>;
  approvalPolicy?: Record<string, unknown>;
}

interface EvaluateStateParams {
  userId: string;
  stateId: string;
}

interface WorkspaceStateQuery {
  userId: string;
  workspaceId?: string | null;
  status?: OperatingStateRecord["status"];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 42);
}

function numberConfig(record: Record<string, unknown>, key: string, fallback: number) {
  const value = record[key];
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textConfig(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function ensureWorkspaceForUser(userId: string): Promise<EnsureWorkspaceResult> {
  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin
    .from("workspaces")
    .select("*")
    .eq("owner_user_id", userId)
    .in("status", ["active", "paused"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as EnsureWorkspaceResult;

  const [{ data: profile }, { data: businessProfile }] = await Promise.all([
    admin.from("profiles").select("full_name,email").eq("id", userId).single(),
    admin.from("business_profiles").select("business_name").eq("user_id", userId).maybeSingle(),
  ]);

  const baseName =
    businessProfile?.business_name ||
    profile?.full_name?.trim() ||
    profile?.email?.split("@")[0] ||
    "Dobly Workspace";
  const baseSlug = slugify(baseName) || `workspace-${userId.slice(0, 8)}`;
  const slug = `${baseSlug}-${userId.slice(0, 6)}`;

  const { data, error } = await admin
    .from("workspaces")
    .insert({
      owner_user_id: userId,
      name: baseName,
      slug,
      region: "KE",
      timezone: "Africa/Nairobi",
      status: "active",
      current_trust_stage: 1,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`Failed to create workspace: ${error?.message ?? "unknown error"}`);
  return data as EnsureWorkspaceResult;
}

async function ensureDesk(params: {
  workspaceId: string;
  deskKey?: string | null;
  deskName?: string | null;
}) {
  if (!params.deskKey) return null;
  const admin = createAdminSupabaseClient();
  const key = slugify(params.deskKey).replace(/-/g, "_");
  const { data: existing } = await admin
    .from("desks")
    .select("id,key,name")
    .eq("workspace_id", params.workspaceId)
    .eq("key", key)
    .maybeSingle();

  if (existing) return existing;

  const name = params.deskName?.trim() || key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const { data, error } = await admin
    .from("desks")
    .insert({
      workspace_id: params.workspaceId,
      key,
      name,
      description: `${name} operating desk`,
      desk_type: "custom",
      status: "active",
      autonomy_mode: "supervised",
      approval_risk_threshold: "medium",
      goal: `Maintain the desired state for ${name.toLowerCase()}.`,
      owner_summary: `${name} is owned by Dobly.`,
    })
    .select("id,key,name")
    .single();

  if (error || !data) throw new Error(`Failed to create desk: ${error?.message ?? "unknown error"}`);
  return data;
}

export async function listOperatingStates(params: WorkspaceStateQuery) {
  const admin = createAdminSupabaseClient();
  const workspace = params.workspaceId ? { id: params.workspaceId } : await ensureWorkspaceForUser(params.userId);
  let query = admin
    .from("operating_states")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false });

  if (params.status) query = query.eq("status", params.status);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list operating states: ${error.message}`);
  return (data ?? []) as OperatingStateRecord[];
}

export async function listActionCandidates(params: WorkspaceStateQuery) {
  const admin = createAdminSupabaseClient();
  const workspace = params.workspaceId ? { id: params.workspaceId } : await ensureWorkspaceForUser(params.userId);
  const { data, error } = await admin
    .from("action_candidates")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Failed to list action candidates: ${error.message}`);
  return (data ?? []) as ActionCandidateRecord[];
}

export async function createOperatingState(params: CreateOperatingStateParams) {
  const admin = createAdminSupabaseClient();
  const workspace = params.workspaceId ? { id: params.workspaceId } : await ensureWorkspaceForUser(params.userId);
  const desk = params.deskId
    ? { id: params.deskId }
    : await ensureDesk({ workspaceId: workspace.id, deskKey: params.deskKey, deskName: params.deskName });

  const { data, error } = await admin
    .from("operating_states")
    .insert({
      workspace_id: workspace.id,
      desk_id: desk?.id ?? null,
      coworker_id: params.coworkerId ?? null,
      title: params.title,
      objective: params.objective,
      desired_condition: params.desiredCondition,
      state_type: params.stateType ?? "custom",
      status: "active",
      health_status: "unknown",
      target_metric: params.targetMetric ?? null,
      target_config: params.targetConfig ?? {},
      watch_config: params.watchConfig ?? {},
      action_playbook: params.actionPlaybook ?? {},
      approval_policy: params.approvalPolicy ?? {},
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`Failed to create operating state: ${error?.message ?? "unknown error"}`);
  return data as OperatingStateRecord;
}

function buildHealthStatus(params: {
  pressureScore: number;
  previousHealth: StateHealth;
  unresolvedSignals: number;
  failedTasks: number;
}) {
  if (params.pressureScore >= 85 || params.failedTasks >= 2) return "breached" as const;
  if (params.pressureScore >= 60 || params.unresolvedSignals >= 2) return "at_risk" as const;
  if (params.previousHealth === "breached" && params.pressureScore < 60) return "recovering" as const;
  if (params.pressureScore >= 35) return "watching" as const;
  return "healthy" as const;
}

function buildSeverity(pressureScore: number): StateSeverity {
  if (pressureScore >= 85) return "critical";
  if (pressureScore >= 60) return "high";
  if (pressureScore >= 35) return "medium";
  return "low";
}

function buildExecutionMode(pressureScore: number, approvalPolicy: Record<string, unknown>): ActionMode {
  const preferred = textConfig(approvalPolicy, "default_mode");
  if (preferred === "observe" || preferred === "simulate" || preferred === "supervised" || preferred === "autonomous") {
    return preferred;
  }
  if (pressureScore >= 85) return "simulate";
  if (pressureScore >= 60) return "supervised";
  return "observe";
}

export async function evaluateOperatingState(params: EvaluateStateParams) {
  const admin = createAdminSupabaseClient();
  const { data: state, error: stateError } = await admin
    .from("operating_states")
    .select("*")
    .eq("id", params.stateId)
    .single();

  if (stateError || !state) throw new Error(`Failed to load operating state: ${stateError?.message ?? "not found"}`);

  const targetConfig = (state.target_config ?? {}) as Record<string, unknown>;
  const watchConfig = (state.watch_config ?? {}) as Record<string, unknown>;
  const approvalPolicy = (state.approval_policy ?? {}) as Record<string, unknown>;
  const departmentId = textConfig(watchConfig, "department_id") ?? textConfig(targetConfig, "department_id");
  const slaMinutes = numberConfig(targetConfig, "sla_minutes", 15);
  const maxOpenTasks = numberConfig(targetConfig, "max_open_tasks", 3);
  const unresolvedSignalLimit = numberConfig(targetConfig, "unresolved_signal_limit", 1);
  const approvalBacklogLimit = numberConfig(targetConfig, "approval_backlog_limit", 1);

  const [signalRows, taskRows, approvalRows, previousEvaluationRows] = await Promise.all([
    admin
      .from("signals")
      .select("*")
      .eq("workspace_id", state.workspace_id)
      .in("status", ["new", "acknowledged", "in_progress"])
      .limit(50),
    (() => {
      let query = admin
        .from("office_tasks")
        .select("*")
        .eq("user_id", params.userId)
        .in("status", ["queued", "running", "waiting_approval", "failed"])
        .limit(100);
      if (departmentId) query = query.eq("department_id", departmentId);
      return query;
    })(),
    admin
      .from("approvals")
      .select("*")
      .eq("user_id", params.userId)
      .eq("status", "pending")
      .limit(50),
    admin
      .from("state_evaluations")
      .select("*")
      .eq("state_id", state.id)
      .order("evaluated_at", { ascending: false })
      .limit(1),
  ]);

  const signals = (signalRows.data ?? []) as Array<Record<string, unknown>>;
  const tasks = (taskRows.data ?? []) as Array<Record<string, unknown>>;
  const approvals = (approvalRows.data ?? []) as Array<Record<string, unknown>>;
  const previousEvaluation = ((previousEvaluationRows.data ?? [])[0] ?? null) as StateEvaluationRecord | null;

  const now = Date.now();
  const agedTasks = tasks.filter((task) => {
    const createdAt = typeof task.created_at === "string" ? Date.parse(task.created_at) : NaN;
    return Number.isFinite(createdAt) && now - createdAt > slaMinutes * 60_000;
  }).length;
  const failedTasks = tasks.filter((task) => task.status === "failed").length;
  const waitingApprovals = approvals.length;
  const unresolvedSignals = signals.length;
  const criticalSignals = signals.filter((signal) => signal.severity === "critical" || signal.severity === "high").length;

  const pressureScore = Math.min(
    100,
    agedTasks * 18 +
      failedTasks * 22 +
      Math.max(0, tasks.length - maxOpenTasks) * 12 +
      Math.max(0, unresolvedSignals - unresolvedSignalLimit) * 14 +
      Math.max(0, waitingApprovals - approvalBacklogLimit) * 10 +
      criticalSignals * 10,
  );

  const healthScore = Math.max(0, Math.min(100, 100 - pressureScore));
  const healthStatus = buildHealthStatus({
    pressureScore,
    previousHealth: (state.health_status as StateHealth) ?? "unknown",
    unresolvedSignals,
    failedTasks,
  });
  const driftSummary =
    pressureScore === 0
      ? "No meaningful drift detected right now."
      : [
          agedTasks ? `${agedTasks} task${agedTasks === 1 ? "" : "s"} beyond the expected response window` : null,
          failedTasks ? `${failedTasks} failed task${failedTasks === 1 ? "" : "s"}` : null,
          unresolvedSignals ? `${unresolvedSignals} unresolved signal${unresolvedSignals === 1 ? "" : "s"}` : null,
          waitingApprovals ? `${waitingApprovals} pending approval${waitingApprovals === 1 ? "" : "s"}` : null,
        ]
          .filter(Boolean)
          .join("; ");

  const recommendedAction =
    pressureScore >= 85
      ? "Escalate immediately and hold execution behind approval."
      : pressureScore >= 60
        ? "Generate supervised recovery work and surface it to the owner."
        : pressureScore >= 35
          ? "Watch closely and prepare recovery actions."
          : "Continue monitoring.";

  const evidence = {
    open_task_count: tasks.length,
    aged_task_count: agedTasks,
    failed_task_count: failedTasks,
    unresolved_signal_count: unresolvedSignals,
    pending_approval_count: waitingApprovals,
    critical_signal_count: criticalSignals,
    department_id: departmentId,
  };

  const { data: evaluation, error: evaluationError } = await admin
    .from("state_evaluations")
    .insert({
      state_id: state.id,
      workspace_id: state.workspace_id,
      desk_id: state.desk_id,
      health_status: healthStatus,
      health_score: Number((healthScore / 100).toFixed(2)),
      pressure_score: Number(pressureScore.toFixed(2)),
      drift_summary: driftSummary,
      evidence,
      recommended_action: recommendedAction,
    })
    .select("*")
    .single();

  if (evaluationError || !evaluation) throw new Error(`Failed to store state evaluation: ${evaluationError?.message ?? "unknown error"}`);

  await admin
    .from("operating_states")
    .update({
      health_status: healthStatus,
      last_evaluated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", state.id);

  let pressureEvent: PressureEventRecord | null = null;
  if (pressureScore >= 35) {
    const { data } = await admin
      .from("pressure_events")
      .insert({
        workspace_id: state.workspace_id,
        desk_id: state.desk_id,
        state_id: state.id,
        coworker_id: state.coworker_id ?? null,
        severity: buildSeverity(pressureScore),
        pressure_score: Number(pressureScore.toFixed(2)),
        title: `${state.title} drift detected`,
        summary: driftSummary,
        metadata: evidence,
      })
      .select("*")
      .single();
    pressureEvent = (data ?? null) as PressureEventRecord | null;
  }

  let actionCandidate: ActionCandidateRecord | null = null;
  if (pressureScore >= 60) {
    const { data: existingCandidate } = await admin
      .from("action_candidates")
      .select("*")
      .eq("state_id", state.id)
      .in("status", ["open", "approved", "executing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existingCandidate) {
      const { data } = await admin
        .from("action_candidates")
        .insert({
          workspace_id: state.workspace_id,
          desk_id: state.desk_id,
          state_id: state.id,
          coworker_id: state.coworker_id ?? null,
          title: `${state.title} recovery`,
          summary: recommendedAction,
          action_kind: pressureScore >= 85 ? "approval" : "task",
          execution_mode: buildExecutionMode(pressureScore, approvalPolicy),
          risk_level: buildSeverity(pressureScore),
          confidence: Number(Math.max(0.45, Math.min(0.98, 1 - pressureScore / 180)).toFixed(2)),
          payload: {
            state_id: state.id,
            state_title: state.title,
            drift_summary: driftSummary,
            evidence,
          },
          status: "open",
        })
        .select("*")
        .single();
      actionCandidate = (data ?? null) as ActionCandidateRecord | null;
    }
  }

  return {
    state: state as OperatingStateRecord,
    evaluation: evaluation as StateEvaluationRecord,
    pressure_event: pressureEvent,
    action_candidate: actionCandidate,
    previous_evaluation: previousEvaluation,
  };
}

export async function evaluateWorkspaceStates(params: WorkspaceStateQuery) {
  const states = await listOperatingStates({ ...params, status: "active" });
  const results: Array<Awaited<ReturnType<typeof evaluateOperatingState>>> = [];
  for (const state of states) {
    results.push(await evaluateOperatingState({ userId: params.userId, stateId: state.id }));
  }
  return results;
}
