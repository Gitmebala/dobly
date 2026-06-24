import { OFFICE_DEPARTMENTS } from "@/lib/office/departments";
import { listOfficeEvents } from "@/lib/office/events";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { OfficeDepartmentId, OfficeSnapshot } from "@/lib/office/types";

async function safeQuery<T>(callback: () => Promise<{ data: T[] | null; error: any }>): Promise<T[]> {
  try {
    const { data, error } = await callback();
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function buildOfficeSnapshot(params: {
  userId: string;
  workspaceId?: string | null;
}): Promise<OfficeSnapshot> {
  const admin = createAdminSupabaseClient();
  const [events, tasks, workers, signals, connections] = await Promise.all([
    listOfficeEvents({ userId: params.userId, workspaceId: params.workspaceId, limit: 50 }).catch(() => []),
    safeQuery<Record<string, any>>(() => {
      let query = admin
        .from("office_tasks")
        .select("*")
        .eq("user_id", params.userId)
        .in("status", ["queued", "running", "waiting_approval", "failed"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (params.workspaceId) query = query.eq("workspace_id", params.workspaceId);
      return query;
    }),
    safeQuery<Record<string, any>>(() => {
      let query = admin
        .from("office_workers")
        .select("*")
        .eq("user_id", params.userId)
        .in("status", ["active", "shadow"])
        .order("updated_at", { ascending: false });
      if (params.workspaceId) query = query.eq("workspace_id", params.workspaceId);
      return query;
    }),
    safeQuery<Record<string, any>>(() =>
      admin
        .from("signals")
        .select("*")
        .eq("user_id", params.userId)
        .in("status", ["new", "acknowledged", "in_progress"])
        .limit(20),
    ),
    safeQuery<Record<string, any>>(() =>
      admin
        .from("connections")
        .select("*")
        .eq("user_id", params.userId)
        .in("status", ["expired", "error"])
        .limit(20),
    ),
  ]);

  const waitingApprovalTasks = tasks.filter((task) => task.status === "waiting_approval");
  const failedTasks = tasks.filter((task) => task.status === "failed");
  const highSignals = signals.filter((signal) =>
    ["high", "critical"].includes(String(signal.impact_level ?? signal.severity ?? ""))
  );

  const departments = OFFICE_DEPARTMENTS.map((department) => {
    const departmentEvents = events.filter((event) => event.departmentId === department.id);
    const departmentTasks = tasks.filter((task) => task.department_id === department.id);
    const departmentWorkers = workers.filter((worker) => worker.department_id === department.id);
    const needsAttention =
      departmentTasks.some((task) => ["waiting_approval", "failed"].includes(String(task.status))) ||
      departmentEvents.some((event) => ["high", "critical"].includes(event.riskLevel));

    return {
      id: department.id,
      name: department.name,
      status: needsAttention
        ? ("needs_attention" as const)
        : departmentEvents.length || departmentWorkers.length
          ? ("active" as const)
          : ("quiet" as const),
      activeWorkers: departmentWorkers.length,
      openTasks: departmentTasks.length,
      latestEvent: departmentEvents[0]?.title ?? null,
    };
  });

  const whatNeedsAttention = [
    ...waitingApprovalTasks.slice(0, 4).map((task) => String(task.title ?? "Action needs approval")),
    ...failedTasks.slice(0, 3).map((task) => String(task.title ?? "Worker task failed")),
    ...highSignals.slice(0, 3).map((signal) => String(signal.title ?? "High priority signal")),
    ...connections.slice(0, 3).map((connection) => `${String(connection.provider)} connection needs attention`),
  ].slice(0, 8);

  const whatHappened = events
    .slice(0, 8)
    .map((event) => event.summary || event.title)
    .filter(Boolean);

  const businessStatus =
    whatNeedsAttention.length > 3
      ? "Business needs attention"
      : whatNeedsAttention.length > 0
        ? "Business has items to review"
        : "Business is running";

  return {
    generatedAt: new Date().toISOString(),
    businessStatus,
    focusReason:
      whatNeedsAttention[0] ??
      whatHappened[0] ??
      "Dobly is watching conversations, content, money, and operations.",
    departments,
    metrics: {
      activeWorkers: workers.length,
      waitingApprovals: waitingApprovalTasks.length,
      openSignals: signals.length,
      recentEvents: events.length,
      integrationsNeedingAttention: connections.length,
    },
    whatNeedsAttention,
    whatHappened,
    needsDecision: waitingApprovalTasks.slice(0, 10),
    opportunities: signals
      .filter((signal) => /growth|demand|opportunity/i.test(String(signal.signal_type ?? signal.title ?? "")))
      .slice(0, 6),
    risks: [...highSignals, ...failedTasks].slice(0, 8),
  };
}

export function getLaunchDepartments(): OfficeDepartmentId[] {
  return OFFICE_DEPARTMENTS.filter((department) => department.launchPriority <= 6).map(
    (department) => department.id,
  );
}
