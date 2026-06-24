import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import RunHistoryClient from "@/components/dashboard/RunHistoryClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { explainWorkflowFailure } from "@/lib/plans";
import type { WorkflowRun } from "@/types";

export default async function WorkflowRunsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: workflow }, { data: runs }] = await Promise.all([
    supabase.from("workflows").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("workflow_runs").select("*").eq("workflow_id", id).eq("user_id", user.id).order("started_at", { ascending: false }),
  ]);

  if (!workflow) notFound();

  const normalizedRuns = ((runs ?? []) as WorkflowRun[]).map((run) => ({
    ...run,
    error_message: run.error_message ? explainWorkflowFailure(run.error_message) : null,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href={`/dashboard/workflows/${id}`} className="btn-ghost inline-flex">
        <ArrowLeft className="h-4 w-4" />
        Back to workflow
      </Link>

      <section className="card">
        <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Run history</div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">{workflow.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
          Review executions, understand failures in plain English, and replay past runs with the same input.
        </p>
      </section>

      {(normalizedRuns ?? []).length === 0 ? (
        <section className="card">
          <p className="text-sm leading-7 text-text-muted">
            No runs yet. Trigger the workflow to start building history.
          </p>
        </section>
      ) : null}

      <RunHistoryClient workflowId={id} runs={normalizedRuns} />
    </div>
  );
}
