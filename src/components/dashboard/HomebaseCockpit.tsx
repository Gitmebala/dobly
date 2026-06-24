"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BellRing,
  Bot,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Command,
  Crown,
  ExternalLink,
  Inbox,
  LayoutGrid,
  MessageSquareText,
  Radar,
  Sparkles,
  X,
} from "lucide-react";
import type {
  HomebaseDashboardData,
  HomebaseDepartmentView,
  HomebaseTaskView,
  HomebaseWorkerView,
} from "@/lib/office/homebase";
import type { OfficeEventRecord } from "@/lib/office/types";

type Panel = "decisions" | "rooms" | "workers" | "feed" | null;

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "rooms", label: "Rooms", icon: Building2 },
  { id: "workers", label: "Workers", icon: Bot },
  { id: "feed", label: "Feed", icon: MessageSquareText },
] as const;

function timeAgo(value: string) {
  try {
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.max(1, Math.round(diff / 60000));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  } catch {
    return "";
  }
}

export default function HomebaseCockpit({
  firstName,
  office,
}: {
  firstName: string;
  office: HomebaseDashboardData;
}) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("overview");
  const [panel, setPanel] = useState<Panel>(null);

  const waitingTasks = office.tasks.filter((task) => task.status === "waiting_approval");
  const activeTasks = office.tasks.filter((task) => task.status === "running" || task.status === "queued");
  const attentionRooms = office.departments.filter((room) => room.status === "needs_attention");
  const activeRooms = office.departments.filter((room) => room.status !== "quiet");
  const topRooms = [...attentionRooms, ...activeRooms.filter((room) => room.status !== "needs_attention")].slice(0, 7);
  const topWorkers = office.workers.slice(0, 7);
  const recentFeed = office.recentEvents.slice(0, 6);

  const statusCopy = useMemo(() => {
    if (waitingTasks.length > 0) return `${waitingTasks.length} decision${waitingTasks.length === 1 ? "" : "s"} waiting`;
    if (activeTasks.length > 0) return `${activeTasks.length} task${activeTasks.length === 1 ? "" : "s"} moving`;
    return office.snapshot.businessStatus;
  }, [activeTasks.length, office.snapshot.businessStatus, waitingTasks.length]);

  return (
    <>
      <div className="dashboard-cockpit grid h-full min-h-0 gap-3 overflow-hidden xl:grid-cols-[240px_minmax(0,1fr)_330px]">
        <aside className="hidden min-h-0 flex-col overflow-hidden rounded-[12px] border border-[var(--dobly-border)] bg-[color-mix(in_srgb,var(--dobly-bg-subtle)_76%,transparent)] p-3 xl:flex">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Today</div>
              <div className="mt-1 text-sm font-medium text-[var(--dobly-text)]">{statusCopy}</div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-[8px] bg-[rgba(196,80,26,0.12)] text-[var(--dobly-accent)]">
              <Radar className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <MetricMini label="Decisions" value={waitingTasks.length} />
            <MetricMini label="Rooms" value={activeRooms.length} />
            <MetricMini label="Workers" value={office.workers.length} />
            <MetricMini label="Events" value={office.recentEvents.length} />
          </div>

          <div className="mt-3 rounded-[10px] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--dobly-text)]">
              <Sparkles className="h-4 w-4 text-[var(--dobly-accent)]" />
              Good to see you, {firstName}
            </div>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--dobly-text-secondary)]">
              {office.snapshot.focusReason || "Dobly is watching the business and will surface what needs judgment."}
            </p>
          </div>

          <div className="mt-3 grid gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm transition ${
                  activeTab === tab.id
                    ? "bg-[rgba(196,80,26,0.14)] text-[var(--dobly-text)]"
                    : "text-[var(--dobly-text-secondary)] hover:bg-[rgba(255,255,255,0.04)]"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-auto grid gap-2">
            <Link href="/dashboard/generate" className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[var(--dobly-accent)] px-3 py-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4" />
              Hire
            </Link>
            <Link href="/dashboard/reports" className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--dobly-border)] px-3 py-2 text-sm text-[var(--dobly-text-secondary)]">
              <Crown className="h-4 w-4" />
              Boardroom
            </Link>
          </div>
        </aside>

        <main className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[12px] border border-[var(--dobly-border)] bg-[color-mix(in_srgb,var(--dobly-bg)_86%,transparent)]">
          <div className="flex flex-col gap-3 border-b border-[var(--dobly-border)] p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-[8px] bg-[rgba(196,80,26,0.12)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--dobly-accent)]">
                  <Command className="h-3.5 w-3.5" />
                  Homebase
                </span>
                <span className="text-xs text-[var(--dobly-text-muted)]">{statusCopy}</span>
              </div>
              <h1 className="mt-2 truncate font-display text-3xl text-[var(--dobly-text)]">Operating floor</h1>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-[8px] border px-3 py-2 text-xs font-medium transition xl:hidden ${
                    activeTab === tab.id
                      ? "border-[rgba(196,80,26,0.3)] bg-[rgba(196,80,26,0.12)] text-[var(--dobly-text)]"
                      : "border-[var(--dobly-border)] text-[var(--dobly-text-secondary)]"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 overflow-hidden p-3">
            {activeTab === "overview" ? (
              <OverviewPlane rooms={topRooms} tasks={waitingTasks} events={recentFeed} onOpen={setPanel} />
            ) : null}
            {activeTab === "rooms" ? <RoomsPlane rooms={office.departments} onOpen={setPanel} /> : null}
            {activeTab === "workers" ? <WorkersPlane workers={topWorkers} onOpen={setPanel} /> : null}
            {activeTab === "feed" ? <FeedPlane events={recentFeed} onOpen={setPanel} /> : null}
          </div>
        </main>

        <aside className="hidden min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[12px] border border-[var(--dobly-border)] bg-[color-mix(in_srgb,var(--dobly-bg-subtle)_78%,transparent)] xl:grid">
          <div className="min-h-0 overflow-hidden p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Attention</div>
                <h2 className="mt-1 text-base font-semibold text-[var(--dobly-text)]">Needs judgment</h2>
              </div>
              <button type="button" onClick={() => setPanel("decisions")} className="rounded-[8px] border border-[var(--dobly-border)] px-2.5 py-1.5 text-xs text-[var(--dobly-text-secondary)]">
                View all
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              {(waitingTasks.length ? waitingTasks.slice(0, 4) : activeTasks.slice(0, 4)).map((task) => (
                <CompactTask key={task.id} task={task} />
              ))}
              {waitingTasks.length === 0 && activeTasks.length === 0 ? (
                <div className="rounded-[8px] border border-[rgba(84,186,123,0.22)] bg-[rgba(84,186,123,0.08)] p-3 text-sm text-[var(--dobly-text-secondary)]">
                  No owner decisions are waiting.
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-[var(--dobly-border)] p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">Live feed</div>
              <button type="button" onClick={() => setPanel("feed")} className="text-xs text-[var(--dobly-accent)]">
                Open
              </button>
            </div>
            <div className="mt-2 grid gap-2">
              {recentFeed.slice(0, 3).map((event) => (
                <div key={event.id} className="rounded-[8px] bg-[rgba(255,255,255,0.025)] p-2.5">
                  <div className="truncate text-xs font-medium text-[var(--dobly-text)]">{event.title}</div>
                  <div className="mt-1 text-[11px] text-[var(--dobly-text-muted)]">{timeAgo(event.createdAt)} ago</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {panel ? (
        <CockpitDrawer
          panel={panel}
          onClose={() => setPanel(null)}
          rooms={office.departments}
          workers={office.workers}
          tasks={office.tasks}
          events={office.recentEvents}
        />
      ) : null}
    </>
  );
}

function MetricMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[8px] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] p-2.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--dobly-text-dim)]">{label}</div>
      <div className="mt-1 text-xl font-semibold text-[var(--dobly-text)]">{value}</div>
    </div>
  );
}

function OverviewPlane({
  rooms,
  tasks,
  events,
  onOpen,
}: {
  rooms: HomebaseDepartmentView[];
  tasks: HomebaseTaskView[];
  events: OfficeEventRecord[];
  onOpen: (panel: Panel) => void;
}) {
  return (
    <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
      <div className="relative min-h-0 overflow-hidden rounded-[10px] border border-[var(--dobly-border)] bg-[radial-gradient(circle_at_50%_42%,rgba(196,80,26,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))]">
        <div className="absolute inset-5 rounded-full border border-[var(--dobly-border)] opacity-50" />
        <div className="absolute inset-16 rounded-full border border-[rgba(196,80,26,0.16)] opacity-70" />
        <div className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[rgba(196,80,26,0.24)] bg-[rgba(196,80,26,0.11)] text-center">
          <Radar className="h-6 w-6 text-[var(--dobly-accent)]" />
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--dobly-text)]">GM</span>
        </div>
        {rooms.map((room) => (
          <Link
            key={room.id}
            href={`/dashboard/departments/${room.id}`}
            className="absolute w-[132px] -translate-x-1/2 -translate-y-1/2 rounded-[8px] border border-[var(--dobly-border)] bg-[color-mix(in_srgb,var(--dobly-bg)_84%,transparent)] p-2.5 shadow-[0_16px_42px_rgba(0,0,0,0.16)] transition hover:border-[rgba(196,80,26,0.32)]"
            style={{ left: `${room.visual.x}%`, top: `${room.visual.y}%` }}
          >
            <div className="truncate text-xs font-semibold text-[var(--dobly-text)]">{room.name}</div>
            <div className="mt-1 text-[11px] text-[var(--dobly-text-muted)]">{room.openTasks} tasks</div>
          </Link>
        ))}
      </div>

      <div className="grid min-h-0 grid-rows-[1fr_1fr] gap-3">
        <MiniPanel title="Decisions" icon={BellRing} action={() => onOpen("decisions")}>
          {(tasks.length ? tasks.slice(0, 3) : []).map((task) => <CompactTask key={task.id} task={task} />)}
          {tasks.length === 0 ? <EmptyMini text="No decisions waiting." /> : null}
        </MiniPanel>
        <MiniPanel title="Movement" icon={Clock3} action={() => onOpen("feed")}>
          {events.slice(0, 3).map((event) => (
            <div key={event.id} className="rounded-[8px] bg-[rgba(255,255,255,0.025)] p-2.5">
              <div className="truncate text-xs font-medium text-[var(--dobly-text)]">{event.title}</div>
              <div className="mt-1 truncate text-[11px] text-[var(--dobly-text-muted)]">{event.summary ?? event.eventType}</div>
            </div>
          ))}
          {events.length === 0 ? <EmptyMini text="No movement yet." /> : null}
        </MiniPanel>
      </div>
    </div>
  );
}

function RoomsPlane({ rooms, onOpen }: { rooms: HomebaseDepartmentView[]; onOpen: (panel: Panel) => void }) {
  return (
    <MiniPanel title="Operating rooms" icon={Building2} action={() => onOpen("rooms")} fill>
      <div className="grid h-full min-h-0 grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
        {rooms.slice(0, 12).map((room) => (
          <Link key={room.id} href={`/dashboard/departments/${room.id}`} className="rounded-[8px] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-sm font-semibold text-[var(--dobly-text)]">{room.name}</div>
              <span className="h-2 w-2 rounded-full bg-[var(--dobly-accent)]" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--dobly-text-muted)]">
              <span>{room.activeWorkers} live</span>
              <span>{room.openTasks} tasks</span>
            </div>
          </Link>
        ))}
      </div>
    </MiniPanel>
  );
}

function WorkersPlane({ workers, onOpen }: { workers: HomebaseWorkerView[]; onOpen: (panel: Panel) => void }) {
  return (
    <MiniPanel title="Workers on shift" icon={Bot} action={() => onOpen("workers")} fill>
      <div className="grid h-full min-h-0 grid-cols-2 gap-2 lg:grid-cols-3">
        {workers.map((worker) => (
          <Link key={worker.id} href={`/dashboard/coworkers/${worker.id}`} className="rounded-[8px] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] p-3">
            <div className="truncate text-sm font-semibold text-[var(--dobly-text)]">{worker.name}</div>
            <div className="mt-1 truncate text-[11px] uppercase tracking-[0.12em] text-[var(--dobly-text-dim)]">{worker.departmentId.replaceAll("_", " ")}</div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
              <div className="h-full rounded-full bg-[var(--dobly-accent)]" style={{ width: `${Math.round(worker.trustScore * 100)}%` }} />
            </div>
            <div className="mt-2 text-xs text-[var(--dobly-text-muted)]">{Math.round(worker.trustScore * 100)}% trust</div>
          </Link>
        ))}
      </div>
    </MiniPanel>
  );
}

function FeedPlane({ events, onOpen }: { events: OfficeEventRecord[]; onOpen: (panel: Panel) => void }) {
  return (
    <MiniPanel title="Operation feed" icon={MessageSquareText} action={() => onOpen("feed")} fill>
      <div className="grid h-full min-h-0 gap-2 lg:grid-cols-2">
        {events.map((event) => (
          <div key={event.id} className="rounded-[8px] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="truncate text-sm font-semibold text-[var(--dobly-text)]">{event.title}</div>
              <span className="text-[11px] text-[var(--dobly-text-muted)]">{timeAgo(event.createdAt)}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">{event.summary ?? event.eventType}</p>
          </div>
        ))}
      </div>
    </MiniPanel>
  );
}

function MiniPanel({
  title,
  icon: Icon,
  action,
  fill = false,
  children,
}: {
  title: string;
  icon: typeof Inbox;
  action: () => void;
  fill?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`grid min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-[10px] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.018)] ${fill ? "h-full" : ""}`}>
      <div className="flex items-center justify-between border-b border-[var(--dobly-border)] p-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--dobly-accent)]" />
          <h2 className="text-sm font-semibold text-[var(--dobly-text)]">{title}</h2>
        </div>
        <button type="button" onClick={action} className="inline-flex items-center gap-1 text-xs text-[var(--dobly-accent)]">
          View all
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
      <div className="min-h-0 overflow-hidden p-3">
        <div className="grid gap-2">{children}</div>
      </div>
    </section>
  );
}

function CompactTask({ task }: { task: HomebaseTaskView }) {
  return (
    <Link href="/dashboard/approvals" className="block rounded-[8px] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] p-2.5 transition hover:border-[rgba(196,80,26,0.28)]">
      <div className="flex items-center justify-between gap-3">
        <div className="truncate text-xs font-semibold text-[var(--dobly-text)]">{task.title}</div>
        <span className="shrink-0 rounded-[6px] bg-[rgba(196,80,26,0.1)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--dobly-accent)]">
          {task.riskLevel}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--dobly-text-secondary)]">{task.summary}</p>
    </Link>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div className="rounded-[8px] border border-[rgba(84,186,123,0.2)] bg-[rgba(84,186,123,0.08)] p-3 text-sm text-[var(--dobly-text-secondary)]">
      {text}
    </div>
  );
}

function CockpitDrawer({
  panel,
  onClose,
  rooms,
  workers,
  tasks,
  events,
}: {
  panel: Exclude<Panel, null>;
  onClose: () => void;
  rooms: HomebaseDepartmentView[];
  workers: HomebaseWorkerView[];
  tasks: HomebaseTaskView[];
  events: OfficeEventRecord[];
}) {
  const title =
    panel === "decisions"
      ? "Decision queue"
      : panel === "rooms"
        ? "Operating rooms"
        : panel === "workers"
          ? "Workers"
          : "Operation feed";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(7,7,6,0.58)] p-4 backdrop-blur-lg">
      <div className="grid max-h-[88vh] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[12px] border border-[var(--dobly-border)] bg-[var(--dobly-bg)] shadow-[0_36px_120px_rgba(0,0,0,0.36)]">
        <div className="flex items-center justify-between border-b border-[var(--dobly-border)] p-4">
          <h3 className="font-display text-2xl text-[var(--dobly-text)]">{title}</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-[8px] border border-[var(--dobly-border)] text-[var(--dobly-text-muted)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4">
          {panel === "decisions" ? (
            <div className="grid gap-2 md:grid-cols-2">
              {tasks.map((task) => <CompactTask key={task.id} task={task} />)}
            </div>
          ) : null}
          {panel === "rooms" ? (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Link key={room.id} href={`/dashboard/departments/${room.id}`} className="rounded-[8px] border border-[var(--dobly-border)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--dobly-text)]">{room.name}</span>
                    <ExternalLink className="h-4 w-4 text-[var(--dobly-text-muted)]" />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">{room.latestEvent ?? room.purpose}</p>
                </Link>
              ))}
            </div>
          ) : null}
          {panel === "workers" ? (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {workers.map((worker) => (
                <Link key={worker.id} href={`/dashboard/coworkers/${worker.id}`} className="rounded-[8px] border border-[var(--dobly-border)] p-3">
                  <div className="font-medium text-[var(--dobly-text)]">{worker.name}</div>
                  <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">{worker.mission}</p>
                </Link>
              ))}
            </div>
          ) : null}
          {panel === "feed" ? (
            <div className="grid gap-2 md:grid-cols-2">
              {events.map((event) => (
                <div key={event.id} className="rounded-[8px] border border-[var(--dobly-border)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-[var(--dobly-text)]">{event.title}</span>
                    <span className="text-xs text-[var(--dobly-text-muted)]">{timeAgo(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">{event.summary ?? event.eventType}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
