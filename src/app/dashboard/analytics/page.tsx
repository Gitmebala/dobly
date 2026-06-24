import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildExecutiveDashboardData } from "@/lib/executive-reporting";

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  const userId = user.id;

  const executive = (await buildExecutiveDashboardData({ userId }).catch(() => null)) ?? ({
    office: {
      departments: [],
      tasks: [],
    },
    boardroom: {
      operatingThesis: "Dobly will form a strategic reading after your workspace has live operating data.",
    },
    signalSummary: {
      unresolvedSignals: 0,
      criticalSignals: 0,
      byType: {},
    },
    workflowSummary: {
      totalRuns: 0,
      successRate: 0,
      avgDurationMinutes: 0,
    },
    approvalSummary: {
      pending: 0,
      stale: 0,
      avgAgeHours: 0,
    },
    costSummary: {
      failedJobs: 0,
      queuedJobs: 0,
      totalUsageEvents: 0,
      estimatedOpsLoad: 0,
    },
  } as unknown as Awaited<ReturnType<typeof buildExecutiveDashboardData>>);
  const topRooms = executive.office.departments
    .filter((room) => room.openTasks > 0 || room.activeWorkers > 0)
    .sort((left, right) => right.openTasks - left.openTasks)
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--dobly-text-dim)]">Analytics</div>
            <h1 className="mt-2 font-display text-3xl tracking-[-0.04em] text-[var(--dobly-text)]">
              Live business analytics
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
              Real throughput, pressure, approvals, reliability, and signal volume across the operating system.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/reports" className="btn-ghost">
              Executive reports
            </Link>
            <Link href="/dashboard/briefings" className="btn-ghost">
              Morning briefings
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Workflow success" value={`${Math.round(executive.workflowSummary.successRate * 100)}%`} hint={`${executive.workflowSummary.totalRuns} runs observed`} />
        <Metric label="Average run time" value={`${executive.workflowSummary.avgDurationMinutes.toFixed(1)} min`} hint="Completed workflow duration average" />
        <Metric label="Pending approvals" value={String(executive.approvalSummary.pending)} hint={`${executive.approvalSummary.stale} stale for 12h+`} />
        <Metric label="Open signals" value={String(executive.signalSummary.unresolvedSignals)} hint={`${executive.signalSummary.criticalSignals} high or critical`} />
        <Metric label="Queue failures" value={String(executive.costSummary.failedJobs)} hint={`${executive.costSummary.queuedJobs} still queued`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Department pressure</div>
          <h2 className="mt-2 font-display text-2xl text-[var(--dobly-text)]">Where the system is under load</h2>
          <div className="mt-4 space-y-3">
            {topRooms.map((room) => (
              <div key={room.id} className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-[var(--dobly-text)]">{room.name}</div>
                  <span className="badge-muted text-xs">{room.status.replace("_", " ")}</span>
                </div>
                <div className="mt-2 text-xs text-[var(--dobly-text-secondary)]">
                  {room.activeWorkers} coworkers · {room.openTasks} open tasks · {room.approvalCount} waiting approvals · {room.operatingRecordCount} records
                </div>
                <div className="mt-3 h-2 rounded-full bg-[rgba(255,255,255,0.06)]">
                  <div
                    className="h-2 rounded-full bg-[var(--dobly-accent)]"
                    style={{ width: `${Math.min(100, room.openTasks * 8 + room.approvalCount * 12 + room.urgentRecordCount * 14)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Signal mix</div>
          <h2 className="mt-2 font-display text-2xl text-[var(--dobly-text)]">What Dobly is noticing most</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(executive.signalSummary.byType).length > 0 ? (
              Object.entries(executive.signalSummary.byType)
                .sort((left, right) => right[1] - left[1])
                .map(([key, value]) => (
                  <div key={key} className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-[var(--dobly-text)]">{key.replaceAll("_", " ")}</div>
                      <span className="badge-muted text-xs">{value}</span>
                    </div>
                  </div>
                ))
            ) : (
              <Empty copy="Signal volume will appear here once the workspace has enough live activity." />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Approvals</div>
          <h2 className="mt-2 font-display text-2xl text-[var(--dobly-text)]">Decision drag</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--dobly-text-secondary)]">
            Average approval age is {executive.approvalSummary.avgAgeHours.toFixed(1)} hours. Stale approvals are often the easiest bottleneck to remove.
          </p>
        </div>

        <div className="card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Usage load</div>
          <h2 className="mt-2 font-display text-2xl text-[var(--dobly-text)]">Runtime pressure</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--dobly-text-secondary)]">
            {executive.costSummary.totalUsageEvents} usage events and {executive.costSummary.estimatedOpsLoad} combined run, task, and usage units were observed in the current analytics window.
          </p>
        </div>

        <div className="card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Boardroom thesis</div>
          <h2 className="mt-2 font-display text-2xl text-[var(--dobly-text)]">Strategic reading</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--dobly-text-secondary)]">
            {executive.boardroom.operatingThesis}
          </p>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">{label}</div>
      <div className="mt-2 font-display text-3xl tracking-[-0.04em] text-[var(--dobly-text)]">{value}</div>
      <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">{hint}</p>
    </div>
  );
}

function Empty({ copy }: { copy: string }) {
  return (
    <div className="rounded-[1.1rem] border border-dashed border-[rgba(242,232,220,0.12)] bg-[rgba(255,255,255,0.015)] p-4 text-sm text-[var(--dobly-text-muted)]">
      {copy}
    </div>
  );
}
