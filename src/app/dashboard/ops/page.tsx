import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDoblyInternalServices } from "@/lib/internal-services";
import { getLaunchBoardSummary, launchBoardSections, type LaunchBoardStatus } from "@/lib/launch-board";
import { buildStartupReadinessSnapshot, type StartupReadinessItem } from "@/lib/startup-readiness";

export default async function OpsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  if (!isAdminEmail(user.email)) notFound();

  const [{ data: workflows }, { data: queue }] = await Promise.all([
    supabase.from("workflows").select("*").eq("user_id", user.id),
    supabase.from("job_queue").select("*").order("created_at", { ascending: false }).limit(10),
  ]);
  const services = getDoblyInternalServices();
  const launchBoardSummary = getLaunchBoardSummary(launchBoardSections);
  const startup = await buildStartupReadinessSnapshot();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="card">
        <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Dobly ops</div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">Internal platform status</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
          This page is for Dobly-side operations: internal AI, delivery services, queue health, and workflow volume.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/security" className="btn-ghost">
            Security
          </Link>
          <Link href="/subprocessors" className="btn-ghost">
            Subprocessors
          </Link>
          <Link href="/privacy" className="btn-ghost">
            Privacy
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="card">
          <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Startup launch score</div>
          <div className="mt-4 flex items-end gap-3">
            <div className="font-display text-6xl font-semibold tracking-[-0.06em] text-text">{startup.score}</div>
            <div className="pb-3 text-sm text-text-muted">/ 100</div>
          </div>
          <p className="mt-4 text-sm leading-7 text-text-muted">
            This is the founder-facing readiness score for launch infrastructure, intelligence, channels, billing, analytics, and runtime signals.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <SummaryTile label="Blockers" value={startup.blockers.length} tone={startup.blockers.length ? "blocked" : "done"} />
            <SummaryTile label="Watches" value={startup.watches.length} tone="working" />
          </div>
        </div>

        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Founder metrics</div>
              <h2 className="mt-2 font-display text-3xl font-semibold text-text">Is Dobly becoming a business?</h2>
            </div>
            <Link href="/dashboard/analytics" className="btn-ghost">
              Analytics
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniMetric label="Users" value={startup.metrics.profiles} />
            <MiniMetric label="Paid" value={startup.metrics.paidProfiles} />
            <MiniMetric label="Operators" value={startup.metrics.activeOperators} sub={`${startup.metrics.operators} total`} />
            <MiniMetric label="Runs 7d" value={startup.metrics.runsLast7Days} sub={`${startup.metrics.failedRunsLast7Days} failed`} />
            <MiniMetric label="Connections" value={startup.metrics.activeConnections} sub={`${startup.metrics.connections} total`} />
            <MiniMetric label="Approvals" value={startup.metrics.pendingApprovals} sub="pending" />
            <MiniMetric label="Queue" value={startup.metrics.queuedJobs} sub={`${startup.metrics.failedJobs} failed`} />
            <MiniMetric label="Usage 30d" value={startup.metrics.usageEventsLast30Days} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ReadinessList
          title="Launch blockers"
          empty="No hard blockers detected from configured env and runtime signals."
          items={startup.blockers}
        />
        <ReadinessList
          title="Watch closely"
          empty="No partial or watch items detected."
          items={startup.watches.slice(0, 8)}
        />
      </section>

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Readiness map</div>
            <h2 className="mt-2 font-display text-3xl font-semibold text-text">What is still missing for startup launch</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
              These are the surfaces Dobly needs before public selling: core SaaS, intelligence, channels, billing, observability, and runtime signals.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {startup.sections.map((section) => (
            <div key={section.id} className="rounded-[1.25rem] border border-border bg-surface-2/50 p-4">
              <h3 className="font-display text-xl font-semibold text-text">{section.title}</h3>
              <div className="mt-4 space-y-3">
                {section.items.map((row) => (
                  <div key={row.id} className="rounded-[1rem] border border-border bg-surface-1/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-medium text-text">{row.label}</div>
                      <ReadinessBadge status={row.status} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-text-muted">{row.summary}</p>
                    <p className="mt-3 text-xs leading-5 text-text-dim">{row.action}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {services.map((service) => (
          <div key={service.id} className="premium-tile">
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">{service.label}</div>
            <div className={`mt-4 font-display text-3xl font-semibold ${service.configured ? "text-accent" : "text-red-300"}`}>
              {service.configured ? "Ready" : "Missing"}
            </div>
            <p className="mt-3 text-sm text-text-muted">{service.description}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Launch board</div>
            <h2 className="mt-2 font-display text-3xl font-semibold text-text">Go-live checklist we can actually track</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
              This board turns the static launch matrix into operational work. It shows what is
              done, what is still moving, and which launch tasks still depend on work outside the repo.
            </p>
          </div>
          <div className="grid min-w-[260px] gap-3 sm:grid-cols-2">
            <SummaryTile label="Done" value={launchBoardSummary.done} tone="done" />
            <SummaryTile label="Working" value={launchBoardSummary.working} tone="working" />
            <SummaryTile label="External" value={launchBoardSummary.external} tone="external" />
            <SummaryTile label="Total" value={launchBoardSummary.total} tone="default" />
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {launchBoardSections.map((section) => (
            <div key={section.id} className="overflow-hidden rounded-[1.5rem] border border-border">
              <div className="border-b border-border bg-surface-2/60 px-5 py-4">
                <h3 className="font-display text-2xl font-semibold text-text">{section.title}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-text-muted">{section.description}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-surface-1/60 text-left">
                      <th className="border-b border-border px-5 py-4 text-xs uppercase tracking-[0.22em] text-text-dim">Item</th>
                      <th className="border-b border-border px-5 py-4 text-xs uppercase tracking-[0.22em] text-text-dim">Done</th>
                      <th className="border-b border-border px-5 py-4 text-xs uppercase tracking-[0.22em] text-text-dim">Owner</th>
                      <th className="border-b border-border px-5 py-4 text-xs uppercase tracking-[0.22em] text-text-dim">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item) => (
                      <tr key={item.id}>
                        <td className="border-b border-border px-5 py-5 align-top text-sm font-medium text-text">
                          {item.title}
                        </td>
                        <td className="border-b border-border px-5 py-5 align-top">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="border-b border-border px-5 py-5 align-top text-sm text-text-muted">
                          {item.owner}
                        </td>
                        <td className="border-b border-border px-5 py-5 align-top text-sm leading-7 text-text-muted">
                          {item.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-sm text-text-dim">
          This board mirrors the higher-detail docs in <span className="font-mono">docs/GO_LIVE_MATRIX.md</span>,
          <span className="font-mono"> docs/LAUNCH_BOARD.md</span>.
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Workflow volume</div>
          <div className="mt-4 font-display text-4xl font-semibold text-text">{workflows?.length ?? 0}</div>
          <p className="mt-3 text-sm text-text-muted">Current workflows visible from this workspace context.</p>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Recent queue jobs</div>
          <div className="mt-4 space-y-3">
            {(queue ?? []).map((job) => (
              <div key={job.id} className="flex items-center justify-between gap-3 rounded-[1rem] border border-border px-4 py-3">
                <div className="text-sm text-text">{job.type}</div>
                <div className="badge-muted">{job.status}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "done" | "working" | "external" | "blocked" | "default";
}) {
  const toneClass =
    tone === "done"
      ? "text-emerald-300"
      : tone === "working"
        ? "text-amber-300"
        : tone === "external"
          ? "text-sky-300"
          : tone === "blocked"
            ? "text-red-300"
          : "text-text";

  return (
    <div className="rounded-[1.25rem] border border-border bg-surface-2/60 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.22em] text-text-dim">{label}</div>
      <div className={`mt-3 font-display text-3xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function MiniMetric({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-[1rem] border border-border bg-surface-2/50 p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim">{label}</div>
      <div className="mt-2 font-display text-3xl font-semibold text-text">{value}</div>
      {sub ? <div className="mt-1 text-xs text-text-muted">{sub}</div> : null}
    </div>
  );
}

function ReadinessList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: StartupReadinessItem[];
}) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-[0.24em] text-text-dim">{title}</div>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((row) => (
            <div key={row.id} className="rounded-[1rem] border border-border bg-surface-2/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-medium text-text">{row.label}</div>
                <ReadinessBadge status={row.status} />
              </div>
              <p className="mt-2 text-sm leading-6 text-text-muted">{row.summary}</p>
              <p className="mt-3 text-xs leading-5 text-text-dim">{row.action}</p>
            </div>
          ))
        ) : (
          <div className="rounded-[1rem] border border-dashed border-border p-4 text-sm text-text-muted">{empty}</div>
        )}
      </div>
    </div>
  );
}

function ReadinessBadge({ status }: { status: StartupReadinessItem["status"] }) {
  const label =
    status === "ready" ? "Ready" : status === "partial" ? "Partial" : status === "watch" ? "Watch" : "Missing";
  const className =
    status === "ready"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : status === "partial"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
        : status === "watch"
          ? "border-sky-400/30 bg-sky-400/10 text-sky-200"
          : "border-red-400/30 bg-red-400/10 text-red-200";

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${className}`}>{label}</span>;
}

function StatusBadge({ status }: { status: LaunchBoardStatus }) {
  const label =
    status === "done"
      ? "Yes"
      : status === "working"
        ? "Working"
        : status === "blocked"
          ? "Blocked"
          : "External";

  const className =
    status === "done"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : status === "working"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
        : status === "blocked"
          ? "border-red-400/30 bg-red-400/10 text-red-200"
          : "border-sky-400/30 bg-sky-400/10 text-sky-200";

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${className}`}>{label}</span>;
}
