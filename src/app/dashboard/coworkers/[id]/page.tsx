import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import OfficeTaskRunButton from "@/components/dashboard/OfficeTaskRunButton";
import { listOfficeEvents } from "@/lib/office/events";
import { listDirectiveMemory } from "@/lib/office/policy-memory";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildHomebaseDashboardData } from "@/lib/office/homebase";

function handoffMeta(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return value as {
    fromDepartment?: string;
    toDepartment?: string;
    assignedWorkerId?: string | null;
    assignedWorkerName?: string | null;
  };
}

function handoffTimelineEntry(params: {
  id: string;
  title: string;
  summary: string | null | undefined;
  occurredAt: string;
  handoff: ReturnType<typeof handoffMeta>;
  status?: string | null;
}) {
  if (!params.handoff?.fromDepartment && !params.handoff?.toDepartment) return null;
  return {
    id: params.id,
    title: params.title,
    summary: params.summary ?? null,
    occurredAt: params.occurredAt,
    status: params.status ?? null,
    handoff: params.handoff,
  };
}

export default async function CoworkerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const office = await buildHomebaseDashboardData({ userId: user.id });
  const worker = office.workers.find((entry) => entry.id === id);

  if (!worker) notFound();

  const room = office.departments.find((department) => department.id === worker.departmentId);
  const tasks = office.tasks.filter((task) => task.workerKey === worker.workerKey).slice(0, 10);
  const workerEvents = await listOfficeEvents({
    userId: user.id,
    workerId: worker.id,
    limit: 8,
  }).catch(() => []);
  const events =
    workerEvents.length > 0
      ? workerEvents
      : office.recentEvents
          .filter((event) => event.workerId === worker.id || event.departmentId === worker.departmentId)
          .slice(0, 8);
  const directives = await listDirectiveMemory({
    userId: user.id,
    departmentId: worker.departmentId,
    limit: 6,
  }).catch(() => []);
  const handoffTimeline = [
    ...tasks
      .map((task) =>
        handoffTimelineEntry({
          id: `task-${task.id}`,
          title: task.title,
          summary: task.summary,
          occurredAt: task.createdAt,
          handoff: handoffMeta(task.toolPayload?.handoff),
          status: task.status,
        }),
      )
      .filter(Boolean),
    ...events
      .map((event) =>
        handoffTimelineEntry({
          id: `event-${event.id}`,
          title: event.title,
          summary: event.summary,
          occurredAt: event.occurredAt ?? event.createdAt,
          handoff: handoffMeta(event.payload?.handoff),
        }),
      )
      .filter(Boolean),
  ]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 8);

  return (
    <div className="coworker-detail-page dobly-stagger mx-auto max-w-5xl space-y-6">
      <section className="card">
        <Link href="/dashboard/coworkers" className="inline-flex items-center gap-2 text-sm text-[var(--dobly-text-muted)] hover:text-[var(--dobly-text)]">
          <ArrowLeft className="h-4 w-4" />
          Back to coworkers
        </Link>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">Coworker desk</div>
            <h1 className="mt-3 font-display text-4xl tracking-[-0.05em] text-[var(--dobly-text)]">{worker.name}</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--dobly-text-secondary)]">{worker.mission}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge-muted text-xs">{worker.runtimeKind}</span>
            <span className="badge-muted text-xs">{worker.autonomyMode}</span>
            <span className="badge-muted text-xs">{worker.status}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Health" value={`${Math.round(worker.healthScore * 100)}%`} />
        <Metric label="Trust" value={`${Math.round(worker.trustScore * 100)}%`} />
        <Metric label="Desk" value={room?.name ?? worker.departmentId} />
        <Metric label="Open work" value={String(tasks.length)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="card">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Active directives</div>
            <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">Rules this coworker should be honoring</h2>
            <div className="mt-4 space-y-3">
              {directives.length > 0 ? (
                directives.map((directive) => (
                  <div key={directive.id} className="rounded-[1.1rem] border border-[rgba(255,184,108,0.24)] bg-[rgba(255,184,108,0.08)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-[var(--dobly-text)]">{directive.title}</div>
                      <span className="badge-muted text-[10px] uppercase">{directive.kind.replaceAll("_", " ")}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">{directive.body}</p>
                  </div>
                ))
              ) : (
                <Empty copy="No durable Board or GM directives are pinned to this coworker yet." />
              )}
            </div>
          </section>

          <section className="card">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Current queue</div>
            <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">What {worker.name} is handling</h2>
            <div className="mt-4 space-y-3">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div key={task.id} className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-[var(--dobly-text)]">{task.title}</div>
                      <div className="flex gap-2">
                        <span className="badge-muted text-[10px] uppercase">{task.status.replace("_", " ")}</span>
                        <span className="badge-muted text-[10px] uppercase">{task.riskLevel}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">{task.summary}</p>
                    {handoffMeta(task.toolPayload?.handoff)?.fromDepartment ? (
                      <div className="mt-3 rounded-[0.9rem] border border-[rgba(196,80,26,0.2)] bg-[rgba(196,80,26,0.08)] px-3 py-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">
                        Handoff from {handoffMeta(task.toolPayload?.handoff)?.fromDepartment?.replaceAll("_", " ")} to{" "}
                        {handoffMeta(task.toolPayload?.handoff)?.assignedWorkerName ?? worker.name}.
                      </div>
                    ) : null}
                    {task.toolPayload?.boardDirective ? (
                      <div className="mt-2 rounded-[0.9rem] border border-[rgba(255,184,108,0.24)] bg-[rgba(255,184,108,0.08)] px-3 py-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">
                        Board directive attached: this work was promoted beyond routine coordination and should be treated as strategic.
                      </div>
                    ) : null}
                    {task.status === "queued" ? (
                      <div className="mt-3">
                        <OfficeTaskRunButton taskId={task.id} />
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <Empty copy={`${worker.name} has no open tasks right now.`} />
              )}
            </div>
          </section>

          <section className="card">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Handoff timeline</div>
            <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">How work is flowing through this desk</h2>
            <div className="mt-4 space-y-3">
              {handoffTimeline.length > 0 ? (
                handoffTimeline.map((entry) => (
                  <div key={entry.id} className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-[var(--dobly-text)]">{entry.title}</div>
                      {entry.status ? <span className="badge-muted text-[10px] uppercase">{entry.status.replace("_", " ")}</span> : null}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">
                      {entry.handoff?.fromDepartment?.replaceAll("_", " ") ?? "Dobly"} to{" "}
                      {entry.handoff?.assignedWorkerName ?? entry.handoff?.toDepartment?.replaceAll("_", " ") ?? worker.name}
                    </p>
                    {entry.summary ? <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-muted)]">{entry.summary}</p> : null}
                  </div>
                ))
              ) : (
                <Empty copy="No routed handoffs have touched this coworker yet." />
              )}
            </div>
          </section>

          <section className="card">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Recent actions</div>
            <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">How the desk has been moving</h2>
            <div className="mt-4 space-y-3">
              {events.length > 0 ? (
                events.map((event) => (
                  <div key={event.id} className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                    <div className="text-sm font-medium text-[var(--dobly-text)]">{event.title}</div>
                    <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">
                      {event.summary ?? `${event.source} emitted ${event.eventType}.`}
                    </p>
                    {handoffMeta(event.payload?.handoff)?.fromDepartment ? (
                      <div className="mt-3 rounded-[0.9rem] border border-[rgba(196,80,26,0.2)] bg-[rgba(196,80,26,0.08)] px-3 py-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">
                        Handoff record: {handoffMeta(event.payload?.handoff)?.fromDepartment?.replaceAll("_", " ")} routed work here.
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <Empty copy="No recent activity has been recorded for this desk yet." />
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Operating profile</div>
            <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">How this coworker is set up</h2>
            <div className="mt-4 space-y-3 text-sm text-[var(--dobly-text-secondary)]">
              <div className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Room</div>
                <div className="mt-2 text-[var(--dobly-text)]">{room?.name ?? worker.departmentId}</div>
              </div>
              <div className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Autonomy</div>
                <div className="mt-2 text-[var(--dobly-text)]">{worker.autonomyMode}</div>
              </div>
              <div className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Worker key</div>
                <div className="mt-2 text-[var(--dobly-text)]">{worker.workerKey}</div>
              </div>
            </div>
          </section>

          {room ? (
            <section className="card">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Room context</div>
              <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">{room.name}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--dobly-text-secondary)]">{room.purpose}</p>
              <Link href={`/dashboard/departments/${room.id}`} className="mt-4 inline-flex text-sm text-[var(--dobly-accent)]">
                Open room
              </Link>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">{label}</div>
      <div className="mt-2 font-display text-3xl tracking-[-0.04em] text-[var(--dobly-text)]">{value}</div>
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
