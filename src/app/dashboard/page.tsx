import Link from "next/link";
import { redirect } from "next/navigation";
import type { ElementType, ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  ChevronRight,
  Clock3,
  Link2,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Wand2,
  Workflow,
  Zap,
} from "lucide-react";
import { isConnectionOperational } from "@/lib/connection-readiness";
import { getPlanConfig, getPlanUsageSnapshot, percentUsed } from "@/lib/plans";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PlanId } from "@/types";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: workflows }, { data: connections }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("workflows").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("connections").select("*").eq("user_id", user.id),
  ]);

  const planId = (profile?.plan ?? "free") as PlanId;
  const usage = await getPlanUsageSnapshot(user.id, planId);
  const plan = getPlanConfig(planId);

  const workflowCount = workflows?.length ?? 0;
  const activeCount = workflows?.filter((workflow) => workflow.status === "active").length ?? 0;
  const agentCount = workflows?.filter((workflow) => workflow.blueprint?.definition?.operator?.enabled).length ?? 0;
  const automationCount = workflows?.filter((workflow) => !workflow.blueprint?.definition?.operator?.enabled).length ?? 0;
  const connectedCount = connections?.filter((connection) => isConnectionOperational(connection)).length ?? 0;
  const stalledConnections = Math.max((connections?.length ?? 0) - connectedCount, 0);
  const timeSavedMinutes = (workflows ?? []).reduce((sum, workflow) => sum + (workflow.time_saved_minutes ?? 0), 0);
  const focusCount = stalledConnections + Math.max(workflowCount - activeCount, 0);
  const standardUsage = usage.standard_executions_limit === -1 ? 18 : percentUsed(usage.standard_executions_used, usage.standard_executions_limit);
  const intelligenceUsage = usage.intelligence_actions_limit === -1 ? 22 : percentUsed(usage.intelligence_actions_used, usage.intelligence_actions_limit);
  const firstName = profile?.full_name?.split(" ")[0] ?? "Operator";

  return (
    <div className="space-y-6 pb-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[rgba(113,140,194,0.16)] bg-[linear-gradient(135deg,rgba(10,18,31,0.96),rgba(9,15,26,0.82))] p-6 shadow-[0_36px_110px_rgba(2,6,16,0.42)] sm:p-8">
        <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_top_right,rgba(77,122,255,0.18),transparent_42%)]" />
        <div className="absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-[rgba(0,232,122,0.08)] blur-3xl" />
        <div className="relative grid gap-8 xl:grid-cols-[1.45fr_0.9fr] xl:items-end">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(77,122,255,0.18)] bg-[rgba(77,122,255,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-[var(--text-secondary)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_14px_rgba(77,122,255,0.9)]" />
              Control room
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl font-display text-4xl font-bold tracking-[-0.05em] text-white sm:text-5xl">
                {firstName}, everything is in motion.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--text-muted)]">
                Calm signal. Clear focus. Fast decisions.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/create" className="btn-primary">
                <Plus className="h-4 w-4" />
                Build workflow
              </Link>
              <Link href="/dashboard/workflows" className="btn-secondary">
                <ArrowRight className="h-4 w-4" />
                Open workflow library
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <HeroStat label="Live" value={activeCount} caption="Running now" tone="blue" />
            <HeroStat label="Ready" value={connectedCount} caption="Connected" tone="green" />
            <HeroStat label="Focus" value={focusCount} caption="Needs eyes" tone="amber" />
            <HeroStat label="Saved" value={`${Math.floor(timeSavedMinutes / 60)}h`} caption="This cycle" tone="blue" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.92fr]">
        <div className="space-y-6">
          <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-dim)]">Workflow pulse</p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-white">
                  Live systems
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,232,122,0.16)] bg-[rgba(0,232,122,0.08)] px-4 py-2 text-sm text-[var(--text-secondary)]">
                <span className="h-2 w-2 rounded-full bg-[var(--green)] shadow-[0_0_12px_rgba(0,232,122,0.78)]" />
                {activeCount} active of {workflowCount}
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {workflows?.slice(0, 5).map((workflow, index) => {
                const isLive = workflow.status === "active";
                const isOperator = Boolean(workflow.blueprint?.definition?.operator?.enabled);
                const effortLabel = workflow.time_saved_minutes
                  ? `${workflow.time_saved_minutes}m saved`
                  : isLive
                    ? "Freshly active"
                    : "Needs review";

                return (
                  <div
                    key={workflow.id}
                    className="group rounded-[1.6rem] border border-[rgba(113,140,194,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 transition-all hover:border-[rgba(77,122,255,0.22)] hover:shadow-[0_24px_60px_rgba(3,8,18,0.24)]"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border border-[rgba(77,122,255,0.14)] bg-[rgba(77,122,255,0.08)] px-3 text-sm font-medium text-[var(--accent)]">
                            0{index + 1}
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold text-white">{workflow.title}</h3>
                          <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
                              {workflow.description || "No summary yet."}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={isLive ? "green" : "amber"}>{isLive ? "Live" : "Idle"}</StatusPill>
                        <StatusPill tone="blue">{isOperator ? "Agent-led" : "Automation"}</StatusPill>
                        <StatusPill tone="subtle">{effortLabel}</StatusPill>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <DetailTile icon={isOperator ? Bot : Workflow} label="Mode" value={isOperator ? "Agent" : "Automation"} tone="blue" />
                      <DetailTile icon={Activity} label="Status" value={isLive ? "Healthy" : "Idle"} tone={isLive ? "green" : "amber"} />
                      <DetailTile icon={Clock3} label="Momentum" value={effortLabel} tone="subtle" />
                    </div>
                  </div>
                );
              })}

              {workflowCount === 0 ? (
                <div className="rounded-[1.6rem] border border-dashed border-[rgba(113,140,194,0.18)] bg-[rgba(255,255,255,0.02)] px-6 py-10 text-center">
                  <p className="font-display text-2xl font-semibold text-white">Nothing live yet.</p>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[var(--text-muted)]">
                    Launch one system to light up the room.
                  </p>
                  <Link href="/dashboard/create" className="btn-primary mt-6 inline-flex">
                    <Wand2 className="h-4 w-4" />
                    Create your first system
                  </Link>
                </div>
              ) : null}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-dim)]">Recent movement</p>
                  <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-white">
                    Timeline
                  </h3>
                </div>
                <span className="rounded-full border border-[rgba(0,232,122,0.16)] bg-[rgba(0,232,122,0.08)] px-3 py-1 text-xs text-[var(--green)]">
                  Live feed
                </span>
              </div>

              <div className="mt-7 space-y-4">
                {(workflows?.slice(0, 3) ?? []).map((workflow, index) => (
                  <div key={workflow.id} className="flex gap-4 rounded-[1.4rem] border border-[rgba(113,140,194,0.14)] bg-[rgba(255,255,255,0.02)] p-4">
                    <div className="relative flex w-10 justify-center">
                      <span className={`mt-1 h-3 w-3 rounded-full ${workflow.status === "active" ? "bg-[var(--green)] shadow-[0_0_16px_rgba(0,232,122,0.82)]" : "bg-[#FFB020] shadow-[0_0_14px_rgba(255,176,32,0.62)]"}`} />
                      {index < 2 ? <span className="absolute top-5 h-[calc(100%-0.25rem)] w-px bg-[linear-gradient(180deg,rgba(113,140,194,0.32),transparent)]" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-medium text-white">{workflow.title}</p>
                        <span className="text-xs uppercase tracking-[0.24em] text-[var(--text-dim)]">
                          {workflow.status === "active" ? "Now" : "Queued"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
                        {workflow.blueprint?.definition?.operator?.enabled
                          ? "Agent logic is steering this flow."
                          : "Automation is keeping the process moving."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface-panel rounded-[2rem] p-6 sm:p-7">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-dim)]">Focus board</p>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-white">
                What deserves attention
              </h3>

              <div className="mt-7 space-y-3">
                <InsightRow
                  icon={TriangleAlert}
                  label="Approval pressure"
                  value={workflowCount > activeCount ? `${workflowCount - activeCount} workflows waiting` : "No pending blockers"}
                  tone={workflowCount > activeCount ? "amber" : "green"}
                />
                <InsightRow
                  icon={Link2}
                  label="Connection watch"
                  value={stalledConnections > 0 ? `${stalledConnections} sources need review` : "All linked systems healthy"}
                  tone={stalledConnections > 0 ? "amber" : "green"}
                />
                <InsightRow
                  icon={TrendingUp}
                  label="Efficiency gain"
                  value={`${Math.floor(timeSavedMinutes / 60)}h ${timeSavedMinutes % 60}m saved this cycle`}
                  tone="blue"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-dim)]">Usage envelope</p>
                <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-white">
                  {plan.name} plan
                </h3>
              </div>
              <span className="rounded-full border border-[rgba(77,122,255,0.16)] bg-[rgba(77,122,255,0.08)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                Monthly
              </span>
            </div>

            <div className="mt-7 space-y-6">
              <UsageMeter
                label="Standard executions"
                used={usage.standard_executions_used}
                limit={usage.standard_executions_limit}
                percent={standardUsage}
                tone="blue"
              />
              <UsageMeter
                label="Intelligence actions"
                used={usage.intelligence_actions_used}
                limit={usage.intelligence_actions_limit}
                percent={intelligenceUsage}
                tone="green"
              />
            </div>

            <div className="mt-7 flex flex-col gap-3">
              <Link href="/pricing" className="btn-secondary">
                <TrendingUp className="h-4 w-4" />
                Upgrade plan
              </Link>
              <Link href="/dashboard/usage" className="btn-ghost">
                View usage details
              </Link>
            </div>
          </section>

          <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-dim)]">Quick actions</p>
            <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-white">
              Keep momentum high
            </h3>

            <div className="mt-7 space-y-3">
              <QuickAction href="/dashboard/create" icon={Wand2} title="Launch a new flow" description="Shape a system from a plain-language brief." tone="blue" />
              <QuickAction href="/dashboard/settings?tab=connections" icon={Link2} title="Review connections" description="Check what is feeding the room and what is stale." tone="green" />
              <QuickAction href="/dashboard/health" icon={ShieldCheck} title="Inspect runtime health" description="See failures, retries, and system trust signals." tone="amber" />
            </div>
          </section>

          <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-dim)]">System mix</p>
            <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-white">
              Current composition
            </h3>

            <div className="mt-7 grid gap-3">
              <CompositionCard icon={Workflow} label="Automations" value={automationCount} hint="Structured recurring systems" tone="blue" />
              <CompositionCard icon={Bot} label="Agents" value={agentCount} hint="Adaptive flows with operator logic" tone="green" />
              <CompositionCard icon={Zap} label="Connected tools" value={connectedCount} hint="Stable paths for data and actions" tone="amber" />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function HeroStat({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: number | string;
  caption: string;
  tone: "blue" | "green" | "amber";
}) {
  const tones = {
    blue: "border-[rgba(77,122,255,0.16)] bg-[linear-gradient(180deg,rgba(77,122,255,0.12),rgba(255,255,255,0.03))] text-[var(--accent)]",
    green: "border-[rgba(0,232,122,0.16)] bg-[linear-gradient(180deg,rgba(0,232,122,0.1),rgba(255,255,255,0.03))] text-[var(--green)]",
    amber: "border-[rgba(255,176,32,0.16)] bg-[linear-gradient(180deg,rgba(255,176,32,0.1),rgba(255,255,255,0.03))] text-[#ffd084]",
  } as const;

  return (
    <div className={`rounded-[1.5rem] border p-5 ${tones[tone]}`}>
      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--text-dim)]">{label}</p>
      <div className="mt-4 font-display text-4xl font-semibold tracking-[-0.05em] text-white">{value}</div>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{caption}</p>
    </div>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "blue" | "green" | "amber" | "subtle";
}) {
  const tones = {
    blue: "border-[rgba(77,122,255,0.18)] bg-[rgba(77,122,255,0.08)] text-[var(--accent)]",
    green: "border-[rgba(0,232,122,0.18)] bg-[rgba(0,232,122,0.08)] text-[var(--green)]",
    amber: "border-[rgba(255,176,32,0.18)] bg-[rgba(255,176,32,0.08)] text-[#ffd084]",
    subtle: "border-[rgba(113,140,194,0.14)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)]",
  } as const;

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${tones[tone]}`}>
      {children}
    </span>
  );
}

function DetailTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: string;
  tone: "blue" | "green" | "amber" | "subtle";
}) {
  const tones = {
    blue: "bg-[rgba(77,122,255,0.08)] text-[var(--accent)]",
    green: "bg-[rgba(0,232,122,0.08)] text-[var(--green)]",
    amber: "bg-[rgba(255,176,32,0.08)] text-[#ffd084]",
    subtle: "bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)]",
  } as const;

  return (
    <div className="rounded-[1.25rem] border border-[rgba(113,140,194,0.14)] bg-[rgba(255,255,255,0.02)] p-4">
      <div className={`inline-flex rounded-2xl p-2.5 ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.24em] text-[var(--text-dim)]">{label}</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{value}</p>
    </div>
  );
}

function UsageMeter({
  label,
  used,
  limit,
  percent,
  tone,
}: {
  label: string;
  used: number;
  limit: number;
  percent: number;
  tone: "blue" | "green";
}) {
  const toneClass =
    tone === "green"
      ? "from-[rgba(0,232,122,0.95)] to-[rgba(124,255,194,0.95)]"
      : "from-[rgba(51,95,242,0.96)] to-[rgba(126,161,255,0.95)]";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="text-[var(--text-dim)]">
          {used.toLocaleString()} / {limit === -1 ? "∞" : limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${toneClass}`}
          style={{ width: `${Math.max(percent, 8)}%` }}
        />
      </div>
      <p className="mt-2 text-xs uppercase tracking-[0.24em] text-[var(--text-dim)]">{percent}% used</p>
    </div>
  );
}

function InsightRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: string;
  tone: "blue" | "green" | "amber";
}) {
  const tones = {
    blue: "bg-[rgba(77,122,255,0.1)] text-[var(--accent)]",
    green: "bg-[rgba(0,232,122,0.1)] text-[var(--green)]",
    amber: "bg-[rgba(255,176,32,0.1)] text-[#ffd084]",
  } as const;

  return (
    <div className="flex items-start gap-3 rounded-[1.35rem] border border-[rgba(113,140,194,0.14)] bg-[rgba(255,255,255,0.02)] p-4">
      <div className={`mt-0.5 rounded-2xl p-2.5 ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-dim)]">{label}</p>
        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{value}</p>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  tone,
}: {
  href: string;
  icon: ElementType;
  title: string;
  description: string;
  tone: "blue" | "green" | "amber";
}) {
  const tones = {
    blue: "bg-[rgba(77,122,255,0.1)] text-[var(--accent)]",
    green: "bg-[rgba(0,232,122,0.1)] text-[var(--green)]",
    amber: "bg-[rgba(255,176,32,0.1)] text-[#ffd084]",
  } as const;

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-[1.3rem] border border-[rgba(113,140,194,0.14)] bg-[rgba(255,255,255,0.02)] p-4 transition-all hover:border-[rgba(77,122,255,0.2)] hover:bg-[rgba(255,255,255,0.04)]"
    >
      <div className={`grid h-11 w-11 place-items-center rounded-2xl ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-medium text-white">{title}</h4>
        <p className="mt-1 text-xs leading-6 text-[var(--text-muted)]">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--text-dim)] transition-colors group-hover:text-white" />
    </Link>
  );
}

function CompositionCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: number;
  hint: string;
  tone: "blue" | "green" | "amber";
}) {
  const tones = {
    blue: "bg-[rgba(77,122,255,0.1)] text-[var(--accent)]",
    green: "bg-[rgba(0,232,122,0.1)] text-[var(--green)]",
    amber: "bg-[rgba(255,176,32,0.1)] text-[#ffd084]",
  } as const;

  return (
    <div className="rounded-[1.35rem] border border-[rgba(113,140,194,0.14)] bg-[rgba(255,255,255,0.02)] p-4">
      <div className={`inline-flex rounded-2xl p-2.5 ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        <p className="font-display text-2xl font-semibold tracking-[-0.04em] text-white">{value}</p>
      </div>
      <p className="mt-2 text-xs leading-6 text-[var(--text-dim)]">{hint}</p>
    </div>
  );
}
