import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Building2,
  GitBranch,
  Network,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const BUSINESS_LANES = [
  {
    label: "Sales and intake",
    copy: "Lead capture, qualification, follow-up, meeting booking, CRM routing.",
  },
  {
    label: "Support and service",
    copy: "Answers, triage, escalation, reminders, issue follow-through.",
  },
  {
    label: "Operations and admin",
    copy: "Approvals, handoffs, reporting, internal workflows, repetitive requests.",
  },
  {
    label: "Commerce and billing",
    copy: "Orders, invoices, payment nudges, status updates, customer notifications.",
  },
];

export default async function CreatePage({
  searchParams,
}: {
  searchParams?: { kind?: string };
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = searchParams ?? {};
  const kind = params.kind === "agent" || params.kind === "automation" ? params.kind : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="card relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-[36%] bg-[radial-gradient(circle_at_top_right,rgba(77,122,255,0.16),transparent_52%)] lg:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Create</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">
              Start with the outcome.
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">
              Dobly should shape the system first and ask for live connections only when launch truly needs them.
            </p>
          </div>
          <Link href="/dashboard/business" className="btn-secondary">
            <Building2 className="h-4 w-4" />
            Update business context
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="premium-tile">
            <div className="badge-green">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              Step 1
            </div>
            <p className="mt-4 font-display text-xl font-semibold text-text">Pick the business job</p>
            <p className="mt-2 text-sm text-text-muted">
              Choose the real job, not the apps.
            </p>
          </div>
          <div className="premium-tile">
            <div className="badge-muted">
              <Network className="h-3.5 w-3.5" />
              Step 2
            </div>
            <p className="mt-4 font-display text-xl font-semibold text-text">Let Dobly draft the system</p>
            <p className="mt-2 text-sm text-text-muted">
              Prompts, structure, guardrails, and logic first.
            </p>
          </div>
          <div className="premium-tile">
            <div className="badge-muted">
              <ShieldCheck className="h-3.5 w-3.5" />
              Step 3
            </div>
            <p className="mt-4 font-display text-xl font-semibold text-text">Connect only what is truly live</p>
            <p className="mt-2 text-sm text-text-muted">
              Connect only what must act in the customer&apos;s own system.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Link
          href="/dashboard/generate?kind=agent"
          className={`card-hover ${kind === "agent" ? "border-accent/30" : ""}`}
        >
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-dim text-accent">
            <Bot className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold text-text">Build an agent</h2>
          <p className="mt-3 text-sm leading-7 text-text-muted">
            Best when the work is conversational: lead qualification, support, scheduling,
            escalation, intake, operator assistance, and bounded decision support.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="badge-muted">Role and tone</span>
            <span className="badge-muted">Guardrails</span>
            <span className="badge-muted">Escalation</span>
            <span className="badge-muted">Channels later</span>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-accent">
            Start guided agent setup
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        <Link
          href="/dashboard/generate?kind=automation"
          className={`card-hover ${kind === "automation" ? "border-accent/30" : ""}`}
        >
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-dim text-accent">
            <GitBranch className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold text-text">
            Build an automation
          </h2>
          <p className="mt-3 text-sm leading-7 text-text-muted">
            Best when the work is repeatable: triggers, schedules, updates, reminders, reporting,
            handoffs, fulfillment, billing, and multi-step operational flows.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="badge-muted">Triggers</span>
            <span className="badge-muted">Steps and paths</span>
            <span className="badge-muted">Outputs</span>
            <span className="badge-muted">Live connections only if needed</span>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-accent">
            Start guided automation setup
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="badge-muted mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Concrete builder flow
          </div>
          <h2 className="font-display text-2xl font-semibold text-text">
            The builder should ask these first
          </h2>
          <div className="mt-4 space-y-3 text-sm text-text-muted">
            <div>1. What exact business outcome are we trying to automate or delegate?</div>
            <div>2. Is this better handled as an agent, an automation, or a combined system?</div>
            <div>3. What information does Dobly already have from business context?</div>
            <div>4. What external actions truly need to happen in the customer&apos;s own tools?</div>
            <div>5. What should happen after launch: run review, connection recovery, activation, and monitoring?</div>
          </div>
        </div>

        <div className="card">
          <div className="badge-muted mb-4">
            <Network className="h-3.5 w-3.5" />
            Common business lanes
          </div>
          <h2 className="font-display text-2xl font-semibold text-text">
            Tailor the system to the business
          </h2>
          <div className="mt-4 grid gap-3">
            {BUSINESS_LANES.map((lane) => (
              <div
                key={lane.label}
                className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-3"
              >
                <div className="font-display text-lg font-medium text-text">{lane.label}</div>
                <p className="mt-1 text-sm text-text-muted">{lane.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
