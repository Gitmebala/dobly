"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  FileText,
  Layers3,
  Megaphone,
  MessageCircle,
  Palette,
  Search,
  Share2,
  ShieldCheck,
  Sheet,
  TrendingUp,
  WalletCards,
  Wrench,
} from "lucide-react";
import type { Profile } from "@/types";
import type { DoblyOSHomeData } from "@/lib/dobly-os";
import type { HomebaseDashboardData } from "@/lib/office/homebase";
import DoblyBrainView, { type DoblyBrainData } from "@/components/dashboard/DoblyBrainView";
import OperatorDock from "@/components/dashboard/OperatorDock";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(value?: string | null) {
  if (!value) return "Now";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function summarizeOperator(operator: any) {
  if (operator.mission) return operator.mission;
  if (operator.outcome) return operator.outcome;
  return "Ready to take on a new responsibility.";
}

const operatingRooms = [
  {
    id: "sales",
    name: "Sales",
    icon: TrendingUp,
    coworker: "Pipeline scout",
    work: "Follow up 14 warm leads",
    status: "Safe to run",
    signal: "#2EBFA5",
    accent: "#C4501A",
    mini: ["KES 412k pipe", "3 proposals", "2 approvals"],
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: Megaphone,
    coworker: "Campaign builder",
    work: "Launch founder story sequence",
    status: "Needs approval",
    signal: "#C4501A",
    accent: "#D4611E",
    mini: ["5 posts queued", "2 designs", "1 report"],
  },
  {
    id: "finance",
    name: "Finance",
    icon: WalletCards,
    coworker: "Cash watcher",
    work: "Reconcile mobile money deposits",
    status: "Shadow mode",
    signal: "#2D9E5A",
    accent: "#2D9E5A",
    mini: ["8 invoices", "3 pending", "1 risk"],
  },
  {
    id: "engineering",
    name: "Engineering",
    icon: Wrench,
    coworker: "Release keeper",
    work: "Prepare runtime smoke checks",
    status: "Human review",
    signal: "#3AA7A3",
    accent: "#3AA7A3",
    mini: ["12 tickets", "4 QA", "1 release"],
  },
];

const workSurfaces = [
  { label: "Chat", href: "/dashboard/coworkers", icon: MessageCircle },
  { label: "Docs", href: "/dashboard/generate", icon: FileText },
  { label: "Sheets", href: "/dashboard/reports", icon: Sheet },
  { label: "Calendar", href: "/dashboard/briefings", icon: CalendarDays },
  { label: "Designs", href: "/dashboard/create", icon: Palette },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
];

export default function DoblyOSCommandCenter({
  profile,
  os,
  brain,
  office,
}: {
  profile: Profile | null;
  os: DoblyOSHomeData;
  brain: DoblyBrainData;
  office: HomebaseDashboardData;
}) {
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const [brainViewEnabled, setBrainViewEnabled] = useState(Boolean(profile?.brain_view_enabled));
  const [tooltipSeen, setTooltipSeen] = useState(Boolean(profile?.brain_tooltip_seen));
  const [showBrainTooltip, setShowBrainTooltip] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("marketing");

  const activeCoworkers = useMemo(
    () =>
      [...(brain.operators ?? [])]
        .sort((a: any, b: any) => {
          const aScore = a.status === "active" ? 2 : a.status === "paused" ? 0 : 1;
          const bScore = b.status === "active" ? 2 : b.status === "paused" ? 0 : 1;
          return bScore - aScore;
        })
        .slice(0, 4),
    [brain.operators],
  );

  const recentCompletions = useMemo(() => {
    const feedItems = (brain.feed ?? []).filter((item: any) => {
      const eventType = String(item.event_type ?? "").toLowerCase();
      const status = String(item.status ?? "").toLowerCase();
      return (
        eventType.includes("completed") ||
        eventType.includes("resolved") ||
        eventType.includes("approved") ||
        status === "completed" ||
        status === "success"
      );
    });
    return feedItems.slice(0, 5);
  }, [brain.feed]);

  const todayActivity = useMemo(() => (brain.feed ?? []).slice(0, 5), [brain.feed]);

  const selectedRoom = operatingRooms.find((room) => room.id === selectedRoomId) ?? operatingRooms[1]!;
  const selectedDepartment = office.departments.find((department) => department.id === selectedRoom.id);
  const selectedCoworker =
    activeCoworkers.find((operator: any) => String(operator.desk ?? operator.department ?? operator.role ?? "").toLowerCase().includes(selectedRoom.id)) ??
    activeCoworkers[0];
  const approvalCount = brain.approvals?.filter((approval: any) => approval.status === "pending" || approval.status === "open").length ?? 0;

  const boardItems = [
    ...os.leadership.board.strategicRisks.map((item) => ({ kind: "Risk", text: item })),
    ...os.leadership.board.strategicOpportunities.map((item) => ({ kind: "Opportunity", text: item })),
    ...os.leadership.board.ownerDecisions.map((item) => ({ kind: "Decision", text: item })),
  ].slice(0, 4);

  useEffect(() => {
    if (tooltipSeen) return;
    const timer = window.setTimeout(() => setShowBrainTooltip(true), 1300);
    return () => window.clearTimeout(timer);
  }, [tooltipSeen]);

  async function persistBrainPreference(next: { brainViewEnabled?: boolean; brainTooltipSeen?: boolean }) {
    await fetch("/api/profile/brain-view", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => undefined);
  }

  async function toggleBrainView(nextValue = !brainViewEnabled) {
    setBrainViewEnabled(nextValue);
    await persistBrainPreference({ brainViewEnabled: nextValue });
  }

  async function dismissTooltip(enable?: boolean) {
    const next = Boolean(enable);
    setShowBrainTooltip(false);
    setTooltipSeen(true);
    if (enable) setBrainViewEnabled(true);
    await persistBrainPreference({ brainTooltipSeen: true, brainViewEnabled: enable ? next : brainViewEnabled });
  }

  return (
    <div className="relative h-full min-h-0 overflow-y-auto pb-28">
      <div className="pointer-events-none fixed inset-0 opacity-90">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_4%,rgba(196,80,26,0.20),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(46,191,165,0.13),transparent_26%),linear-gradient(135deg,var(--dobly-bg),var(--dobly-bg-subtle)_46%,var(--dobly-bg))]" />
        <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(color-mix(in_srgb,var(--dobly-text)_22%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--dobly-text)_18%,transparent)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute left-[8%] top-[16%] h-64 w-[42rem] rotate-[-8deg] rounded-full bg-[linear-gradient(90deg,rgba(196,80,26,0.18),rgba(46,191,165,0.08),transparent)] blur-3xl" />
        <div className="absolute bottom-[10%] right-[8%] h-72 w-[34rem] rotate-[10deg] rounded-full bg-[linear-gradient(90deg,rgba(245,237,228,0.10),rgba(196,80,26,0.12),transparent)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-[1500px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        {brainViewEnabled ? (
          <>
            <section className="mb-4 flex items-center justify-between gap-3 rounded-[1.35rem] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.04)] px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Brain View</div>
                <div className="mt-1 text-sm text-[var(--dobly-text-secondary)]">
                  The living graph of coworkers, tools, and cross-office movement.
                </div>
              </div>
              <button type="button" onClick={() => toggleBrainView(false)} className="btn-secondary px-4 py-2 text-xs">
                Back to Home
              </button>
            </section>
            <DoblyBrainView data={brain} />
          </>
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <div className="rounded-[2rem] border border-[color-mix(in_srgb,var(--dobly-text)_14%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--dobly-surface)_66%,transparent),color-mix(in_srgb,var(--dobly-surface-raised)_44%,transparent))] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl">
                  <Link
                    href="/dashboard/create"
                    className="group flex items-center justify-between gap-4 rounded-[1.55rem] border border-[color-mix(in_srgb,var(--dobly-accent)_26%,transparent)] bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.045))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] transition hover:border-[color-mix(in_srgb,var(--dobly-accent)_48%,transparent)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[1.1rem] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.5),rgba(196,80,26,0.18)_46%,rgba(196,80,26,0.08))] text-[var(--dobly-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                        <Search className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--dobly-text)]">
                          Ask Dobly anything. Create, assign, approve, run.
                        </div>
                        <div className="mt-0.5 truncate text-xs text-[var(--dobly-text-muted)]">
                          Good evening, {firstName}. One command can become a coworker, a record, or a workflow.
                        </div>
                      </div>
                    </div>
                    <span className="hidden items-center gap-2 rounded-full border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.08)] px-3 py-1.5 text-[11px] text-[var(--dobly-text-muted)] sm:inline-flex">
                      Ctrl K
                      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </div>

                <section className="relative overflow-hidden rounded-[2.2rem] border border-[color-mix(in_srgb,var(--dobly-text)_13%,transparent)] bg-[linear-gradient(140deg,color-mix(in_srgb,var(--dobly-surface)_72%,transparent),color-mix(in_srgb,var(--dobly-surface-raised)_42%,transparent))] p-4 shadow-[0_38px_120px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl sm:p-5">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(196,80,26,0.14),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(46,191,165,0.09),transparent_30%)]" />
                  <div className="pointer-events-none absolute left-8 right-8 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(196,80,26,0.48)] to-transparent" />
                  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(196,80,26,0.25)] bg-[rgba(196,80,26,0.1)] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--dobly-accent)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--dobly-accent)] shadow-[0_0_18px_rgba(196,80,26,0.65)]" />
                        Operating Floor
                      </div>
                      <h1 className="mt-4 max-w-2xl font-display text-4xl tracking-[-0.055em] text-[var(--dobly-text)] sm:text-5xl">
                        One calm surface for the work Dobly is moving.
                      </h1>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <TrustChip label="Shadow mode" />
                      <TrustChip label={`${approvalCount || 1} needs approval`} warm />
                      <TrustChip label="Safe to run" good />
                    </div>
                  </div>

                  <div className="relative mt-6 grid gap-3 md:grid-cols-2">
                    {operatingRooms.map((room) => {
                      const Icon = room.icon;
                      const active = selectedRoom.id === room.id;
                      const department = office.departments.find((item) => item.id === room.id);
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setSelectedRoomId(room.id)}
                          className={cx(
                            "group relative overflow-hidden rounded-[1.55rem] border p-4 text-left transition duration-300",
                            active
                              ? "border-[color-mix(in_srgb,var(--dobly-accent)_46%,transparent)] bg-[linear-gradient(145deg,rgba(255,255,255,0.18),rgba(196,80,26,0.08),rgba(255,255,255,0.045))] shadow-[0_24px_70px_rgba(196,80,26,0.14),inset_0_1px_0_rgba(255,255,255,0.22)]"
                              : "border-[color-mix(in_srgb,var(--dobly-text)_10%,transparent)] bg-[linear-gradient(145deg,rgba(255,255,255,0.105),rgba(255,255,255,0.035))] shadow-[inset_0_1px_0_rgba(255,255,255,0.13)] hover:border-[color-mix(in_srgb,var(--dobly-accent)_30%,transparent)]",
                          )}
                        >
                          <div className="pointer-events-none absolute -right-14 -top-16 h-36 w-36 rounded-full bg-[var(--room-glow,rgba(196,80,26,0.12))] blur-2xl" style={{ "--room-glow": `${room.accent}24` } as CSSProperties} />
                          <div className="relative flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="grid h-11 w-11 place-items-center rounded-[1.1rem] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" style={{ color: room.accent }}>
                                <Icon className="h-5 w-5" />
                              </span>
                              <div>
                                <div className="text-base font-semibold text-[var(--dobly-text)]">{room.name}</div>
                                <div className="mt-1 text-xs text-[var(--dobly-text-muted)]">
                                  {department?.activeWorkers ?? 1} active coworker{(department?.activeWorkers ?? 1) === 1 ? "" : "s"}
                                </div>
                              </div>
                            </div>
                            <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] px-2.5 py-1 text-[10px] font-medium text-[var(--dobly-text-secondary)]">
                              {room.status}
                            </span>
                          </div>
                          <div className="relative mt-5 rounded-[1.15rem] border border-[color-mix(in_srgb,var(--dobly-text)_8%,transparent)] bg-[rgba(255,255,255,0.055)] p-3">
                            <div className="flex items-center gap-2 text-xs text-[var(--dobly-text-muted)]">
                              <span className="h-2 w-2 rounded-full shadow-[0_0_18px_currentColor]" style={{ background: room.signal, color: room.signal }} />
                              {room.coworker}
                            </div>
                            <div className="mt-2 text-sm font-medium text-[var(--dobly-text)]">{room.work}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {room.mini.map((item) => (
                                <span key={item} className="rounded-full bg-[rgba(255,255,255,0.07)] px-2.5 py-1 text-[11px] text-[var(--dobly-text-muted)]">
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-[1.8rem] border border-[color-mix(in_srgb,var(--dobly-text)_12%,transparent)] bg-[linear-gradient(135deg,rgba(255,255,255,0.11),rgba(255,255,255,0.035))] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {workSurfaces.map((surface) => {
                      const Icon = surface.icon;
                      return (
                        <Link
                          key={surface.label}
                          href={surface.href}
                          className="group flex flex-col items-center justify-center gap-2 rounded-[1.25rem] border border-transparent px-3 py-3 text-center transition hover:border-[rgba(196,80,26,0.24)] hover:bg-[rgba(255,255,255,0.07)]"
                        >
                          <span className="grid h-10 w-10 place-items-center rounded-[1rem] bg-[rgba(196,80,26,0.10)] text-[var(--dobly-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition group-hover:-translate-y-0.5">
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          <span className="text-xs font-medium text-[var(--dobly-text-secondary)]">{surface.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              </div>

              <aside className="space-y-4">
                <section className="relative overflow-hidden rounded-[2rem] border border-[color-mix(in_srgb,var(--dobly-text)_13%,transparent)] bg-[linear-gradient(150deg,color-mix(in_srgb,var(--dobly-surface)_70%,transparent),color-mix(in_srgb,var(--dobly-surface-raised)_42%,transparent))] p-5 shadow-[0_34px_100px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl">
                  <div className="pointer-events-none absolute -right-16 -top-10 h-40 w-40 rounded-full bg-[rgba(196,80,26,0.16)] blur-3xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Selected room</div>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--dobly-text)]">
                          {selectedRoom.name} Room
                        </h2>
                      </div>
                      <span className="grid h-12 w-12 place-items-center rounded-[1.2rem] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.075)] text-[var(--dobly-accent)]">
                        <Layers3 className="h-5 w-5" />
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      <InspectorRow
                        label="Active coworker"
                        value={selectedCoworker?.name ?? selectedRoom.coworker}
                        meta={selectedCoworker ? summarizeOperator(selectedCoworker) : selectedRoom.work}
                      />
                      <InspectorRow
                        label="Work in review"
                        value={selectedRoom.work}
                        meta={recentCompletions[0]?.title ?? "Awaiting owner review before execution."}
                      />
                      <InspectorRow
                        label="Connected tools"
                        value={selectedRoom.id === "marketing" ? "Canva, Meta, Docs" : selectedRoom.id === "finance" ? "Paystack, M-PESA, Sheets" : selectedRoom.id === "sales" ? "CRM, Email, WhatsApp" : "GitHub, Docs, Deploy"}
                        meta={`${selectedDepartment?.openTasks ?? selectedRoom.mini.length} open work items`}
                      />
                    </div>

                    <div className="mt-5 rounded-[1.25rem] border border-[rgba(196,80,26,0.2)] bg-[rgba(196,80,26,0.08)] p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dobly-text)]">
                        <ShieldCheck className="h-4 w-4 text-[var(--dobly-accent)]" />
                        Trust controls
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <TrustChip label="Human review" />
                        <TrustChip label="Needs approval" warm />
                        <TrustChip label="Safe to run" good />
                      </div>
                    </div>

                    <Link href={`/dashboard/departments/${selectedRoom.id}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[1.15rem] bg-[linear-gradient(135deg,var(--dobly-accent),#D4611E)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(196,80,26,0.25)] transition hover:-translate-y-0.5">
                      Open {selectedRoom.name}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </section>

                <section className="rounded-[1.7rem] border border-[color-mix(in_srgb,var(--dobly-text)_11%,transparent)] bg-[linear-gradient(145deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.11),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-[var(--dobly-text)]">Live signals</div>
                    <button
                      type="button"
                      onClick={() => toggleBrainView()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--dobly-border)] px-2.5 py-1 text-[11px] text-[var(--dobly-text-muted)] transition hover:text-[var(--dobly-accent)]"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Brain
                    </button>
                    {showBrainTooltip ? (
                      <button onClick={() => dismissTooltip(false)} className="sr-only">Dismiss Brain View tip</button>
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-2">
                    {(todayActivity.length ? todayActivity.slice(0, 3) : boardItems.slice(0, 3)).map((item: any, index) => (
                      <div key={item.id ?? `${item.kind}-${index}`} className="rounded-[1rem] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.055)] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="truncate text-sm font-medium text-[var(--dobly-text)]">{item.title ?? item.kind ?? "Signal"}</div>
                          <div className="shrink-0 text-[10px] text-[var(--dobly-text-dim)]">{formatTime(item.created_at)}</div>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--dobly-text-muted)]">
                          {item.summary ?? item.text ?? "Dobly is watching this operating signal."}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
            </section>
          </>
        )}
      </div>
      <OperatorDock brain={brain} />
    </div>
  );
}

function TrustChip({ label, warm = false, good = false }: { label: string; warm?: boolean; good?: boolean }) {
  const dot = good ? "bg-[#2D9E5A]" : warm ? "bg-[var(--dobly-accent)]" : "bg-[#3AA7A3]";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--dobly-text)_12%,transparent)] bg-[rgba(255,255,255,0.075)] px-3 py-1.5 text-[11px] font-medium text-[var(--dobly-text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
      <span className={cx("h-1.5 w-1.5 rounded-full shadow-[0_0_14px_currentColor]", dot)} />
      {label}
    </span>
  );
}

function InspectorRow({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="rounded-[1.18rem] border border-[color-mix(in_srgb,var(--dobly-text)_10%,transparent)] bg-[linear-gradient(145deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
      <div className="text-[10px] uppercase tracking-[0.17em] text-[var(--dobly-text-dim)]">{label}</div>
      <div className="mt-2 text-sm font-semibold text-[var(--dobly-text)]">{value}</div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--dobly-text-muted)]">{meta}</p>
    </div>
  );
}
