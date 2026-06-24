import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, GitBranch, Shield } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWorkflowCollaborationInsights } from "@/lib/workflow-dashboard";

export default async function TeamCollaborationPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const data = await getWorkflowCollaborationInsights(user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="card">
        <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Collaboration</div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">Live approvals, versions, and activity</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">
          This screen now reflects real approvals, workflow versions, and runtime activity from your workspace instead of sample comments and invented reviewers.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="premium-tile"><div className="flex items-center gap-2 text-text-dim"><Shield className="h-4 w-4 text-accent" />Approvals</div><div className="mt-3 font-display text-3xl text-text">{data.approvals.length}</div></div>
        <div className="premium-tile"><div className="flex items-center gap-2 text-text-dim"><GitBranch className="h-4 w-4 text-accent" />Versions</div><div className="mt-3 font-display text-3xl text-text">{data.versions.length}</div></div>
        <div className="premium-tile"><div className="flex items-center gap-2 text-text-dim"><Clock3 className="h-4 w-4 text-accent" />Activity</div><div className="mt-3 font-display text-3xl text-text">{data.events.length}</div></div>
      </section>

      <section className="card">
        <div className="mb-4 font-display text-2xl font-semibold text-text">Approvals</div>
        <div className="space-y-3">
          {data.approvals.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-border p-5 text-sm text-text-muted">No approvals yet.</div>
          ) : (
            data.approvals.map((approval) => (
              <div key={approval.id} className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] p-4">
                <div className="flex items-center gap-3">
                  {approval.status === "approved" ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <Clock3 className="h-5 w-5 text-yellow-400" />}
                  <div className="font-medium text-text">{approval.title}</div>
                  <span className="badge-muted capitalize">{approval.status}</span>
                </div>
                <div className="mt-2 text-sm text-text-muted">{approval.message}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-text-dim">{new Date(approval.requested_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <div className="mb-4 font-display text-2xl font-semibold text-text">Version history</div>
        <div className="space-y-3">
          {data.versions.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-border p-5 text-sm text-text-muted">No saved versions yet.</div>
          ) : (
            data.versions.map((version) => (
              <div key={version.id} className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-text">{version.title}</div>
                  <span className="badge-muted">v{version.version_number}</span>
                </div>
                <div className="mt-2 text-sm text-text-muted">{version.description || "Version snapshot saved."}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-text-dim">{new Date(version.created_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <div className="mb-4 font-display text-2xl font-semibold text-text">Activity timeline</div>
        <div className="space-y-3">
          {data.events.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-border p-5 text-sm text-text-muted">No runtime activity recorded yet.</div>
          ) : (
            data.events.map((event) => (
              <div key={event.id} className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-text">{event.workflowName}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-text-dim">{new Date(event.created_at).toLocaleString()}</div>
                </div>
                <div className="mt-2 text-sm text-text-muted">{event.event_type.replaceAll(".", " ")}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
