import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GitBranch, Plus } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";
import { maskToken, type LoopTriggerMetadata } from "@/lib/loop-triggers";
import { CreateLoopDrawer } from "@/components/dashboard/CreateLoopDrawer";
import { LoopTriggerPopover } from "@/components/dashboard/LoopTriggerPopover";
import { LoopRowMenu } from "@/components/dashboard/LoopRowMenu";

export const metadata = { title: "Loops" };

const CADENCE_LABELS: Record<string, string> = {
  manual: "Only when asked",
  always_on: "Always on",
  hourly: "Every hour",
  daily: "Every day",
  weekly: "Every week",
  market_open: "At market open",
  event_based: "When something happens",
};

function describeCadence(cadence: string) {
  return CADENCE_LABELS[cadence] ?? cadence.replaceAll("_", " ");
}

export default async function WorkflowsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // This page reads the coworkers' own loops (dobly_operator_loops, created
  // for every coworker at hire time), NOT the legacy `workflows` table. It
  // used to read `workflows` exclusively - a table the current product never
  // writes to - so it told users "Nothing runs on its own yet" while their
  // coworkers had real, scheduled, actively-firing loops. Same read/write
  // mismatch that kept the "Finish setup" banner up forever.
  const operators = await listDoblyOperators({ userId: user.id }).catch((): OperatorWithLoops[] => []);

  const loops = operators.flatMap((operator) =>
    (operator.loops ?? [])
      .filter((loop) => loop.status !== "archived")
      .map((loop) => ({ loop, operator })),
  );
  const activeCount = loops.filter(({ loop }) => loop.status === "active").length;
  const hireableCoworkers = operators
    .filter((operator) => operator.status === "active")
    .map((operator) => ({ id: operator.id, name: operator.name }));

  return (
    <div className="workflows-page mx-auto max-w-5xl space-y-4">
      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-text-dim">Loops</div>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">The recurring work your coworkers run</h1>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {activeCount} running across {operators.length} coworker{operators.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hireableCoworkers.length > 0 ? <CreateLoopDrawer coworkers={hireableCoworkers} /> : null}
            <Link href="/dashboard/coworkers?create=true" className="btn-primary">
              <Plus className="h-4 w-4" />
              Hire a coworker
            </Link>
          </div>
        </div>
      </section>

      {loops.length === 0 ? (
        <section className="card text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-dim text-accent">
            <GitBranch className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-semibold text-text">Nothing runs on its own yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            Loops appear when a coworker takes on recurring or event-driven work. Hire a coworker and describe the job, then Dobly sets up the loops.
          </p>
          <Link href="/dashboard/coworkers?create=true" className="btn-primary mt-4">
            Hire a coworker
          </Link>
        </section>
      ) : (
        <section className="home-list">
          {loops.map(({ loop, operator }) => {
            const metadata = (loop.metadata ?? {}) as LoopTriggerMetadata;
            const isWebhook = metadata.trigger_kind === "webhook" && !!metadata.webhook_token;
            return (
              <div key={loop.id} className="home-list-row loop-row">
                <Link href={`/dashboard/coworkers?operatorId=${operator.id}`} className="home-list-main loop-row-link">
                  <strong>{loop.name}</strong>
                  <small>
                    {operator.name} · {describeCadence(loop.cadence)}
                    {loop.trigger ? ` · ${loop.trigger}` : ""}
                  </small>
                </Link>
                <span className="home-list-meta">
                  {isWebhook ? (
                    <LoopTriggerPopover loopId={loop.id} maskedToken={maskToken(metadata.webhook_token!)} />
                  ) : null}
                  <em data-status={loop.status}>{loop.status}</em>
                  <time>
                    {loop.last_run_at
                      ? `ran ${new Date(loop.last_run_at).toISOString().slice(0, 10)}`
                      : "not run yet"}
                  </time>
                  <LoopRowMenu loopId={loop.id} status={loop.status as "active" | "paused" | "archived"} />
                  <Link href={`/dashboard/coworkers?operatorId=${operator.id}`} aria-label={`Open ${loop.name}`}>
                    <ArrowRight size={14} />
                  </Link>
                </span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
