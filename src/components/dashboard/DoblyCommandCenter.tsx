"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  BookOpenText,
  Brain,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronDown,
  CircleDollarSign,
  Command,
  Compass,
  DatabaseZap,
  FileText,
  Gauge,
  GitBranch,
  Grid2X2,
  Layers3,
  Mail,
  Maximize2,
  MessageSquareText,
  Minus,
  MoreHorizontal,
  Plus,
  PlugZap,
  Search,
  Settings,
  Sparkles,
  Target,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useTheme } from "@/components/providers/ThemeProvider";
import { getDoblyPlan, type DoblyPlanId } from "@/lib/billing/plans";
import { CONNECTION_GROUPS, CONNECTION_PROVIDERS, type ConnectionProviderDefinition } from "@/lib/connection-catalog";
import { analyzePromptDesign } from "@/lib/generation";
import { createClient } from "@/lib/supabase/client";
import type {
  HomebaseDashboardData,
  HomebaseDepartmentView,
  HomebaseWorkerView,
} from "@/lib/office/homebase";
import type { OfficeEventRecord } from "@/lib/office/types";
import type { Connection, Profile } from "@/types";

type ViewMode = "feed" | "workers" | "offices" | "connections" | "pipelines" | "settings";
type DetailKind = "feed" | "worker" | "office" | "connection" | "pipeline" | "gm";

type DetailSelection = {
  kind: DetailKind;
  title: string;
  badge: string;
  timestamp?: string;
  description: string;
  context?: string[];
  actions?: string[];
  recommendation?: string;
  requiresInput?: boolean;
  nodeId?: string;
  primaryAction?: { label: string; href?: string; eventView?: ViewMode };
  secondaryActions?: Array<{ label: string; href?: string; eventView?: ViewMode; tone?: "normal" | "danger" }>;
};

type GraphElement = {
  data: Record<string, string | number | boolean | null | undefined>;
};

declare global {
  interface Window {
    cytoscape?: (options: Record<string, unknown>) => any;
  }
}

const officeNames: Record<string, string> = {
  reception: "Customer",
  support: "Customer",
  finance: "Finance",
  sales: "Sales",
  operations: "Ops",
  marketing: "Marketing",
  hr: "HR",
  compliance: "Legal",
  analytics: "Research",
  growth: "Research",
  admin: "Ops",
  projects: "Ops",
  integrations: "Ops",
  general_manager: "GM",
  boardroom: "Board",
  training_room: "Training",
  filing_cabinet: "Memory",
};

const viewLabels: Record<ViewMode, string> = {
  feed: "Feed",
  workers: "Coworkers",
  offices: "Offices",
  connections: "Connections",
  pipelines: "Builders",
  settings: "Settings",
};

const officeColors: Record<string, { bg: string; icon: React.ReactNode }> = {
  Customer: { bg: "rgba(100,140,255,0.12)", icon: <MessageSquareText className="h-3.5 w-3.5" /> },
  Finance: { bg: "rgba(80,200,140,0.12)", icon: <CircleDollarSign className="h-3.5 w-3.5" /> },
  Sales: { bg: "rgba(255,160,80,0.12)", icon: <ArrowRight className="h-3.5 w-3.5" /> },
  Ops: { bg: "rgba(200,200,200,0.10)", icon: <Settings className="h-3.5 w-3.5" /> },
  Marketing: { bg: "rgba(196,80,26,0.14)", icon: <Zap className="h-3.5 w-3.5" /> },
  HR: { bg: "rgba(176,129,255,0.12)", icon: <Bot className="h-3.5 w-3.5" /> },
  Legal: { bg: "rgba(230,168,48,0.12)", icon: <FileText className="h-3.5 w-3.5" /> },
  Research: { bg: "rgba(123,164,255,0.12)", icon: <Search className="h-3.5 w-3.5" /> },
  GM: { bg: "rgba(196,80,26,0.18)", icon: <Brain className="h-3.5 w-3.5" /> },
};

function timeAgo(value?: string | null) {
  if (!value) return "Just now";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function normalizeOffice(id?: string | null) {
  if (!id) return "Ops";
  return officeNames[id] ?? id.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sectionLabel(label: string) {
  return <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--t3)]">{label}</div>;
}

function NodeGraphIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4.5 4.5 11.5 8M4.5 11.5 11.5 8" stroke={active ? "var(--rust)" : "var(--t2)"} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="3.5" cy="4" r="2" stroke={active ? "var(--rust)" : "var(--t2)"} strokeWidth="1.3" />
      <circle cx="3.5" cy="12" r="2" stroke={active ? "var(--rust)" : "var(--t2)"} strokeWidth="1.3" />
      <circle cx="12.5" cy="8" r="2" stroke={active ? "var(--rust)" : "var(--t2)"} strokeWidth="1.3" />
    </svg>
  );
}

export default function DoblyCommandCenter({
  userId,
  profile,
  office,
  connections,
}: {
  userId: string;
  profile: Profile | null;
  office: HomebaseDashboardData;
  connections: Connection[];
}) {
  const [view, setView] = useState<ViewMode>("feed");
  const [brainViewEnabled, setBrainViewEnabled] = useState(Boolean(profile?.brain_view_enabled));
  const [tooltipSeen, setTooltipSeen] = useState(Boolean(profile?.brain_tooltip_seen));
  const [showBrainTooltip, setShowBrainTooltip] = useState(false);
  const [detail, setDetail] = useState<DetailSelection | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [toolboxOpen, setToolboxOpen] = useState(false);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const plan = useMemo(() => getDoblyPlan((profile?.plan ?? "free") as DoblyPlanId), [profile?.plan]);

  const activeWorkers = office.workers.filter((worker) => ["active", "shadow", "running"].includes(worker.status));
  const waitingTasks = office.tasks.filter((task) => task.status === "waiting_approval");
  const feedEntries = useMemo(() => buildFeedEntries(office), [office]);
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  useEffect(() => {
    if (tooltipSeen) return;
    const timer = window.setTimeout(() => setShowBrainTooltip(true), 1500);
    return () => window.clearTimeout(timer);
  }, [tooltipSeen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setToolboxOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const urlView = new URLSearchParams(window.location.search).get("view");
    if (isViewMode(urlView)) setView(urlView);

    function handleDashboardNavigate(event: Event) {
      const nextView = (event as CustomEvent<{ view?: string }>).detail?.view ?? null;
      if (isViewMode(nextView)) {
        setBrainViewEnabled(false);
        setView(nextView);
        setDetail(null);
      }
    }

    function handleBrainToggle(event: Event) {
      const enabled = (event as CustomEvent<{ enabled?: boolean }>).detail?.enabled;
      if (typeof enabled === "boolean") {
        void persistBrainPreference(enabled, tooltipSeen || enabled);
      } else {
        void persistBrainPreference(!brainViewEnabled, tooltipSeen || !brainViewEnabled);
      }
    }

    window.addEventListener("dobly:navigate", handleDashboardNavigate);
    window.addEventListener("dobly:brain-toggle", handleBrainToggle);
    return () => {
      window.removeEventListener("dobly:navigate", handleDashboardNavigate);
      window.removeEventListener("dobly:brain-toggle", handleBrainToggle);
    };
  }, [brainViewEnabled, tooltipSeen]);

  async function persistBrainPreference(nextValue: boolean, seen = tooltipSeen) {
    setBrainViewEnabled(nextValue);
    const supabase = createClient();
    await supabase.from("profiles").update({ brain_view_enabled: nextValue, brain_tooltip_seen: seen }).eq("id", userId);
  }

  async function dismissBrainTooltip(enable: boolean) {
    setShowBrainTooltip(false);
    setTooltipSeen(true);
    await persistBrainPreference(enable, true);
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_auto] overflow-hidden bg-[var(--bg)]">
      <div className="grid min-h-0 grid-rows-[56px_minmax(0,1fr)] overflow-hidden">
        <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--div)] bg-[var(--bg)] px-6">
          <div className="min-w-0">
            <h1 className="text-[17px] font-semibold text-[var(--t1)]">{brainViewEnabled ? "Brain" : viewLabels[view]}</h1>
            <p className="hidden truncate text-[11px] text-[var(--t3)] md:block">
              {brainViewEnabled ? "Your Dobly ecosystem as a living graph." : `Calm control for ${firstName}. Dobly is already handling the moving parts.`}
            </p>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setToolboxOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[var(--div)] px-3 text-[12px] text-[var(--t2)] transition hover:bg-[rgba(245,237,228,0.04)]"
            >
              <Command className="h-3.5 w-3.5" />
              Toolbox
            </button>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-[7px] border border-[var(--div)] bg-transparent transition hover:bg-[rgba(245,237,228,0.04)]"
              onClick={() => persistBrainPreference(!brainViewEnabled)}
              aria-label="Toggle Brain View"
            >
              <NodeGraphIcon active={brainViewEnabled} />
            </button>
            {showBrainTooltip ? (
              <div className="absolute right-24 top-10 z-40 w-[220px] rounded-[8px] border border-[rgba(196,80,26,0.3)] bg-[var(--bg-3)] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="text-[13px] font-semibold text-[var(--t1)]">Try Brain View</div>
                <p className="mt-1 text-[12px] leading-4 text-[var(--t2)]">See your operation as a living graph.</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => dismissBrainTooltip(true)} className="rounded-[6px] bg-[var(--rust)] px-2.5 py-1.5 text-[11px] font-semibold text-[#F5EDE4]">Try it</button>
                  <button type="button" onClick={() => dismissBrainTooltip(false)} className="rounded-[6px] px-2.5 py-1.5 text-[11px] text-[var(--t2)] hover:bg-[rgba(245,237,228,0.05)]">Dismiss</button>
                </div>
              </div>
            ) : null}
            {!brainViewEnabled ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDateFilterOpen((open) => !open)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[var(--div)] px-3 text-[12px] text-[var(--t2)] transition hover:bg-[rgba(245,237,228,0.04)]"
                >
                  Today
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {dateFilterOpen ? (
                  <div className="absolute right-0 top-10 z-30 w-36 rounded-[8px] border border-[var(--div)] bg-[var(--bg-3)] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    {["Today", "This week", "Needs input"].map((option) => (
                      <button key={option} type="button" onClick={() => setDateFilterOpen(false)} className="block w-full rounded-[6px] px-2.5 py-2 text-left text-[12px] text-[var(--t2)] hover:bg-[rgba(245,237,228,0.05)]">{option}</button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            <button type="button" onClick={() => setBriefOpen(true)} className="inline-flex h-[34px] items-center gap-2 rounded-[14px] bg-[var(--rust)] px-3.5 text-[13px] font-semibold text-[#F5EDE4] transition hover:-translate-y-px hover:bg-[var(--rust-h)]">
              <Plus className="h-3.5 w-3.5" />
              {brainViewEnabled ? "New Role" : "New Role"}
            </button>
          </div>
        </header>

        <main className="relative min-h-0 overflow-hidden">
          <SpaceBackdrop />
          {brainViewEnabled ? (
            <BrainView
              office={office}
              connections={connections}
              feedEntries={feedEntries}
              onSelect={setDetail}
            />
          ) : (
            <NormalDashboard
              view={view}
              setView={setView}
              office={office}
              connections={connections}
              feedEntries={feedEntries}
              waitingTasks={waitingTasks.length}
              activeWorkers={activeWorkers.length}
              profilePlan={plan.id}
              onSelect={setDetail}
              onNew={() => setBriefOpen(true)}
            />
          )}
        </main>
      </div>

      <DetailPanel selection={detail} onClose={() => setDetail(null)} />
      {toolboxOpen ? <ToolboxModal onClose={() => setToolboxOpen(false)} /> : null}
      {briefOpen ? <NewRolePanel onClose={() => setBriefOpen(false)} connections={connections} /> : null}
    </div>
  );
}

function isViewMode(value: string | null): value is ViewMode {
  return value === "feed" || value === "workers" || value === "offices" || value === "connections" || value === "pipelines" || value === "settings";
}

function buildFeedEntries(office: HomebaseDashboardData): DetailSelection[] {
  const stateEntries = office.states
    .filter((state) => ["watching", "at_risk", "breached", "recovering"].includes(state.healthStatus))
    .slice(0, 6)
    .map((state) => ({
      kind: "feed" as const,
      title: state.title,
      badge: "State Engine",
      timestamp: state.lastEvaluatedAt ?? undefined,
      description: state.desiredCondition,
      context: [`Health: ${state.healthStatus}`, state.targetMetric ? `Metric: ${state.targetMetric}` : "No target metric set"],
      actions: ["Evaluated against live operating data", "Pressure score calculated", "Ready for coworker or owner action"],
      recommendation: state.objective,
      requiresInput: ["at_risk", "breached"].includes(state.healthStatus),
      primaryAction: { label: "Open states", href: "/dashboard/ops" },
      secondaryActions: [
        { label: "View office", eventView: "offices" as const },
        { label: "Inspect approvals", href: "/dashboard/approvals" },
      ],
      nodeId: state.deskId ? `office:${state.deskId}` : "gm",
    }));

  const candidateEntries = office.actionCandidates.slice(0, 6).map((candidate) => ({
    kind: "feed" as const,
    title: candidate.title,
    badge: "Action Candidate",
    timestamp: candidate.updatedAt,
    description: candidate.summary,
    context: [`Mode: ${candidate.executionMode}`, `Risk: ${candidate.riskLevel}`, `Kind: ${candidate.actionKind}`],
    actions: ["Generated from state drift", "Waiting for coworker or owner path", "Ready for simulation or supervised run"],
    requiresInput: ["high", "critical"].includes(candidate.riskLevel),
    primaryAction: { label: "Open approvals", href: "/dashboard/approvals" },
    secondaryActions: [
      { label: "View operations", href: "/dashboard/ops" },
      { label: "Open coworkers", eventView: "workers" as const },
    ],
    nodeId: candidate.deskId ? `office:${candidate.deskId}` : "gm",
  }));

  const taskEntries = office.tasks.slice(0, 8).map((task) => {
    const officeName = normalizeOffice(task.departmentId);
    return {
      kind: "feed" as const,
      title: task.title,
      badge: `${officeName} Office`,
      timestamp: task.createdAt,
      description: task.summary || `Dobly prepared a ${task.riskLevel} risk decision package.`,
      context: [`Risk level: ${task.riskLevel}`, `Runtime: ${task.runtimeKind}`, task.toolName ? `Tool: ${task.toolName}` : "No external tool required"],
      actions: ["Loaded relevant office context", "Checked approval boundaries", "Prepared the owner decision package"],
      recommendation: task.approvalRequired ? "Approve if the context matches your intent, or override with a clearer instruction." : undefined,
      requiresInput: task.status === "waiting_approval",
      primaryAction: task.status === "waiting_approval" ? { label: "Review approval", href: "/dashboard/approvals" } : { label: "Open feed", eventView: "feed" as const },
      secondaryActions: [
        { label: "View role", eventView: "workers" as const },
        { label: "Show office", eventView: "offices" as const },
      ],
      nodeId: `worker:${task.workerKey}`,
    };
  });

  const eventEntries = office.recentEvents.slice(0, 12).map((event) => {
    const officeName = normalizeOffice(event.departmentId);
    return {
      kind: "feed" as const,
      title: event.title,
      badge: `${officeName} Office`,
      timestamp: event.createdAt,
      description: event.summary ?? event.eventType,
      context: [`Risk: ${event.riskLevel}`, `Event type: ${event.eventType}`],
      actions: ["Logged to the operation feed", "Updated the relevant office context"],
      requiresInput: ["high", "critical"].includes(event.riskLevel),
      primaryAction: ["high", "critical"].includes(event.riskLevel) ? { label: "Review escalation", href: "/dashboard/approvals" } : { label: "Open office", eventView: "offices" as const },
      secondaryActions: [
        { label: "Filter feed", eventView: "feed" as const },
        { label: "View roles", eventView: "workers" as const },
      ],
      nodeId: event.departmentId ? `office:${event.departmentId}` : "gm",
    };
  });

  const fallback: DetailSelection[] = [
    {
      kind: "feed",
      title: "Dobly is waiting for its first live job.",
      badge: "General Manager",
      description: "Create a role and Dobly will start turning the feed into a plain-language operating narrative.",
      context: ["No live events have been logged yet.", "Sandbox runs and connection checks will appear here."],
      actions: ["Standing by for a brief"],
      primaryAction: { label: "Create first role", eventView: "workers" },
      secondaryActions: [{ label: "Connect tools", eventView: "connections" }],
      nodeId: "gm",
    },
  ];

  const combined = [...candidateEntries, ...stateEntries, ...taskEntries, ...eventEntries];
  return combined.length ? combined : fallback;
}

function buildFeedStats(office: HomebaseDashboardData, entries: DetailSelection[]) {
  const activeRoles = office.workers.filter((worker) => ["active", "shadow", "running"].includes(worker.status)).length;
  const escalated = office.tasks.filter((task) => task.status === "waiting_approval" || task.riskLevel === "high" || task.riskLevel === "critical").length;
  const failures = office.tasks.filter((task) => task.status === "failed").length;
  const statePressure = office.states.filter((state) => ["at_risk", "breached"].includes(state.healthStatus)).length;
  const openCandidates = office.actionCandidates.filter((candidate) => candidate.status === "open").length;
  const executions = entries.length;
  const score = Math.max(
    46,
    Math.min(97, 92 - escalated * 4 - failures * 8 - statePressure * 5 - openCandidates * 2 + Math.min(activeRoles, 6) * 2),
  );

  return {
    score,
    executions,
    escalated,
    activeRoles,
    failures,
    statePressure,
    openCandidates,
    recentRoles: office.workers
      .slice()
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 4),
    recentConnections: office.recentEvents
      .filter((event) => event.eventType.includes("integration") || event.source.includes("connection"))
      .slice(0, 3),
  };
}

function NormalDashboard({
  view,
  setView,
  office,
  connections,
  feedEntries,
  waitingTasks,
  activeWorkers,
  profilePlan,
  onSelect,
  onNew,
}: {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  office: HomebaseDashboardData;
  connections: Connection[];
  feedEntries: DetailSelection[];
  waitingTasks: number;
  activeWorkers: number;
  profilePlan: DoblyPlanId;
  onSelect: (selection: DetailSelection) => void;
  onNew: () => void;
}) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[var(--dobly-bg)]">
      <div className="min-h-0 overflow-hidden">
        {view === "feed" ? <FeedView office={office} entries={feedEntries} waitingTasks={waitingTasks} onSelect={onSelect} onNew={onNew} /> : null}
        {view === "workers" ? <WorkersView workers={office.workers} onSelect={onSelect} onNew={onNew} /> : null}
        {view === "offices" ? <OfficesView offices={office.departments} events={office.recentEvents} workers={office.workers} onSelect={onSelect} onNew={onNew} /> : null}
        {view === "connections" ? <ConnectionsView connections={connections} onSelect={onSelect} /> : null}
        {view === "pipelines" ? <PipelinesView office={office} onSelect={onSelect} onNew={onNew} /> : null}
        {view === "settings" ? <SettingsView profilePlan={profilePlan} activeWorkers={activeWorkers} office={office} /> : null}
      </div>
    </div>
  );
}

function FeedView({
  office,
  entries,
  waitingTasks,
  onSelect,
  onNew,
}: {
  office: HomebaseDashboardData;
  entries: DetailSelection[];
  waitingTasks: number;
  onSelect: (selection: DetailSelection) => void;
  onNew: () => void;
}) {
  const stats = useMemo(() => buildFeedStats(office, entries), [entries, office]);
  const [feedMode, setFeedMode] = useState<"all" | "needs_input" | "pressure" | "cleared">("all");
  const visibleEntries = useMemo(() => {
    if (feedMode === "needs_input") return entries.filter((entry) => entry.requiresInput);
    if (feedMode === "pressure") return entries.filter((entry) => /risk|urgent|critical|approval|needs/i.test(`${entry.description} ${entry.badge}`));
    if (feedMode === "cleared") return entries.filter((entry) => !entry.requiresInput);
    return entries;
  }, [entries, feedMode]);

  return (
    <section className="feed-layout grid h-full min-h-0 overflow-hidden px-5 py-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.9fr)] xl:gap-5">
      <div className="feed-left min-h-0 overflow-hidden">
      <div className="feed-briefing shrink-0 rounded-[10px] border border-[var(--div)] bg-[var(--bg-2)] p-5">
        <div className="flex items-center justify-between gap-4">
          {sectionLabel("This Morning")}
          <span className="text-[11px] text-[var(--t3)]">Today 6:00 AM</span>
        </div>
        <p className="mt-3 font-display text-[16px] italic leading-7 text-[var(--t1)] opacity-90">
          {entries.length > 1
            ? `${entries.length} operating updates are ready. ${waitingTasks} need your attention, and Dobly has grouped the rest by office so you can scan the business in under a minute.`
            : "Nothing noisy yet. Dobly is waiting for its first job, and the feed will become the daily narrative of what happened while you were away."}
        </p>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={waitingTasks ? undefined : onNew} className="rounded-[6px] px-3 py-1.5 text-[12px] font-semibold text-[var(--rust)] hover:bg-[rgba(196,80,26,0.08)]">
            {waitingTasks ? `${waitingTasks} need attention` : "Create first role"}
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          ["all", "All", entries.length],
          ["needs_input", "Needs input", entries.filter((entry) => entry.requiresInput).length],
          ["pressure", "Pressure", entries.filter((entry) => /risk|urgent|critical|approval|needs/i.test(`${entry.description} ${entry.badge}`)).length],
          ["cleared", "Cleared", entries.filter((entry) => !entry.requiresInput).length],
        ].map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFeedMode(value as "all" | "needs_input" | "pressure" | "cleared")}
            className={`rounded-full border px-3 py-1.5 text-[11px] transition ${
              feedMode === value
                ? "border-[rgba(196,80,26,0.38)] bg-[rgba(196,80,26,0.12)] text-[var(--t1)]"
                : "border-[var(--div)] text-[var(--t2)] hover:bg-[rgba(245,237,228,0.04)]"
            }`}
          >
            {label} · {count}
          </button>
        ))}
      </div>
      <div className="feed-entries min-h-0 overflow-y-auto pt-3">
        {visibleEntries.map((entry, index) => (
          <FeedRow key={`${entry.title}-${index}`} entry={entry} onSelect={onSelect} />
        ))}
      </div>
      </div>
      <aside className="feed-stats mt-4 hidden min-h-0 overflow-y-auto rounded-[10px] border border-[var(--div)] bg-[var(--bg-2)] p-5 xl:block">
        {sectionLabel("Live Stats")}
        <div className="mt-4 font-display text-[48px] italic leading-none text-[var(--rust)]">{stats.score}</div>
        <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[var(--t3)]">Dobly Score</div>
        <p className="mt-2 text-[13px] leading-5 text-[var(--t2)]">
          {stats.escalated > 0
            ? `Operating well. ${stats.escalated} item${stats.escalated === 1 ? "" : "s"} need direct attention.`
            : "Operating well. No major pressure is visible right now."}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--div)] pt-5">
          <StatBlock label="executions" value={String(stats.executions)} />
          <StatBlock label="escalated" value={String(stats.escalated)} />
          <StatBlock label="active roles" value={String(stats.activeRoles)} />
          <StatBlock label="failures" value={String(stats.failures)} />
          <StatBlock label="state pressure" value={String(stats.statePressure)} />
          <StatBlock label="action queue" value={String(stats.openCandidates)} />
        </div>
        <div className="mt-5 border-t border-[var(--div)] pt-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--t3)]">Active Roles</div>
          <div className="mt-3 grid gap-2">
            {stats.recentRoles.map((worker) => (
              <div key={worker.id} className="flex items-center justify-between gap-3 text-[12px] text-[var(--t2)]">
                <span className="truncate text-[var(--t1)]">{worker.name}</span>
                <span className="shrink-0">{timeAgo(worker.updatedAt)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 border-t border-[var(--div)] pt-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--t3)]">Recent Connections</div>
          <div className="mt-3 grid gap-2">
            {stats.recentConnections.length ? stats.recentConnections.map((event) => (
              <div key={event.id} className="text-[12px] leading-5 text-[var(--t2)]">
                <div className="truncate text-[var(--t1)]">{event.title}</div>
                <div>{timeAgo(event.createdAt)}</div>
              </div>
            )) : <div className="text-[12px] text-[var(--t3)]">No recent connection activity yet.</div>}
          </div>
        </div>
      </aside>
    </section>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[20px] font-semibold text-[var(--t1)]">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--t3)]">{label}</div>
    </div>
  );
}

function FeedRow({ entry, onSelect }: { entry: DetailSelection; onSelect: (selection: DetailSelection) => void }) {
  const officeName = entry.badge.replace(" Office", "");
  const tone = officeColors[officeName] ?? officeColors.Ops;
  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="grid w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--div2)] px-2 py-3 text-left transition hover:bg-[rgba(196,80,26,0.04)]"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full text-[var(--t2)]" style={{ backgroundColor: tone.bg }}>
        {tone.icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] text-[var(--t1)]">{entry.description}</span>
        <span className="mt-1 block text-[12px] text-[var(--t3)]">{entry.badge} · {timeAgo(entry.timestamp)}</span>
      </span>
      {entry.requiresInput ? (
        <span className="rounded-full border border-[rgba(196,80,26,0.45)] px-2 py-1 text-[11px] text-[var(--rust)]">
          Needs input
        </span>
      ) : null}
    </button>
  );
}

function WorkersView({
  workers,
  onSelect,
  onNew,
}: {
  workers: HomebaseWorkerView[];
  onSelect: (selection: DetailSelection) => void;
  onNew: () => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"all" | "active" | "shadow" | "paused">("all");
  const visible = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return workers.filter((worker) => {
      const matchesQuery =
        !lowered ||
        worker.name.toLowerCase().includes(lowered) ||
        worker.mission.toLowerCase().includes(lowered) ||
        normalizeOffice(worker.departmentId).toLowerCase().includes(lowered);
      const matchesMode =
        mode === "all" ||
        (mode === "active" && worker.status === "active") ||
        (mode === "shadow" && worker.status === "shadow") ||
        (mode === "paused" && worker.status === "paused");
      return matchesQuery && matchesMode;
    });
  }, [mode, query, workers]);

  return (
    <section className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="relative w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--t3)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 w-full rounded-[7px] border border-[var(--div)] bg-[var(--bg-2)] pl-9 pr-3 text-[13px] text-[var(--t1)] outline-none placeholder:text-[var(--t3)]" placeholder="Search coworkers..." />
        </div>
        <button type="button" onClick={onNew} className="h-8 rounded-[6px] bg-[var(--rust)] px-3 text-[13px] font-semibold text-[#F5EDE4]">New Role</button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["active", "Active"],
          ["shadow", "Shadow"],
          ["paused", "Paused"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value as "all" | "active" | "shadow" | "paused")}
            className={`rounded-full border px-3 py-1.5 text-[11px] transition ${
              mode === value
                ? "border-[rgba(196,80,26,0.38)] bg-[rgba(196,80,26,0.12)] text-[var(--t1)]"
                : "border-[var(--div)] text-[var(--t2)] hover:bg-[rgba(245,237,228,0.04)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {visible.length ? (
        <div className="grid min-h-0 grid-cols-3 gap-3 overflow-y-auto pr-1">
          {visible.map((worker) => (
            <button
              key={worker.id}
              type="button"
              onClick={() => onSelect(workerDetail(worker))}
              className="h-[140px] rounded-[10px] border border-[var(--div)] bg-[var(--bg-2)] p-[18px] text-left transition hover:border-[rgba(196,80,26,0.25)] hover:bg-[var(--bg-3)]"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="truncate text-[15px] font-semibold text-[var(--t1)]">{worker.name}</h3>
                <span className={`h-2 w-2 rounded-full ${worker.status === "active" ? "bg-[#54BA7B]" : worker.status === "paused" ? "bg-[#E6A830]" : "bg-[var(--t3)]"}`} />
              </div>
              <div className="mt-3 inline-flex rounded-full bg-[rgba(245,237,228,0.05)] px-2 py-1 text-[11px] text-[var(--t2)]">{normalizeOffice(worker.departmentId)}</div>
              <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-[var(--t2)]">{worker.mission || "A Dobly role assigned to recurring operational work."}</p>
              <div className="mt-4 flex justify-between text-[11px] text-[var(--t3)]">
                <span>{timeAgo(worker.updatedAt)}</span>
                <span>{Math.round(worker.trustScore * 100)}% trust</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState text="No roles yet. Tell Dobly what to handle." action="Create role" onAction={onNew} />
      )}
    </section>
  );
}

function workerDetail(worker: HomebaseWorkerView): DetailSelection {
  return {
    kind: "worker",
    title: worker.name,
    badge: `${normalizeOffice(worker.departmentId)} Office`,
    timestamp: worker.updatedAt,
    description: worker.mission || "This role handles a defined part of the operation.",
    context: [`Status: ${worker.status}`, `Autonomy: ${worker.autonomyMode}`, `Trust score: ${Math.round(worker.trustScore * 100)}%`],
    actions: ["Trigger configured", "Office memory available", "Escalation boundaries active"],
    primaryAction: { label: worker.status === "paused" ? "Resume role" : "Open role", href: `/dashboard/coworkers/${worker.id}` },
    secondaryActions: [
      { label: worker.status === "paused" ? "Keep paused" : "Pause role", href: `/dashboard/coworkers/${worker.id}` },
      { label: "Edit instructions", href: `/dashboard/coworkers/${worker.id}` },
      { label: "View runs", eventView: "feed" },
    ],
    nodeId: `worker:${worker.id}`,
  };
}

function OfficesView({
  offices,
  events,
  workers,
  onSelect,
  onNew,
}: {
  offices: HomebaseDepartmentView[];
  events: OfficeEventRecord[];
  workers: HomebaseWorkerView[];
  onSelect: (selection: DetailSelection) => void;
  onNew: () => void;
}) {
  const coreOffices = offices.filter((office) => !["boardroom", "general_manager", "training_room", "filing_cabinet"].includes(office.id)).slice(0, 8);
  return (
    <section className="h-full min-h-0 overflow-y-auto p-5">
      <div className="grid grid-cols-2 gap-3">
        {coreOffices.map((office) => {
          const officeWorkers = workers.filter((worker) => worker.departmentId === office.id);
          const officeEvents = events.filter((event) => event.departmentId === office.id).slice(0, 3);
          return (
            <button
              type="button"
              key={office.id}
              onClick={() => onSelect(officeDetail(office, officeWorkers.length))}
              className="h-[200px] rounded-[12px] border border-[var(--div)] bg-[var(--bg-2)] p-6 text-left transition hover:border-[rgba(196,80,26,0.25)] hover:bg-[var(--bg-3)]"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[16px] font-semibold text-[var(--t1)]">{normalizeOffice(office.id)} Office</h3>
                <span className="rounded-full bg-[rgba(245,237,228,0.05)] px-2 py-1 text-[11px] text-[var(--t2)]">{officeWorkers.length} roles</span>
              </div>
              <p className="mt-3 line-clamp-1 text-[13px] text-[var(--t2)]">{office.purpose}</p>
              <div className="mt-4 grid gap-1.5">
                {(officeEvents.length ? officeEvents : [{ id: `${office.id}-empty`, title: "No recent activity yet." } as OfficeEventRecord]).map((event) => (
                  <div key={event.id} className="truncate text-[12px] text-[var(--t2)]">{event.title}</div>
                ))}
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--t4)]">
                <div className="h-full rounded-full bg-[var(--rust)]" style={{ width: `${Math.min(100, Math.max(8, office.activeWorkers * 18 + office.openTasks * 8))}%` }} />
              </div>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onNew} className="mt-3 rounded-[8px] border border-[var(--div)] px-3 py-2 text-[13px] text-[var(--t2)] hover:bg-[rgba(245,237,228,0.04)]">
        Add Role to this Office
      </button>
    </section>
  );
}

function officeDetail(office: HomebaseDepartmentView, count: number): DetailSelection {
  return {
    kind: "office",
    title: `${normalizeOffice(office.id)} Office`,
    badge: `${count} active roles`,
    description: office.purpose,
    context: [`Open tasks: ${office.openTasks}`, `Approvals waiting: ${office.approvalCount}`, `Operating records: ${office.operatingRecordCount}`],
    actions: ["Coordinates roles in this office", "Writes office-specific memory", "Escalates through the General Manager"],
    primaryAction: { label: "Add role here", eventView: "workers" },
    secondaryActions: [
      { label: "View office activity", eventView: "feed" },
      { label: "Open office page", href: `/dashboard/departments/${office.id}` },
    ],
    nodeId: `office:${office.id}`,
  };
}

function ConnectionsView({
  connections,
  onSelect,
}: {
  connections: Connection[];
  onSelect: (selection: DetailSelection) => void;
}) {
  const connected = connections.filter((connection) => connection.status === "active");
  const connectedProviderIds = new Set(connected.map((connection) => connection.provider));
  const connectedByProvider = new Map(connections.map((connection) => [connection.provider, connection]));
  const availableProviders = CONNECTION_PROVIDERS.filter(
    (provider) => !connectedProviderIds.has(provider.id),
  );
  return (
    <section className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold text-[var(--t1)]">Connection library</div>
          <p className="mt-1 text-[12px] text-[var(--t2)]">
            All Dobly connection options are here. Verified live tools can execute; draft-only tools are shown honestly.
          </p>
        </div>
        <div className="rounded-full bg-[rgba(196,80,26,0.12)] px-3 py-1 text-[11px] text-[var(--rust)]">
          {connected.length} connected · {CONNECTION_PROVIDERS.length} available
        </div>
      </div>
      <div className="min-h-0 overflow-y-auto pr-1">
      <ConnectionSection title="Connected" count={connected.length}>
        {connected.length ? (
          connected.map((connection) => (
            <ConnectionCard
              key={connection.id}
              title={connection.label || connection.provider}
              description={`${connection.provider} · ${connection.status}`}
              live
              onSelect={() => onSelect(connectionDetail(connection))}
            />
          ))
        ) : (
          <div className="col-span-2 rounded-[10px] border border-dashed border-[var(--div)] p-5 text-[13px] text-[var(--t2)]">
            No connections yet. Choose any provider below to unlock live actions.
          </div>
        )}
      </ConnectionSection>
      <div className="my-5 h-px bg-[var(--div)]" />
      {CONNECTION_GROUPS.map((group) => {
        const providers = availableProviders.filter((provider) => provider.category === group.id);
        if (!providers.length) return null;
        return (
          <div key={group.id} className="mb-5">
            <ConnectionSection title={group.label} count={providers.length}>
              {providers.map((provider) => {
                const existing = connectedByProvider.get(provider.id);
                return (
                  <ConnectionCard
                    key={provider.id}
                    title={provider.label}
                    description={provider.description}
                    live={existing?.status === "active"}
                    draftOnly={!provider.launchReady}
                    onSelect={() => onSelect(providerDetail(provider, existing))}
                  />
                );
              })}
            </ConnectionSection>
          </div>
        );
      })}
      </div>
    </section>
  );
}

function connectionDetail(connection: Connection): DetailSelection {
  return {
    kind: "connection",
    title: connection.label || connection.provider,
    badge: "Live",
    timestamp: connection.updated_at,
    description: `${connection.provider} is connected and available to verified live runtime actions.`,
    context: [`Account: ${connection.account_identifier ?? "Connected account"}`, `Scopes: ${connection.scopes?.join(", ") || "Default scopes"}`],
    actions: ["Test the token/permission path", "Use it in matching roles", "Review scopes before live activation"],
    primaryAction: { label: "Test connection", href: `/dashboard/connections/${connection.id}` },
    secondaryActions: [
      { label: "Use in new role", eventView: "workers" },
      { label: "Manage connection", href: `/dashboard/connections/${connection.id}` },
      { label: "Disconnect", href: `/dashboard/connections/${connection.id}`, tone: "danger" },
    ],
    nodeId: `conn-${connection.id}`,
  };
}

function providerDetail(provider: ConnectionProviderDefinition, existing?: Connection): DetailSelection {
  const launchState = provider.launchReady ? "Verified live / setup ready" : "Draft-only until runtime is verified";
  return {
    kind: "connection",
    title: provider.label,
    badge: existing?.status === "active" ? "Connected" : launchState,
    timestamp: existing?.updated_at,
    description: provider.description,
    context: [
      `Category: ${provider.category.replace("-", " ")}`,
      `Setup method: ${provider.starterFlow.method}`,
      `Use cases: ${provider.useCases.join(", ")}`,
      provider.launchReady ? "Dobly can expose this in setup." : "Dobly should not promise live execution until this provider is verified.",
    ],
    actions: [
      "Connect the account or credential path",
      "Check required permissions before activation",
      "Use only in workflows where the runtime contract is verified",
    ],
    primaryAction: { label: existing?.status === "active" ? "Open connection" : `Connect ${provider.label}`, href: `/dashboard/connect/${provider.id}` },
    secondaryActions: [
      { label: "Use in new role", eventView: "workers" },
      { label: "View setup requirements", href: `/dashboard/connect/${provider.id}` },
    ],
    nodeId: existing ? `conn-${existing.id}` : `provider:${provider.id}`,
  };
}

function ConnectionSection({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {sectionLabel(title)}
        {typeof count === "number" ? <span className="rounded-full bg-[rgba(245,237,228,0.05)] px-2 py-0.5 text-[10px] text-[var(--t2)]">{count}</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function ConnectionCard({ title, description, live, draftOnly, onSelect }: { title: string; description: string; live?: boolean; draftOnly?: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`rounded-[10px] border border-[var(--div)] bg-[var(--bg-2)] p-5 text-left transition hover:border-[rgba(196,80,26,0.25)] hover:bg-[var(--bg-3)] ${live ? "" : "opacity-85"}`}>
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-[10px] bg-[rgba(196,80,26,0.12)] text-[var(--rust)]">
        <DatabaseZap className="h-5 w-5" />
      </div>
      <div className="mt-3 text-center text-[14px] font-semibold text-[var(--t1)]">{title}</div>
      <div className="mt-1 text-center text-[12px] text-[var(--t2)]">{description}</div>
      <div className="mt-4 flex justify-center">
        {live ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#54BA7B]"><span className="h-1.5 w-1.5 rounded-full bg-[#54BA7B]" />Live</span>
        ) : draftOnly ? (
          <span className="rounded-[6px] border border-[rgba(245,237,228,0.12)] px-3 py-1.5 text-[12px] text-[var(--t2)]">Draft only</span>
        ) : (
          <span className="rounded-[6px] border border-[rgba(196,80,26,0.35)] px-3 py-1.5 text-[12px] text-[var(--rust)]">Connect</span>
        )}
      </div>
    </button>
  );
}

function PipelinesView({ office, onSelect, onNew }: { office: HomebaseDashboardData; onSelect: (selection: DetailSelection) => void; onNew: () => void }) {
  const pipelines = office.workers.filter((worker) => `${worker.runtimeKind} ${worker.mission}`.toLowerCase().includes("pipeline")).slice(0, 8);
  return (
    <section className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[13px] text-[var(--t2)]">Multi-step jobs where one output feeds the next.</div>
        <button type="button" onClick={onNew} className="h-8 rounded-[6px] bg-[var(--rust)] px-3 text-[13px] font-semibold text-[#F5EDE4]">New Pipeline</button>
      </div>
      <div className="min-h-0 overflow-y-auto">
        {(pipelines.length ? pipelines : office.workers.slice(0, 4)).map((worker, index) => (
          <button
            key={worker.id}
            type="button"
            onClick={() => onSelect({ ...workerDetail(worker), kind: "pipeline", title: worker.name })}
            className="mb-2 grid w-full grid-cols-[minmax(0,1fr)_220px_auto] items-center gap-4 rounded-[10px] border border-[var(--div)] bg-[var(--bg-2)] p-4 text-left transition hover:bg-[var(--bg-3)]"
          >
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold text-[var(--t1)]">{worker.name || `Pipeline ${index + 1}`}</span>
              <span className="mt-1 block truncate text-[12px] text-[var(--t2)]">{worker.mission || "Manual trigger · supervised runtime"}</span>
              <span className="mt-1 block text-[11px] text-[var(--t3)]">4 steps</span>
            </span>
            <span className="flex items-center gap-2">
              {[0, 1, 2, 3].map((step) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--rust)]" title={`Step ${step + 1}`} />
                  {step < 3 ? <span className="h-px w-9 bg-[rgba(245,237,228,0.12)]" /> : null}
                </span>
              ))}
            </span>
            <span className="text-[11px] text-[var(--t3)]">{timeAgo(worker.updatedAt)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SettingsView({
  profilePlan,
  activeWorkers,
  office,
}: {
  profilePlan: DoblyPlanId;
  activeWorkers: number;
  office: HomebaseDashboardData;
}) {
  const tabs = ["Profile", "Business", "Appearance", "Readiness", "Notifications", "Billing", "Security", "Team"];
  const [active, setActive] = useState("Business");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const plan = getDoblyPlan(profilePlan);
  const staffedDepartments = office.departments.filter((department) => department.activeWorkers > 0).length;
  const workerPercent = Math.min(100, Math.round((activeWorkers / Math.max(1, plan.entitlements.workers)) * 100));
  const departmentPercent = Math.min(100, Math.round((staffedDepartments / Math.max(1, plan.entitlements.departments)) * 100));
  const themeModes = [
    ["dark", "Dark", "Premium night cockpit"],
    ["light", "Light", "Warm parchment workspace"],
    ["system", "System", `Following device: ${resolvedTheme}`],
  ] as const;
  const readiness = [
    ["Auth", "Google sign-in, password auth, callbacks, and protected routes are wired."],
    ["Runtime trust", "Live/draft-only connector categories prevent Dobly from pretending to execute unsupported work."],
    ["Briefings", "Works with both the current user-based schema and older workspace-based briefing tables."],
    ["UI shell", "Fixed cockpit shell, collapsible sidebar, slide-in detail panel, Brain View, and modal creation flow are in place."],
    ["Environment", "API keys still decide which providers can be proven live on your machine."],
  ] as const;
  return (
    <section className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-5">
      <div className="mb-4 flex gap-1 border-b border-[var(--div)] pb-2">
        {tabs.map((tab) => (
          <button key={tab} type="button" onClick={() => setActive(tab)} className={`rounded-[7px] px-3 py-2 text-[12px] ${active === tab ? "bg-[rgba(245,237,228,0.06)] text-[var(--t1)]" : "text-[var(--t2)] hover:bg-[rgba(245,237,228,0.04)]"}`}>{tab}</button>
        ))}
      </div>
      <div className="min-h-0 overflow-y-auto">
        <div className="max-w-3xl rounded-[12px] border border-[var(--div)] bg-[var(--bg-2)] p-5">
          {active === "Business" ? (
            <>
              <h2 className="text-[16px] font-semibold text-[var(--t1)]">Business voice</h2>
              <p className="mt-1 text-[13px] text-[var(--t2)]">This voice feeds every agent and customer-facing role.</p>
              <textarea className="mt-4 h-32 w-full resize-none rounded-[10px] border border-[var(--div)] bg-[var(--bg)] p-3 text-[13px] text-[var(--t1)] outline-none placeholder:text-[var(--t3)]" placeholder="Describe how you want Dobly to sound when communicating with customers..." />
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="rounded-[7px] bg-[var(--rust)] px-4 py-2 text-[13px] font-semibold text-[#F5EDE4]">Save</button>
                <Link href="/dashboard/business" className="rounded-[7px] border border-[var(--div)] px-4 py-2 text-[13px] text-[var(--t2)] hover:bg-[rgba(245,237,228,0.05)]">Open full business profile</Link>
              </div>
            </>
          ) : active === "Appearance" ? (
            <>
              <h2 className="text-[16px] font-semibold text-[var(--t1)]">Appearance</h2>
              <p className="mt-1 text-[13px] text-[var(--t2)]">Choose how Dobly feels. System follows the device automatically.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {themeModes.map(([value, label, description]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={`rounded-[10px] border p-4 text-left transition ${
                      theme === value ? "border-[rgba(196,80,26,0.45)] bg-[rgba(196,80,26,0.10)]" : "border-[var(--div)] bg-[var(--bg)] hover:bg-[var(--bg-3)]"
                    }`}
                  >
                    <div className="text-[14px] font-semibold text-[var(--t1)]">{label}</div>
                    <div className="mt-1 text-[12px] text-[var(--t2)]">{description}</div>
                  </button>
                ))}
              </div>
            </>
          ) : active === "Readiness" ? (
            <>
              <h2 className="text-[16px] font-semibold text-[var(--t1)]">Launch readiness</h2>
              <p className="mt-1 text-[13px] text-[var(--t2)]">This is the cockpit checklist Dobly needs before real customers trust it with business work.</p>
              <div className="mt-4 grid gap-2">
                {readiness.map(([title, description]) => (
                  <div key={title} className="rounded-[10px] border border-[var(--div)] bg-[var(--bg)] p-3">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--t1)]"><Check className="h-3.5 w-3.5 text-[var(--rust)]" />{title}</div>
                    <p className="mt-1 text-[12px] leading-5 text-[var(--t2)]">{description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/dashboard/health" className="rounded-[7px] bg-[var(--rust)] px-4 py-2 text-[13px] font-semibold text-[#F5EDE4]">Open readiness center</Link>
                <Link href="/dashboard/setup" className="rounded-[7px] border border-[var(--div)] px-4 py-2 text-[13px] text-[var(--t2)] hover:bg-[rgba(245,237,228,0.05)]">Launch wiring</Link>
              </div>
            </>
          ) : active === "Notifications" ? (
            <>
              <h2 className="text-[16px] font-semibold text-[var(--t1)]">Notification routes</h2>
              <p className="mt-1 text-[13px] text-[var(--t2)]">Decide where pressure, approvals, and briefings should reach you.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ["Briefings", "Morning and end-of-day summaries"],
                  ["Approvals", "High-risk decisions and owner signoff"],
                  ["Pressure alerts", "Urgent drift across offices"],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-[10px] border border-[var(--div)] bg-[var(--bg)] p-4">
                    <div className="text-[13px] font-semibold text-[var(--t1)]">{title}</div>
                    <div className="mt-1 text-[12px] leading-5 text-[var(--t2)]">{body}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/dashboard/notifications" className="rounded-[7px] bg-[var(--rust)] px-4 py-2 text-[13px] font-semibold text-[#F5EDE4]">Open notifications</Link>
                <Link href="/dashboard/briefings" className="rounded-[7px] border border-[var(--div)] px-4 py-2 text-[13px] text-[var(--t2)] hover:bg-[rgba(245,237,228,0.05)]">See briefings</Link>
              </div>
            </>
          ) : active === "Billing" ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--t1)]">{plan.name}</h2>
                  <p className="mt-1 text-[13px] text-[var(--t2)]">{plan.tagline}</p>
                </div>
                <span className="rounded-full bg-[rgba(196,80,26,0.12)] px-3 py-1 text-[11px] text-[var(--rust)]">${plan.monthlyPriceUsd}/mo</span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[10px] border border-[var(--div)] bg-[var(--bg)] p-4">
                  <div className="flex items-center justify-between text-[12px] text-[var(--t2)]">
                    <span>Workers in use</span>
                    <span>{activeWorkers} / {plan.entitlements.workers}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--t4)]"><div className="h-full rounded-full bg-[var(--rust)]" style={{ width: `${workerPercent}%` }} /></div>
                </div>
                <div className="rounded-[10px] border border-[var(--div)] bg-[var(--bg)] p-4">
                  <div className="flex items-center justify-between text-[12px] text-[var(--t2)]">
                    <span>Departments staffed</span>
                    <span>{staffedDepartments} / {plan.entitlements.departments}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--t4)]"><div className="h-full rounded-full bg-[var(--rust)]" style={{ width: `${departmentPercent}%` }} /></div>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-[12px] text-[var(--t2)] sm:grid-cols-2">
                <div className="rounded-[10px] border border-[var(--div)] bg-[var(--bg)] p-3">Boardroom: <span className="text-[var(--t1)]">{plan.entitlements.boardroom}</span></div>
                <div className="rounded-[10px] border border-[var(--div)] bg-[var(--bg)] p-3">Briefings: <span className="text-[var(--t1)]">{plan.entitlements.generalManagerBriefings}</span></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/dashboard/usage" className="rounded-[7px] bg-[var(--rust)] px-4 py-2 text-[13px] font-semibold text-[#F5EDE4]">Open usage</Link>
                <Link href="/dashboard/settings?tab=billing" className="rounded-[7px] border border-[var(--div)] px-4 py-2 text-[13px] text-[var(--t2)] hover:bg-[rgba(245,237,228,0.05)]">Payments and plan</Link>
              </div>
            </>
          ) : active === "Security" ? (
            <>
              <h2 className="text-[16px] font-semibold text-[var(--t1)]">Trust and governance</h2>
              <p className="mt-1 text-[13px] text-[var(--t2)]">Dobly should earn authority. Keep approvals, simulation, and risky sends visible.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Approvals", "High-risk actions pause for human review."],
                  ["Shadow mode", "New coworkers can observe before acting."],
                  ["Simulation", "Preview action outcomes before live execution."],
                  ["Audit trail", "Every major action remains replayable."],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-[10px] border border-[var(--div)] bg-[var(--bg)] p-4">
                    <div className="text-[13px] font-semibold text-[var(--t1)]">{title}</div>
                    <div className="mt-1 text-[12px] leading-5 text-[var(--t2)]">{body}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/dashboard/approvals" className="rounded-[7px] bg-[var(--rust)] px-4 py-2 text-[13px] font-semibold text-[#F5EDE4]">Approval queue</Link>
                <Link href="/dashboard/health" className="rounded-[7px] border border-[var(--div)] px-4 py-2 text-[13px] text-[var(--t2)] hover:bg-[rgba(245,237,228,0.05)]">Readiness and trust</Link>
              </div>
            </>
          ) : active === "Team" ? (
            <>
              <h2 className="text-[16px] font-semibold text-[var(--t1)]">Team and workspace</h2>
              <p className="mt-1 text-[13px] text-[var(--t2)]">Seats, coworkers, and the human layer around Dobly.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[10px] border border-[var(--div)] bg-[var(--bg)] p-4">
                  <div className="text-[12px] text-[var(--t2)]">Team seats</div>
                  <div className="mt-2 text-[24px] font-semibold text-[var(--t1)]">{plan.entitlements.teamSeats}</div>
                </div>
                <div className="rounded-[10px] border border-[var(--div)] bg-[var(--bg)] p-4">
                  <div className="text-[12px] text-[var(--t2)]">Business channels</div>
                  <div className="mt-2 text-[24px] font-semibold text-[var(--t1)]">{plan.entitlements.businessChannels}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/dashboard/business" className="rounded-[7px] bg-[var(--rust)] px-4 py-2 text-[13px] font-semibold text-[#F5EDE4]">Open workspace</Link>
                <Link href="/dashboard/coworkers" className="rounded-[7px] border border-[var(--div)] px-4 py-2 text-[13px] text-[var(--t2)] hover:bg-[rgba(245,237,228,0.05)]">See coworkers</Link>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/settings" className="rounded-[7px] bg-[var(--rust)] px-4 py-2 text-[13px] font-semibold text-[#F5EDE4]">Open full settings</Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SpaceBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-[12%] top-[14%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(196,80,26,0.12),transparent_68%)] blur-2xl" />
      <div className="absolute right-[14%] top-[8%] h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(245,237,228,0.06),transparent_72%)] blur-2xl" />
      <div className="absolute bottom-[10%] right-[22%] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(123,164,255,0.05),transparent_70%)] blur-3xl" />
      {Array.from({ length: 22 }).map((_, index) => (
        <span
          key={index}
          className="absolute rounded-full bg-[rgba(245,237,228,0.26)]"
          style={{
            left: `${6 + ((index * 11) % 82)}%`,
            top: `${8 + ((index * 17) % 74)}%`,
            width: `${index % 3 === 0 ? 2 : 1}px`,
            height: `${index % 3 === 0 ? 2 : 1}px`,
            opacity: 0.32 + (index % 5) * 0.08,
          }}
        />
      ))}
      <svg className="absolute inset-0 h-full w-full opacity-[0.11]">
        <path d="M120 200C220 120 330 100 460 140" stroke="#C4501A" strokeWidth="1" strokeDasharray="2 16" />
        <path d="M860 160C980 120 1110 150 1240 260" stroke="#F5EDE4" strokeWidth="1" strokeDasharray="2 18" />
        <path d="M980 720C1130 640 1270 660 1410 740" stroke="#C4501A" strokeWidth="1" strokeDasharray="2 20" />
      </svg>
    </div>
  );
}

function ToolboxModal({ onClose }: { onClose: () => void }) {
  const sections = [
    {
      title: "Build",
      items: [
        { href: "/dashboard/generate", label: "Generate coworker", hint: "Describe the role", icon: <Sparkles className="h-4 w-4" /> },
        { href: "/dashboard/create", label: "Structured builder", hint: "Use the guided builder", icon: <Layers3 className="h-4 w-4" /> },
        { href: "/dashboard/workflows", label: "Workflow floor", hint: "Execution builders and runs", icon: <Workflow className="h-4 w-4" /> },
      ],
    },
    {
      title: "Operate",
      items: [
        { href: "/dashboard/briefings", label: "Briefings", hint: "Owner summaries and updates", icon: <BookOpenText className="h-4 w-4" /> },
        { href: "/dashboard/approvals", label: "Approvals", hint: "Decisions waiting on you", icon: <Compass className="h-4 w-4" /> },
        { href: "/dashboard/ops", label: "Ops floor", hint: "Execution and pressure", icon: <Gauge className="h-4 w-4" /> },
      ],
    },
    {
      title: "Expand",
      items: [
        { href: "/dashboard/memory", label: "Memory", hint: "Institutional memory", icon: <Brain className="h-4 w-4" /> },
        { href: "/dashboard/connections", label: "Connections", hint: "Channels and providers", icon: <PlugZap className="h-4 w-4" /> },
        { href: "/dashboard/marketplace", label: "Marketplace", hint: "Reusable packs and templates", icon: <BriefcaseBusiness className="h-4 w-4" /> },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(7,7,6,0.46)] px-6 backdrop-blur-[10px]">
      <div className="relative w-full max-w-4xl rounded-[24px] border border-[rgba(245,237,228,0.09)] bg-[rgba(28,28,26,0.96)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-[10px] text-[var(--t3)] transition hover:bg-[rgba(245,237,228,0.05)]">
          <X className="h-4 w-4" />
        </button>
        <div className="pr-12">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--t3)]">Toolbox</div>
          <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[var(--t1)]">Everything Dobly can open from here</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[var(--t2)]">Use this like a launch deck inside the app. The goal is fewer dead ends, more real rooms, and faster movement between build, operate, and expand.</p>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {sections.map((section) => (
            <div key={section.title} className="rounded-[18px] border border-[var(--div)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--t3)]">{section.title}</div>
              <div className="mt-3 grid gap-2">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-[14px] border border-transparent bg-[rgba(255,255,255,0.02)] px-3 py-3 transition hover:border-[rgba(196,80,26,0.22)] hover:bg-[rgba(196,80,26,0.08)]">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--t1)]">
                      <span className="text-[var(--rust)]">{item.icon}</span>
                      {item.label}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--t3)]">{item.hint}</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text, action, onAction }: { text: string; action: string; onAction: () => void }) {
  return (
    <div className="grid h-full place-items-center">
      <div className="text-center">
        <div className="mx-auto opacity-40"><BrandMark size={48} showWord={false} /></div>
        <div className="mt-4 font-display text-[18px] italic text-[var(--t1)]">{text}</div>
        <button type="button" onClick={onAction} className="mt-4 rounded-[7px] bg-[var(--rust)] px-4 py-2 text-[13px] font-semibold text-[#F5EDE4]">{action}</button>
      </div>
    </div>
  );
}

function BrainView({
  office,
  connections,
  feedEntries,
  onSelect,
}: {
  office: HomebaseDashboardData;
  connections: Connection[];
  feedEntries: DetailSelection[];
  onSelect: (selection: DetailSelection) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const cyRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const [scriptReady, setScriptReady] = useState(() => typeof window !== "undefined" && Boolean(window.cytoscape));
  const [tooltip, setTooltip] = useState<{ x: number; y: number; title: string; subtitle: string; body?: string } | null>(null);
  const [miniFeedOpen, setMiniFeedOpen] = useState(true);
  const [breadcrumb, setBreadcrumb] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  const elements = useMemo(() => buildGraphElements(office, connections), [connections, office]);
  const graphStyles = useMemo(() => createBrainStyles(resolvedTheme), [resolvedTheme]);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.cytoscape) return;

    const cy = window.cytoscape({
      container: containerRef.current,
      elements,
      style: graphStyles,
      layout: brainLayout,
      wheelSensitivity: 0.3,
      minZoom: 0.3,
      maxZoom: 3,
    });
    cyRef.current = cy;

    cy.on("mouseover", "node", (event: any) => {
      const node = event.target;
      const connected = node.connectedEdges().connectedNodes();
      cy.elements().addClass("dimmed");
      node.removeClass("dimmed");
      connected.removeClass("dimmed").addClass("highlighted");
      node.connectedEdges().removeClass("dimmed").addClass("highlighted");
      const position = event.renderedPosition;
      setTooltip({
        x: position.x,
        y: position.y,
        title: node.data("label"),
        subtitle: node.data("type"),
        body: node.data("description") || node.data("status") || "Part of your Dobly ecosystem.",
      });
    });

    cy.on("mousemove", "node", (event: any) => {
      setTooltip((current) => current ? { ...current, x: event.renderedPosition.x, y: event.renderedPosition.y } : current);
    });

    cy.on("mouseout", "node", () => {
      cy.elements().removeClass("dimmed highlighted");
      setTooltip(null);
    });

    cy.on("tap", "node", (event: any) => {
      const node = event.target;
      cy.nodes().unselect();
      node.select();
      cy.animate({ fit: { eles: node.closedNeighborhood(), padding: 80 }, duration: 400, easing: "ease-in-out" });
      onSelect(detailFromNode(node.data(), office, connections));
    });

    cy.on("dbltap", 'node[type = "office"]', (event: any) => {
      const node = event.target;
      cy.animate({ fit: { eles: node.closedNeighborhood(), padding: 60 }, duration: 500, easing: "ease-in-out" });
      setBreadcrumb(node.data("label"));
    });

    const phases: Record<string, number> = {};
    cy.nodes().forEach((node: any) => {
      phases[node.id()] = Math.random() * Math.PI * 2;
    });

    const breathe = (timestamp: number) => {
      cy.nodes().forEach((node: any) => {
        const type = node.data("type");
        const baseSize = type === "gm" ? 68 : type === "office" ? 52 : type === "worker" ? 36 : 24;
        const speed = node.data("active") === "true" ? 0.0008 : 0.0005;
        const scale = 1 + Math.sin(timestamp * speed + phases[node.id()]) * 0.03;
        node.style({ width: baseSize * scale, height: baseSize * scale });
      });
      animationRef.current = requestAnimationFrame(breathe);
    };
    animationRef.current = requestAnimationFrame(breathe);

    const resize = () => {
      cy.resize();
      cy.fit(cy.elements(), 60);
      const canvas = overlayRef.current;
      if (canvas && containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      cy.destroy();
      cyRef.current = null;
    };
  }, [connections, elements, graphStyles, office, onSelect, scriptReady]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dobly-brain-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "workflow_runs" }, (payload) => {
        const nodeId = `worker:${payload.new.workflow_id}`;
        drawRipple(cyRef.current, overlayRef.current, nodeId);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "escalations" }, (payload) => {
        const workerId = payload.new.coworker_id ? `worker:${payload.new.coworker_id}` : "gm";
        cyRef.current?.getElementById(workerId)?.addClass("escalated");
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function zoomBy(multiplier: number) {
    const cy = cyRef.current;
    if (!cy) return;
    cy.animate({ zoom: cy.zoom() * multiplier, duration: 160 });
  }

  function fitAll() {
    cyRef.current?.animate({ fit: { eles: cyRef.current.elements(), padding: 60 }, duration: 260 });
    setBreadcrumb(null);
  }

  function centerSelected() {
    const selected = cyRef.current?.elements(":selected");
    if (selected?.length) cyRef.current.animate({ fit: { eles: selected.closedNeighborhood(), padding: 80 }, duration: 260 });
  }

  function highlightNode(nodeId?: string) {
    const cy = cyRef.current;
    if (!cy || !nodeId) return;
    const node = cy.getElementById(nodeId);
    if (!node?.length) return;
    cy.elements().addClass("dimmed");
    node.removeClass("dimmed").addClass("highlighted");
    node.connectedEdges().removeClass("dimmed").addClass("highlighted");
    node.connectedEdges().connectedNodes().removeClass("dimmed").addClass("highlighted");
  }

  function clearHighlight() {
    cyRef.current?.elements().removeClass("dimmed highlighted");
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-[var(--bg)]">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(196,80,26,0.04)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#centerGlow)" />
      </svg>
      <div ref={containerRef} id="brain-canvas" className="absolute inset-0" />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      {breadcrumb ? (
        <button type="button" onClick={fitAll} className="absolute left-4 top-4 z-20 rounded-[8px] border border-[var(--div)] bg-[rgba(34,34,32,0.84)] px-3 py-2 text-[12px] text-[var(--t2)] backdrop-blur-xl">
          All / <span className="text-[var(--t1)]">{breadcrumb}</span>
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setMiniFeedOpen((open) => !open)}
        className="absolute left-0 top-1/2 z-30 grid h-12 w-8 -translate-y-1/2 place-items-center rounded-r-[8px] border border-l-0 border-[var(--div)] bg-[var(--bg-2)] text-[var(--rust)]"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      <aside className={`absolute inset-y-0 left-0 z-20 w-[280px] border-r border-[var(--div)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] p-3 backdrop-blur-2xl transition duration-250 ${miniFeedOpen ? "translate-x-0" : "-translate-x-[280px]"}`}>
        <div className="mb-3 flex items-center justify-between">
          {sectionLabel("Mini Feed")}
          <button type="button" onClick={() => setMiniFeedOpen(false)} className="text-[var(--t3)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="h-[calc(100%-28px)] overflow-y-auto">
          {feedEntries.map((entry, index) => (
            <button
              key={`${entry.title}-${index}`}
              type="button"
              onMouseEnter={() => highlightNode(entry.nodeId)}
              onMouseLeave={clearHighlight}
              onClick={() => {
                highlightNode(entry.nodeId);
                onSelect(entry);
              }}
              className="mb-1 w-full rounded-[8px] p-2 text-left transition hover:bg-[rgba(245,237,228,0.04)]"
            >
              <div className="line-clamp-2 text-[12px] leading-4 text-[var(--t1)]">{entry.description}</div>
              <div className="mt-1 text-[11px] text-[var(--t3)]">{entry.badge}</div>
            </button>
          ))}
        </div>
      </aside>

      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-0.5 rounded-[8px] border border-[var(--div)] bg-[var(--bg-2)] p-1.5">
        <BrainControl icon={<Plus className="h-4 w-4" />} onClick={() => zoomBy(1.2)} label="Zoom in" />
        <BrainControl icon={<Minus className="h-4 w-4" />} onClick={() => zoomBy(0.8)} label="Zoom out" />
        <BrainControl icon={<Target className="h-4 w-4" />} onClick={fitAll} label="Reset" />
        <BrainControl icon={<Maximize2 className="h-4 w-4" />} onClick={centerSelected} label="Center selected" />
      </div>

      {tooltip ? (
        <div
          className="pointer-events-none absolute z-40 max-w-[220px] rounded-[8px] border border-[var(--div)] bg-[var(--bg-3)] px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
          style={{ left: tooltip.x + 16, top: tooltip.y + 16 }}
        >
          <div className="text-[13px] font-semibold text-[var(--t1)]">{tooltip.title}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--t3)]">{tooltip.subtitle}</div>
          <div className="mt-2 text-[12px] leading-4 text-[var(--t2)]">{tooltip.body}</div>
        </div>
      ) : null}
    </div>
  );
}

function createBrainStyles(theme: "light" | "dark") {
  const dark = theme === "dark";
  const nodeBg = dark ? "#272724" : "#E4DAD0";
  const text = dark ? "rgba(245,237,228,0.7)" : "rgba(26,15,8,0.7)";
  const border = dark ? "rgba(245,237,228,0.12)" : "rgba(26,15,8,0.12)";
  const edge = dark ? "rgba(245,237,228,0.08)" : "rgba(26,15,8,0.10)";
  const edgeActive = dark ? "rgba(245,237,228,0.25)" : "rgba(26,15,8,0.25)";
  const highlight = dark ? "rgba(245,237,228,0.3)" : "rgba(26,15,8,0.3)";
  return [
    { selector: "node", style: { "background-color": nodeBg, "border-color": border, "border-width": 1, label: "data(label)", color: text, "font-family": "Instrument Sans, sans-serif", "font-size": 11, "text-valign": "bottom", "text-margin-y": 6, "text-wrap": "none" } },
    { selector: 'node[type = "gm"]', style: { width: 68, height: 68, "background-color": "rgba(196,80,26,0.15)", "border-color": "rgba(196,80,26,0.4)", "border-width": 2, "font-size": 12, "font-weight": 600 } },
    { selector: 'node[type = "office"]', style: { width: 52, height: 52, "font-size": 12, "font-weight": 500 } },
    { selector: 'node[type = "worker"]', style: { width: 36, height: 36, "font-size": 11 } },
    { selector: 'node[type = "connection"]', style: { width: 24, height: 24, "font-size": 10 } },
    { selector: 'node[active = "true"]', style: { "border-color": "rgba(196,80,26,0.6)", "border-width": 2, "shadow-blur": 12, "shadow-color": "rgba(196,80,26,0.2)", "shadow-offset-x": 0, "shadow-offset-y": 0, "shadow-opacity": 1 } },
    { selector: "node:selected", style: { "border-color": "#C4501A", "border-width": 2, "shadow-blur": 20, "shadow-color": "rgba(196,80,26,0.35)", "shadow-offset-x": 0, "shadow-offset-y": 0, "shadow-opacity": 1 } },
    { selector: "node.escalated", style: { "border-color": "#E6A830", "border-width": 2, "shadow-color": "rgba(230,168,48,0.3)", "shadow-blur": 16 } },
    { selector: "node.dimmed", style: { opacity: 0.25 } },
    { selector: "node.highlighted", style: { "border-color": highlight, "border-width": 2 } },
    { selector: "edge", style: { width: 1, "line-color": edge, "curve-style": "bezier", "target-arrow-shape": "none" } },
    { selector: 'edge[type = "office-to-gm"]', style: { "line-color": "rgba(196,80,26,0.24)", width: 1.5 } },
    { selector: "edge.highlighted", style: { "line-color": edgeActive, width: 2 } },
    { selector: "edge.dimmed", style: { opacity: 0.05 } },
  ];
}

const brainLayout = {
  name: "cose",
  idealEdgeLength: 120,
  nodeOverlap: 20,
  refresh: 20,
  fit: true,
  padding: 60,
  randomize: false,
  componentSpacing: 100,
  nodeRepulsion: 450000,
  edgeElasticity: 100,
  nestingFactor: 5,
  gravity: 80,
  numIter: 1000,
  initialTemp: 200,
  coolingFactor: 0.95,
  minTemp: 1.0,
};

function buildGraphElements(office: HomebaseDashboardData, connections: Connection[]): GraphElement[] {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const elements: GraphElement[] = [
    { data: { id: "gm", label: "General Manager", type: "gm", active: office.recentEvents.length ? "true" : "false", description: `Coordinating ${office.departments.length} offices. ${office.tasks.length} tasks in motion.` } },
  ];

  office.departments.slice(0, 12).forEach((department) => {
    elements.push({
      data: {
        id: `office:${department.id}`,
        label: normalizeOffice(department.id),
        type: "office",
        active: department.latestEvent ? "true" : "false",
        description: department.purpose,
      },
    });
    elements.push({ data: { id: `edge:${department.id}:gm`, source: `office:${department.id}`, target: "gm", type: "office-to-gm" } });
  });

  office.workers.slice(0, 32).forEach((worker) => {
    elements.push({
      data: {
        id: `worker:${worker.id}`,
        label: worker.name,
        type: "worker",
        officeId: `office:${worker.departmentId}`,
        active: new Date(worker.updatedAt).getTime() > oneHourAgo ? "true" : "false",
        status: worker.status,
        description: worker.mission,
      },
    });
    elements.push({ data: { id: `edge:${worker.id}:${worker.departmentId}`, source: `worker:${worker.id}`, target: `office:${worker.departmentId}` } });
  });

  connections.filter((connection) => connection.status === "active").slice(0, 16).forEach((connection, index) => {
    const worker = office.workers[index % Math.max(1, office.workers.length)];
    elements.push({
      data: {
        id: `conn-${connection.id}`,
        label: connection.provider,
        type: "connection",
        description: connection.label,
      },
    });
    if (worker) {
      elements.push({ data: { id: `edge:${worker.id}:conn:${connection.id}`, source: `worker:${worker.id}`, target: `conn-${connection.id}` } });
    } else {
      elements.push({ data: { id: `edge:gm:conn:${connection.id}`, source: "gm", target: `conn-${connection.id}` } });
    }
  });

  return elements;
}

function detailFromNode(data: Record<string, string>, office: HomebaseDashboardData, connections: Connection[]): DetailSelection {
  if (data.type === "gm") {
    return {
      kind: "gm",
      title: "General Manager",
      badge: "Coordinating all offices",
      description: "The cross-office intelligence layer that prevents conflicts and surfaces what the owner needs to know.",
      context: [`${office.departments.length} offices`, `${office.workers.length} roles`, `${office.tasks.length} tasks`],
      actions: ["Watching cross-office conflicts", "Preparing morning briefings", "Routing escalations to the Board"],
      primaryAction: { label: "Open briefings", href: "/dashboard/briefings" },
      secondaryActions: [
        { label: "View feed", eventView: "feed" },
        { label: "Review decisions", href: "/dashboard/approvals" },
      ],
      nodeId: "gm",
    };
  }
  if (data.type === "connection") {
    const id = String(data.id).replace("conn-", "");
    const connection = connections.find((item) => item.id === id);
    return connection ? connectionDetail(connection) : { kind: "connection", title: data.label, badge: "Connection", description: data.description ?? "Connected tool.", nodeId: data.id };
  }
  if (data.type === "office") {
    const id = String(data.id).replace("office:", "");
    const department = office.departments.find((item) => item.id === id);
    return department ? officeDetail(department, office.workers.filter((worker) => worker.departmentId === department.id).length) : { kind: "office", title: data.label, badge: "Office", description: data.description ?? "Office node.", nodeId: data.id };
  }
  const id = String(data.id).replace("worker:", "");
  const worker = office.workers.find((item) => item.id === id);
  return worker ? workerDetail(worker) : { kind: "worker", title: data.label, badge: "Role", description: data.description ?? "Role node.", nodeId: data.id };
}

function drawRipple(cy: any, canvas: HTMLCanvasElement | null, nodeId: string) {
  if (!cy || !canvas) return;
  const node = cy.getElementById(nodeId);
  if (!node?.length) return;
  const position = node.renderedPosition();
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  let radius = 0;
  let opacity = 0.6;
  const interval = window.setInterval(() => {
    ctx.clearRect(position.x - 90, position.y - 90, 180, 180);
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(position.x, position.y, radius - ring * 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(196,80,26,${Math.max(0, opacity - ring * 0.12)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    radius += 2;
    opacity -= 0.02;
    if (opacity <= 0) {
      ctx.clearRect(position.x - 90, position.y - 90, 180, 180);
      window.clearInterval(interval);
    }
  }, 16);
}

function BrainControl({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid h-8 w-8 place-items-center rounded-[6px] text-[var(--t2)] transition hover:bg-[rgba(245,237,228,0.06)]">
      {icon}
    </button>
  );
}

function DetailPanel({ selection, onClose }: { selection: DetailSelection | null; onClose: () => void }) {
  const open = Boolean(selection);
  function runAction(action?: { href?: string; eventView?: ViewMode }) {
    if (!action) return;
    if (action.eventView) {
      const nextUrl = action.eventView === "feed" ? "/dashboard" : `/dashboard?view=${action.eventView}`;
      window.history.pushState({}, "", nextUrl);
      window.dispatchEvent(new CustomEvent("dobly:navigate", { detail: { view: action.eventView } }));
      return;
    }
    if (action.href) window.location.href = action.href;
  }

  return (
    <aside
      className={`h-screen shrink-0 overflow-hidden border-l border-[var(--div)] bg-[var(--bg-2)] transition-[width] duration-200 ease-out ${
        open ? "w-[320px]" : "w-0 border-l-0"
      }`}
      aria-hidden={!open}
    >
      <div
        className={`grid h-full w-[320px] grid-rows-[auto_minmax(0,1fr)_auto] transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-[320px]"
        }`}
      >
      <div className="border-b border-[var(--div)] p-4">
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-[7px] text-[var(--t3)] transition hover:bg-[rgba(245,237,228,0.05)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 className="mt-2 font-display text-[18px] italic leading-6 text-[var(--t1)]">{selection?.title}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[rgba(196,80,26,0.12)] px-2 py-1 text-[11px] text-[var(--rust)]">{selection?.badge}</span>
        {selection?.timestamp ? <span className="text-[11px] text-[var(--t3)]">{timeAgo(selection.timestamp)}</span> : null}
        </div>
        <div className="mt-4 grid gap-2">
          {selection?.primaryAction ? (
            <button
              type="button"
              onClick={() => runAction(selection.primaryAction)}
              className="rounded-[7px] bg-[var(--rust)] px-3 py-2 text-[13px] font-semibold text-[#F5EDE4] transition hover:bg-[var(--rust-h)]"
            >
              {selection.primaryAction.label}
            </button>
          ) : null}
          {selection?.secondaryActions?.length ? (
            <div className="grid grid-cols-2 gap-2">
              {selection.secondaryActions.slice(0, 4).map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => runAction(action)}
                  className={`rounded-[7px] border border-[var(--div)] px-3 py-2 text-[12px] transition hover:bg-[rgba(245,237,228,0.05)] ${
                    action.tone === "danger" ? "text-[#C4503A]" : "text-[var(--t2)]"
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 overflow-y-auto p-4">
        <DetailSection title="Purpose">
          <p>
            {selection?.kind === "connection"
              ? "This panel is where you inspect access, connect missing tools, test permissions, and decide whether a provider is safe to use live."
              : selection?.kind === "worker"
                ? "This panel is where you operate the role: open it, pause it, edit its instructions, or inspect recent activity."
                : selection?.kind === "office"
                  ? "This panel is where you manage an office: add roles, inspect activity, and understand what needs attention."
                  : "This panel is the decision surface: it gives context, shows what Dobly did, and gives you the next operational move."}
          </p>
        </DetailSection>
        <DetailSection title="What happened">
          <p>{selection?.description}</p>
        </DetailSection>
        {selection?.context?.length ? (
          <DetailSection title="Context">
            {selection.context.map((item) => <p key={item}>{item}</p>)}
          </DetailSection>
        ) : null}
        {selection?.actions?.length ? (
          <DetailSection title="Actions taken">
            {selection.actions.map((item) => <p key={item}>• {item}</p>)}
          </DetailSection>
        ) : null}
        {selection?.recommendation ? (
          <DetailSection title="Recommendation" amber>
            <p>{selection.recommendation}</p>
          </DetailSection>
        ) : null}
      </div>
      {selection?.requiresInput ? (
        <div className="border-t border-[var(--div)] p-4">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button type="button" className="rounded-[7px] bg-[var(--rust)] px-3 py-2 text-[13px] font-semibold text-[#F5EDE4]">Approve</button>
            <button type="button" className="rounded-[7px] border border-[var(--div)] px-3 py-2 text-[13px] text-[var(--t2)]">Override</button>
          </div>
          <p className="mt-2 text-[11px] text-[var(--t3)]">Dobly will learn from this decision.</p>
        </div>
      ) : null}
      </div>
    </aside>
  );
}

function DetailSection({ title, amber, children }: { title: string; amber?: boolean; children: React.ReactNode }) {
  return (
    <section className={`mb-5 ${amber ? "border-l-2 border-[#E6A830] bg-[rgba(230,168,48,0.08)] p-3" : ""}`}>
      <div className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] ${amber ? "text-[#E6A830]" : "text-[var(--t3)]"}`}>{title}</div>
      <div className="space-y-2 text-[13px] leading-5 text-[var(--t2)]">{children}</div>
    </section>
  );
}

function NewRolePanel({ onClose, connections }: { onClose: () => void; connections: Connection[] }) {
  const [brief, setBrief] = useState("");
  const analysis = useMemo(() => analyzePromptDesign(brief || "Handle real work reliably."), [brief]);
  const connectedGoogle = connections.some((connection) => connection.provider === "google" && connection.status === "active");
  const connectedWhatsApp = connections.some((connection) => connection.provider === "whatsapp" && connection.status === "active");
  const required = [
    { name: "Google", detail: "Docs and Gmail output", connected: connectedGoogle },
    { name: "WhatsApp", detail: "Live message handling", connected: connectedWhatsApp },
    { name: "Dobly runtime", detail: "Briefing, reports, approvals", connected: true },
  ];
  const statePreview = useMemo(() => inferStatePreview(brief), [brief]);
  const intentReady = brief.trim().length >= 12;
  const suggestedBuilderHref = `/dashboard/generate?prompt=${encodeURIComponent(brief || "Build a coworker that owns this recurring work.")}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(7,7,6,0.42)] backdrop-blur-[8px]">
      <div className="chat-panel relative flex h-screen w-full max-w-[560px] flex-col overflow-hidden border-l border-[var(--div)] bg-[var(--bg)] shadow-[-24px_0_80px_rgba(0,0,0,0.35)]">
        <div className="chat-header flex h-14 items-center justify-between border-b border-[var(--div)] px-5">
          <div className="text-[15px] font-semibold text-[var(--t1)]">New coworker</div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-[7px] text-[var(--t3)] hover:bg-[rgba(245,237,228,0.05)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="flex items-start gap-3">
            <div className="mt-1"><BrandMark size={20} showWord={false} /></div>
            <div className="max-w-[88%] rounded-[4px_12px_12px_12px] border border-[var(--div)] bg-[var(--bg-2)] px-4 py-3 text-[14px] leading-6 text-[var(--t1)]">
              Tell Dobly what area you want owned. I’ll route you into the real builder with the right coworker shape, signal model, and launch path.
            </div>
          </div>
          <textarea
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            autoFocus
            rows={5}
            className="mt-6 max-h-52 min-h-28 w-full resize-none rounded-[14px] border border-[var(--div)] bg-[var(--bg-2)] p-4 font-display text-[18px] italic leading-8 text-[var(--t1)] outline-none placeholder:text-[var(--t2)]"
            placeholder="Create a coworker that keeps hot leads moving and escalates pricing exceptions to me..."
          />

          <div className="mt-5 flex flex-wrap gap-2">
            {["Follow up on unpaid invoices", "Handle WhatsApp enquiries", "Qualify incoming leads", "Track stock thesis breaks"].map((option) => (
              <button key={option} type="button" onClick={() => setBrief(option)} className="option-btn">
                {option}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-[14px] border border-[var(--div)] bg-[var(--bg-2)] p-4">
              <div className="flex items-center justify-between gap-3">
                {sectionLabel("Detected shape")}
                <span className="rounded-full bg-[rgba(196,80,26,0.12)] px-3 py-1 text-[11px] text-[var(--rust)] capitalize">
                  {analysis.operatorModel}
                </span>
              </div>
              <div className="mt-3 text-[15px] font-semibold text-[var(--t1)]">
                {brief.trim() ? brief.trim().slice(0, 84) : "Your coworker package will appear here"}
              </div>
              <div className="mt-2 text-[12px] leading-5 text-[var(--t2)]">{analysis.classificationReason}</div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[14px] border border-[var(--div)] bg-[var(--bg-2)] p-4">
                {sectionLabel("State preview")}
                <div className="mt-3 grid gap-2">
                  {statePreview.map((state) => (
                    <div key={state} className="rounded-[10px] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-[12px] text-[var(--t1)]">
                      {state}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[14px] border border-[var(--div)] bg-[var(--bg-2)] p-4">
                {sectionLabel("Live path")}
                <div className="mt-3 grid gap-2">
                  {required.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-[10px] bg-[rgba(255,255,255,0.03)] px-3 py-2">
                      <div>
                        <div className="text-[12px] font-semibold text-[var(--t1)]">{item.name}</div>
                        <div className="text-[11px] text-[var(--t3)]">{item.detail}</div>
                      </div>
                      {item.connected ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#54BA7B]"><Check className="h-3.5 w-3.5" />Ready</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            window.history.pushState({}, "", "/dashboard?view=connections");
                            window.dispatchEvent(new CustomEvent("dobly:navigate", { detail: { view: "connections" } }));
                            onClose();
                          }}
                          className="rounded-[6px] border border-[rgba(196,80,26,0.35)] px-2.5 py-1 text-[11px] text-[var(--rust)]"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[14px] border border-[rgba(196,80,26,0.18)] bg-[rgba(196,80,26,0.06)] p-4">
              {sectionLabel("What happens next")}
              <div className="mt-3 grid gap-2 text-[12px] leading-5 text-[var(--t2)]">
                <p>Dobly will turn this into a coworker package with mission, signals, states, approvals, and runtime boundaries.</p>
                <p>The full builder then decides the safe live path and what connections still need setup.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--div)] p-5">
          <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
            <Link href="/dashboard/create" className="rounded-[8px] border border-[var(--div)] px-4 py-2.5 text-center text-[13px] text-[var(--t2)] hover:bg-[rgba(245,237,228,0.05)]">
              Structured builder
            </Link>
            <Link
              href={intentReady ? suggestedBuilderHref : "/dashboard/generate"}
              className={`rounded-[8px] px-4 py-2.5 text-center text-[13px] font-semibold text-[#F5EDE4] ${
                intentReady ? "bg-[var(--rust)]" : "bg-[rgba(196,80,26,0.35)]"
              }`}
            >
              Open coworker builder
            </Link>
          </div>
          <div className="mt-3 text-[11px] text-[var(--t3)]">Use `Cmd/Ctrl + K` anywhere in the dashboard to reopen the toolbox.</div>
        </div>
      </div>
    </div>
  );
}

function inferStatePreview(brief: string) {
  const lowered = brief.toLowerCase();
  const previews = new Set<string>();

  if (/(lead|inbound|qualif|sales|deal)/.test(lowered)) previews.add("No qualified lead waits too long without movement");
  if (/(invoice|payment|collect|overdue|cash)/.test(lowered)) previews.add("No invoice risk grows silently");
  if (/(support|customer|complaint|ticket|reply)/.test(lowered)) previews.add("No unhappy customer goes unseen");
  if (/(stock|portfolio|price|market|buy|sell)/.test(lowered)) previews.add("No thesis breach goes unnoticed");
  if (/(report|brief|summary|digest)/.test(lowered)) previews.add("No important drift reaches you late");

  if (!previews.size) previews.add("No important work in this area stalls without a next step");
  previews.add("High-risk actions pause for approval before execution");

  return Array.from(previews).slice(0, 4);
}
