import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  GitBranch,
  Link2,
  Plus,
  Repeat2,
} from "lucide-react";
import WorkflowListActions from "@/components/dashboard/WorkflowListActions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const AUTOMATION_EXAMPLES = [
  {
    title: "Invoice follow-up",
    copy:
      "When payment is due, send reminders, update the ledger, and notify the operator only if the account stalls.",
  },
  {
    title: "Order orchestration",
    copy:
      "Move new orders through fulfillment, update records, and trigger delivery or pickup instructions.",
  },
  {
    title: "Daily reporting",
    copy:
      "Collect data from connected tools, summarize the day, and deliver a report at the same time every cycle.",
  },
];

export default async function AutomationsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: workflows } = await supabase
    .from("workflows")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const automations = (workflows ?? []).filter(
    (workflow) => !workflow.blueprint?.definition?.operator?.enabled,
  );
  const activeAutomations = automations.filter((workflow) => workflow.status === "active").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="card relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(0,232,122,0.08),transparent_50%)] lg:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Automations</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">
              Systems that run the repeatable work
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">
              Triggers, steps, timing, and delivery. Quiet when healthy, obvious when something needs attention.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="badge-muted">Scheduled reports</span>
              <span className="badge-muted">Order follow-through</span>
              <span className="badge-muted">Payment reminders</span>
              <span className="badge-muted">CRM sync</span>
            </div>
          </div>
          <Link href="/dashboard/create?kind=automation" className="btn-primary">
            <Plus className="h-4 w-4" />
            New automation
          </Link>
        </div>

        <div className="relative mt-6 grid gap-4 md:grid-cols-3">
          <div className="premium-tile">
            <div className="badge-green">
              <Repeat2 className="h-3.5 w-3.5" />
              Running now
            </div>
            <p className="mt-4 font-display text-3xl font-semibold text-text">
              {activeAutomations}
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Running in the background.
            </p>
          </div>
          <div className="premium-tile">
            <div className="badge-muted">
              <CalendarClock className="h-3.5 w-3.5" />
              Best for
            </div>
            <p className="mt-4 font-display text-xl font-semibold text-text">
              Repeatable operations
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Best when order and timing matter.
            </p>
          </div>
          <div className="premium-tile">
            <div className="badge-muted">
              <Link2 className="h-3.5 w-3.5" />
              Designed around
            </div>
            <p className="mt-4 font-display text-xl font-semibold text-text">
              Triggers and steps
            </p>
            <p className="mt-2 text-sm text-text-muted">
              One path. Visible end to end.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {automations.length === 0 ? (
          <div className="card text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-dim text-accent">
              <GitBranch className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-text">No automations yet</h2>
            <p className="mx-auto mt-3 max-w-md text-text-muted">
              Start from a repetitive process, then let Dobly turn it into a deployable workflow
              with triggers, timing, and connector actions.
            </p>
            <Link href="/dashboard/create?kind=automation" className="btn-primary mt-6">
              Build your first automation
            </Link>
          </div>
        ) : (
          automations.map((automation) => (
            <div key={automation.id} className="card-hover">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-dim text-accent">
                  <GitBranch className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link
                        href={`/dashboard/workflows/${automation.id}`}
                        className="font-display text-xl font-semibold text-text transition-colors hover:text-accent"
                      >
                        {automation.title}
                      </Link>
                      <p className="mt-2 text-sm leading-6 text-text-muted">
                        {automation.description}
                      </p>
                    </div>
                    <span className="badge-muted capitalize">{automation.status}</span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-3 py-3 text-sm text-text-muted">
                      <div className="text-xs uppercase tracking-[0.18em] text-text-dim">Trigger</div>
                      <div className="mt-2 text-text">Event or schedule</div>
                    </div>
                    <div className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-3 py-3 text-sm text-text-muted">
                      <div className="text-xs uppercase tracking-[0.18em] text-text-dim">Shape</div>
                      <div className="mt-2 text-text">Deterministic path</div>
                    </div>
                    <div className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-3 py-3 text-sm text-text-muted">
                      <div className="text-xs uppercase tracking-[0.18em] text-text-dim">
                        Examples
                      </div>
                      <div className="mt-2 text-text">Sync, notify, update</div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center">
                    <div className="text-xs uppercase tracking-[0.22em] text-text-dim">
                      {new Date(automation.created_at).toLocaleDateString()}
                    </div>
                    <div className="sm:ml-auto">
                      <WorkflowListActions workflowId={automation.id} status={automation.status} />
                    </div>
                    <Link href={`/dashboard/workflows/${automation.id}`} className="btn-ghost">
                      Open automation
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {AUTOMATION_EXAMPLES.map((example) => (
          <div key={example.title} className="card">
            <div className="badge-muted">
              <GitBranch className="h-3.5 w-3.5" />
              Example automation
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold text-text">
              {example.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-text-muted">{example.copy}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
