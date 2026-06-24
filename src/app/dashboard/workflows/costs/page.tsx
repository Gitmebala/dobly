import { redirect } from "next/navigation";
import { AlertCircle, BarChart3, Clock3, DollarSign, TrendingUp } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWorkflowCostInsights } from "@/lib/workflow-dashboard";

export default async function CostDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const insights = await getWorkflowCostInsights(user.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Run economics</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">Live workflow cost and ROI signals</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">
              This page is now grounded in real workflow runs. Estimated spend is derived from live execution volume and intelligence-heavy steps until full provider-level billing attribution lands.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="premium-tile"><div className="flex items-center gap-2 text-text-dim"><DollarSign className="h-4 w-4 text-accent" />Estimated spend</div><div className="mt-3 font-display text-3xl text-text">${insights.summary.totalEstimatedSpend.toFixed(2)}</div></div>
        <div className="premium-tile"><div className="flex items-center gap-2 text-text-dim"><BarChart3 className="h-4 w-4 text-accent" />Executions</div><div className="mt-3 font-display text-3xl text-text">{insights.summary.totalExecutions}</div></div>
        <div className="premium-tile"><div className="flex items-center gap-2 text-text-dim"><Clock3 className="h-4 w-4 text-accent" />Time saved</div><div className="mt-3 font-display text-3xl text-text">{insights.summary.totalTimeSavedHours.toFixed(1)}h</div></div>
        <div className="premium-tile"><div className="flex items-center gap-2 text-text-dim"><TrendingUp className="h-4 w-4 text-accent" />Estimated ROI</div><div className="mt-3 font-display text-3xl text-green-400">{insights.summary.roiPercent}%</div></div>
      </section>

      <section className="card">
        <div className="mb-4 font-display text-2xl font-semibold text-text">Workflow breakdown</div>
        <div className="space-y-3">
          {insights.workflows.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-border p-5 text-sm text-text-muted">
              No run data yet.
            </div>
          ) : (
            insights.workflows.map((workflow) => (
              <div key={workflow.workflowId} className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="font-display text-lg font-semibold text-text">{workflow.workflowName}</div>
                    <div className="mt-1 text-sm text-text-muted">
                      {workflow.totalExecutions} executions • {workflow.successfulExecutions} succeeded • {workflow.failedExecutions} failed
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm text-text-muted sm:grid-cols-4">
                    <div>Avg run: <span className="text-text">{(workflow.averageDurationMs / 1000).toFixed(1)}s</span></div>
                    <div>Spend: <span className="text-text">${workflow.estimatedSpend.toFixed(2)}</span></div>
                    <div>Saved: <span className="text-text">{workflow.timeSavedHours.toFixed(1)}h</span></div>
                    <div>Manual value: <span className="text-text">${workflow.manualCostEstimate.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-accent" />
          <div className="text-sm text-text-muted">
            Estimated spend currently uses live execution counts plus intelligence-step density as a conservative operational proxy. This removes the old mock dashboard while keeping the UI honest until exact per-provider billing lands.
          </div>
        </div>
      </section>
    </div>
  );
}
