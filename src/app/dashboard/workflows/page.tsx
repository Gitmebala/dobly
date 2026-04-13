import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GitBranch, Plus, Zap } from "lucide-react";
import WorkflowListActions from "@/components/dashboard/WorkflowListActions";
import { STARTER_TEMPLATES } from "@/lib/starter-templates";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function WorkflowsPage() {
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

  const activeCount = workflows?.filter((workflow) => workflow.status === "active").length ?? 0;
  const totalTimeSaved = workflows?.reduce((sum, workflow) => sum + (workflow.time_saved_minutes ?? 0), 0) ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="card">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Workflow library</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">Everything currently in motion</h1>
            <p className="mt-3 text-base leading-7 text-text-muted">
              {activeCount} active workflows and {Math.round(totalTimeSaved / 60)} hours returned so far.
            </p>
          </div>
          <Link href="/dashboard/generate" className="btn-primary">
            <Plus className="h-4 w-4" />
            New workflow
          </Link>
        </div>
      </section>

      {!workflows || workflows.length === 0 ? (
        <section className="space-y-5">
          <div className="card text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-dim text-accent">
              <GitBranch className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-text">No workflows yet</h2>
            <p className="mx-auto mt-3 max-w-md text-text-muted">
              Start from a ready-made idea and make it your own.
            </p>
            <Link href="/dashboard/generate" className="btn-primary mt-6">
              <Zap className="h-4 w-4" />
              Generate workflow
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {STARTER_TEMPLATES.map((template) => (
              <Link
                key={template.id}
                href={`/dashboard/generate?prompt=${encodeURIComponent(template.prompt)}`}
                className="premium-tile"
              >
                <div className="badge-muted mb-3">{template.category}</div>
                <div className="font-display text-lg font-semibold text-text">{template.title}</div>
                <p className="mt-2 text-sm leading-6 text-text-muted">{template.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="grid gap-4">
          {workflows.map((workflow) => {
            const blueprint = workflow.blueprint as Record<string, unknown>;
            const integrations = (blueprint?.integrations ?? []) as string[];

            return (
              <div key={workflow.id} className="card-hover">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-dim text-accent">
                    <GitBranch className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <Link
                          href={`/dashboard/workflows/${workflow.id}`}
                          className="font-display text-xl font-semibold text-text transition-colors hover:text-accent"
                        >
                          {workflow.title}
                        </Link>
                        <p className="mt-2 text-sm leading-6 text-text-muted">{workflow.description}</p>
                      </div>
                      <span className="badge-muted capitalize">{workflow.status}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {integrations.slice(0, 4).map((tool) => (
                        <span key={tool} className="badge-muted">
                          {tool}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center">
                      <div className="text-xs uppercase tracking-[0.22em] text-text-dim">
                        {new Date(workflow.created_at).toLocaleDateString()}
                      </div>
                      <div className="sm:ml-auto">
                        <WorkflowListActions workflowId={workflow.id} status={workflow.status} />
                      </div>
                      <Link href={`/dashboard/workflows/${workflow.id}`} className="btn-ghost">
                        Open workflow
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
