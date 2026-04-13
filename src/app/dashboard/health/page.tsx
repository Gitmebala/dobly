import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { getRequiredProviderIdsForWorkflow } from "@/lib/connection-requirements";
import { isConnectionOperational } from "@/lib/connection-readiness";
import { deriveWorkflowHealth } from "@/lib/plans";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Approval, Connection, Workflow, WorkflowRun } from "@/types";

export default async function HealthPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: workflows }, { data: connections }, { data: runs }, { data: approvals }] =
    await Promise.all([
      supabase.from("workflows").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("connections").select("*").eq("user_id", user.id),
      supabase
        .from("workflow_runs")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(200),
      supabase
        .from("approvals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("requested_at", { ascending: false }),
    ]);

  const connectionMap = new Map(
    (connections ?? []).map((connection) => [connection.provider, connection] as const)
  );
  const healthRows = (workflows ?? []).map((workflow) =>
    buildHealthRow({
      workflow,
      runs: (runs ?? []).filter((run) => run.workflow_id === workflow.id),
      approvals: (approvals ?? []).filter((approval) => approval.workflow_id === workflow.id),
      connectionMap,
    })
  );

  const healthyCount = healthRows.filter((row) => row.health === "green").length;
  const attentionCount = healthRows.filter((row) => row.health !== "green").length;
  const accountRiskCount = (connections ?? []).filter((connection) => !isConnectionOperational(connection)).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Workflow health</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">
              See what needs attention before it becomes urgent.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
              This view is based on real run history, pending approvals, and connection readiness so Dobly stays honest about what is healthy and what is at risk.
            </p>
          </div>
          <div className="badge-green">
            <Activity className="h-3.5 w-3.5" />
            Runtime-backed
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Healthy" value={healthyCount} tone="good" />
        <MetricCard label="Attention needed" value={attentionCount} tone="warn" />
        <MetricCard label="Account risk" value={accountRiskCount} tone="bad" />
      </section>

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-text">Recovery controls</h2>
            <p className="mt-2 text-sm leading-7 text-text-muted">
              When a connection expires, a setup is incomplete, or a workflow needs human attention, Dobly should route you directly to the fix instead of leaving a dead end.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/settings?tab=connections" className="btn-secondary">
              Open connections
            </Link>
            <Link href="/dashboard/approvals" className="btn-ghost">
              Open approvals
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {healthRows.length === 0 ? (
          <div className="rounded-[1.2rem] border border-dashed border-border p-6 text-sm text-text-muted">
            No automations yet. Build one first, then Dobly will surface run reliability and recovery state here.
          </div>
        ) : (
          healthRows.map((row) => (
            <div key={row.workflow.id} className="card-hover">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="font-display text-2xl font-semibold text-text">{row.workflow.title}</div>
                  <p className="mt-2 text-sm leading-6 text-text-muted">{row.workflow.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="badge-muted">{row.lastRunLabel}</span>
                    <span className="badge-muted">{row.successRateLabel}</span>
                    {row.pendingApprovals > 0 ? (
                      <span className="badge-muted">{row.pendingApprovals} approval pending</span>
                    ) : null}
                    {row.atRiskProviders.length > 0 ? (
                      <span className="badge-muted">Reconnect: {row.atRiskProviders.join(", ")}</span>
                    ) : null}
                  </div>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${row.tone}`}>
                  <row.Icon className="h-4 w-4" />
                  {row.label}
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function buildHealthRow({
  workflow,
  runs,
  approvals,
  connectionMap,
}: {
  workflow: Workflow;
  runs: WorkflowRun[];
  approvals: Approval[];
  connectionMap: Map<string, Connection>;
}) {
  const recentRuns = runs.slice(0, 10);
  const lastRun = recentRuns[0] ?? null;
  const succeeded = recentRuns.filter((run) => run.status === "success").length;
  const successRate = recentRuns.length > 0 ? succeeded / recentRuns.length : 1;
  const requiredProviders = getRequiredProviderIdsForWorkflow(workflow.blueprint, workflow.prompt);
  const atRiskProviders = requiredProviders.filter((provider) => {
    const connection = connectionMap.get(provider);
    return !connection || !isConnectionOperational(connection);
  });

  const health = deriveWorkflowHealth({
    lastRunStatus: lastRun?.status ?? null,
    successRateLastTen: successRate,
    credentialsExpiringSoon: atRiskProviders.length > 0,
  });

  const pendingApprovals = approvals.length;
  const tone =
    health === "green"
      ? "border-accent/25 bg-accent/5 text-accent"
      : health === "amber"
        ? "border-yellow-300/25 bg-yellow-300/5 text-yellow-300"
        : "border-red-300/25 bg-red-300/5 text-red-300";
  const Icon = health === "green" ? CheckCircle2 : health === "amber" ? AlertTriangle : ShieldAlert;
  const label = health === "green" ? "Healthy" : health === "amber" ? "Needs attention" : "At risk";

  return {
    workflow,
    health,
    tone,
    Icon,
    label,
    pendingApprovals,
    atRiskProviders,
    lastRunLabel: lastRun
      ? `Last run: ${lastRun.status} · ${new Date(lastRun.started_at).toLocaleString()}`
      : "No runs yet",
    successRateLabel:
      recentRuns.length > 0
        ? `Success rate: ${Math.round(successRate * 100)}% of last ${recentRuns.length}`
        : "Success rate: waiting for first run",
  };
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "warn" | "bad";
}) {
  const className =
    tone === "good" ? "text-accent" : tone === "warn" ? "text-yellow-300" : "text-red-300";

  return (
    <div className="premium-tile">
      <div className="text-xs uppercase tracking-[0.24em] text-text-dim">{label}</div>
      <div className={`mt-3 font-display text-4xl font-bold ${className}`}>{value}</div>
    </div>
  );
}
