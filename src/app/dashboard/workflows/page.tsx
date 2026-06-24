import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GitBranch, Plus, Zap, MoreVertical, Play, Pause, Trash2, Edit, Copy } from "lucide-react";
import WorkflowListActions from "@/components/dashboard/WorkflowListActions";
import Dropdown from "@/components/ui/Dropdown";
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
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-text-dim">Loop blueprints</div>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">Operator Loops</h1>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {activeCount} active blueprint{activeCount === 1 ? "" : "s"} - {Math.round(totalTimeSaved / 60)}h saved
            </p>
          </div>
          <Link href="/dashboard/operators" className="btn-primary">
            <Plus className="h-4 w-4" />
            Create Operator
          </Link>
        </div>
      </section>

      {!workflows || workflows.length === 0 ? (
        <section className="space-y-4">
          <div className="card text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-dim text-accent">
              <GitBranch className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl font-semibold text-text">No Loop blueprints yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
              Start by creating an Operator. Dobly will attach Loops when recurring or event-based work is needed.
            </p>
            <Link href="/dashboard/operators" className="btn-primary mt-4">
              <Zap className="h-4 w-4" />
              Create Operator
            </Link>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {STARTER_TEMPLATES.map((template) => (
              <Link
                key={template.id}
                href={`/dashboard/generate?prompt=${encodeURIComponent(template.prompt)}`}
                className="premium-tile"
              >
                <div className="badge-muted mb-2 text-xs">{template.category}</div>
                <div className="font-display text-sm font-semibold text-text">{template.title}</div>
                <p className="mt-1 text-xs leading-4 text-text-muted">{template.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="grid gap-3">
          {workflows.map((workflow) => {
            const blueprint = workflow.blueprint as Record<string, unknown>;
            const integrations = (blueprint?.integrations ?? []) as string[];

            return (
              <div key={workflow.id} className="card-hover">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-dim text-accent">
                    <GitBranch className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <Link
                          href={`/dashboard/workflows/${workflow.id}`}
                          className="font-display text-base font-semibold text-text transition-colors hover:text-accent"
                        >
                          {workflow.title}
                        </Link>
                        <p className="mt-1 text-xs leading-4 text-text-muted">{workflow.description}</p>
                      </div>
                      <span className="badge-muted capitalize text-xs">{workflow.status}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {integrations.slice(0, 4).map((tool) => (
                        <span key={tool} className="badge-muted text-xs">
                          {tool}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-2 sm:flex-row sm:items-center">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-text-dim">
                        {new Date(workflow.created_at).toLocaleDateString()}
                      </div>
                      <div className="sm:ml-auto flex gap-2">
                        <Dropdown
                          trigger={<MoreVertical className="h-4 w-4 text-text-muted" />}
                          items={[
                            {
                              label: "Edit",
                              icon: Edit,
                              onClick: () => {},
                            },
                            {
                              label: "Duplicate",
                              icon: Copy,
                              onClick: () => {},
                            },
                            {
                              label: workflow.status === "active" ? "Pause" : "Activate",
                              icon: workflow.status === "active" ? Pause : Play,
                              onClick: () => {},
                            },
                            {
                              label: "Delete",
                              icon: Trash2,
                              onClick: () => {},
                              variant: "danger",
                            },
                          ]}
                        />
                      </div>
                      <Link href={`/dashboard/workflows/${workflow.id}`} className="btn-ghost text-xs">
                        Open
                        <ArrowRight className="h-3 w-3" />
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
