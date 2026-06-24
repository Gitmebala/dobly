import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { ActionCandidateRecord, OperatingStateRecord } from "@/types";
import { OFFICE_DEPARTMENTS, OFFICE_WORKER_TEMPLATES } from "@/lib/office/departments";
import { listOfficeEvents } from "@/lib/office/events";
import { buildOfficeSnapshot } from "@/lib/office/snapshot";
import { loadDepartmentOperatingData } from "@/lib/department-records";
import type {
  OfficeDepartmentDefinition,
  OfficeDepartmentId,
  OfficeEventRecord,
  OfficeRiskLevel,
  OfficeTaskStatus,
  OfficeWorkerKind,
} from "@/lib/office/types";

type RoomTone = "signal" | "money" | "growth" | "support" | "ops" | "memory" | "leadership";

export interface HomebaseRoomVisual {
  x: number;
  y: number;
  tone: RoomTone;
  icon: string;
}

export interface HomebaseWorkerView {
  id: string;
  name: string;
  workerKey: string;
  departmentId: OfficeDepartmentId;
  runtimeKind: OfficeWorkerKind;
  mission: string;
  status: string;
  autonomyMode: string;
  healthScore: number;
  trustScore: number;
  updatedAt: string;
}

export interface HomebaseTaskView {
  id: string;
  departmentId: OfficeDepartmentId;
  workerKey: string;
  runtimeKind: OfficeWorkerKind | "system";
  title: string;
  summary: string;
  status: OfficeTaskStatus;
  riskLevel: OfficeRiskLevel;
  approvalRequired: boolean;
  toolName: string | null;
  toolPayload: Record<string, unknown>;
  createdAt: string;
}

export interface HomebaseDepartmentView extends OfficeDepartmentDefinition {
  visual: HomebaseRoomVisual;
  status: "quiet" | "active" | "needs_attention";
  activeWorkers: number;
  openTasks: number;
  approvalCount: number;
  operatingRecordCount: number;
  urgentRecordCount: number;
  latestEvent: string | null;
  templates: typeof OFFICE_WORKER_TEMPLATES;
}

export interface HomebaseStateView {
  id: string;
  deskId: string | null;
  title: string;
  objective: string;
  desiredCondition: string;
  stateType: OperatingStateRecord["state_type"];
  healthStatus: OperatingStateRecord["health_status"];
  targetMetric: string | null;
  lastEvaluatedAt: string | null;
}

export interface HomebaseActionCandidateView {
  id: string;
  stateId: string | null;
  deskId: string | null;
  title: string;
  summary: string;
  actionKind: ActionCandidateRecord["action_kind"];
  executionMode: ActionCandidateRecord["execution_mode"];
  riskLevel: ActionCandidateRecord["risk_level"];
  status: ActionCandidateRecord["status"];
  updatedAt: string;
}

export interface HomebaseDashboardData {
  snapshot: Awaited<ReturnType<typeof buildOfficeSnapshot>>;
  departments: HomebaseDepartmentView[];
  workers: HomebaseWorkerView[];
  tasks: HomebaseTaskView[];
  states: HomebaseStateView[];
  actionCandidates: HomebaseActionCandidateView[];
  recentEvents: OfficeEventRecord[];
}

const ROOM_VISUALS: Record<OfficeDepartmentId, HomebaseRoomVisual> = {
  reception: { x: 12, y: 34, tone: "signal", icon: "inbox" },
  marketing: { x: 28, y: 16, tone: "growth", icon: "megaphone" },
  creative: { x: 38, y: 26, tone: "growth", icon: "palette" },
  sales: { x: 30, y: 52, tone: "growth", icon: "briefcase" },
  finance: { x: 54, y: 54, tone: "money", icon: "wallet" },
  support: { x: 52, y: 20, tone: "support", icon: "lifebuoy" },
  engineering: { x: 62, y: 68, tone: "ops", icon: "code" },
  operations: { x: 76, y: 36, tone: "ops", icon: "boxes" },
  admin: { x: 70, y: 66, tone: "ops", icon: "calendar" },
  projects: { x: 46, y: 72, tone: "ops", icon: "kanban" },
  hr: { x: 86, y: 56, tone: "support", icon: "users" },
  growth: { x: 18, y: 74, tone: "growth", icon: "flask" },
  analytics: { x: 66, y: 18, tone: "memory", icon: "chart" },
  compliance: { x: 84, y: 24, tone: "ops", icon: "shield" },
  integrations: { x: 12, y: 58, tone: "signal", icon: "plug" },
  training_room: { x: 14, y: 82, tone: "memory", icon: "graduation" },
  filing_cabinet: { x: 50, y: 88, tone: "memory", icon: "archive" },
  general_manager: { x: 50, y: 8, tone: "leadership", icon: "radar" },
  boardroom: { x: 86, y: 10, tone: "leadership", icon: "crown" },
};

function toWorkerView(row: Record<string, unknown>): HomebaseWorkerView {
  return {
    id: String(row.id),
    name: String(row.name ?? "Coworker"),
    workerKey: String(row.worker_key ?? "worker"),
    departmentId: String(row.department_id ?? "reception") as OfficeDepartmentId,
    runtimeKind: String(row.runtime_kind ?? "automation") as OfficeWorkerKind,
    mission: String(row.mission ?? ""),
    status: String(row.status ?? "draft"),
    autonomyMode: String(row.autonomy_mode ?? "supervised"),
    healthScore: Number(row.health_score ?? 0.5),
    trustScore: Number(row.trust_score ?? 0.5),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function toTaskView(row: Record<string, unknown>): HomebaseTaskView {
  return {
    id: String(row.id),
    departmentId: String(row.department_id ?? "general_manager") as OfficeDepartmentId,
    workerKey: String(row.worker_key ?? "system"),
    runtimeKind: String(row.runtime_kind ?? "system") as OfficeWorkerKind | "system",
    title: String(row.title ?? "Office task"),
    summary: String(row.summary ?? ""),
    status: String(row.status ?? "queued") as OfficeTaskStatus,
    riskLevel: String(row.risk_level ?? "medium") as OfficeRiskLevel,
    approvalRequired: Boolean(row.approval_required),
    toolName: row.tool_name ? String(row.tool_name) : null,
    toolPayload: typeof row.tool_payload === "object" && row.tool_payload ? (row.tool_payload as Record<string, unknown>) : {},
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function toStateView(row: Record<string, unknown>): HomebaseStateView {
  return {
    id: String(row.id),
    deskId: row.desk_id ? String(row.desk_id) : null,
    title: String(row.title ?? "Operating state"),
    objective: String(row.objective ?? ""),
    desiredCondition: String(row.desired_condition ?? ""),
    stateType: String(row.state_type ?? "custom") as OperatingStateRecord["state_type"],
    healthStatus: String(row.health_status ?? "unknown") as OperatingStateRecord["health_status"],
    targetMetric: row.target_metric ? String(row.target_metric) : null,
    lastEvaluatedAt: row.last_evaluated_at ? String(row.last_evaluated_at) : null,
  };
}

function toActionCandidateView(row: Record<string, unknown>): HomebaseActionCandidateView {
  return {
    id: String(row.id),
    stateId: row.state_id ? String(row.state_id) : null,
    deskId: row.desk_id ? String(row.desk_id) : null,
    title: String(row.title ?? "Action candidate"),
    summary: String(row.summary ?? ""),
    actionKind: String(row.action_kind ?? "custom") as ActionCandidateRecord["action_kind"],
    executionMode: String(row.execution_mode ?? "observe") as ActionCandidateRecord["execution_mode"],
    riskLevel: String(row.risk_level ?? "medium") as ActionCandidateRecord["risk_level"],
    status: String(row.status ?? "open") as ActionCandidateRecord["status"],
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function roomStatus(value: unknown): HomebaseDepartmentView["status"] {
  if (value === "needs_attention" || value === "active" || value === "quiet") return value;
  return "quiet";
}

async function safeRows(
  callback: () => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>,
) {
  try {
    const { data, error } = await callback();
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function buildHomebaseDashboardData(params: {
  userId: string;
  workspaceId?: string | null;
}): Promise<HomebaseDashboardData> {
  const admin = createAdminSupabaseClient();
  const snapshot = await buildOfficeSnapshot(params);
  const workspaceIds = params.workspaceId
    ? [params.workspaceId]
    : (
        (
          await admin
            .from("workspaces")
            .select("id")
            .eq("owner_user_id", params.userId)
            .in("status", ["active", "paused"])
        ).data ?? []
      ).map((row: Record<string, unknown>) => String(row.id));

  const [workerRows, taskRows, stateRows, actionCandidateRows, recentEvents] = await Promise.all([
    safeRows(() => {
      let query = admin
        .from("office_workers")
        .select("*")
        .eq("user_id", params.userId)
        .in("status", ["active", "shadow", "paused"])
        .order("updated_at", { ascending: false })
        .limit(36);
      if (params.workspaceId) query = query.eq("workspace_id", params.workspaceId);
      return query;
    }),
    safeRows(() => {
      let query = admin
        .from("office_tasks")
        .select("*")
        .eq("user_id", params.userId)
        .in("status", ["queued", "running", "waiting_approval", "failed"])
        .order("created_at", { ascending: false })
        .limit(48);
      if (params.workspaceId) query = query.eq("workspace_id", params.workspaceId);
      return query;
    }),
    safeRows(() => {
      let query = admin
        .from("operating_states")
        .select("*")
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(24);
      if (workspaceIds.length) query = query.in("workspace_id", workspaceIds);
      else query = query.eq("workspace_id", "__none__");
      return query;
    }),
    safeRows(() => {
      let query = admin
        .from("action_candidates")
        .select("*")
        .in("status", ["open", "approved", "executing"])
        .order("updated_at", { ascending: false })
        .limit(24);
      if (workspaceIds.length) query = query.in("workspace_id", workspaceIds);
      else query = query.eq("workspace_id", "__none__");
      return query;
    }),
    listOfficeEvents({ userId: params.userId, workspaceId: params.workspaceId, limit: 12 }).catch(() => []),
  ]);

  const workers = workerRows.map(toWorkerView);
  const tasks = taskRows.map(toTaskView);
  const states = stateRows.map(toStateView);
  const actionCandidates = actionCandidateRows.map(toActionCandidateView);

  const operatingByDepartment = new Map(
    await Promise.all(
      OFFICE_DEPARTMENTS.map(async (definition) => {
        const operating = await loadDepartmentOperatingData({
          userId: params.userId,
          departmentId: definition.id,
        });
        return [definition.id, operating] as const;
      }),
    ),
  );

  const departments = OFFICE_DEPARTMENTS.map((definition) => {
    const snapshotRoom = snapshot.departments.find((department) => department.id === definition.id);
    const approvalCount = tasks.filter(
      (task) => task.departmentId === definition.id && task.status === "waiting_approval",
    ).length;
    const operating = operatingByDepartment.get(definition.id);
    const urgentRecordCount =
      operating?.records.filter((record) => record.priority === "high" || record.priority === "critical").length ?? 0;
    const status: HomebaseDepartmentView["status"] =
      snapshotRoom?.status === "needs_attention" || urgentRecordCount > 0
        ? "needs_attention"
        : roomStatus(snapshotRoom?.status);

    return {
      ...definition,
      visual: ROOM_VISUALS[definition.id],
      status,
      activeWorkers: snapshotRoom?.activeWorkers ?? 0,
      openTasks: snapshotRoom?.openTasks ?? 0,
      approvalCount,
      operatingRecordCount: operating?.records.length ?? 0,
      urgentRecordCount,
      latestEvent: snapshotRoom?.latestEvent ?? null,
      templates: OFFICE_WORKER_TEMPLATES.filter((template) => template.departmentId === definition.id),
    };
  });

  return {
    snapshot,
    departments,
    workers,
    tasks,
    states,
    actionCandidates,
    recentEvents,
  };
}

export function getRoomVisual(id: OfficeDepartmentId) {
  return ROOM_VISUALS[id];
}
