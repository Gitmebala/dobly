import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleAlert, Database, Sparkles } from "lucide-react";
import HireOfficeWorkerButton from "@/components/dashboard/HireOfficeWorkerButton";
import DepartmentWorkbenchClient from "@/components/dashboard/DepartmentWorkbenchClient";
import OfficeTaskDecisionButtons from "@/components/dashboard/OfficeTaskDecisionButtons";
import OfficeTaskRunButton from "@/components/dashboard/OfficeTaskRunButton";
import RecordActionButton from "@/components/dashboard/RecordActionButton";
import { loadDepartmentOperatingData, type DepartmentOperatingRecord } from "@/lib/department-records";
import { listOfficeEvents } from "@/lib/office/events";
import { buildHomebaseDashboardData } from "@/lib/office/homebase";
import { listDirectiveMemory } from "@/lib/office/policy-memory";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DepartmentPage({
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
  const room = office.departments.find((department) => department.id === id);

  if (!room) notFound();

  const [operating, events] = await Promise.all([
    loadDepartmentOperatingData({ userId: user.id, departmentId: room.id }),
    listOfficeEvents({ userId: user.id, departmentId: room.id, limit: 8 }).catch(() => []),
  ]);
  const directives = await listDirectiveMemory({
    userId: user.id,
    departmentId: room.id,
    limit: 6,
  }).catch(() => []);
  const workers = office.workers.filter((worker) => worker.departmentId === room.id);
  const tasks = office.tasks.filter((task) => task.departmentId === room.id);
  const waitingApprovals = tasks.filter((task) => task.status === "waiting_approval");
  const handoffEvents = events.filter((event) => Boolean((event.payload as Record<string, unknown> | undefined)?.handoff)).slice(0, 6);
  const roomPulse = buildRoomPulse(room.id, operating.records.length, tasks.length, waitingApprovals.length);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[rgba(242,232,220,0.08)] bg-[linear-gradient(135deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.16)]">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(196,80,26,0.2),transparent_66%)] blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-32 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)] blur-3xl" />

        <Link href="/dashboard" className="relative inline-flex items-center gap-2 text-sm text-[var(--dobly-text-muted)] hover:text-[var(--dobly-text)]">
          <ArrowLeft className="h-4 w-4" />
          Back to Homebase
        </Link>

        <div className="relative mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">Department room</div>
            <h1 className="mt-3 font-display text-4xl tracking-[-0.05em] text-[var(--dobly-text)]">{room.name}</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--dobly-text-secondary)]">{room.purpose}</p>
            <div className="mt-4 flex items-start gap-3 rounded-[1.2rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(0,0,0,0.12)] p-4">
              <Sparkles className="mt-0.5 h-4 w-4 text-[var(--dobly-accent)]" />
              <p className="text-sm leading-6 text-[var(--dobly-text-secondary)]">{roomPulse}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge-muted text-xs">{room.status.replace("_", " ")}</span>
            <span className="badge-muted text-xs">{room.activeWorkers} coworkers live</span>
            <span className="badge-muted text-xs">{room.openTasks} open tasks</span>
            <span className="badge-muted text-xs">{operating.records.length} records</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <Metric label="Live coworkers" value={String(workers.length)} hint="People Dobly has hired into this room." />
        <Metric label="Approvals" value={String(waitingApprovals.length)} hint="Actions waiting for owner judgment." />
        {operating.metrics.map((item) => (
          <Metric key={item.label} label={item.label} value={item.value} hint={item.hint} />
        ))}
      </section>

      <DepartmentWorkbenchClient
        departmentId={room.id}
        roomName={room.name}
        records={operating.records}
        workers={workers}
        tasks={tasks}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="card">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Active directives</div>
            <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">Durable rules shaping this room</h2>
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
                <EmptyCard copy="No durable Board or GM directives are pinned to this room yet." />
              )}
            </div>
          </section>

          <section className="card">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Operating board</div>
                <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">Actual records this room owns</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dobly-text-secondary)]">
                  This is the difference between a demo and an office: durable business objects Dobly can track,
                  brief, update, and hand off.
                </p>
              </div>
              <span className="badge-muted text-xs">
                {operating.workspaceIds.length} workspace source{operating.workspaceIds.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {operating.records.length > 0 ? (
                operating.records.slice(0, 10).map((record) => (
                  <OperatingRecordCard key={`${record.kind}-${record.id}`} record={record} />
                ))
              ) : (
                <EmptyCard copy="No operating records yet. Once messages, invoices, leads, or cases arrive, this room becomes a real desk instead of an empty page." />
              )}
            </div>
          </section>

          <section className="card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Live work queue</div>
                <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">What this room is handling</h2>
              </div>
              <span className="badge-muted text-xs">{tasks.length} active</span>
            </div>

            <div className="mt-4 space-y-3">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div key={task.id} className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-[var(--dobly-text)]">{task.title}</div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <span className="badge-muted text-[10px] uppercase">{task.status.replace("_", " ")}</span>
                        <span className="badge-muted text-[10px] uppercase">{task.riskLevel}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">{task.summary}</p>
                    <div className="mt-3 text-xs text-[var(--dobly-text-muted)]">
                      {task.workerKey.replaceAll("_", " ")}
                      {task.toolName ? ` - via ${task.toolName}` : ""}
                    </div>
                    {task.status === "waiting_approval" ? (
                      <div className="mt-3">
                        <OfficeTaskDecisionButtons taskId={task.id} />
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
                <EmptyCard copy="Nothing is queued in this room right now." />
              )}
            </div>
          </section>

          <section className="card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Coworkers</div>
                <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">Who works here</h2>
              </div>
              <Link href="/dashboard/coworkers" className="text-sm text-[var(--dobly-accent)]">
                All coworkers
              </Link>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {workers.length > 0 ? (
                workers.map((worker) => (
                  <Link
                    key={worker.id}
                    href={`/dashboard/coworkers/${worker.id}`}
                    className="rounded-[1.2rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4 transition hover:border-[rgba(242,232,220,0.14)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-[var(--dobly-text)]">{worker.name}</div>
                      <span className="badge-muted text-[10px] uppercase">{worker.runtimeKind}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--dobly-text-secondary)]">{worker.mission}</p>
                    <div className="mt-3 text-xs text-[var(--dobly-text-muted)]">
                      {Math.round(worker.healthScore * 100)}% health - {Math.round(worker.trustScore * 100)}% trust - {worker.autonomyMode}
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyCard copy="No live coworkers yet in this room. Start with one of the templates on the right." />
              )}
            </div>
          </section>

          <section className="card">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Handoff timeline</div>
            <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">Where this room is sending and receiving work</h2>
            <div className="mt-4 space-y-3">
              {handoffEvents.length > 0 ? (
                handoffEvents.map((event) => {
                  const handoff = ((event.payload as Record<string, unknown> | undefined)?.handoff ?? {}) as Record<string, unknown>;
                  return (
                    <div key={event.id} className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                      <div className="text-sm font-medium text-[var(--dobly-text)]">{event.title}</div>
                      <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">
                        {String(handoff.fromDepartment ?? "dobly").replaceAll("_", " ")} to{" "}
                        {String(handoff.assignedWorkerName ?? handoff.toDepartment ?? "next desk").replaceAll("_", " ")}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-muted)]">{event.summary ?? "Dobly routed work through this room."}</p>
                    </div>
                  );
                })
              ) : (
                <EmptyCard copy="No routed handoffs are visible in this room yet." />
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Templates</div>
            <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">What Dobly can hire here</h2>
            <div className="mt-4 space-y-3">
              {room.templates.length > 0 ? (
                room.templates.map((template) => (
                  <div key={template.key} className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-[var(--dobly-text)]">{template.name}</div>
                      <span className="badge-muted text-[10px] uppercase">{template.kind}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">{template.mission}</p>
                    <div className="mt-3 text-xs text-[var(--dobly-text-muted)]">Handles {template.handles.join(", ")}</div>
                    <div className="mt-3">
                      <HireOfficeWorkerButton templateKey={template.key} />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyCard copy="No starter templates have been defined for this room yet." />
              )}
            </div>
          </section>

          <section className="card">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Recent signals</div>
            <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">What just happened</h2>
            <div className="mt-4 space-y-3">
              {events.length > 0 ? (
                events.map((event) => (
                  <div key={event.id} className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                    <div className="text-sm font-medium text-[var(--dobly-text)]">{event.title}</div>
                    <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">
                      {event.summary ?? `${event.source} emitted ${event.eventType}.`}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyCard copy="No recent events in this room yet." />
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Cross-room motion</div>
            <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">Where this room hands work next</h2>
          </div>
          <Link href="/dashboard" className="text-sm text-[var(--dobly-accent)]">
            Back to map
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--dobly-text-secondary)]">
          <span className="rounded-full border border-[rgba(242,232,220,0.08)] px-4 py-2">{room.name}</span>
          <ArrowRight className="h-4 w-4 text-[var(--dobly-text-dim)]" />
          <span className="rounded-full border border-[rgba(242,232,220,0.08)] px-4 py-2">General Manager</span>
          <ArrowRight className="h-4 w-4 text-[var(--dobly-text-dim)]" />
          <span className="rounded-full border border-[rgba(242,232,220,0.08)] px-4 py-2">Owner decision</span>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="group rounded-[1.2rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(242,232,220,0.16)] hover:bg-[rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">
        <Database className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-2 font-display text-3xl tracking-[-0.04em] text-[var(--dobly-text)]">{value}</div>
      {hint ? <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-muted)]">{hint}</p> : null}
    </div>
  );
}

function OperatingRecordCard({ record }: { record: DepartmentOperatingRecord }) {
  const isUrgent = record.priority === "critical" || record.priority === "high";
  const priorityClass = isUrgent
    ? "border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.06)]"
    : "border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)]";

  return (
    <div className={`rounded-[1.25rem] border p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(242,232,220,0.18)] ${priorityClass}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-muted text-[10px] uppercase">{record.kind.replaceAll("_", " ")}</span>
            <span className="badge-muted text-[10px] uppercase">{record.status.replaceAll("_", " ")}</span>
            {isUrgent ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(239,68,68,0.28)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--danger)]">
                <CircleAlert className="h-3 w-3" />
                {record.priority}
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-sm font-semibold text-[var(--dobly-text)]">{record.title}</h3>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--dobly-text-secondary)]">{record.summary}</p>
        </div>
        {record.moneyLabel ? (
          <div className="shrink-0 rounded-full border border-[rgba(242,232,220,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--dobly-text)]">
            {record.moneyLabel}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 text-xs text-[var(--dobly-text-muted)] md:grid-cols-2">
        <div>
          <span className="text-[var(--dobly-text-dim)]">Owner/contact: </span>
          {record.ownerLabel ?? "Not assigned"}
        </div>
        <div>
          <span className="text-[var(--dobly-text-dim)]">Next action: </span>
          {record.nextAction ?? "Keep watching"}
        </div>
      </div>
      <div className="mt-4">
        <RecordActionButton kind={record.kind} recordId={record.id} />
      </div>
    </div>
  );
}

function buildRoomPulse(roomId: string, records: number, tasks: number, approvals: number) {
  if (records === 0 && tasks === 0) {
    return "This room is structurally ready, but it has no live records yet. Connect a channel or send a test message to wake it up.";
  }
  if (approvals > 0) {
    return `This room is active and waiting on ${approvals} owner decision${approvals === 1 ? "" : "s"}. Clear those first so coworkers can keep moving.`;
  }
  if (tasks > 0) {
    return `This room has ${records} operating record${records === 1 ? "" : "s"} and ${tasks} queued work item${tasks === 1 ? "" : "s"}. Dobly has enough context to act.`;
  }
  return `${roomId.replaceAll("_", " ")} has ${records} durable operating record${records === 1 ? "" : "s"} ready for briefings, automations, and handoffs.`;
}

function EmptyCard({ copy }: { copy: string }) {
  return (
    <div className="rounded-[1.1rem] border border-dashed border-[rgba(242,232,220,0.12)] bg-[rgba(255,255,255,0.015)] p-4 text-sm text-[var(--dobly-text-muted)]">
      {copy}
    </div>
  );
}
