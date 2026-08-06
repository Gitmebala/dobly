import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildDoblyWorkspaceSnapshot } from "@/lib/dobly-ops";
import { isConnectionOperational } from "@/lib/connection-readiness";
import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";
import { listRuntimeApprovals, type RuntimeApprovalRecord } from "@/lib/runtime/approvals";
import { getSignalSummary } from "@/lib/signals/service";
import type { Approval, Connection, Workflow, WorkflowRun, WorkflowVersion } from "@/types";
import DoblyDashboardClient from "./DoblyDashboardClient";

export default async function DoblyDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ justOnboarded?: string }>;
}) {
  const justOnboarded = (await searchParams)?.justOnboarded === "1";
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const operatorsPromise = listDoblyOperators({ userId: user.id }).catch((): OperatorWithLoops[] => []);
  // The coworker runtime writes approvals to `runtime_approvals`, NOT the
  // legacy `approvals` table this page used to read exclusively. That is why
  // the home page could say "Nothing needs your decision right now" and show
  // "0 AWAITING YOU" while a real approval was sitting pending - and why
  // /dashboard/approvals (which reads runtime approvals correctly) disagreed
  // with the home page about how much was waiting.
  const runtimeApprovalsPromise = listRuntimeApprovals({ userId: user.id, status: "pending" }).catch(
    (): RuntimeApprovalRecord[] => [],
  );
  const signalSummaryPromise = getSignalSummary(user.id).catch(() => ({
    totalSignals: 0,
    unresolvedSignals: 0,
    criticalSignals: 0,
    byType: {} as Record<string, number>,
    byImpact: {} as Record<string, number>,
    recentSignals: [] as Array<{ id: string; title: string; description: string; signal_type: string; impact_level: string; created_at: string }>,
  }));
  const [
    { data: profile },
    { data: businessProfile },
    { data: workflows },
    { data: runs },
    { data: approvals },
    { data: connections },
    { data: versions },
    { data: runtimeRuns },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("business_profiles").select("*").eq("user_id", user.id).single(),
    // The workflow builder is retired - Build now creates a dobly_operator, so
    // this legacy table no longer receives new rows. Kept only to fold any
    // historical rows into the workspace snapshot's numbers below.
    supabase.from("workflows").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(8),
    supabase.from("workflow_runs").select("*").eq("user_id", user.id).order("started_at", { ascending: false }).limit(10),
    supabase.from("approvals").select("*").eq("user_id", user.id).order("requested_at", { ascending: false }).limit(5),
    supabase.from("connections").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(6),
    supabase.from("workflow_versions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    // Coworker runs live in software_execution_runs, NOT workflow_runs - the
    // legacy table only ever has rows from the old workflow-builder product.
    // "RUNS TODAY" read only workflow_runs, so it showed 0 no matter how much
    // real coworker work ran that day.
    supabase
      .from("software_execution_runs")
      .select("id, status, started_at, task")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(50) as unknown as PromiseLike<{ data: Array<{ id: string; status: string; started_at: string; task: string | null }> | null }>,
  ]);

  // Runtime approvals carry the same shape as legacy approvals apart from
  // workflow_id, so they can be presented as one queue. Without this merge the
  // home page silently under-reports what is actually waiting on the user.
  const runtimeApprovals = await runtimeApprovalsPromise;
  const mergedApprovals = [
    ...((approvals ?? []) as Approval[]),
    ...runtimeApprovals.map((approval) => ({
      ...approval,
      workflow_id: "",
    }) as unknown as Approval),
  ].sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());

  const RUNTIME_STATUS_TO_WORKFLOW_STATUS: Record<string, WorkflowRun["status"]> = {
    completed: "success",
    failed: "failed",
    not_configured: "failed",
    cancelled: "failed",
    running: "running",
    draft: "running",
    needs_approval: "awaiting_approval",
  };
  const mergedRuns = [
    ...((runs ?? []) as WorkflowRun[]),
    ...(runtimeRuns ?? []).map((run) => ({
      id: run.id,
      workflow_id: "",
      user_id: user.id,
      status: RUNTIME_STATUS_TO_WORKFLOW_STATUS[run.status] ?? "running",
      trigger_type: "manual",
      trigger_payload: {},
      started_at: run.started_at,
      finished_at: null,
      error_message: null,
      step_results: [],
    }) as unknown as WorkflowRun),
  ].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  // Runtime runs have no workflow_id (they belong to an operator, not a
  // legacy workflow), so their label has to travel by run id instead of the
  // workflowTitles-by-workflow_id lookup that only ever worked for legacy runs.
  const runLabels: Record<string, string> = {};
  for (const run of runtimeRuns ?? []) {
    runLabels[run.id] = run.task || "Coworker run";
  }

  const operators = await operatorsPromise;

  // "Active systems" and "time returned" used to come only from the legacy
  // workflows table, which stops growing once Build creates operators - so
  // this counted 0 active systems even with real, active coworkers running
  // loops. Operators don't track time_saved_minutes, so that stat is folded
  // in from the legacy rows only (historical, won't grow further).
  const operatorsAsWorkflows = operators.map((operator) => ({
    id: operator.id,
    title: operator.name,
    status: operator.status,
    time_saved_minutes: 0,
  })) as unknown as Workflow[];
  const legacyWorkflows = (workflows ?? []) as Workflow[];

  const snapshot = buildDoblyWorkspaceSnapshot({
    profile: profile ?? null,
    businessProfile: businessProfile ?? null,
    workflows: [...operatorsAsWorkflows, ...legacyWorkflows],
    runs: mergedRuns,
    approvals: mergedApprovals,
    connections: (connections ?? []) as Connection[],
    versions: (versions ?? []) as WorkflowVersion[],
  });

  const latestRuns = ((runs ?? []) as WorkflowRun[]).slice(0, 5);
  // Was reading only the raw legacy `approvals` array, so the sidebar
  // "Approvals" panel could say "No actions are waiting" while the "Needs
  // attention" panel (built from mergedApprovals) correctly counted a real
  // backlog of pending runtime approvals sitting right next to it.
  const latestApprovals = mergedApprovals.filter((approval) => approval.status === "pending").slice(0, 3);
  const latestConnections = ((connections ?? []) as Connection[]).slice(0, 4);
  const workflowTitles = Object.fromEntries(((workflows ?? []) as Workflow[]).map((workflow) => [workflow.id, workflow.title]));

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  // This must match /dashboard/onboarding's definition of "done" exactly.
  // It used to disagree in two ways, so the "Finish setup" line could never
  // disappear no matter what the user actually did:
  //   1. hasWorkflow counted rows in `workflows`, a legacy table the current
  //      product never writes to - hiring a coworker creates a row in
  //      `dobly_operators` (see createDoblyOperator), so this was always
  //      false. The onboarding wizard meanwhile counted operators and told
  //      the user they were finished.
  //   2. hasBusinessContext required `description`, which is optional in
  //      businessProfileSchema - so a user who completed the business form
  //      without that one optional field stayed "incomplete" forever.
  const onboarding = {
    hasBusinessContext: Boolean(businessProfile?.business_name),
    hasConnection: ((connections ?? []) as Connection[]).some(isConnectionOperational),
    hasWorkflow: operators.length > 0,
  };
  const team = operators.slice(0, 8).map((operator) => ({
    id: operator.id,
    name: operator.name,
    mission: operator.mission,
    status: operator.status,
    kind: operator.kind,
    lastRunAt: operator.last_run_at,
    loopCount: (operator.loops ?? []).filter((loop) => loop.status !== "archived").length,
  }));

  const signalSummary = await signalSummaryPromise;

  // A single at-a-glance score, built from things the user already sees
  // broken out individually elsewhere on this page (failed runs, stale
  // approvals, disconnected accounts, critical signals) - not a new
  // metric invented for this view, just those combined into one number.
  const pulseScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        snapshot.metrics.failedToday * 6 -
        Math.min(snapshot.metrics.waitingApprovals, 10) * 2 -
        snapshot.metrics.reconnectNeeded * 8 -
        signalSummary.criticalSignals * 5,
    ),
  );

  // "Operating systems" used to be recent rows from the legacy workflows
  // table. Now that Build creates operators, the equivalent live concept is
  // each coworker's loops - the recurring work actually running unattended.
  const recentLoops = operators
    .flatMap((operator) =>
      (operator.loops ?? [])
        .filter((loop) => loop.status !== "archived")
        .map((loop) => ({
          id: loop.id,
          name: loop.name,
          operatorId: operator.id,
          operatorName: operator.name,
          status: loop.status,
          updatedAt: loop.last_run_at ?? loop.updated_at,
        })),
    )
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <DoblyDashboardClient
      recentLoops={recentLoops}
      latestRuns={latestRuns}
      latestApprovals={latestApprovals}
      latestConnections={latestConnections}
      snapshot={snapshot}
      workflowTitles={workflowTitles}
      runLabels={runLabels}
      onboarding={onboarding}
      firstName={firstName}
      team={team}
      signalSummary={signalSummary}
      pulseScore={pulseScore}
      justOnboarded={justOnboarded}
    />
  );
}
