import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle, Clock3, PlayCircle } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWorkflowRunDetail } from "@/lib/workflow-dashboard";

function renderStatus(status: string) {
  if (status === "success") return <CheckCircle2 className="h-5 w-5 text-green-400" />;
  if (status === "failed") return <AlertCircle className="h-5 w-5 text-red-400" />;
  if (status === "awaiting_approval") return <Clock3 className="h-5 w-5 text-yellow-400" />;
  return <PlayCircle className="h-5 w-5 text-accent" />;
}

export default async function ExecutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const detail = await getWorkflowRunDetail(user.id, id);
  if (!detail) redirect("/dashboard/workflows/executions");

  const stepResults = Array.isArray(detail.run.step_results) ? detail.run.step_results : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/dashboard/workflows/executions" className="btn-ghost inline-flex">
        <ArrowLeft className="h-4 w-4" />
        Back to runs
      </Link>

      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Run detail</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">{detail.workflowName}</h1>
            <p className="mt-3 text-base leading-7 text-text-muted">
              Trigger {detail.run.trigger_type} • Started {new Date(detail.run.started_at).toLocaleString()}
              {detail.run.finished_at ? ` • Finished ${new Date(detail.run.finished_at).toLocaleString()}` : ""}
            </p>
          </div>
          <div className="badge-muted capitalize">{detail.run.status.replaceAll("_", " ")}</div>
        </div>
        {detail.run.error_message ? (
          <div className="mt-4 rounded-[1rem] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {detail.run.error_message}
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="mb-4 font-display text-2xl font-semibold text-text">Step results</div>
        <div className="space-y-3">
          {stepResults.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-border p-5 text-sm text-text-muted">
              This run has not stored step results yet.
            </div>
          ) : (
            stepResults.map((step: any, index: number) => (
              <div key={step.id ?? `${index}`} className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] p-4">
                <div className="flex items-center gap-3">
                  {renderStatus(String(step.status ?? "running"))}
                  <div className="font-medium text-text">{step.name ?? `Step ${index + 1}`}</div>
                  <span className="badge-muted capitalize">{String(step.status ?? "running")}</span>
                </div>
                <div className="mt-2 text-sm text-text-muted">
                  Started {step.started_at ? new Date(step.started_at).toLocaleString() : "unknown"}
                  {step.finished_at ? ` • Finished ${new Date(step.finished_at).toLocaleString()}` : ""}
                </div>
                {step.error ? <div className="mt-3 text-sm text-red-300">{String(step.error)}</div> : null}
                {step.output ? (
                  <pre className="mt-3 overflow-x-auto rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] p-3 text-xs text-text-muted">
                    {JSON.stringify(step.output, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <div className="mb-4 font-display text-2xl font-semibold text-text">Run events</div>
        <div className="space-y-3">
          {detail.events.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-border p-5 text-sm text-text-muted">
              No run events were recorded for this execution.
            </div>
          ) : (
            detail.events.map((event) => (
              <div key={event.id} className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-text">{event.event_type.replaceAll(".", " ")}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-text-dim">{new Date(event.created_at).toLocaleString()}</div>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] p-3 text-xs text-text-muted">
                  {JSON.stringify(event.event_data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
