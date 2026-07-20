import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildDoblyWorkspaceSnapshot } from "@/lib/dobly-ops";
import { isConnectionOperational } from "@/lib/connection-readiness";
import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";
import type { Approval, Connection, Workflow, WorkflowRun, WorkflowVersion } from "@/types";
import DoblyDashboardClient from "./DoblyDashboardClient";

export default async function DoblyDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const operatorsPromise = listDoblyOperators({ userId: user.id }).catch((): OperatorWithLoops[] => []);
  const [
    { data: profile },
    { data: businessProfile },
    { data: workflows },
    { data: runs },
    { data: approvals },
    { data: connections },
    { data: versions },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("business_profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("workflows").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(8),
    supabase.from("workflow_runs").select("*").eq("user_id", user.id).order("started_at", { ascending: false }).limit(10),
    supabase.from("approvals").select("*").eq("user_id", user.id).order("requested_at", { ascending: false }).limit(5),
    supabase.from("connections").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(6),
    supabase.from("workflow_versions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
  ]);

  const snapshot = buildDoblyWorkspaceSnapshot({
    profile: profile ?? null,
    businessProfile: businessProfile ?? null,
    workflows: (workflows ?? []) as Workflow[],
    runs: (runs ?? []) as WorkflowRun[],
    approvals: (approvals ?? []) as Approval[],
    connections: (connections ?? []) as Connection[],
    versions: (versions ?? []) as WorkflowVersion[],
  });

  const recentWorkflows = ((workflows ?? []) as Workflow[]).slice(0, 5);
  const latestRuns = ((runs ?? []) as WorkflowRun[]).slice(0, 5);
  const latestApprovals = ((approvals ?? []) as Approval[]).slice(0, 3);
  const latestConnections = ((connections ?? []) as Connection[]).slice(0, 4);
  const workflowTitles = Object.fromEntries(((workflows ?? []) as Workflow[]).map((workflow) => [workflow.id, workflow.title]));
  const onboarding = {
    hasBusinessContext: Boolean(businessProfile?.business_name && businessProfile?.description),
    hasConnection: ((connections ?? []) as Connection[]).some(isConnectionOperational),
    hasWorkflow: ((workflows ?? []) as Workflow[]).length > 0,
  };

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const operators = await operatorsPromise;
  const team = operators.slice(0, 6).map((operator) => ({
    id: operator.id,
    name: operator.name,
    mission: operator.mission,
    status: operator.status,
    lastRunAt: operator.last_run_at,
  }));

  return (
    <DoblyDashboardClient
      recentWorkflows={recentWorkflows}
      latestRuns={latestRuns}
      latestApprovals={latestApprovals}
      latestConnections={latestConnections}
      snapshot={snapshot}
      workflowTitles={workflowTitles}
      onboarding={onboarding}
      firstName={firstName}
      team={team}
    />
  );
}
