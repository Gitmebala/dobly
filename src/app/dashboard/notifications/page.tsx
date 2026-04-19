import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BellRing,
  CreditCard,
  Link2,
  Mail,
  MessageSquareText,
  Smartphone,
} from "lucide-react";
import { getConnectionReadiness, isConnectionOperational } from "@/lib/connection-readiness";
import { getPlanUsageSnapshot, percentUsed } from "@/lib/plans";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PlanId } from "@/types";

export default async function NotificationsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: approvals }, { data: failedRuns }, { data: connections }, { data: workflows }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("approvals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("requested_at", { ascending: false })
        .limit(10),
      supabase
        .from("workflow_runs")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "failed")
        .order("started_at", { ascending: false })
        .limit(10),
      supabase.from("connections").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("workflows").select("id,title").eq("user_id", user.id),
    ]);

  const usage = await getPlanUsageSnapshot(user.id, ((profile?.plan ?? "free") as PlanId));
  const workflowMap = new Map((workflows ?? []).map((workflow) => [workflow.id, workflow.title] as const));
  const riskyConnections = (connections ?? []).filter((connection) => !isConnectionOperational(connection));
  const standardPressure =
    usage.standard_executions_limit !== -1 &&
    percentUsed(usage.standard_executions_used, usage.standard_executions_limit) >= 80;
  const intelligencePressure =
    usage.intelligence_actions_limit !== -1 &&
    percentUsed(usage.intelligence_actions_used, usage.intelligence_actions_limit) >= 80;

  const totalSignals =
    (approvals ?? []).length +
    (failedRuns ?? []).length +
    riskyConnections.length +
    (standardPressure ? 1 : 0) +
    (intelligencePressure ? 1 : 0);

  const preference = (profile?.notification_preference ?? "app") as "app" | "email" | "whatsapp";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Attention center</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">
              Signals worth surfacing
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
              Dobly should stay quiet until the next action changes.
            </p>
          </div>
          <div className="badge-green capitalize">{preference} first</div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <SignalMetric label="Open signals" value={totalSignals} />
        <SignalMetric label="Approvals" value={(approvals ?? []).length} />
        <SignalMetric label="Failed runs" value={(failedRuns ?? []).length} />
        <SignalMetric label="Connection issues" value={riskyConnections.length} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ChannelCard
          label="In-app"
          active={preference === "app"}
          icon={<BellRing className="h-5 w-5 text-accent" />}
          copy="Best when you are already operating from the dashboard."
        />
        <ChannelCard
          label="Email"
          active={preference === "email"}
          icon={<Mail className="h-5 w-5 text-accent" />}
          copy="For summaries and recovery notes."
        />
        <ChannelCard
          label="WhatsApp"
          active={preference === "whatsapp"}
          icon={<Smartphone className="h-5 w-5 text-accent" />}
          copy="For phone-first alerts once messaging is live."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-5 flex items-center gap-3">
            <MessageSquareText className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-semibold text-text">Approvals and failures</h2>
          </div>
          <div className="space-y-3">
            {(approvals ?? []).map((approval) => (
              <Link
                key={approval.id}
                href={`/dashboard/approvals/${approval.id}`}
                className="block rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-3 transition-all hover:border-border-hi"
              >
                <div className="font-display text-base font-medium text-text">{approval.title}</div>
                <div className="mt-2 text-sm leading-6 text-text-muted">{approval.message}</div>
                <div className="mt-3 text-xs uppercase tracking-[0.18em] text-text-dim">
                  {approval.channel} · pending approval
                </div>
              </Link>
            ))}

            {(failedRuns ?? []).map((run) => (
              <Link
                key={run.id}
                href={`/dashboard/workflows/${run.workflow_id}/runs`}
                className="block rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-3 transition-all hover:border-border-hi"
              >
                <div className="font-display text-base font-medium text-text">
                  {workflowMap.get(run.workflow_id) ?? "Workflow run"}
                </div>
                <div className="mt-2 text-sm leading-6 text-text-muted">
                  {run.error_message ?? "Execution failed."}
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.18em] text-text-dim">
                  {new Date(run.started_at).toLocaleString()}
                </div>
              </Link>
            ))}

            {(approvals ?? []).length === 0 && (failedRuns ?? []).length === 0 ? (
              <div className="rounded-[1rem] border border-dashed border-border p-5 text-sm text-text-muted">
                No approval or failure signals right now.
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="mb-5 flex items-center gap-3">
              <Link2 className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl font-semibold text-text">Connection recovery</h2>
            </div>
            <div className="space-y-3">
              {riskyConnections.map((connection) => {
                const readiness = getConnectionReadiness(connection);
                return (
                  <div key={connection.id} className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-3">
                    <div className="font-display text-base font-medium text-text">{connection.label}</div>
                    <div className="mt-2 text-sm leading-6 text-text-muted">
                      {readiness.detail ?? "Dobly needs this connection reviewed before it can keep using it."}
                    </div>
                  </div>
                );
              })}
              {riskyConnections.length === 0 ? (
                <div className="rounded-[1rem] border border-dashed border-border p-5 text-sm text-text-muted">
                  All deploy-ready connected accounts look healthy.
                </div>
              ) : null}
            </div>
            <Link href="/dashboard/settings?tab=connections" className="btn-secondary mt-5">
              Open connections
            </Link>
          </div>

          <div className="card">
            <div className="mb-5 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl font-semibold text-text">Usage pressure</h2>
            </div>
            <div className="space-y-4">
              <UsageBar
                label="Standard executions"
                used={usage.standard_executions_used}
                limit={usage.standard_executions_limit}
              />
              <UsageBar
                label="Intelligence actions"
                used={usage.intelligence_actions_used}
                limit={usage.intelligence_actions_limit}
              />
            </div>
            {standardPressure || intelligencePressure ? (
              <div className="mt-5 rounded-[1rem] border border-yellow-300/25 bg-yellow-300/5 px-4 py-3 text-sm text-yellow-200">
                Usage is getting close to the current plan limit. Review usage before Dobly starts hitting plan friction.
              </div>
            ) : (
              <div className="mt-5 rounded-[1rem] border border-border bg-surface px-4 py-3 text-sm text-text-muted">
                Usage is still comfortably within the current plan.
              </div>
            )}
            <Link href="/dashboard/usage" className="btn-secondary mt-5">
              Open usage
            </Link>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-text">Adjust routing</h2>
            <p className="mt-2 text-sm leading-7 text-text-muted">
              Change the default notification channel in settings if Dobly is surfacing important moments in the wrong place.
            </p>
          </div>
          <Link href="/dashboard/settings?tab=profile" className="btn-secondary">
            Open notification settings
          </Link>
        </div>
      </section>
    </div>
  );
}

function SignalMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="premium-tile">
      <div className="text-xs uppercase tracking-[0.24em] text-text-dim">{label}</div>
      <div className="mt-3 font-display text-4xl font-bold text-text">{value}</div>
    </div>
  );
}

function ChannelCard({
  label,
  active,
  icon,
  copy,
}: {
  label: string;
  active: boolean;
  icon: ReactNode;
  copy: string;
}) {
  return (
    <div className="premium-tile">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon}
          <div className="font-display text-xl font-semibold text-text">{label}</div>
        </div>
        {active ? <div className="badge-green">Active</div> : <div className="badge-muted">Available</div>}
      </div>
      <p className="mt-4 text-sm leading-7 text-text-muted">{copy}</p>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const width = `${percentUsed(used, limit)}%`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-text-muted">{label}</span>
        <span className="font-display text-text">
          {used}
          <span className="text-text-muted"> / {limit === -1 ? "unlimited" : limit}</span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width }} />
      </div>
    </div>
  );
}
