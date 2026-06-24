"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  CalendarDays,
  FileText,
  Film,
  KanbanSquare,
  Layers,
  LayoutTemplate,
  MessageSquareText,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Sheet,
  Sparkles,
  Zap,
} from "lucide-react";
import type { DepartmentOperatingRecord } from "@/lib/department-records";
import type { HomebaseTaskView, HomebaseWorkerView } from "@/lib/office/homebase";
import type { OfficeDepartmentId } from "@/lib/office/types";
import {
  getDepartmentWorkspaceProfile,
  type DepartmentWorkspaceProfile,
  type DepartmentWorkspaceTabId,
} from "@/lib/department-workspaces";

interface ManualTask {
  id: string;
  title: string;
  owner: string;
  status: "draft" | "doing" | "review" | "done";
}

interface TableRow {
  id: string;
  item: string;
  owner: string;
  status: string;
  next: string;
}

const TABS: Record<DepartmentWorkspaceTabId, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  desk: { label: "Desk", icon: LayoutTemplate },
  pipeline: { label: "Pipeline", icon: ClipboardList },
  doc: { label: "Document", icon: FileText },
  table: { label: "Table", icon: Sheet },
  calendar: { label: "Calendar", icon: CalendarDays },
  board: { label: "Board", icon: KanbanSquare },
  assets: { label: "Assets", icon: Palette },
  review: { label: "Review", icon: CheckCircle2 },
};

const DEPARTMENT_THEMES: Partial<Record<OfficeDepartmentId, { accent: string; accent2: string; glow: string; label: string }>> = {
  reception: { accent: "#28B7A8", accent2: "#C4501A", glow: "rgba(40,183,168,0.22)", label: "Live front desk" },
  sales: { accent: "#2F80ED", accent2: "#C4501A", glow: "rgba(47,128,237,0.22)", label: "Revenue room" },
  marketing: { accent: "#D65A88", accent2: "#C4501A", glow: "rgba(214,90,136,0.2)", label: "Campaign studio" },
  creative: { accent: "#8B5CF6", accent2: "#EC4899", glow: "rgba(139,92,246,0.22)", label: "Production studio" },
  finance: { accent: "#16A34A", accent2: "#C47A1A", glow: "rgba(22,163,74,0.2)", label: "Money desk" },
  engineering: { accent: "#38BDF8", accent2: "#8B5CF6", glow: "rgba(56,189,248,0.18)", label: "Build room" },
  support: { accent: "#F59E0B", accent2: "#28B7A8", glow: "rgba(245,158,11,0.18)", label: "Customer care" },
  operations: { accent: "#64748B", accent2: "#C4501A", glow: "rgba(100,116,139,0.22)", label: "Ops floor" },
  admin: { accent: "#A855F7", accent2: "#C4501A", glow: "rgba(168,85,247,0.18)", label: "Back office" },
  projects: { accent: "#06B6D4", accent2: "#F97316", glow: "rgba(6,182,212,0.18)", label: "Delivery room" },
  hr: { accent: "#E11D48", accent2: "#F59E0B", glow: "rgba(225,29,72,0.16)", label: "People room" },
  growth: { accent: "#84CC16", accent2: "#06B6D4", glow: "rgba(132,204,22,0.18)", label: "Growth lab" },
  analytics: { accent: "#22C55E", accent2: "#38BDF8", glow: "rgba(34,197,94,0.16)", label: "Signal room" },
  compliance: { accent: "#F97316", accent2: "#EF4444", glow: "rgba(249,115,22,0.18)", label: "Trust room" },
};

function defaultDoc(roomName: string, profile: DepartmentWorkspaceProfile, records: DepartmentOperatingRecord[]) {
  const firstRecord = records[0];
  return [
    `${roomName} working note`,
    "",
    `Main work object: ${profile.workObject}`,
    "",
    "Objective:",
    firstRecord?.nextAction ?? "Choose the next useful piece of work and move it forward.",
    "",
    "Context:",
    firstRecord?.summary ?? "Add the context you want Dobly and the team to remember.",
    "",
    "Owner edits:",
    "- Rewrite anything that sounds wrong.",
    "- Add missing facts before asking Dobly to continue.",
    "- Mark what should stay human-only.",
  ].join("\n");
}

function statusTone(status: string) {
  if (/done|completed|approved/i.test(status)) return "text-emerald-600";
  if (/review|approval|waiting/i.test(status)) return "text-amber-600";
  if (/failed|blocked|overdue/i.test(status)) return "text-red-600";
  return "text-[var(--dobly-text-muted)]";
}

function statusProgress(status: ManualTask["status"]) {
  if (status === "doing") return "w-2/4 bg-[color:var(--room-accent)]";
  if (status === "review") return "w-3/4 bg-amber-500";
  if (status === "done") return "w-full bg-emerald-500";
  return "w-1/4 bg-[var(--dobly-text-dim)]";
}

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function DepartmentWorkbenchClient({
  departmentId,
  roomName,
  records,
  workers,
  tasks,
}: {
  departmentId: OfficeDepartmentId;
  roomName: string;
  records: DepartmentOperatingRecord[];
  workers: HomebaseWorkerView[];
  tasks: HomebaseTaskView[];
}) {
  const profile = useMemo(() => getDepartmentWorkspaceProfile(departmentId), [departmentId]);
  const theme = DEPARTMENT_THEMES[departmentId] ?? {
    accent: "#C4501A",
    accent2: "#38BDF8",
    glow: "rgba(196,80,26,0.2)",
    label: "Workspace",
  };
  const themeStyle = {
    "--room-accent": theme.accent,
    "--room-accent-2": theme.accent2,
    "--room-glow": theme.glow,
  } as CSSProperties;
  const storageKey = `dobly.department-workbench.${departmentId}`;
  const [tab, setTab] = useState<DepartmentWorkspaceTabId>(() => profile.tabs[0] ?? "desk");
  const [note, setNote] = useState(() => loadStored(`${storageKey}.note`, defaultDoc(roomName, profile, records)));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [manualTasks, setManualTasks] = useState<ManualTask[]>(() =>
    loadStored(
      `${storageKey}.manualTasks`,
      profile.manualTaskSeeds.map((title, index) => ({
      id: `manual-${index}`,
      title,
      owner: index === 0 ? "You" : workers[index - 1]?.name ?? "Dobly",
      status: index === 0 ? "doing" : index === 1 ? "review" : "draft",
      })),
    ),
  );
  const [rows, setRows] = useState<TableRow[]>(() =>
    loadStored(
      `${storageKey}.rows`,
      (records.length > 0 ? records.slice(0, 4) : manualTasks).map((item: any, index) => ({
        id: `row-${index}`,
        item: item.title,
        owner: item.ownerLabel ?? item.owner ?? workers[index]?.name ?? "Unassigned",
        status: item.status ?? "draft",
        next: item.nextAction ?? "Decide next step",
      })),
    ),
  );

  useEffect(() => {
    window.localStorage.setItem(`${storageKey}.note`, JSON.stringify(note));
  }, [note, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(`${storageKey}.manualTasks`, JSON.stringify(manualTasks));
  }, [manualTasks, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(`${storageKey}.rows`, JSON.stringify(rows));
  }, [rows, storageKey]);

  const doblyPrompt = useMemo(() => {
    const next = manualTasks.find((task) => task.status !== "done")?.title ?? `Improve ${roomName}`;
    return `In ${roomName}, ${profile.aiHandoffVerb}: ${next}. Use this context: ${note.slice(0, 700)}`;
  }, [manualTasks, note, profile.aiHandoffVerb, roomName]);

  function saveNote() {
    setSavedAt(new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date()));
  }

  function addManualTask() {
    setManualTasks((current) => [
      {
        id: `manual-${Date.now()}`,
        title: `New ${roomName.toLowerCase()} item`,
        owner: "You",
        status: "draft",
      },
      ...current,
    ]);
  }

  function cycleTask(id: string) {
    const nextStatus: Record<ManualTask["status"], ManualTask["status"]> = {
      draft: "doing",
      doing: "review",
      review: "done",
      done: "draft",
    };
    setManualTasks((current) => current.map((task) => (task.id === id ? { ...task, status: nextStatus[task.status] } : task)));
  }

  function updateRow(id: string, key: keyof TableRow, value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: `row-${Date.now()}`,
        item: "New work item",
        owner: "You",
        status: "draft",
        next: "Define next action",
      },
    ]);
  }

  return (
    <section
      style={themeStyle}
      className="relative overflow-hidden rounded-[2.1rem] border border-[color-mix(in_srgb,var(--room-accent)_24%,var(--dobly-border))] bg-[radial-gradient(circle_at_10%_0%,var(--room-glow),transparent_32%),radial-gradient(circle_at_92%_10%,color-mix(in_srgb,var(--room-accent-2)_18%,transparent),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.025))] p-4 shadow-[0_30px_110px_rgba(0,0,0,0.16)] sm:p-5"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(color-mix(in_srgb,var(--room-accent)_30%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--room-accent)_30%,transparent)_1px,transparent_1px)] [background-size:38px_38px]" />
      <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border border-[color-mix(in_srgb,var(--room-accent)_26%,transparent)]" />
      <div className="pointer-events-none absolute -right-10 top-12 h-36 w-36 rounded-full border border-[color-mix(in_srgb,var(--room-accent-2)_25%,transparent)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--room-accent)_50%,transparent)] to-transparent" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--room-accent)_34%,transparent)] bg-[color-mix(in_srgb,var(--room-accent)_13%,transparent)] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[color:var(--room-accent)]">
              <Sparkles className="h-3.5 w-3.5" />
              {theme.label}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-xs text-[var(--dobly-text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(34,197,94,0.55)]" />
              {profile.workObject} workspace
            </div>
          </div>
          <h2 className="mt-3 font-display text-2xl tracking-[-0.04em] text-[var(--dobly-text)]">
            {profile.headline}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
            This is not a generic AI box. It is a {profile.workObject} workspace with the surfaces this department
            actually needs. Work manually, correct output, then hand the exact context back to Dobly.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.primaryViews.map((view) => (
              <span
                key={view}
                className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--room-accent)_18%,var(--dobly-border))] bg-[rgba(255,255,255,0.035)] px-3 py-1.5 text-[11px] text-[var(--dobly-text-secondary)]"
              >
                <Layers className="h-3 w-3 text-[color:var(--room-accent)]" />
                {view}
              </span>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {profile.operatingSurfaces.map((surface) => (
              <div key={surface.title} className="group relative overflow-hidden rounded-[1rem] border border-[color-mix(in_srgb,var(--room-accent)_14%,var(--dobly-border))] bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-3 transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--room-accent)_34%,transparent)]">
                <div className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-[color:var(--room-accent)] opacity-70" />
                <div className="pl-2 text-xs font-semibold text-[var(--dobly-text)]">{surface.title}</div>
                <p className="mt-1 text-[11px] leading-5 text-[var(--dobly-text-muted)]">{surface.description}</p>
              </div>
            ))}
          </div>
        </div>
        <Link href={`/dashboard/generate?prompt=${encodeURIComponent(doblyPrompt)}`} className="shrink-0 inline-flex items-center justify-center gap-2 rounded-[1.05rem] bg-[linear-gradient(135deg,var(--room-accent),var(--room-accent-2))] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_color-mix(in_srgb,var(--room-accent)_24%,transparent)] transition hover:-translate-y-0.5">
          Ask Dobly from this work
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative mt-5 flex gap-2 overflow-x-auto rounded-[1.25rem] border border-[var(--dobly-border)] bg-[rgba(0,0,0,0.1)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {profile.tabs.map((tabId) => {
          const item = TABS[tabId];
          const Icon = item.icon;
          const active = tab === tabId;
          return (
            <button
              key={tabId}
              type="button"
              onClick={() => setTab(tabId)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-[0.95rem] border px-3 py-2 text-sm transition ${
                active
                  ? "border-[color-mix(in_srgb,var(--room-accent)_34%,transparent)] bg-[color-mix(in_srgb,var(--room-accent)_14%,transparent)] text-[var(--dobly-text)] shadow-[0_10px_26px_color-mix(in_srgb,var(--room-accent)_12%,transparent)]"
                  : "border-transparent bg-transparent text-[var(--dobly-text-muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--dobly-text)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="relative mt-5">
        {tab === "desk" ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--dobly-text)]">{roomName} desk</h3>
                  <p className="mt-1 text-xs text-[var(--dobly-text-muted)]">Click an item to move it through the room.</p>
                </div>
                <button type="button" onClick={addManualTask} className="rounded-[0.9rem] border border-[color-mix(in_srgb,var(--room-accent)_24%,var(--dobly-border))] bg-[color-mix(in_srgb,var(--room-accent)_10%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--dobly-text)] transition hover:-translate-y-0.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add item
                </button>
              </div>
              {manualTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => cycleTask(task.id)}
                  className="group relative overflow-hidden rounded-[1.15rem] border border-[color-mix(in_srgb,var(--room-accent)_12%,var(--dobly-border))] bg-[linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] p-4 text-left transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--room-accent)_36%,transparent)]"
                >
                  <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-[color:var(--room-accent)] opacity-80" />
                  <div className="flex items-start justify-between gap-4 pl-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--dobly-text)]">{task.title}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--dobly-text-muted)]">
                        <span>Owner: {task.owner}</span>
                        <span className="h-1 w-1 rounded-full bg-[var(--dobly-text-dim)]" />
                        <span>{profile.aiHandoffVerb}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-xs font-medium capitalize ${statusTone(task.status)}`}>{task.status}</span>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.07)]">
                    <div className={`h-full rounded-full transition-all ${statusProgress(task.status)}`} />
                  </div>
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-[1.25rem] border border-[color-mix(in_srgb,var(--room-accent)_18%,var(--dobly-border))] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--room-accent)_11%,transparent),rgba(255,255,255,0.025))] p-4">
                <div className="absolute right-3 top-3 text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">roles</div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dobly-text)]">
                  <Bot className="h-4 w-4 text-[color:var(--room-accent)]" />
                  Coworker roles
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.coworkerRoles.map((role) => (
                    <span key={role} className="rounded-full border border-[color-mix(in_srgb,var(--room-accent)_18%,var(--dobly-border))] bg-[rgba(255,255,255,0.035)] px-3 py-1.5 text-xs text-[var(--dobly-text-secondary)]">{role}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.03)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dobly-text)]">
                  <Activity className="h-4 w-4 text-[color:var(--room-accent)]" />
                  Live coworker context
                </div>
                <div className="mt-4 space-y-3">
                  {(workers.length > 0 ? workers.slice(0, 4) : [{ id: "starter", name: "No coworker yet", mission: "Create one when this room needs help.", status: "draft" } as any]).map((worker) => (
                    <div key={worker.id} className="rounded-[1rem] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.035)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-[var(--dobly-text)]">{worker.name}</div>
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(34,197,94,0.45)]" />
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--dobly-text-muted)]">{worker.mission}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "doc" ? (
          <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
            <div className="rounded-[1.25rem] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.035)] p-3">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="min-h-[420px] w-full resize-y rounded-[1rem] border border-transparent bg-transparent px-4 py-4 font-mono text-sm leading-7 text-[var(--dobly-text)] outline-none focus:border-[rgba(196,80,26,0.28)]"
              />
            </div>
            <aside className="space-y-3">
              <button type="button" onClick={saveNote} className="btn-primary w-full justify-center">
                <Save className="h-4 w-4" />
                Save working note
              </button>
              <button type="button" onClick={() => setNote(defaultDoc(roomName, profile, records))} className="btn-secondary w-full justify-center">
                <RotateCcw className="h-4 w-4" />
                Reset from records
              </button>
              <div className="rounded-[1.1rem] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.03)] p-4 text-sm leading-6 text-[var(--dobly-text-secondary)]">
                {savedAt ? `Saved locally at ${savedAt}.` : "Use this to fix tone, facts, requirements, and approvals before Dobly continues."}
              </div>
            </aside>
          </div>
        ) : null}

        {tab === "table" ? (
          <div className="overflow-hidden rounded-[1.25rem] border border-[color-mix(in_srgb,var(--room-accent)_15%,var(--dobly-border))] bg-[rgba(255,255,255,0.025)]">
            <div className="flex flex-col gap-3 border-b border-[var(--dobly-border)] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--room-accent)_10%,transparent),transparent)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--dobly-text)]">{roomName} tracker</h3>
                <p className="mt-1 text-xs text-[var(--dobly-text-muted)]">{rows.length} editable records in this view</p>
              </div>
              <button type="button" onClick={addRow} className="rounded-[0.9rem] border border-[color-mix(in_srgb,var(--room-accent)_24%,var(--dobly-border))] bg-[color-mix(in_srgb,var(--room-accent)_10%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--dobly-text)] transition hover:-translate-y-0.5">
                <Plus className="h-3.5 w-3.5" />
                Add row
              </button>
            </div>
            <div className="overflow-x-auto p-3">
              <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">
                    {profile.tableColumns.map((column) => (
                      <th key={column.key} className="px-3 py-2">{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="rounded-[1rem] bg-[rgba(255,255,255,0.035)]">
                      {profile.tableColumns.map((column) => (
                        <td key={column.key} className="px-2 py-2">
                          <input
                            value={row[column.key]}
                            onChange={(event) => updateRow(row.id, column.key, event.target.value)}
                            placeholder={column.placeholder}
                            className="w-full rounded-[0.75rem] border border-transparent bg-[rgba(255,255,255,0.035)] px-3 py-2 text-[var(--dobly-text)] outline-none focus:border-[color-mix(in_srgb,var(--room-accent)_32%,transparent)]"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "pipeline" ? (
          <div className="grid gap-4 md:grid-cols-4">
            {profile.pipelineStages.map((stage, stageIndex) => (
              <div key={stage} className="min-h-[280px] overflow-hidden rounded-[1.2rem] border border-[color-mix(in_srgb,var(--room-accent)_14%,var(--dobly-border))] bg-[rgba(255,255,255,0.025)]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="px-3 pt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">{stage}</div>
                  <span className="mr-3 mt-3 rounded-full bg-[color-mix(in_srgb,var(--room-accent)_12%,transparent)] px-2 py-1 text-[10px] text-[color:var(--room-accent)]">
                    {stageIndex + 1}
                  </span>
                </div>
                <div className="h-1 bg-[linear-gradient(90deg,var(--room-accent),transparent)] opacity-80" />
                <div className="space-y-3 p-3">
                  {(records.length > 0 ? records : manualTasks).filter((_, index) => index % profile.pipelineStages.length === stageIndex).slice(0, 4).map((item: any) => (
                    <div key={`${stage}-${item.id}`} className="rounded-[1rem] border border-[var(--dobly-border)] bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
                      <div className="text-sm font-medium text-[var(--dobly-text)]">{item.title}</div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--dobly-text-muted)]">
                        {item.nextAction ?? item.summary ?? profile.correctionFocus}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "calendar" ? (
          <div className="grid gap-3 md:grid-cols-7">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
              <div key={day} className="min-h-[220px] rounded-[1.15rem] border border-[color-mix(in_srgb,var(--room-accent)_12%,var(--dobly-border))] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">{day}</div>
                  <div className="h-2 w-2 rounded-full bg-[color:var(--room-accent)] opacity-70" />
                </div>
                <div className="mt-3 space-y-2">
                  {manualTasks.filter((_, taskIndex) => taskIndex % 7 === index).map((task) => (
                    <button key={task.id} type="button" onClick={() => cycleTask(task.id)} className="w-full rounded-[0.9rem] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.045)] p-3 text-left text-xs leading-5 text-[var(--dobly-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--room-accent)_28%,transparent)]">
                      {task.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "board" ? (
          <div className="grid gap-4 md:grid-cols-4">
            {(["draft", "doing", "review", "done"] as ManualTask["status"][]).map((status) => (
              <div key={status} className="min-h-[260px] rounded-[1.2rem] border border-[color-mix(in_srgb,var(--room-accent)_14%,var(--dobly-border))] bg-[rgba(255,255,255,0.025)] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">{status}</div>
                  <span className="text-[10px] text-[var(--dobly-text-dim)]">{manualTasks.filter((task) => task.status === status).length}</span>
                </div>
                <div className="space-y-3">
                  {manualTasks.filter((task) => task.status === status).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => cycleTask(task.id)}
                      className="w-full rounded-[1rem] border border-[var(--dobly-border)] bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-3 text-left text-sm text-[var(--dobly-text)] transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--room-accent)_30%,transparent)]"
                    >
                      {task.title}
                      <span className="mt-2 block text-xs text-[var(--dobly-text-muted)]">{task.owner}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "assets" ? (
          <div className="grid gap-4 md:grid-cols-3">
            {profile.artifactKinds.map((artifact) => (
              <ArtifactCard
                key={artifact.title}
                icon={artifact.kind === "video" ? Film : artifact.kind === "spreadsheet" ? Sheet : artifact.kind === "design" ? Palette : FileText}
                title={artifact.title}
                body={artifact.body}
                href={`/dashboard/generate?prompt=${encodeURIComponent(`${artifact.prompt} Context: ${note.slice(0, 500)}`)}`}
              />
            ))}
          </div>
        ) : null}

        {tab === "review" ? (
          <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
            <div className="space-y-3">
              {(tasks.length > 0 ? tasks.slice(0, 5) : manualTasks).map((item: any) => (
                <div key={item.id} className="rounded-[1.15rem] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.035)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--dobly-text)]">{item.title}</div>
                      <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-muted)]">{item.summary ?? "Owner-created work item awaiting review."}</p>
                    </div>
                    <span className={`rounded-full border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-xs font-medium capitalize ${statusTone(item.status)}`}>{String(item.status).replaceAll("_", " ")}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative overflow-hidden rounded-[1.25rem] border border-[color-mix(in_srgb,var(--room-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--room-accent)_9%,transparent)] p-4">
              <div className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-[color-mix(in_srgb,var(--room-accent)_24%,transparent)] bg-[rgba(255,255,255,0.035)]">
                <Zap className="h-4 w-4 text-[color:var(--room-accent)]" />
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dobly-text)]">
                <MessageSquareText className="h-4 w-4 text-[color:var(--room-accent)]" />
                Correction loop
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--dobly-text-secondary)]">
                {profile.correctionFocus} When Dobly drafts something you dislike, edit it here and send the correction
                back as memory for this coworker or department.
              </p>
              <Link href={`/dashboard/generate?prompt=${encodeURIComponent(`Improve this ${roomName} work using my corrected note: ${note.slice(0, 700)}`)}`} className="btn-primary mt-4 w-full justify-center">
                Continue with corrections
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <NittyPanel title="Record fields" items={profile.recordFields} />
          <NittyPanel title="Actions" items={profile.primaryActions} />
          <NittyPanel title="Automation triggers" items={profile.automationMoments} />
          <NittyPanel title="Approval rules" items={profile.approvalRules} tone="warn" />
          <NittyPanel title="Connected apps" items={profile.connectedApps} />
          <NittyPanel title="Done means" items={profile.doneSignals} tone="success" />
        </div>
      </div>
    </section>
  );
}

function NittyPanel({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "warn" | "success";
}) {
  const dotClass =
    tone === "warn"
      ? "bg-amber-500"
      : tone === "success"
        ? "bg-emerald-500"
        : "bg-[var(--dobly-accent)]";

  return (
    <div className="relative overflow-hidden rounded-[1.2rem] border border-[color-mix(in_srgb,var(--room-accent)_12%,var(--dobly-border))] bg-[linear-gradient(145deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] p-4">
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-[color-mix(in_srgb,var(--room-accent)_42%,transparent)] to-transparent" />
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">{title}</div>
        <span className="rounded-full border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.035)] px-2 py-0.5 text-[10px] text-[var(--dobly-text-muted)]">
          {items.length}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 rounded-[0.8rem] bg-[rgba(255,255,255,0.025)] px-2 py-1.5 text-xs leading-5 text-[var(--dobly-text-secondary)]">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArtifactCard({
  icon: Icon,
  title,
  body,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[1.2rem] border border-[color-mix(in_srgb,var(--room-accent)_14%,var(--dobly-border))] bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.022))] p-4 transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--room-accent)_34%,transparent)]"
    >
      <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-[color-mix(in_srgb,var(--room-accent)_48%,transparent)] to-transparent opacity-80" />
      <div className="grid h-11 w-11 place-items-center rounded-[1rem] border border-[color-mix(in_srgb,var(--room-accent)_20%,transparent)] bg-[color-mix(in_srgb,var(--room-accent)_12%,transparent)] text-[color:var(--room-accent)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-[var(--dobly-text)]">{title}</h3>
      <p className="mt-2 text-xs leading-6 text-[var(--dobly-text-muted)]">{body}</p>
      <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--room-accent)]">
        Create from context
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
