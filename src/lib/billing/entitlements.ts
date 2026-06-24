import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  canUseChannel,
  canUseDepartment,
  getDoblyPlan,
  type DoblyPlanId,
} from "@/lib/billing/plans";
import type { BusinessChannelId } from "@/lib/business-channels";
import type { LaunchDepartmentId } from "@/lib/department-bundles";

export type UsageMetric =
  | "ai_actions"
  | "automation_runs"
  | "chatbot_conversations"
  | "voice_minutes"
  | "sms_messages"
  | "whatsapp_conversations"
  | "memory_items"
  | "workers"
  | "departments"
  | "business_channels";

export interface EntitlementCheckResult {
  allowed: boolean;
  planId: DoblyPlanId;
  planName: string;
  reason?: string;
  limit?: number;
  used?: number;
  remaining?: number;
  overage?: number;
  windowStart?: string;
  windowEnd?: string;
}

const METRIC_TO_LIMIT: Record<UsageMetric, keyof ReturnType<typeof getDoblyPlan>["entitlements"]> = {
  ai_actions: "aiActions",
  automation_runs: "automationRuns",
  chatbot_conversations: "chatbotConversations",
  voice_minutes: "voiceMinutes",
  sms_messages: "smsMessages",
  whatsapp_conversations: "whatsappConversations",
  memory_items: "memoryItems",
  workers: "workers",
  departments: "departments",
  business_channels: "businessChannels",
};

export async function getUserPlanId(userId: string): Promise<DoblyPlanId> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = String((data as any)?.plan ?? "free");
  if (["free", "starter", "operator", "business", "command"].includes(plan)) return plan as DoblyPlanId;
  return "free";
}

function currentBillingWindow() {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

async function countRows(params: {
  table: string;
  userId: string;
  workspaceId?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from(params.table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", params.userId);

  if (params.workspaceId) query = query.eq("workspace_id", params.workspaceId);

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export async function getUsageCount(params: {
  metric: UsageMetric;
  userId: string;
  workspaceId?: string | null;
}) {
  if (params.metric === "memory_items") {
    return countRows({ table: "business_memory_items", userId: params.userId, workspaceId: params.workspaceId });
  }
  if (params.metric === "workers") {
    const [operators, officeWorkers] = await Promise.all([
      countRows({ table: "dobly_operators", userId: params.userId, workspaceId: params.workspaceId }),
      countRows({ table: "office_workers", userId: params.userId, workspaceId: params.workspaceId }),
    ]);
    return Math.max(operators, officeWorkers);
  }
  if (params.metric === "business_channels") {
    return countRows({ table: "business_channel_connections", userId: params.userId, workspaceId: params.workspaceId });
  }
  if (params.metric === "departments") {
    const admin = createAdminSupabaseClient();
    let operatorQuery = admin.from("dobly_operators").select("kind, scope").eq("user_id", params.userId);
    if (params.workspaceId) operatorQuery = operatorQuery.eq("workspace_id", params.workspaceId);
    const { data: operators } = await operatorQuery;
    if (operators?.length) {
      return new Set((operators ?? []).map((row: any) => String(row.scope ?? row.kind ?? "custom").split(".")[0])).size;
    }
    let query = admin.from("office_workers").select("department_id").eq("user_id", params.userId);
    if (params.workspaceId) query = query.eq("workspace_id", params.workspaceId);
    const { data, error } = await query;
    if (error) return 0;
    return new Set((data ?? []).map((row: any) => row.department_id)).size;
  }

  const admin = createAdminSupabaseClient();
  let query = admin
    .from("usage_events")
    .select("quantity")
    .eq("user_id", params.userId)
    .eq("metric", params.metric);
  if (params.workspaceId) query = query.eq("workspace_id", params.workspaceId);
  const window = currentBillingWindow();
  query = query.gte("created_at", window.start).lt("created_at", window.end);

  const { data, error } = await query;
  if (error) return 0;
  return (data ?? []).reduce((sum: number, row: any) => sum + Number(row.quantity ?? 0), 0);
}

export async function checkUsageEntitlement(params: {
  userId: string;
  metric: UsageMetric;
  quantity?: number;
  workspaceId?: string | null;
}): Promise<EntitlementCheckResult> {
  const planId = await getUserPlanId(params.userId);
  const plan = getDoblyPlan(planId);
  const limit = Number(plan.entitlements[METRIC_TO_LIMIT[params.metric]] ?? 0);
  const used = await getUsageCount({
    metric: params.metric,
    userId: params.userId,
    workspaceId: params.workspaceId,
  });
  const next = used + (params.quantity ?? 1);
  const window = currentBillingWindow();

  return {
    allowed: next <= limit,
    planId,
    planName: plan.name,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    overage: Math.max(0, next - limit),
    windowStart: window.start,
    windowEnd: window.end,
    reason: next <= limit ? undefined : `${plan.name} includes ${limit} ${params.metric.replaceAll("_", " ")}.`,
  };
}

export async function getUsageSummary(params: {
  userId: string;
  workspaceId?: string | null;
}) {
  const planId = await getUserPlanId(params.userId);
  const plan = getDoblyPlan(planId);
  const window = currentBillingWindow();
  const metrics: UsageMetric[] = [
    "ai_actions",
    "automation_runs",
    "chatbot_conversations",
    "voice_minutes",
    "sms_messages",
    "whatsapp_conversations",
    "memory_items",
    "workers",
    "departments",
    "business_channels",
  ];

  const entries = await Promise.all(
    metrics.map(async (metric) => {
      const used = await getUsageCount({
        metric,
        userId: params.userId,
        workspaceId: params.workspaceId,
      });
      const limit = Number(plan.entitlements[METRIC_TO_LIMIT[metric]] ?? 0);
      const ratio = limit > 0 ? used / limit : 0;
      return {
        metric,
        used,
        limit,
        remaining: Math.max(0, limit - used),
        overage: Math.max(0, used - limit),
        status: used > limit ? "over" : ratio >= 0.9 ? "warning" : "ok",
      };
    })
  );

  return {
    planId,
    planName: plan.name,
    windowStart: window.start,
    windowEnd: window.end,
    metrics: entries,
  };
}

export async function checkDepartmentEntitlement(params: {
  userId: string;
  departmentId: LaunchDepartmentId;
}) {
  const planId = await getUserPlanId(params.userId);
  const plan = getDoblyPlan(planId);
  const allowed = canUseDepartment(planId, params.departmentId);

  return {
    allowed,
    planId,
    planName: plan.name,
    reason: allowed ? undefined : `${plan.name} does not include the ${params.departmentId} department.`,
  };
}

export async function checkChannelEntitlement(params: {
  userId: string;
  channelId: BusinessChannelId;
}) {
  const planId = await getUserPlanId(params.userId);
  const plan = getDoblyPlan(planId);
  const allowed = canUseChannel(planId, params.channelId);

  return {
    allowed,
    planId,
    planName: plan.name,
    reason: allowed ? undefined : `${plan.name} does not include ${params.channelId.replaceAll("_", " ")}.`,
  };
}

export async function recordUsageEvent(params: {
  userId: string;
  workspaceId?: string | null;
  metric: UsageMetric;
  quantity?: number;
  source: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  await admin.from("usage_events").insert({
    user_id: params.userId,
    workspace_id: params.workspaceId ?? null,
    metric: params.metric,
    quantity: params.quantity ?? 1,
    source: params.source,
    metadata: params.metadata ?? {},
  });
}
