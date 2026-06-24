import Link from "next/link";
import { redirect } from "next/navigation";
import { requireDoblyAdmin } from "@/lib/admin/access";
import { DOBLY_PLANS } from "@/lib/billing/plans";
import { buildExecutiveDashboardData } from "@/lib/executive-reporting";
import { getCoverageSummary } from "@/lib/use-case-coverage";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

async function safeCount(supabase: any, table: string) {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

export default async function AdminPage() {
  const { supabase, allowed } = await requireDoblyAdmin();
  if (!allowed) redirect("/dashboard");
  const admin = createAdminSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profiles, channels, workers, tasks, memory, usage, events, executive] = await Promise.all([
    safeCount(supabase, "profiles"),
    safeCount(supabase, "business_channel_connections"),
    safeCount(supabase, "office_workers"),
    safeCount(supabase, "office_tasks"),
    safeCount(supabase, "business_memory_items"),
    safeCount(supabase, "usage_events"),
    safeCount(supabase, "office_events"),
    user ? buildExecutiveDashboardData({ userId: user.id }).catch(() => null) : Promise.resolve(null),
  ]);

  const [{ data: recentTasks }, { data: recentRuns }] = await Promise.all([
    supabase
      .from("office_tasks")
      .select("id,title,status,risk_level,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("workflow_runs")
      .select("id,status,workflow_id,started_at,finished_at")
      .order("started_at", { ascending: false })
      .limit(8),
  ]);

  const [{ data: billingUsage }, { data: wallets }, { data: providerAccounts }] = await Promise.all([
    admin.from("billing_usage_events").select("actual_cost_minor,customer_cost_minor,provider,status").limit(5000),
    admin.from("billing_wallets").select("available_minor,reserved_minor,lifetime_funded_minor,lifetime_spent_minor"),
    admin.from("billing_provider_accounts").select("provider,market,status,funding_mode,balance_minor,low_balance_threshold_minor").order("provider"),
  ]);
  const total = (rows: any[], key: string) => rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
  const providerCost = total(billingUsage ?? [], "actual_cost_minor");
  const walletFunded = total(wallets ?? [], "lifetime_funded_minor");
  const walletAvailable = total(wallets ?? [], "available_minor");

  const coverage = getCoverageSummary();

  return (
    <main className="dobly-canvas min-h-screen px-5 py-10 text-[var(--dobly-text)] sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="card">
          <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--dobly-text-dim)]">Dobly Admin</div>
          <h1 className="mt-2 font-display text-4xl tracking-[-0.06em]">Operator command center</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
            Product health, diagnostics, boardroom pressure, queue behavior, usage, and launch-state visibility in one surface.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Users" value={profiles} />
          <Metric label="Channels" value={channels} />
          <Metric label="Workers" value={workers} />
          <Metric label="Tasks" value={tasks} />
          <Metric label="Memory items" value={memory} />
          <Metric label="Usage events" value={usage} />
          <Metric label="Office events" value={events} />
          <Metric label="Use cases covered" value={`${coverage.working}/${coverage.total}`} />
          <Metric label="Provider cost tracked" value={`KSh ${(providerCost / 100).toLocaleString()}`} />
          <Metric label="Capacity funded" value={`KSh ${(walletFunded / 100).toLocaleString()}`} />
          <Metric label="Capacity available" value={`KSh ${(walletAvailable / 100).toLocaleString()}`} />
          <Metric label="Active provider rails" value={(providerAccounts ?? []).filter((provider: any) => provider.status === "active").length} />
        </section>

        {executive ? (
          <section className="grid gap-4 md:grid-cols-5">
            <Metric label="Workflow success" value={`${Math.round(executive.workflowSummary.successRate * 100)}%`} />
            <Metric label="Pending approvals" value={executive.approvalSummary.pending} />
            <Metric label="Open signals" value={executive.signalSummary.unresolvedSignals} />
            <Metric label="Failed jobs" value={executive.costSummary.failedJobs} />
            <Metric label="Strategic risks" value={executive.boardroom.strategicRisks.length} />
          </section>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card">
            <h2 className="font-display text-2xl">Plans and margins</h2>
            <div className="mt-4 grid gap-3">
              {DOBLY_PLANS.map((plan) => (
                <div key={plan.id} className="rounded-2xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-display text-xl">{plan.name}</div>
                      <p className="mt-1 text-xs text-[var(--dobly-text-muted)]">{plan.marginStrategy}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold">KSh {plan.monthlyPriceKes.toLocaleString()}</div>
                      <div className="text-xs text-[var(--dobly-text-dim)]">per month</div>
                      <div className="mt-1 text-xs text-[var(--dobly-text-muted)]">KSh {(plan.operatingAllowanceMinor / 100).toLocaleString()} operating reserve</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-display text-2xl">Diagnostics and tooling</h2>
            <div className="mt-4 space-y-3">
              <AdminLink href="/dashboard/ops" label="Internal ops board" />
              <AdminLink href="/dashboard/analytics" label="Live analytics surface" />
              <AdminLink href="/dashboard/reports" label="Executive reports" />
              <AdminLink href={process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"} label="Open PostHog" />
              <AdminLink
                href={process.env.SENTRY_ORG ? `https://sentry.io/organizations/${process.env.SENTRY_ORG}/` : "https://sentry.io"}
                label="Open Sentry"
              />
              <AdminLink href="/api/coverage/use-cases" label="Use-case coverage JSON" />
              <AdminLink href="/api/office/boardroom/export?format=json" label="Boardroom export JSON" />
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="font-display text-2xl">Provider funding rails</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(providerAccounts ?? []).map((provider: any) => (
              <div key={`${provider.provider}:${provider.market}`} className="rounded-2xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
                <div className="flex items-center justify-between gap-3"><strong>{provider.provider}</strong><span className="badge-muted text-xs">{provider.status}</span></div>
                <div className="mt-2 text-xs text-[var(--dobly-text-muted)]">{provider.market} · {provider.funding_mode.replaceAll("_", " ")}</div>
                <div className="mt-3 text-sm">{provider.balance_minor == null ? "Balance reporting not connected" : `KSh ${(Number(provider.balance_minor) / 100).toLocaleString()}`}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="font-display text-2xl">Recent tasks</h2>
            <div className="mt-4 space-y-3">
              {(recentTasks ?? []).map((task: any) => (
                <div key={task.id} className="rounded-2xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-medium">{task.title}</div>
                    <div className="flex gap-2">
                      <span className="badge-muted text-xs">{task.status}</span>
                      <span className="badge-muted text-xs">{task.risk_level}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-display text-2xl">Recent workflow runs</h2>
            <div className="mt-4 space-y-3">
              {(recentRuns ?? []).map((run: any) => (
                <div key={run.id} className="rounded-2xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-[var(--dobly-text)]">{run.workflow_id ?? "workflow"}</div>
                    <span className="badge-muted text-xs">{run.status}</span>
                  </div>
                  <div className="mt-2 text-xs text-[var(--dobly-text-muted)]">
                    Started {run.started_at ? new Date(run.started_at).toLocaleString() : "unknown"} {run.finished_at ? `· finished ${new Date(run.finished_at).toLocaleString()}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--dobly-text-dim)]">{label}</div>
      <div className="mt-2 font-display text-3xl tracking-[-0.05em]">{value}</div>
    </div>
  );
}

function AdminLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] px-4 py-3 text-sm text-[var(--dobly-text-secondary)] transition hover:border-[rgba(196,80,26,0.3)]"
    >
      {label}
    </Link>
  );
}
