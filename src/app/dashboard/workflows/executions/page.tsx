import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock3, PlayCircle } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWorkflowRunSummaries } from "@/lib/workflow-dashboard";

function formatDuration(durationMs: number | null) {
  if (!durationMs) return "In progress";
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

export default async function ExecutionsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const runs = await getWorkflowRunSummaries(user.id);
  const stats = {
    total: runs.length,
    success: runs.filter((run) => run.status === "success").length,
    failed: runs.filter((run) => run.status === "failed").length,
    waiting: runs.filter((run) => run.status === "awaiting_approval").length,
    running: runs.filter((run) => run.status === "running").length,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Executions</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">Live workflow runs</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
              This is now reading from live workflow runs, not mock data. Use it to see what Dobly ran, how long it took, and where guarded steps stopped.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <div className="premium-tile"><div className="text-xs uppercase tracking-[0.18em] text-text-dim">Total</div><div className="mt-3 font-display text-3xl text-text">{stats.total}</div></div>
        <div className="premium-tile"><div className="text-xs uppercase tracking-[0.18em] text-text-dim">Success</div><div className="mt-3 font-display text-3xl text-green-400">{stats.success}</div></div>
        <div className="premium-tile"><div className="text-xs uppercase tracking-[0.18em] text-text-dim">Failed</div><div className="mt-3 font-display text-3xl text-red-400">{stats.failed}</div></div>
        <div className="premium-tile"><div className="text-xs uppercase tracking-[0.18em] text-text-dim">Waiting approval</div><div className="mt-3 font-display text-3xl text-yellow-400">{stats.waiting}</div></div>
        <div className="premium-tile"><div className="text-xs uppercase tracking-[0.18em] text-text-dim">Running</div><div className="mt-3 font-display text-3xl text-accent">{stats.running}</div></div>
      </section>

      <section className="card">
        <div className="space-y-3">
          {runs.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-border p-6 text-sm text-text-muted">
              No workflow runs yet.
            </div>
          ) : (
            runs.map((run) => (
              <div key={run.id} className="flex flex-col gap-4 rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] p-4 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {run.status === "success" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    ) : run.status === "failed" ? (
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    ) : run.status === "awaiting_approval" ? (
                      <Clock3 className="h-5 w-5 text-yellow-400" />
                    ) : (
                      <PlayCircle className="h-5 w-5 text-accent" />
                    )}
                    <div className="font-display text-lg font-semibold text-text">{run.workflowName}</div>
                    <span className="badge-muted capitalize">{run.status.replaceAll("_", " ")}</span>
                  </div>
                  <div className="mt-2 text-sm text-text-muted">
                    Trigger: {run.triggerType} • Started {new Date(run.startedAt).toLocaleString()} • Duration {formatDuration(run.durationMs)}
                  </div>
                  <div className="mt-2 text-sm text-text-muted">
                    {run.successCount} successful steps{run.failedCount ? `, ${run.failedCount} failed` : ""}
                    {run.errorMessage ? ` • ${run.errorMessage}` : ""}
                  </div>
                </div>
                <Link href={`/dashboard/workflows/executions/${run.id}`} className="btn-secondary text-xs">
                  Open run
                </Link>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
