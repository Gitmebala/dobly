import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { PLANS, type Plan, type PlanId, type PlanUsageSnapshot, type WorkflowHealthStatus } from "@/types";

function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function getPlanConfig(planId: PlanId): Plan {
  return PLANS.find((plan) => plan.id === planId) ?? PLANS[0]!;
}

export async function getPlanUsageSnapshot(userId: string, planId: PlanId): Promise<PlanUsageSnapshot> {
  const admin = createAdminSupabaseClient();
  const plan = getPlanConfig(planId);
  const monthStart = monthStartIso();

  const [{ count: workflowCount }, { count: standardExecutions }, { count: intelligenceActions }] =
    await Promise.all([
      admin.from("workflows").select("*", { count: "exact", head: true }).eq("user_id", userId),
      admin
        .from("usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action", "standard_execution")
        .gte("created_at", monthStart),
      admin
        .from("usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action", "intelligence_action")
        .gte("created_at", monthStart),
    ]);

  return {
    plan_id: planId,
    workflow_count: workflowCount ?? 0,
    standard_executions_used: standardExecutions ?? 0,
    standard_executions_limit: plan.max_standard_executions,
    intelligence_actions_used: intelligenceActions ?? 0,
    intelligence_actions_limit: plan.max_intelligence_actions,
  };
}

export async function canCreateWorkflow(userId: string, planId: PlanId) {
  const usage = await getPlanUsageSnapshot(userId, planId);
  const plan = getPlanConfig(planId);
  return {
    allowed: plan.max_workflows === -1 || usage.workflow_count < plan.max_workflows,
    usage,
    plan,
  };
}

export async function canConsumeStandardExecution(userId: string, planId: PlanId) {
  const usage = await getPlanUsageSnapshot(userId, planId);
  return {
    allowed: usage.standard_executions_limit === -1 || usage.standard_executions_used < usage.standard_executions_limit,
    usage,
  };
}

export function percentUsed(used: number, limit: number) {
  if (limit === -1 || limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function deriveWorkflowHealth(params: {
  lastRunStatus?: string | null;
  successRateLastTen?: number;
  credentialsExpiringSoon?: boolean;
}) {
  if (params.lastRunStatus === "failed") return "red" satisfies WorkflowHealthStatus;
  if (params.credentialsExpiringSoon) return "amber" satisfies WorkflowHealthStatus;
  if ((params.successRateLastTen ?? 1) < 0.9) return "amber" satisfies WorkflowHealthStatus;
  return "green" satisfies WorkflowHealthStatus;
}

export function explainWorkflowFailure(rawMessage: string) {
  const message = rawMessage.toLowerCase();

  if (message.includes("expired") && message.includes("token")) {
    return "A connected account expired. Reconnect it once and Dobly can replay the run automatically.";
  }
  if (message.includes("rate limit")) {
    return "The connected service temporarily slowed Dobly down. The run can be retried automatically in a moment.";
  }
  if (message.includes("not found")) {
    return "Dobly could not find something it expected in the connected app. Check that the linked resource still exists.";
  }
  if (message.includes("approval")) {
    return "This run stopped because Dobly needs your approval before it can continue.";
  }

  return "This automation hit a problem during execution. Dobly saved the failed run so you can review it and retry safely.";
}
