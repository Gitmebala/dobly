"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Clock3,
  Command,
  Crown,
  AlertTriangle,
  Loader2,
  MessageSquareText,
  Sparkles,
  X,
} from "lucide-react";
import type {
  HomebaseDepartmentView,
  HomebaseTaskView,
  HomebaseWorkerView,
} from "@/lib/office/homebase";
import type { OfficeEventRecord } from "@/lib/office/types";

interface CommandSnapshot {
  businessStatus: string;
  focusReason: string;
  whatNeedsAttention: string[];
  whatHappened?: string[];
  metrics: {
    waitingApprovals: number;
    activeWorkers?: number;
    openSignals?: number;
    recentEvents?: number;
    integrationsNeedingAttention?: number;
  };
  setupWarning?: string;
}

interface BoardroomReportView {
  period: string;
  strategicQuestion: string;
  members: Array<{
    agentName: string;
    role: string;
    mandate: string;
    finding: string;
    recommendation: string;
    confidence: "low" | "medium" | "high";
    evidence?: string[];
    pressureScore?: number;
  }>;
  synthesis: string;
  ownerDecisions: string[];
  strategicMetrics: Array<{
    label: string;
    value: string;
    interpretation: string;
  }>;
  strategicRisks: string[];
  strategicOpportunities: string[];
  operatingPressure: Array<{
    department: string;
    records: number;
    needsAction: number;
    highPriority: number;
    moneyLinked: number;
    pressureScore: number;
    topItem: string | null;
  }>;
  operatingThesis: string;
  setupWarning?: string;
}

const PROMPTS = [
  "Find me 50 leads like my best customers and prepare outreach.",
  "What should I focus on today?",
  "Turn this idea into a week of content.",
  "Which department is slowing the business down?",
];

function shortDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export function HomebaseCommandCenter({
  firstName,
  snapshot,
  departments,
  workers,
  tasks,
  recentEvents,
}: {
  firstName: string;
  snapshot: CommandSnapshot;
  departments: HomebaseDepartmentView[];
  workers: HomebaseWorkerView[];
  tasks: HomebaseTaskView[];
  recentEvents: OfficeEventRecord[];
}) {
  const router = useRouter();
  const [command, setCommand] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [mode, setMode] = useState<"idle" | "success" | "error">("idle");
  const deferredCommand = useDeferredValue(command);

  const waitingTasks = tasks.filter((task) => task.status === "waiting_approval");
  const runningTasks = tasks.filter((task) => ["queued", "running"].includes(task.status));
  const activeDepartments = departments.filter((department) => department.status !== "quiet");
  const attentionDepartments = departments.filter((department) => department.status === "needs_attention");

  const operatingMemory = useMemo(
    () => [
      `${workers.length} coworkers known`,
      `${departments.length} departments mapped`,
      `${recentEvents.length} recent events indexed`,
      `${waitingTasks.length} decisions pending`,
    ],
    [departments.length, recentEvents.length, waitingTasks.length, workers.length],
  );

  const nextMoves = useMemo(() => {
    const moves = [
      ...snapshot.whatNeedsAttention.slice(0, 3),
      ...waitingTasks.slice(0, 2).map((task) => `Approve or hold: ${task.title}`),
      ...attentionDepartments.slice(0, 2).map((department) => `Inspect ${department.name}`),
    ];

    return moves.length > 0
      ? Array.from(new Set(moves)).slice(0, 5)
      : ["Ask Dobly to brief the day, hire a coworker, or inspect a department."];
  }, [attentionDepartments, snapshot.whatNeedsAttention, waitingTasks]);

  async function submitCommand(nextCommand = command) {
    const trimmed = nextCommand.trim();
    if (!trimmed) return;

    setIsThinking(true);
    setMode("idle");
    setAnswer(null);

    try {
      const response = await fetch("/api/office/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: trimmed }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error ?? "Dobly could not handle that command.");
      }

      setAnswer(result.response ?? "Dobly captured the command.");
      setMode("success");
      setCommand("");
      startTransition(() => router.refresh());
    } catch (error) {
      setMode("error");
      setAnswer(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[2.2rem] border border-[rgba(242,232,220,0.09)] bg-[radial-gradient(circle_at_22%_0%,rgba(196,80,26,0.22),transparent_31%),radial-gradient(circle_at_78%_8%,rgba(94,184,255,0.16),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-5 shadow-[0_34px_120px_rgba(0,0,0,0.26)] sm:p-7 lg:p-8">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(242,232,220,0.34)] to-transparent" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(196,80,26,0.35)] bg-[rgba(196,80,26,0.13)] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--dobly-text)]">
              <Sparkles className="h-3.5 w-3.5" />
              General Manager
            </span>
            <span className="rounded-full border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.035)] px-3 py-1.5 text-xs text-[var(--dobly-text-muted)]">
              {snapshot.businessStatus}
            </span>
          </div>

          <div className="mt-6 max-w-4xl">
            <p className="text-sm leading-7 text-[var(--dobly-text-secondary)]">
              Good to see you, {firstName}. Dobly is not just listing systems anymore. It is watching the office,
              remembering the work, and turning your intent into action.
            </p>
            <h1 className="mt-3 font-display text-[clamp(2.7rem,6vw,6rem)] leading-[0.88] tracking-[-0.07em] text-[var(--dobly-text)]">
              What should Dobly move forward?
            </h1>
          </div>

          <div className="mt-7 rounded-[1.6rem] border border-[rgba(242,232,220,0.1)] bg-[rgba(9,9,8,0.42)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            {snapshot.setupWarning ? (
              <div className="mb-3 rounded-[1.1rem] border border-[rgba(245,214,111,0.26)] bg-[rgba(245,214,111,0.1)] px-4 py-3 text-sm leading-6 text-[var(--dobly-text-secondary)]">
                {snapshot.setupWarning}
              </div>
            ) : null}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex min-h-[74px] flex-1 items-start gap-3 rounded-[1.25rem] border border-[rgba(242,232,220,0.07)] bg-[rgba(255,255,255,0.035)] px-4 py-4">
                <Command className="mt-1 h-5 w-5 shrink-0 text-[var(--dobly-accent)]" />
                <textarea
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      submitCommand();
                    }
                  }}
                  placeholder="Ask Dobly anything: find leads, brief the business, draft content, hire a coworker..."
                  className="min-h-[48px] flex-1 resize-none bg-transparent text-base leading-6 text-[var(--dobly-text)] outline-none placeholder:text-[var(--dobly-text-dim)]"
                />
              </div>
              <button
                type="button"
                onClick={() => submitCommand()}
                disabled={isThinking || deferredCommand.trim().length < 2}
                className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-[1.2rem] bg-[var(--dobly-accent)] px-6 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                Move it
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setCommand(prompt);
                    submitCommand(prompt);
                  }}
                  className="rounded-full border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] px-3 py-2 text-xs text-[var(--dobly-text-secondary)] transition hover:border-[rgba(196,80,26,0.36)] hover:text-[var(--dobly-text)]"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {answer ? (
              <div
                className={`mt-4 rounded-[1.2rem] border px-4 py-3 text-sm leading-6 ${
                  mode === "error"
                    ? "border-[rgba(239,68,68,0.32)] bg-[rgba(239,68,68,0.1)] text-[rgb(252,165,165)]"
                    : "border-[rgba(84,186,123,0.28)] bg-[rgba(84,186,123,0.1)] text-[var(--dobly-text-secondary)]"
                }`}
              >
                {answer}
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <SignalTile label="Active departments" value={String(activeDepartments.length)} detail="rooms with motion" />
            <SignalTile label="Work in motion" value={String(runningTasks.length)} detail="queued or running" />
            <SignalTile label="Needs owner" value={String(waitingTasks.length)} detail="approval guardrail" warn={waitingTasks.length > 0} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.035)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--dobly-text-dim)]">Operating brief</div>
                <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">What matters now</h2>
              </div>
              <Brain className="h-5 w-5 text-[var(--dobly-accent)]" />
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--dobly-text-secondary)]">{snapshot.focusReason}</p>
          </div>

          <div className="rounded-[1.5rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--dobly-text-dim)]">Next moves</div>
            <div className="mt-3 space-y-2">
              {nextMoves.map((move, index) => (
                <div key={`${move}-${index}`} className="flex gap-3 rounded-xl border border-[rgba(242,232,220,0.06)] bg-[rgba(0,0,0,0.12)] p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dobly-accent)]" />
                  <span className="text-sm leading-5 text-[var(--dobly-text-secondary)]">{move}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--dobly-text-dim)]">Working memory</div>
              <Link href="/dashboard/departments/filing_cabinet" className="text-xs text-[var(--dobly-accent)]">
                Open
              </Link>
            </div>
            <div className="mt-3 grid gap-2">
              {operatingMemory.map((item) => (
                <div key={item} className="rounded-xl bg-[rgba(255,255,255,0.035)] px-3 py-2 text-xs text-[var(--dobly-text-secondary)]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function HomebaseActionRail({
  snapshot,
  tasks,
  recentEvents,
}: {
  snapshot: CommandSnapshot;
  tasks: HomebaseTaskView[];
  recentEvents: OfficeEventRecord[];
}) {
  const waitingTasks = tasks.filter((task) => task.status === "waiting_approval").slice(0, 4);
  const liveFeed = recentEvents.slice(0, 5);
  const narrativeFeed =
    liveFeed.length > 0
      ? liveFeed.map((event) => ({
          id: event.id,
          title: event.title,
          summary: event.summary ?? `${event.source} emitted ${event.eventType}.`,
          meta: shortDate(event.occurredAt),
          risk: event.riskLevel,
        }))
      : (snapshot.whatHappened ?? snapshot.whatNeedsAttention).slice(0, 5).map((item, index) => ({
          id: `snapshot-${index}`,
          title: "Homebase update",
          summary: item,
          meta: "snapshot",
          risk: "low",
        }));

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--dobly-text-dim)]">Owner cockpit</div>
            <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">Decisions waiting</h2>
          </div>
          <Link href="/dashboard/approvals" className="text-sm text-[var(--dobly-accent)]">
            Open all
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {waitingTasks.length > 0 ? (
            waitingTasks.map((task) => (
              <Link
                key={task.id}
                href="/dashboard/approvals"
                className="block rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] p-4 transition hover:border-[rgba(196,80,26,0.28)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-[var(--dobly-text)]">{task.title}</div>
                  <span className="badge-muted text-[10px] uppercase">{task.riskLevel}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">{task.summary}</p>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.1rem] border border-[rgba(84,186,123,0.18)] bg-[rgba(84,186,123,0.08)] p-4 text-sm text-[var(--dobly-text-secondary)]">
              Nothing is waiting on you. Dobly can keep moving.
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--dobly-text-dim)]">Live work</div>
            <h2 className="mt-2 font-display text-xl text-[var(--dobly-text)]">What the office is doing</h2>
          </div>
          <MessageSquareText className="h-5 w-5 text-[var(--dobly-accent)]" />
        </div>
        <div className="mt-4 space-y-3">
          {narrativeFeed.map((event) => (
            <div key={event.id} className="grid grid-cols-[auto_1fr] gap-3 rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
              <div className="mt-1 grid h-8 w-8 place-items-center rounded-full bg-[rgba(196,80,26,0.12)]">
                <Clock3 className="h-4 w-4 text-[var(--dobly-accent)]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[var(--dobly-text)]">{event.title}</span>
                  <span className="text-[11px] text-[var(--dobly-text-dim)]">{event.meta}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--dobly-text-secondary)]">
                  {event.summary}
                </p>
              </div>
            </div>
          ))}
          {narrativeFeed.length === 0 ? (
            <div className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] p-4 text-sm text-[var(--dobly-text-muted)]">
              No recent movement yet. Try asking Dobly to do something.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function BoardroomStrip() {
  const [report, setReport] = useState<BoardroomReportView | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runBoardroom() {
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/office/boardroom/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategicQuestion: "What should the owner focus on next based on current operating records?" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error ?? "The Boardroom could not produce a report.");
      setReport(result.report);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "The Boardroom could not produce a report.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <>
      <section className="rounded-[1.8rem] border border-[rgba(242,232,220,0.08)] bg-[linear-gradient(135deg,rgba(255,152,103,0.11),rgba(255,255,255,0.025))] p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[rgba(255,152,103,0.28)] bg-[rgba(255,152,103,0.12)]">
              <Crown className="h-5 w-5 text-[rgb(255,152,103)]" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--dobly-text-dim)]">Strategic layer</div>
              <h2 className="mt-2 font-display text-2xl tracking-[-0.04em] text-[var(--dobly-text)]">The Board reads the work, not just the dashboard.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dobly-text-secondary)]">
                CFO, CRO, CMO, COO, CCO, and Strategy agents inspect real records: leads, invoices, cases, operations, conversations, and content.
              </p>
              {error ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.1)] px-3 py-1.5 text-xs text-[rgb(252,165,165)]">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {error}
                </div>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={runBoardroom}
            disabled={isRunning}
            className="btn-primary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isRunning ? "Board is reading..." : "Run Boardroom"}
          </button>
        </div>
      </section>

      {report ? <BoardroomReportDialog report={report} onClose={() => setReport(null)} /> : null}
    </>
  );
}

function BoardroomReportDialog({
  report,
  onClose,
}: {
  report: BoardroomReportView;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(5,5,4,0.72)] px-4 py-8 backdrop-blur-xl">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[rgba(242,232,220,0.13)] bg-[linear-gradient(145deg,rgba(27,25,22,0.98),rgba(12,12,10,0.98))] shadow-[0_40px_140px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between gap-4 border-b border-[rgba(242,232,220,0.08)] p-5 sm:p-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">Boardroom report</div>
            <h3 className="mt-2 font-display text-3xl tracking-[-0.05em] text-[var(--dobly-text)]">Strategic pressure from real records</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--dobly-text-secondary)]">{report.synthesis}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[rgba(242,232,220,0.1)] bg-[rgba(255,255,255,0.035)] text-[var(--dobly-text-muted)] transition hover:text-[var(--dobly-text)]"
            aria-label="Close Boardroom report"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-132px)] overflow-y-auto p-5 sm:p-6">
          {report.setupWarning ? (
            <div className="mb-5 rounded-2xl border border-[rgba(245,214,111,0.25)] bg-[rgba(245,214,111,0.09)] p-4 text-sm text-[var(--dobly-text-secondary)]">
              {report.setupWarning}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[1.5rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--dobly-text-dim)]">Operating thesis</div>
              <p className="mt-3 text-lg leading-8 text-[var(--dobly-text)]">{report.operatingThesis}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {report.strategicMetrics.slice(0, 4).map((metric) => (
                <div key={metric.label} className="rounded-[1.2rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">{metric.label}</div>
                  <div className="mt-2 font-display text-3xl text-[var(--dobly-text)]">{metric.value}</div>
                  <p className="mt-1 text-xs leading-5 text-[var(--dobly-text-muted)]">{metric.interpretation}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {report.operatingPressure.slice(0, 6).map((pressure) => (
              <div key={pressure.department} className="rounded-[1.35rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-display text-xl tracking-[-0.04em] text-[var(--dobly-text)]">{pressure.department}</h4>
                  <span className="rounded-full bg-[rgba(255,152,103,0.12)] px-2.5 py-1 text-xs text-[rgb(255,184,142)]">
                    {pressure.pressureScore}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-muted)]">
                  {pressure.records} records, {pressure.needsAction} need movement, {pressure.highPriority} high priority, {pressure.moneyLinked} money-linked.
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--dobly-text-secondary)]">{pressure.topItem ?? "No record pressure yet."}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {report.members.map((member) => (
              <div key={member.role} className="rounded-[1.5rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--dobly-text-dim)]">{member.role}</div>
                    <h4 className="mt-1 font-display text-2xl tracking-[-0.04em] text-[var(--dobly-text)]">{member.agentName}</h4>
                  </div>
                  <span className="rounded-full border border-[rgba(242,232,220,0.1)] px-3 py-1 text-xs text-[var(--dobly-text-muted)]">
                    {member.confidence} confidence
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-[var(--dobly-text-muted)]">{member.mandate}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--dobly-text-secondary)]">{member.finding}</p>
                <p className="mt-3 rounded-2xl bg-[rgba(255,152,103,0.08)] p-3 text-sm leading-6 text-[var(--dobly-text)]">{member.recommendation}</p>
                {member.evidence?.length ? (
                  <div className="mt-3 space-y-2">
                    {member.evidence.map((item) => (
                      <div key={item} className="rounded-xl bg-[rgba(0,0,0,0.18)] px-3 py-2 text-xs text-[var(--dobly-text-muted)]">
                        {item}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <BoardroomList title="Strategic risks" items={report.strategicRisks} empty="No major record-backed risk visible yet." />
            <BoardroomList title="Strategic opportunities" items={report.strategicOpportunities} empty="Create more live records to surface opportunities." />
            <BoardroomList title="Owner decisions" items={report.ownerDecisions} empty="No board-level decisions are waiting." />
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardroomList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--dobly-text-dim)]">{title}</div>
      <div className="mt-3 space-y-2">
        {(items.length > 0 ? items : [empty]).map((item) => (
          <div key={item} className="rounded-xl bg-[rgba(0,0,0,0.16)] px-3 py-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalTile({
  label,
  value,
  detail,
  warn = false,
}: {
  label: string;
  value: string;
  detail: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-[1.2rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">{label}</div>
      <div className={`mt-2 font-display text-3xl tracking-[-0.05em] ${warn ? "text-[rgb(245,214,111)]" : "text-[var(--dobly-text)]"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-[var(--dobly-text-muted)]">{detail}</div>
    </div>
  );
}
