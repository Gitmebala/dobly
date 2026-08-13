import Link from "next/link";
import { redirect } from "next/navigation";
import { listDirectiveMemory } from "@/lib/office/policy-memory";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildExecutiveDashboardData, buildExecutiveArtifacts } from "@/lib/executive-reporting";

export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const executive = await buildExecutiveDashboardData({ userId: user.id });
  const artifacts = buildExecutiveArtifacts({
    boardroom: executive.boardroom,
    reports: executive.latestReports,
  });
  const directives = await listDirectiveMemory({
    userId: user.id,
    limit: 8,
  }).catch(() => []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--app-muted)]">Reports</div>
            <h1 className="mt-2 font-display text-3xl tracking-[-0.04em] text-[var(--app-text)]">
              Boardroom and operating review
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--app-muted)]">
              Executive reporting, narrative artifacts, decision routing, and the live operating picture in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/api/office/boardroom/export?format=md" className="btn-ghost">
              Export boardroom markdown
            </Link>
            <Link href="/api/office/boardroom/export?format=json" className="btn-ghost">
              Export boardroom JSON
            </Link>
            <Link href="/dashboard/analytics" className="btn-ghost">
              Open analytics
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <Metric label="Runs observed" value={String(executive.workflowSummary.totalRuns)} />
        <Metric label="Success rate" value={`${Math.round(executive.workflowSummary.successRate * 100)}%`} />
        <Metric label="Pending approvals" value={String(executive.approvalSummary.pending)} />
        <Metric label="Open signals" value={String(executive.signalSummary.unresolvedSignals)} />
        <Metric label="Strategic risks" value={String(executive.boardroom.strategicRisks.length)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <div className="card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--app-muted)]">Boardroom synthesis</div>
          <h2 className="mt-2 font-display text-2xl text-[var(--app-text)]">What the business should change next</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--app-muted)]">{executive.boardroom.synthesis}</p>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {executive.boardroom.strategicMetrics.map((metric) => (
              <div key={metric.label} className="reports-tile">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--app-muted)]">{metric.label}</div>
                <div className="mt-2 font-display text-2xl text-[var(--app-text)]">{metric.value}</div>
                <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">{metric.interpretation}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <ListCard
              title="Owner decisions"
              items={executive.boardroom.ownerDecisions}
              empty="No strategic decisions are currently waiting."
            />
            <ListCard
              title="Strategic risks"
              items={executive.boardroom.strategicRisks}
              empty="No major strategic risks are visible right now."
            />
            <ListCard
              title="Strategic opportunities"
              items={executive.boardroom.strategicOpportunities}
              empty="No strategic opportunities have been promoted yet."
            />
          </div>
        </div>

        <div className="card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--app-muted)]">Artifact pack</div>
          <h2 className="mt-2 font-display text-2xl text-[var(--app-text)]">Reusable outputs</h2>
          <div className="mt-4 space-y-3">
            <ArtifactCard
              title="Boardroom markdown"
              detail="Owner-ready strategy memo generated from the live office."
              bodyPreview={artifacts.boardroomMarkdown.slice(0, 240)}
            />
            <ArtifactCard
              title="Boardroom JSON"
              detail="Structured export for downstream rendering, storage, or delivery."
              bodyPreview={artifacts.boardroomJson.slice(0, 240)}
            />
          </div>

          <div className="mt-6 text-[10px] uppercase tracking-[0.18em] text-[var(--app-muted)]">Recent stored reports</div>
          <div className="mt-3 space-y-3">
            {artifacts.reportCards.length > 0 ? (
              artifacts.reportCards.map((report) => (
                <div key={report.id} className="reports-tile">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-[var(--app-text)]">{report.title}</div>
                    <span className="badge-muted text-xs">{report.reportType}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">
                    {report.body.slice(0, 180)}
                  </p>
                  <div className="mt-3 text-xs text-[var(--app-muted)]">
                    {new Date(report.createdAt).toLocaleString()} · {report.deliveryStatus ?? "stored"}
                  </div>
                </div>
              ))
            ) : (
              <Empty copy="Workflow-generated reports will appear here once live runs start producing artifacts." />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--app-muted)]">Boardroom members</div>
          <h2 className="mt-2 font-display text-2xl text-[var(--app-text)]">The business from each angle</h2>
          <div className="mt-4 space-y-3">
            {executive.boardroom.members.map((member) => (
              <div key={member.role} className="reports-tile">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--app-text)]">{member.role}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">{member.mandate}</div>
                  </div>
                  <span className="badge-muted text-xs">{member.confidence}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">{member.finding}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">{member.recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--app-muted)]">Operating review</div>
          <h2 className="mt-2 font-display text-2xl text-[var(--app-text)]">Pressure, narrative, and queue health</h2>
          <div className="mt-4 space-y-3">
            {executive.boardroom.operatingPressure.map((item) => (
              <div key={item.department} className="reports-tile">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-[var(--app-text)]">{item.department}</div>
                  <span className="badge-muted text-xs">pressure {item.pressureScore}</span>
                </div>
                <div className="mt-2 text-xs text-[var(--app-muted)]">
                  {item.records} records · {item.needsAction} need action · {item.highPriority} high priority · {item.moneyLinked} money-linked
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">
                  Top item: {item.topItem ?? "No dominant item yet."}
                </p>
              </div>
            ))}

            <div className="reports-tile text-sm leading-6 text-[var(--app-muted)]">
              {executive.boardroom.operatingThesis}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--app-muted)]">Durable board directives</div>
        <h2 className="mt-2 font-display text-2xl text-[var(--app-text)]">Rules the Board has written into Dobly</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {directives.length > 0 ? (
            directives.map((directive) => (
              <div key={directive.id} className="reports-directive-tile">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-[var(--app-text)]">{directive.title}</div>
                  <span className="badge-muted text-xs">{directive.kind.replaceAll("_", " ")}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">{directive.body}</p>
                <div className="mt-3 text-xs text-[var(--app-muted)]">
                  Scope: {directive.scope.replaceAll("_", " ")} · Updated {new Date(directive.updatedAt).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <Empty copy="No durable Board directives have been written into Dobly yet." />
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="reports-tile">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--app-muted)]">{label}</div>
      <div className="mt-2 font-display text-3xl tracking-[-0.04em] text-[var(--app-text)]">{value}</div>
    </div>
  );
}

function ListCard({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--app-muted)]">{title}</div>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? items.map((item, index) => (
          <div key={`${title}-${index}`} className="reports-tile reports-tile-sm text-sm leading-6 text-[var(--app-muted)]">
            {item}
          </div>
        )) : <Empty copy={empty} />}
      </div>
    </div>
  );
}

function ArtifactCard({ title, detail, bodyPreview }: { title: string; detail: string; bodyPreview: string }) {
  return (
    <div className="reports-tile">
      <div className="text-sm font-medium text-[var(--app-text)]">{title}</div>
      <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">{detail}</p>
      <pre className="reports-code">
        {bodyPreview}
      </pre>
    </div>
  );
}

function Empty({ copy }: { copy: string }) {
  return (
    <div className="reports-empty">
      {copy}
    </div>
  );
}
