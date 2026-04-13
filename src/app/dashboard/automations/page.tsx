import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GitBranch, Plus } from "lucide-react";
import WorkflowListActions from "@/components/dashboard/WorkflowListActions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
    (workflow) => !workflow.blueprint?.definition?.operator?.enabled
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="card">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Automations</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">
              Structured business workflows that keep running
            </h1>
            <p className="mt-3 text-base leading-7 text-text-muted">
              These are the repeatable systems Dobly built to move work, data, messages, and actions across your business.
            </p>
          </div>
          <Link href="/dashboard/create?kind=automation" className="btn-primary">
            <Plus className="h-4 w-4" />
            New automation
          </Link>
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
              Start from a repetitive process, then let Dobly turn it into a deployable workflow.
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
                      <p className="mt-2 text-sm leading-6 text-text-muted">{automation.description}</p>
                    </div>
                    <span className="badge-muted capitalize">{automation.status}</span>
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
    </div>
  );
}
