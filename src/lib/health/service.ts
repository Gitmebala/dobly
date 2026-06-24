import { loadDepartmentOperatingData } from "@/lib/department-records";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { CoworkerHealth, HealthState } from "@/types";

interface CreateHealthSnapshotParams {
  coworkerId: string;
  periodStart: string;
  periodEnd: string;
  metrics: {
    responseSpeed?: number;
    resolutionRate?: number;
    escalationRate?: number;
    overrideRate?: number;
    conversionRate?: number;
    revenueCaptured?: number;
    revenueRecovered?: number;
    timeSavedHours?: number;
  };
  mistakes?: Array<{ type: string; count: number; description: string }>;
  improvements?: Array<{ type: string; impact: number; description: string }>;
}

interface CalculateHealthScoresParams {
  coworkerId: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
}

type CoworkerRow = {
  id: string;
  user_id: string;
  desk: string;
  role: string;
  tools: string[] | null;
  trust_score: number | null;
  value_score: number | null;
  health_score: number | null;
};

export async function createHealthSnapshot(params: CreateHealthSnapshotParams): Promise<CoworkerHealth> {
  const admin = createAdminSupabaseClient();
  const scores = calculateHealthScores(params.metrics);
  const healthState = determineHealthState(scores, params.mistakes || []);

  const { data, error } = await admin
    .from("coworker_health")
    .insert({
      coworker_id: params.coworkerId,
      autonomy_score: scores.autonomy,
      trust_score: scores.trust,
      quality_score: scores.quality,
      value_score: scores.value,
      response_speed: params.metrics.responseSpeed || 0,
      resolution_rate: params.metrics.resolutionRate || 0,
      escalation_rate: params.metrics.escalationRate || 0,
      override_rate: params.metrics.overrideRate || 0,
      conversion_rate: params.metrics.conversionRate || 0,
      revenue_captured: params.metrics.revenueCaptured || 0,
      revenue_recovered: params.metrics.revenueRecovered || 0,
      time_saved_hours: params.metrics.timeSavedHours || 0,
      recent_mistakes: params.mistakes || [],
      top_improvements: params.improvements || [],
      health_state: healthState,
      period_start: params.periodStart,
      period_end: params.periodEnd,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create health snapshot: ${error.message}`);
  }

  await updateCoworkerHealthScores(params.coworkerId, scores);
  return data as CoworkerHealth;
}

export async function calculateCoworkerHealth(params: CalculateHealthScoresParams): Promise<{
  healthSnapshot: CoworkerHealth;
  trends: {
    autonomyTrend: "improving" | "stable" | "declining";
    trustTrend: "improving" | "stable" | "declining";
    qualityTrend: "improving" | "stable" | "declining";
    valueTrend: "improving" | "stable" | "declining";
  };
  recommendations: string[];
}> {
  const admin = createAdminSupabaseClient();
  const coworker = await getCoworkerRow(params.coworkerId, params.userId);
  if (!coworker) {
    throw new Error("Coworker not found");
  }

  const departmentIds = mapDeskToDepartments(coworker.desk);
  const [officeTasks, workflowRuns, shadowRuns, simulations, approvals, operatingData] = await Promise.all([
    safeRows(() => {
      let query = admin
        .from("office_tasks")
        .select("*")
        .eq("user_id", params.userId)
        .gte("created_at", params.periodStart)
        .order("created_at", { ascending: false })
        .limit(200);
      if (departmentIds.length > 0) query = query.in("department_id", departmentIds);
      return query;
    }),
    safeRows(() =>
      admin
        .from("workflow_runs")
        .select("*")
        .eq("user_id", params.userId)
        .gte("started_at", params.periodStart)
        .order("started_at", { ascending: false })
        .limit(120),
    ),
    safeRows(() =>
      admin
        .from("shadow_mode_runs")
        .select("*")
        .eq("coworker_id", params.coworkerId)
        .gte("created_at", params.periodStart)
        .order("created_at", { ascending: false })
        .limit(120),
    ),
    safeRows(() =>
      admin
        .from("simulations")
        .select("*")
        .eq("coworker_id", params.coworkerId)
        .gte("created_at", params.periodStart)
        .order("created_at", { ascending: false })
        .limit(80),
    ),
    safeRows(() =>
      admin
        .from("approvals")
        .select("*")
        .eq("user_id", params.userId)
        .gte("requested_at", params.periodStart)
        .order("requested_at", { ascending: false })
        .limit(120),
    ),
    Promise.all(
      departmentIds.map((departmentId) =>
        loadDepartmentOperatingData({
          userId: params.userId,
          departmentId,
        }),
      ),
    ),
  ]);

  const records = operatingData.flatMap((item) => item.records);
  const metrics = deriveCoworkerMetrics({
    coworker,
    officeTasks,
    workflowRuns,
    shadowRuns,
    simulations,
    approvals,
    records,
  });
  const mistakes = deriveMistakes(metrics, officeTasks, shadowRuns, simulations);
  const improvements = deriveImprovements(metrics, coworker, records);

  const healthSnapshot = await createHealthSnapshot({
    coworkerId: params.coworkerId,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    metrics,
    mistakes,
    improvements,
  });

  const previousSnapshots = (await getHealthSnapshots(params.coworkerId, params.userId, { limit: 6 })).filter(
    (snapshot) => snapshot.id !== healthSnapshot.id,
  );
  const trends = calculateTrends(healthSnapshot, previousSnapshots);
  const recommendations = generateHealthRecommendations(healthSnapshot, trends);

  return {
    healthSnapshot,
    trends,
    recommendations,
  };
}

export async function getHealthSnapshots(coworkerId: string, userId: string, filters?: {
  limit?: number;
}): Promise<CoworkerHealth[]> {
  const admin = createAdminSupabaseClient();
  let query = admin.from("coworker_health").select("*").eq("coworker_id", coworkerId).order("period_end", { ascending: false });
  if (filters?.limit) query = query.limit(filters.limit);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch health snapshots: ${error.message}`);
  return (data || []) as CoworkerHealth[];
}

export async function getLatestHealthSnapshot(coworkerId: string, userId: string): Promise<CoworkerHealth | null> {
  const snapshots = await getHealthSnapshots(coworkerId, userId, { limit: 1 });
  return snapshots[0] ?? null;
}

export async function getOverallHealthSummary(userId: string): Promise<{
  totalCoworkers: number;
  healthyCoworkers: number;
  needsAttentionCoworkers: number;
  underperformingCoworkers: number;
  averageScores: {
    autonomy: number;
    trust: number;
    quality: number;
    value: number;
  };
  byDesk: Record<string, { count: number; averageHealth: number }>;
}> {
  const admin = createAdminSupabaseClient();
  const { data: coworkers, error } = await admin
    .from("coworkers")
    .select("id, desk, health_score, trust_score, value_score")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to fetch coworkers: ${error.message}`);
  }

  const allCoworkers = coworkers ?? [];
  const totalCoworkers = allCoworkers.length;
  const snapshots = await Promise.all(allCoworkers.map((coworker: any) => getLatestHealthSnapshot(String(coworker.id), userId)));

  const healthStates = snapshots.filter(Boolean).map((snapshot) => snapshot as CoworkerHealth);
  const healthyCoworkers = healthStates.filter((snapshot) => snapshot.health_state === "reliable").length;
  const needsAttentionCoworkers = healthStates.filter((snapshot) =>
    ["needs_review", "over_escalating", "under_escalating"].includes(snapshot.health_state),
  ).length;
  const underperformingCoworkers = healthStates.filter((snapshot) => snapshot.health_state === "underperforming").length;

  const averageScores = {
    autonomy: average(healthStates.map((snapshot) => snapshot.autonomy_score), 0.5),
    trust: average(healthStates.map((snapshot) => snapshot.trust_score), 0.5),
    quality: average(healthStates.map((snapshot) => snapshot.quality_score), 0.5),
    value: average(healthStates.map((snapshot) => snapshot.value_score), 0.5),
  };

  const byDesk: Record<string, { count: number; averageHealth: number }> = {};
  for (const coworker of allCoworkers) {
    const desk = String((coworker as any).desk ?? "unknown");
    if (!byDesk[desk]) byDesk[desk] = { count: 0, averageHealth: 0 };
    byDesk[desk].count += 1;
    byDesk[desk].averageHealth += Number((coworker as any).health_score ?? 0.5);
  }
  for (const desk of Object.keys(byDesk)) {
    byDesk[desk].averageHealth = byDesk[desk].count > 0 ? byDesk[desk].averageHealth / byDesk[desk].count : 0.5;
  }

  return {
    totalCoworkers,
    healthyCoworkers,
    needsAttentionCoworkers,
    underperformingCoworkers,
    averageScores,
    byDesk,
  };
}

async function updateCoworkerHealthScores(
  coworkerId: string,
  scores: { autonomy: number; trust: number; quality: number; value: number },
): Promise<void> {
  const admin = createAdminSupabaseClient();
  await admin
    .from("coworkers")
    .update({
      health_score: scores.quality,
      trust_score: scores.trust,
      value_score: scores.value,
      last_health_check: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", coworkerId);
}

function calculateHealthScores(metrics: {
  responseSpeed?: number;
  resolutionRate?: number;
  escalationRate?: number;
  overrideRate?: number;
  conversionRate?: number;
  revenueCaptured?: number;
  revenueRecovered?: number;
  timeSavedHours?: number;
}): {
  autonomy: number;
  trust: number;
  quality: number;
  value: number;
} {
  const overrideRate = clamp(metrics.overrideRate ?? 0, 0, 1);
  const escalationRate = clamp(metrics.escalationRate ?? 0, 0, 1);
  const resolutionRate = clamp(metrics.resolutionRate ?? 0, 0, 1);
  const conversionRate = clamp(metrics.conversionRate ?? 0, 0, 1);
  const responseSpeed = Math.max(60, metrics.responseSpeed ?? 300);

  const autonomy = clamp(1 - overrideRate * 1.6 - escalationRate * 0.9, 0, 1);
  const trust = clamp(resolutionRate * 0.6 + Math.min(1, 900 / responseSpeed) * 0.25 + (1 - overrideRate) * 0.15, 0, 1);
  const quality = clamp(resolutionRate * 0.65 + conversionRate * 0.25 + (1 - escalationRate) * 0.1, 0, 1);

  const valueBase = (metrics.revenueCaptured ?? 0) + (metrics.revenueRecovered ?? 0);
  const value = clamp(valueBase / 250000 + (metrics.timeSavedHours ?? 0) / 80, 0, 1);

  return { autonomy, trust, quality, value };
}

function determineHealthState(
  scores: { autonomy: number; trust: number; quality: number; value: number },
  mistakes: Array<{ type: string; count: number; description: string }>,
): HealthState {
  const averageScore = (scores.autonomy + scores.trust + scores.quality + scores.value) / 4;
  const hasExcessiveEscalation = mistakes.some((mistake) => mistake.type === "excessive_escalation");
  const hasMissedEscalation = mistakes.some((mistake) => mistake.type === "missed_escalation");
  const hasQualityIssue = mistakes.some((mistake) => mistake.type === "quality_issue");

  if (averageScore < 0.4 || hasQualityIssue) return "underperforming";
  if (hasExcessiveEscalation) return "over_escalating";
  if (hasMissedEscalation) return "under_escalating";
  if (averageScore < 0.6) return "needs_review";
  if (averageScore < 0.8) return "learning";
  return "reliable";
}

function calculateTrends(
  current: CoworkerHealth,
  previous: CoworkerHealth[],
): {
  autonomyTrend: "improving" | "stable" | "declining";
  trustTrend: "improving" | "stable" | "declining";
  qualityTrend: "improving" | "stable" | "declining";
  valueTrend: "improving" | "stable" | "declining";
} {
  if (previous.length === 0) {
    return {
      autonomyTrend: "stable",
      trustTrend: "stable",
      qualityTrend: "stable",
      valueTrend: "stable",
    };
  }

  const baseline = {
    autonomy: average(previous.map((snapshot) => snapshot.autonomy_score), current.autonomy_score),
    trust: average(previous.map((snapshot) => snapshot.trust_score), current.trust_score),
    quality: average(previous.map((snapshot) => snapshot.quality_score), current.quality_score),
    value: average(previous.map((snapshot) => snapshot.value_score), current.value_score),
  };

  return {
    autonomyTrend: getTrend(current.autonomy_score, baseline.autonomy),
    trustTrend: getTrend(current.trust_score, baseline.trust),
    qualityTrend: getTrend(current.quality_score, baseline.quality),
    valueTrend: getTrend(current.value_score, baseline.value),
  };
}

function generateHealthRecommendations(
  health: CoworkerHealth,
  trends: {
    autonomyTrend: "improving" | "stable" | "declining";
    trustTrend: "improving" | "stable" | "declining";
    qualityTrend: "improving" | "stable" | "declining";
    valueTrend: "improving" | "stable" | "declining";
  },
): string[] {
  const recommendations: string[] = [];

  if (health.health_state === "underperforming") {
    recommendations.push("Quality is below the safe floor. Review the coworker scope, replay recent failures, and tighten approvals.");
  }
  if (health.health_state === "over_escalating") {
    recommendations.push("This coworker is escalating too often. Promote repeat-safe decisions into policy so work keeps moving.");
  }
  if (health.health_state === "under_escalating") {
    recommendations.push("Risk may be slipping through without enough owner review. Lower the autonomy threshold for sensitive actions.");
  }
  if (trends.trustTrend === "declining") {
    recommendations.push("Trust is slipping. Compare recent shadow decisions against owner edits and update the guidance pack.");
  }
  if (trends.qualityTrend === "declining") {
    recommendations.push("Resolution quality is trending down. Inspect repeated failure modes before expanding autonomy.");
  }
  if (health.response_speed > 900) {
    recommendations.push("Response speed is slow for live operations. Remove bottlenecks or add a faster deterministic path.");
  }
  if (health.resolution_rate < 0.7) {
    recommendations.push("Resolution rate is below target. Focus on the most common unresolved record type first.");
  }
  if (recommendations.length === 0) {
    recommendations.push("This coworker is holding up well. Keep recording shadow feedback so autonomy can graduate safely.");
  }

  return recommendations;
}

async function getCoworkerRow(coworkerId: string, userId: string): Promise<CoworkerRow | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("coworkers")
    .select("id,user_id,desk,role,tools,trust_score,value_score,health_score")
    .eq("id", coworkerId)
    .eq("user_id", userId)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`Failed to fetch coworker: ${error.message}`);
  return data as CoworkerRow;
}

function mapDeskToDepartments(desk: string): Array<any> {
  if (desk === "customer_desk") return ["reception", "sales"];
  if (desk === "finance_desk") return ["finance"];
  if (desk === "support_desk") return ["support"];
  if (desk === "operations_desk") return ["operations", "projects"];
  return ["reception"];
}

function deriveCoworkerMetrics(params: {
  coworker: CoworkerRow;
  officeTasks: any[];
  workflowRuns: any[];
  shadowRuns: any[];
  simulations: any[];
  approvals: any[];
  records: any[];
}) {
  const completedTasks = params.officeTasks.filter((task) => String(task.status) === "completed");
  const failedTasks = params.officeTasks.filter((task) => String(task.status) === "failed");
  const waitingApprovals = params.officeTasks.filter((task) => String(task.status) === "waiting_approval");
  const finishedRunDurations = params.workflowRuns
    .map((run) => secondsBetween(run.started_at, run.completed_at ?? run.finished_at ?? run.updated_at))
    .filter((value) => value > 0);
  const taskDurations = completedTasks
    .map((task) => secondsBetween(task.created_at, task.updated_at))
    .filter((value) => value > 0);

  const responseSpeed = average([...taskDurations, ...finishedRunDurations], 300);
  const totalOutcomeUnits = Math.max(completedTasks.length + failedTasks.length, 1);
  const resolutionRate = clamp(completedTasks.length / totalOutcomeUnits, 0, 1);

  const reviewedShadowRuns = params.shadowRuns.filter((run) => run.owner_approved !== null || run.was_correct !== null);
  const rejectedShadowRuns = reviewedShadowRuns.filter((run) => run.owner_approved === false || run.was_correct === false);
  const overrideRate = reviewedShadowRuns.length > 0 ? rejectedShadowRuns.length / reviewedShadowRuns.length : 0;
  const escalationRate = clamp(
    (waitingApprovals.length + params.simulations.filter((simulation) => simulation.outcome === "escalation").length) /
      Math.max(params.officeTasks.length + params.simulations.length, 1),
    0,
    1,
  );

  const { conversionRate, revenueCaptured, revenueRecovered } = deriveOutcomeMetrics(params.coworker.desk, params.records);
  const timeSavedHours =
    completedTasks.length * 0.2 +
    params.workflowRuns.filter((run) => /completed|success/i.test(String(run.status ?? ""))).length * 0.08 +
    reviewedShadowRuns.length * 0.05;

  return {
    responseSpeed,
    resolutionRate,
    escalationRate,
    overrideRate,
    conversionRate,
    revenueCaptured,
    revenueRecovered,
    timeSavedHours: Number(timeSavedHours.toFixed(1)),
  };
}

function deriveOutcomeMetrics(desk: string, records: any[]) {
  if (desk === "finance_desk") {
    const invoices = records.filter((record) => record.kind === "invoice");
    const paid = invoices.filter((invoice) => /paid|settled/i.test(String(invoice.status ?? "")));
    const overdue = invoices.filter((invoice) => /overdue|late/i.test(String(invoice.status ?? "")));
    return {
      conversionRate: invoices.length > 0 ? paid.length / invoices.length : 0.75,
      revenueCaptured: paid.reduce((sum, invoice) => sum + parseMoney(invoice.moneyLabel), 0),
      revenueRecovered: overdue.length > 0 ? overdue.reduce((sum, invoice) => sum + parseMoney(invoice.moneyLabel) * 0.15, 0) : 0,
    };
  }

  if (desk === "support_desk") {
    const cases = records.filter((record) => record.kind === "support_case");
    const resolved = cases.filter((record) => /resolved|closed/i.test(String(record.status ?? "")));
    return {
      conversionRate: cases.length > 0 ? resolved.length / cases.length : 0.8,
      revenueCaptured: 0,
      revenueRecovered: 0,
    };
  }

  if (desk === "operations_desk") {
    const items = records.filter((record) => record.kind === "operations_item");
    const closed = items.filter((record) => /done|resolved|closed|completed/i.test(String(record.status ?? "")));
    return {
      conversionRate: items.length > 0 ? closed.length / items.length : 0.78,
      revenueCaptured: 0,
      revenueRecovered: 0,
    };
  }

  const leads = records.filter((record) => record.kind === "lead");
  const qualified = leads.filter((record) => /qualified|won|booked|proposal/i.test(String(record.status ?? "")));
  return {
    conversionRate: leads.length > 0 ? qualified.length / leads.length : 0.72,
    revenueCaptured: qualified.reduce((sum, lead) => sum + parseMoney(lead.moneyLabel), 0),
    revenueRecovered: 0,
  };
}

function deriveMistakes(metrics: ReturnType<typeof deriveCoworkerMetrics>, officeTasks: any[], shadowRuns: any[], simulations: any[]) {
  const mistakes: Array<{ type: string; count: number; description: string }> = [];
  const failedTasks = officeTasks.filter((task) => String(task.status) === "failed").length;
  const incorrectShadowRuns = shadowRuns.filter((run) => run.was_correct === false).length;
  const escalations = officeTasks.filter((task) => String(task.status) === "waiting_approval").length;

  if (failedTasks >= 3) {
    mistakes.push({
      type: "quality_issue",
      count: failedTasks,
      description: `${failedTasks} live task${failedTasks === 1 ? "" : "s"} failed in the current review window.`,
    });
  }
  if (metrics.escalationRate > 0.35) {
    mistakes.push({
      type: "excessive_escalation",
      count: escalations,
      description: "Too many actions still require owner review, which is slowing the desk down.",
    });
  }
  if (incorrectShadowRuns >= 3 || simulations.filter((simulation) => simulation.outcome === "failure").length >= 2) {
    mistakes.push({
      type: "missed_escalation",
      count: incorrectShadowRuns,
      description: "Recent shadow or simulation results show the coworker still misses some judgment boundaries.",
    });
  }

  return mistakes;
}

function deriveImprovements(metrics: ReturnType<typeof deriveCoworkerMetrics>, coworker: CoworkerRow, records: any[]) {
  const improvements: Array<{ type: string; impact: number; description: string }> = [];
  if (metrics.conversionRate >= 0.7) {
    improvements.push({
      type: "conversion_strength",
      impact: Number(metrics.conversionRate.toFixed(2)),
      description: "This coworker is moving a healthy share of owned records to the desired next state.",
    });
  }
  if (metrics.timeSavedHours >= 6) {
    improvements.push({
      type: "time_saved",
      impact: Number(metrics.timeSavedHours.toFixed(1)),
      description: "Automation throughput is now saving meaningful manual follow-through time each week.",
    });
  }
  if ((coworker.tools ?? []).length >= 3 && records.length >= 6) {
    improvements.push({
      type: "tool_readiness",
      impact: clamp((coworker.tools ?? []).length / 5, 0, 1),
      description: "Tooling and operating context are strong enough to support broader safe autonomy.",
    });
  }
  return improvements;
}

async function safeRows(callback: () => Promise<{ data: any[] | null; error: any }>) {
  try {
    const { data, error } = await callback();
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

function average(values: number[], fallback: number) {
  if (values.length === 0) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseMoney(label: unknown) {
  const match = String(label ?? "").match(/([\d,]+(?:\.\d+)?)/);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
}

function secondsBetween(start: unknown, end: unknown) {
  const startMs = Date.parse(String(start ?? ""));
  const endMs = Date.parse(String(end ?? ""));
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  return Math.round((endMs - startMs) / 1000);
}

function getTrend(current: number, previous: number): "improving" | "stable" | "declining" {
  const threshold = 0.05;
  if (current > previous + threshold) return "improving";
  if (current < previous - threshold) return "declining";
  return "stable";
}
