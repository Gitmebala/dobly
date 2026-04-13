import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BellRing, Bot, Gauge, GitBranch, Link2, Sparkles, TrendingUp, Wand2 } from "lucide-react";
import { isConnectionOperational } from "@/lib/connection-readiness";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlanUsageSnapshot, getPlanConfig, percentUsed } from "@/lib/plans";
import type { PlanId } from "@/types";
import CountUpValue from "@/components/CountUpValue";

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
  const agentCount = workflows?.filter((workflow) => workflow.blueprint?.definition?.operator?.enabled).length ?? 0;
  const automationCount = workflows?.filter((workflow) => !workflow.blueprint?.definition?.operator?.enabled).length ?? 0;
  const activeCount = workflows?.filter((workflow) => workflow.status === "active").length ?? 0;
  const connectedCount = connections?.filter((connection) => isConnectionOperational(connection)).length ?? 0;
  const timeSavedMinutes = (workflows ?? []).reduce((sum, workflow) => sum + (workflow.time_saved_minutes ?? 0), 0);

  const suggestions = [
    "Use your business context to speed up new agent and automation generation.",
    "You have connected tools, but no live inbound agent running yet.",
    "You have active systems, but no extra approval checkpoints on risky actions yet.",
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="card noise overflow-hidden">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="badge-green mb-5">Business pulse</div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-text sm:text-5xl">
              Your business systems are starting to run like a product.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-text-muted">
              Build agents for roles, automations for processes, and keep the whole runtime visible from one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="premium-tile">
              <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Active systems</div>
              <div className="mt-4 font-display text-4xl font-semibold text-text"><CountUpValue value={activeCount} /></div>
            </div>
            <div className="premium-tile">
              <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Live agents</div>
              <div className="mt-4 font-display text-4xl font-semibold text-text"><CountUpValue value={agentCount} /></div>
            </div>
            <div className="premium-tile">
              <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Automations</div>
              <div className="mt-4 font-display text-4xl font-semibold text-text"><CountUpValue value={automationCount} /></div>
            </div>
            <div className="premium-tile">
              <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Connected accounts</div>
              <div className="mt-4 font-display text-4xl font-semibold capitalize text-text">{connectedCount}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Usage</div>
              <h2 className="mt-2 font-display text-2xl font-semibold text-text">Execution capacity this month</h2>
            </div>
            <div className="badge-muted">{plan.name}</div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-text-muted">
                <span>Standard executions</span>
                <span>
                  {usage.standard_executions_used}/{usage.standard_executions_limit === -1 ? "unlimited" : usage.standard_executions_limit}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-accent-dim">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[#7c73ff]"
                  style={{ width: `${percentUsed(usage.standard_executions_used, usage.standard_executions_limit)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-text-muted">
                <span>Intelligence actions</span>
                <span>
                  {usage.intelligence_actions_used}/{usage.intelligence_actions_limit === -1 ? "unlimited" : usage.intelligence_actions_limit}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-accent-dim">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#b6b1ff] to-[var(--accent)]"
                  style={{ width: `${percentUsed(usage.intelligence_actions_used, usage.intelligence_actions_limit)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/pricing" className="btn-secondary">
              <TrendingUp className="h-4 w-4" />
              View plan details
            </Link>
            <Link href="/dashboard/usage" className="btn-ghost">
              <Gauge className="h-4 w-4" />
              Open usage
            </Link>
            <Link href="/dashboard/health" className="btn-ghost">
              <Gauge className="h-4 w-4" />
              Open health
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Next move</div>
          <h2 className="mt-2 font-display text-2xl font-semibold text-text">Build the next business system</h2>
          <p className="mt-4 text-base leading-7 text-text-muted">
            Describe the role or process once. Dobly will shape it into a bounded agent or a deployable automation.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard/create" className="btn-primary">
              <Wand2 className="h-4 w-4" />
              Create system
            </Link>
            <Link href="/dashboard/agents" className="btn-secondary">
              <Bot className="h-4 w-4" />
              View agents
            </Link>
            <Link href="/dashboard/automations" className="btn-secondary">
              <GitBranch className="h-4 w-4" />
              View automations
            </Link>
            <Link href="/dashboard/settings?tab=connections" className="btn-secondary">
              <Link2 className="h-4 w-4" />
              Connect accounts
            </Link>
            <Link href="/dashboard/business" className="btn-ghost">
              <ArrowRight className="h-4 w-4" />
              Business context
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Recent systems</div>
              <h2 className="mt-2 font-display text-2xl font-semibold text-text">What is currently in motion</h2>
            </div>
            <Link href="/dashboard/agents" className="btn-ghost">
              View all
            </Link>
          </div>

          <div className="grid gap-3">
            {(workflows ?? []).slice(0, 4).map((workflow) => (
              <Link key={workflow.id} href={`/dashboard/workflows/${workflow.id}`} className="premium-tile">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-display text-xl font-semibold text-text">{workflow.title}</div>
                    <p className="mt-2 text-sm leading-6 text-text-muted">{workflow.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-accent" />
                </div>
              </Link>
            ))}
            {workflowCount === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-border p-6 text-sm text-text-muted">
                No systems live yet. Add business context, connect your tools, then let Dobly build your first agent or automation.
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl font-semibold text-text">Dobly suggests</h2>
            </div>
            <div className="space-y-3">
              {suggestions.map((item) => (
                <div key={item} className="premium-tile">
                  <div className="text-sm leading-7 text-text-muted">{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="mb-4 flex items-center gap-3">
              <BellRing className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl font-semibold text-text">Approvals</h2>
            </div>
            <p className="text-sm leading-7 text-text-muted">
              High-risk actions pause here until you approve them, so Dobly can move quickly without acting blindly.
            </p>
            <Link href="/dashboard/approvals" className="btn-secondary mt-5">
              Open approvals
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
