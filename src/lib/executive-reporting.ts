import { createBoardroomReport } from "@/lib/office/intelligence";
import { buildHomebaseDashboardData } from "@/lib/office/homebase";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getSignalSummary } from "@/lib/signals/service";
import type { Report } from "@/types";

async function safeRows<T>(callback: () => Promise<{ data: T[] | null; error: any }>) {
  try {
    const { data, error } = await callback();
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function buildExecutiveDashboardData(params: { userId: string; workspaceId?: string | null }) {
  const admin = createAdminSupabaseClient();
  const [office, boardroom, workflowRuns, approvals, reports, usageLogs, queueJobs, signalSummary] = await Promise.all([
    buildHomebaseDashboardData({ userId: params.userId, workspaceId: params.workspaceId }),
    createBoardroomReport({ userId: params.userId, workspaceId: params.workspaceId ?? null }),
    safeRows(() =>
      admin
        .from("workflow_runs")
        .select("*")
        .eq("user_id", params.userId)
        .order("started_at", { ascending: false })
        .limit(150),
    ),
    safeRows(() =>
      admin
        .from("approvals")
        .select("*")
        .eq("user_id", params.userId)
        .order("requested_at", { ascending: false })
        .limit(120),
    ),
    safeRows(() =>
      admin
        .from("reports")
        .select("*")
        .eq("user_id", params.userId)
        .order("created_at", { ascending: false })
        .limit(30),
    ) as Promise<Report[]>,
    safeRows(() =>
      admin
        .from("usage_logs")
        .select("*")
        .eq("user_id", params.userId)
        .order("created_at", { ascending: false })
        .limit(250),
    ),
    safeRows(() =>
      admin
        .from("job_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ),
    getSignalSummary(params.userId).catch(() => ({
      totalSignals: 0,
      unresolvedSignals: 0,
      criticalSignals: 0,
      byType: {},
      byImpact: {},
      recentSignals: [],
    })),
  ]);

  const completedRuns = workflowRuns.filter((run: any) => /success|completed/i.test(String(run.status ?? "")));
  const failedRuns = workflowRuns.filter((run: any) => /failed|error/i.test(String(run.status ?? "")));
  const runningRuns = workflowRuns.filter((run: any) => /running/i.test(String(run.status ?? "")));
  const pendingApprovals = approvals.filter((approval: any) => String(approval.status ?? "") === "pending");
  const approvalAges = pendingApprovals
    .map((approval: any) => hoursSince(approval.requested_at))
    .filter((value) => value >= 0);
  const staleApprovals = approvalAges.filter((value) => value >= 12).length;

  const durations = completedRuns
    .map((run: any) => minutesBetween(run.started_at, run.finished_at ?? run.completed_at ?? run.updated_at))
    .filter((value) => value > 0);

  const workflowSummary = {
    totalRuns: workflowRuns.length,
    successRate: workflowRuns.length > 0 ? completedRuns.length / workflowRuns.length : 0,
    failureRate: workflowRuns.length > 0 ? failedRuns.length / workflowRuns.length : 0,
    runningNow: runningRuns.length,
    avgDurationMinutes: average(durations, 0),
  };

  const costSummary = {
    totalUsageEvents: usageLogs.length,
    estimatedOpsLoad: usageLogs.length + workflowRuns.length + office.tasks.length,
    queuedJobs: queueJobs.filter((job: any) => String(job.status ?? "") === "queued").length,
    failedJobs: queueJobs.filter((job: any) => String(job.status ?? "") === "failed").length,
  };

  const latestReports = (reports as Report[]).slice(0, 8);

  return {
    office,
    boardroom,
    signalSummary,
    workflowSummary,
    approvalSummary: {
      pending: pendingApprovals.length,
      stale: staleApprovals,
      avgAgeHours: average(approvalAges, 0),
    },
    costSummary,
    latestReports,
    queueJobs,
  };
}

export function boardroomReportToMarkdown(report: Awaited<ReturnType<typeof createBoardroomReport>>) {
  const lines = [
    `# Dobly Boardroom Report`,
    ``,
    `Period: ${report.period}`,
    `Question: ${report.strategicQuestion}`,
    ``,
    `## Synthesis`,
    report.synthesis,
    ``,
    `## Strategic Metrics`,
    ...report.strategicMetrics.map((metric) => `- ${metric.label}: ${metric.value} — ${metric.interpretation}`),
    ``,
    `## Owner Decisions`,
    ...(report.ownerDecisions.length > 0 ? report.ownerDecisions.map((item) => `- ${item}`) : ["- No boardroom decisions are currently queued."]),
    ``,
    `## Strategic Risks`,
    ...(report.strategicRisks.length > 0 ? report.strategicRisks.map((item) => `- ${item}`) : ["- No major strategic risks surfaced."]),
    ``,
    `## Strategic Opportunities`,
    ...(report.strategicOpportunities.length > 0
      ? report.strategicOpportunities.map((item) => `- ${item}`)
      : ["- No major strategic opportunities surfaced yet."]),
    ``,
    `## Boardroom Members`,
    ...report.members.flatMap((member) => [
      `### ${member.role} — ${member.agentName}`,
      `Mandate: ${member.mandate}`,
      `Finding: ${member.finding}`,
      `Recommendation: ${member.recommendation}`,
      `Confidence: ${member.confidence}`,
      ``,
    ]),
  ];

  return lines.join("\n");
}

export function buildExecutiveArtifacts(params: {
  boardroom: Awaited<ReturnType<typeof createBoardroomReport>>;
  reports: Report[];
}) {
  const boardroomJson = JSON.stringify(params.boardroom, null, 2);
  const boardroomMarkdown = boardroomReportToMarkdown(params.boardroom);
  return {
    boardroomJson,
    boardroomMarkdown,
    reportCards: params.reports.map((report) => ({
      id: report.id,
      title: report.title,
      reportType: report.report_type,
      createdAt: report.created_at,
      deliveryStatus: report.delivery_status,
      body: report.body,
    })),
  };
}

function average(values: number[], fallback: number) {
  if (values.length === 0) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function minutesBetween(start: unknown, end: unknown) {
  const startMs = Date.parse(String(start ?? ""));
  const endMs = Date.parse(String(end ?? ""));
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  return (endMs - startMs) / 60000;
}

function hoursSince(value: unknown) {
  const time = Date.parse(String(value ?? ""));
  if (!Number.isFinite(time)) return -1;
  return (Date.now() - time) / 3600000;
}
