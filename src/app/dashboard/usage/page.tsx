import { redirect } from "next/navigation";
import { BarChart3, Clock3, Cpu, Gauge } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlanConfig, getPlanUsageSnapshot, percentUsed } from "@/lib/plans";
import type { PlanId } from "@/types";

export default async function UsagePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: usageLogs }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", user.id).single(),
    supabase.from("usage_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(25),
  ]);

  const planId = (profile?.plan ?? "free") as PlanId;
  const plan = getPlanConfig(planId);
  const snapshot = await getPlanUsageSnapshot(user.id, planId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Usage</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">What Dobly has done this month</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
              Standard executions protect runtime cost. Intelligence actions protect AI cost. Both are visible here so the product stays understandable.
            </p>
          </div>
          <div className="badge-green capitalize">{plan.name}</div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="premium-tile">
          <div className="flex items-center gap-3 text-text-dim"><Gauge className="h-4 w-4 text-accent" />Standard executions</div>
          <div className="mt-4 font-display text-4xl font-semibold text-text">{snapshot.standard_executions_used}</div>
          <div className="mt-2 text-sm text-text-muted">of {snapshot.standard_executions_limit === -1 ? "unlimited" : snapshot.standard_executions_limit}</div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(0,223,160,0.08)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${percentUsed(snapshot.standard_executions_used, snapshot.standard_executions_limit)}%` }} /></div>
        </div>
        <div className="premium-tile">
          <div className="flex items-center gap-3 text-text-dim"><Cpu className="h-4 w-4 text-accent" />Intelligence actions</div>
          <div className="mt-4 font-display text-4xl font-semibold text-text">{snapshot.intelligence_actions_used}</div>
          <div className="mt-2 text-sm text-text-muted">of {snapshot.intelligence_actions_limit === -1 ? "unlimited" : snapshot.intelligence_actions_limit}</div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(0,223,160,0.08)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${percentUsed(snapshot.intelligence_actions_used, snapshot.intelligence_actions_limit)}%` }} /></div>
        </div>
        <div className="premium-tile">
          <div className="flex items-center gap-3 text-text-dim"><BarChart3 className="h-4 w-4 text-accent" />Workflow count</div>
          <div className="mt-4 font-display text-4xl font-semibold text-text">{snapshot.workflow_count}</div>
          <div className="mt-2 text-sm text-text-muted">on the {plan.name} plan</div>
          <div className="mt-4 text-xs uppercase tracking-[0.24em] text-text-dim">{plan.max_workflows === -1 ? "Unlimited workflows" : `${plan.max_workflows} workflow limit`}</div>
        </div>
      </section>

      <section className="card">
        <div className="mb-5 flex items-center gap-3">
          <Clock3 className="h-5 w-5 text-accent" />
          <h2 className="font-display text-2xl font-semibold text-text">Recent usage events</h2>
        </div>
        <div className="space-y-3">
          {(usageLogs ?? []).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-3">
              <div>
                <div className="font-display text-base font-medium text-text">{item.action.replace(/_/g, " ")}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-text-dim">{new Date(item.created_at).toLocaleString()}</div>
              </div>
              <div className="badge-muted">{Object.keys(item.metadata ?? {}).length} metadata fields</div>
            </div>
          ))}
          {(usageLogs ?? []).length === 0 ? <div className="rounded-[1rem] border border-dashed border-border p-5 text-sm text-text-muted">No usage events yet this month.</div> : null}
        </div>
      </section>
    </div>
  );
}
