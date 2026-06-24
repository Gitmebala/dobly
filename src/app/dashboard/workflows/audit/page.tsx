import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWorkflowAuditEntries } from "@/lib/workflow-dashboard";

export default async function AuditLogsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const entries = await getWorkflowAuditEntries(user.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="card">
        <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Audit</div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">Live workflow audit trail</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">
          This feed is now backed by real run events, version saves, and approvals from your workspace instead of fabricated audit records.
        </p>
      </section>

      <section className="card">
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-border p-5 text-sm text-text-muted">
              No audit entries yet.
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="font-medium text-text">{entry.title}</div>
                    <div className="mt-1 text-sm text-text-muted">{entry.workflowName}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="badge-muted capitalize">{entry.kind.replaceAll("_", " ")}</span>
                    <span className="badge-muted capitalize">{entry.status}</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-text-muted">{entry.detail}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-text-dim">{new Date(entry.occurredAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
