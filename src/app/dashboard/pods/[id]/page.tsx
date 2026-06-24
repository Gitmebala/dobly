import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import PodLaunchButton from "@/components/dashboard/PodLaunchButton";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PodRecord } from "@/lib/pods/types";

export default async function PodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { id } = await params;
  const { data: pod } = await supabase
    .from("pods")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!pod) notFound();

  const record = pod as PodRecord;
  const spec = record.spec;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/pods" className="inline-flex items-center gap-2 text-sm text-[var(--dobly-text-secondary)] hover:text-[var(--dobly-text)]">
        <ArrowLeft className="h-4 w-4" />
        Pods
      </Link>

      <section className="grid gap-6 border-b border-[rgba(245,237,228,0.08)] pb-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <p className="dobly-kicker">{spec.audience} Pod</p>
          <h1 className="mt-3 font-display text-5xl tracking-[-0.06em] text-[var(--dobly-text)]">{spec.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">{spec.purpose}</p>
        </div>
        <div className="rounded-[1.2rem] border border-[rgba(245,237,228,0.08)] bg-[rgba(255,255,255,0.02)] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Launch readiness</div>
          <div className="mt-3 font-display text-5xl tracking-[-0.06em] text-[var(--dobly-text)]">
            {spec.launch.readinessScore}%
          </div>
          <div className="mt-3 text-sm text-[var(--dobly-text-secondary)]">Safest mode: {spec.launch.safestFirstMode}</div>
          <div className="mt-4">
            <PodLaunchButton podId={record.id} />
          </div>
        </div>
      </section>

      {spec.verticalBaseline ? (
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Vertical baseline">
            <Line>{spec.verticalBaseline.title}</Line>
            <MiniList title="Point tools to beat" items={spec.verticalBaseline.competitorBaseline} />
            <MiniList title="Worker depth" items={spec.verticalBaseline.workerDepth} />
          </Panel>
          <Panel title="Dobly advantage">
            <MiniList title="Must match" items={spec.verticalBaseline.mustMatch} />
            <MiniList title="Above the baseline" items={spec.verticalBaseline.doblyAdvantage} />
          </Panel>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Job">
          <Line>{spec.job.summary}</Line>
          <MiniList title="Duties" items={spec.job.duties} />
          <MiniList title="Not responsible for" items={spec.job.notResponsibleFor} />
        </Panel>

        <Panel title="Control">
          <MiniList title="Can do without asking" items={spec.approvalPolicy.canDoWithoutAsking} />
          <MiniList title="Always asks for" items={spec.approvalPolicy.alwaysAskFor} />
          <MiniList title="Never does" items={spec.approvalPolicy.neverDo} />
        </Panel>
      </section>

      <section>
        <div className="border-b border-[rgba(245,237,228,0.08)] pb-3 text-[11px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">
          Capabilities
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {spec.capabilities.map((capability) => (
            <div key={capability.id} className="rounded-[1.1rem] border border-[rgba(245,237,228,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="badge-muted">{capability.kind}</span>
                <span className={capability.riskLevel === "high" ? "badge-green" : "badge-muted"}>{capability.riskLevel}</span>
              </div>
              <h3 className="mt-4 text-base font-medium text-[var(--dobly-text)]">{capability.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--dobly-text-secondary)]">{capability.purpose}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Simulation">
          {spec.simulations.map((scenario) => (
            <div key={scenario.id} className="dobly-row">
              <div>
                <div className="flex items-center gap-2 text-sm text-[var(--dobly-text)]">
                  {scenario.needsApproval ? <ShieldCheck className="h-4 w-4 text-[var(--dobly-accent)]" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                  {scenario.title}
                </div>
                <p className="mt-1 text-sm leading-6 text-[var(--dobly-text-secondary)]">{scenario.expectedBehavior}</p>
              </div>
            </div>
          ))}
        </Panel>

        <Panel title="Next steps">
          {spec.launch.nextSteps.map((item) => (
            <Line key={item}>{item}</Line>
          ))}
          {spec.launch.missingConnections.length > 0 ? (
            <MiniList title="Missing connections" items={spec.launch.missingConnections} />
          ) : null}
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="border-b border-[rgba(245,237,228,0.08)] pb-3 text-[11px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">
        {title}
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">{title}</div>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <Line key={item}>{item}</Line>
        ))}
      </div>
    </div>
  );
}

function Line({ children }: { children: React.ReactNode }) {
  return <div className="dobly-row text-sm leading-6 text-[var(--dobly-text-secondary)]">{children}</div>;
}
