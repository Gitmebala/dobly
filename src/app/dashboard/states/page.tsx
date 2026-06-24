import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, Gauge, Sparkles } from "lucide-react";
import { buildHomebaseDashboardData } from "@/lib/office/homebase";
import { listDirectiveMemory } from "@/lib/office/policy-memory";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function StatesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const office = await buildHomebaseDashboardData({ userId: user.id });
  const states = office.states;
  const actionCandidates = office.actionCandidates;
  const directives = await listDirectiveMemory({
    userId: user.id,
    limit: 6,
  }).catch(() => []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">State engine</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">What Dobly is trying to keep true</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">
              States are the promises Dobly is maintaining. Pressure comes from drift, backlog, failures, and unresolved signals. Action candidates are the next moves the engine is preparing.
            </p>
          </div>
          <div className="badge-green">
            <Sparkles className="h-3.5 w-3.5" />
            Live engine
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Active states" value={String(states.length)} />
        <Metric label="At risk / breached" value={String(states.filter((state) => ["at_risk", "breached"].includes(state.healthStatus)).length)} />
        <Metric label="Open action candidates" value={String(actionCandidates.filter((candidate) => candidate.status === "open").length)} />
      </section>

      <section className="card">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-text">Operating states</h2>
            <p className="mt-1 text-sm text-text-muted">The desired conditions Dobly is watching across the business.</p>
          </div>
          <Link href="/dashboard/generate" className="btn-secondary">
            Add coworker
          </Link>
        </div>
        <div className="grid gap-3">
          {states.length ? states.map((state) => (
            <div key={state.id} className="rounded-[1.2rem] border border-border bg-[rgba(255,255,255,0.03)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-base font-medium text-text">{state.title}</div>
                  <div className="mt-1 text-sm text-text-muted">{state.desiredCondition}</div>
                </div>
                <StatusBadge status={state.healthStatus} />
              </div>
              <div className="mt-4 grid gap-3 text-sm text-text-muted md:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-text-dim">Objective</div>
                  <div className="mt-1">{state.objective}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-text-dim">Type</div>
                  <div className="mt-1 capitalize">{state.stateType}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-text-dim">Last evaluated</div>
                  <div className="mt-1">{state.lastEvaluatedAt ? new Date(state.lastEvaluatedAt).toLocaleString() : "Not yet evaluated"}</div>
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-[1.2rem] border border-dashed border-border p-5 text-sm text-text-muted">
              No operating states exist yet. As you generate coworkers, Dobly can start turning responsibilities into states.
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-text">Action candidates</h2>
            <p className="mt-1 text-sm text-text-muted">The real next moves the state engine is creating from drift.</p>
          </div>
          <Link href="/dashboard/approvals" className="btn-ghost">
            Open approvals
          </Link>
        </div>
        <div className="grid gap-3">
          {actionCandidates.length ? actionCandidates.map((candidate) => (
            <div key={candidate.id} className="rounded-[1.2rem] border border-border bg-[rgba(255,255,255,0.03)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-base font-medium text-text">{candidate.title}</div>
                  <div className="mt-1 text-sm text-text-muted">{candidate.summary}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-muted capitalize">{candidate.executionMode}</span>
                  <span className="badge-muted capitalize">{candidate.riskLevel}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-text-dim">
                <span className="inline-flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5 text-accent" />{candidate.actionKind}</span>
                <span>Status: {candidate.status}</span>
                <span>Updated {new Date(candidate.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          )) : (
            <div className="rounded-[1.2rem] border border-dashed border-border p-5 text-sm text-text-muted">
              No action candidates are open right now. That means either pressure is low or no states have been evaluated into work yet.
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-text">Directives shaping the engine</h2>
            <p className="mt-1 text-sm text-text-muted">Board and GM rules that should influence how Dobly interprets pressure and chooses recovery moves.</p>
          </div>
          <Link href="/dashboard/reports" className="btn-ghost">
            Open Board
          </Link>
        </div>
        <div className="grid gap-3">
          {directives.length ? directives.map((directive) => (
            <div key={directive.id} className="rounded-[1.2rem] border border-[rgba(255,184,108,0.24)] bg-[rgba(255,184,108,0.08)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-base font-medium text-text">{directive.title}</div>
                  <div className="mt-1 text-sm text-text-muted">{directive.body}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-muted capitalize">{directive.kind.replaceAll("_", " ")}</span>
                  <span className="badge-muted capitalize">{directive.scope.replaceAll("_", " ")}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-[1.2rem] border border-dashed border-border p-5 text-sm text-text-muted">
              No durable Board or GM directives are visible yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="premium-tile">
      <div className="text-xs uppercase tracking-[0.22em] text-text-dim">{label}</div>
      <div className="mt-3 font-display text-3xl font-semibold text-text">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "healthy"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : status === "watching"
        ? "border-sky-400/30 bg-sky-400/10 text-sky-200"
        : status === "recovering"
          ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
          : "border-red-400/30 bg-red-400/10 text-red-200";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize ${tone}`}>
      <AlertTriangle className="h-3 w-3" />
      {status.replace("_", " ")}
    </span>
  );
}
