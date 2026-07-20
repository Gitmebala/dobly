import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GitBranch, Plus } from "lucide-react";
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
    <div className="workflows-page mx-auto max-w-5xl space-y-4">
      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-text-dim">Loops</div>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">The recurring work your coworkers run</h1>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {activeCount} running · {Math.round(totalTimeSaved / 60)}h returned so far
            </p>
          </div>
          <Link href="/dashboard/coworkers?create=true" className="btn-primary">
            <Plus className="h-4 w-4" />
            Hire a coworker
          </Link>
        </div>
      </section>

      {!workflows || workflows.length === 0 ? (
        <section className="card text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-dim text-accent">
            <GitBranch className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-semibold text-text">Nothing runs on its own yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            Loops appear when a coworker takes on recurring or event-driven work. Hire a coworker and describe the job — Dobly sets up the loops.
          </p>
          <Link href="/dashboard/coworkers?create=true" className="btn-primary mt-4">
            Hire a coworker
          </Link>
        </section>
      ) : (
        <section className="home-list">
          {workflows.map((workflow) => {
            const blueprint = workflow.blueprint as Record<string, unknown>;
            const integrations = (blueprint?.integrations ?? []) as string[];
            return (
              <Link key={workflow.id} href={`/dashboard/workflows/${workflow.id}`} className="home-list-row">
                <span className="home-list-main">
                  <strong>{workflow.title}</strong>
                  <small>
                    {workflow.description || "No description yet"}
                    {integrations.length ? ` · via ${integrations.slice(0, 3).join(", ")}` : ""}
                  </small>
                </span>
                <span className="home-list-meta">
                  <em data-status={workflow.status}>{workflow.status}</em>
                  <time>{new Date(workflow.created_at).toLocaleDateString()}</time>
                  <ArrowRight size={14} />
                </span>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
