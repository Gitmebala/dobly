import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Circle,
  Link2,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { isConnectionOperational } from "@/lib/connection-readiness";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type OnboardingStep = {
  number: number;
  done: boolean;
  icon: ReactNode;
  title: string;
  copy: string;
  detail: string;
  href: string;
  action: string;
};

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: workflows }, { data: connections }, { data: businessProfile }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("workflows").select("id").eq("user_id", user.id),
    supabase.from("connections").select("*").eq("user_id", user.id),
    supabase.from("business_profiles").select("*").eq("user_id", user.id).single(),
  ]);

  const readyConnections = (connections ?? []).filter(isConnectionOperational);
  const hasWorkflow = (workflows ?? []).length > 0;
  const hasConnection = readyConnections.length > 0;
  const hasBusinessContext = Boolean(businessProfile?.business_name && businessProfile?.description);
  const readyToOperate = hasBusinessContext && hasConnection && hasWorkflow;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || user.user_metadata?.full_name?.trim().split(/\s+/)[0] || "there";

  const steps: OnboardingStep[] = [
    {
      number: 1,
      done: hasBusinessContext,
      icon: <Building2 />,
      title: "Tell Dobly about the business",
      copy: "Add the business, customers, offer, voice, policies, and the context Dobly must remember.",
      detail: hasBusinessContext ? businessProfile.business_name : "About 3 minutes",
      href: "/dashboard/business",
      action: hasBusinessContext ? "Review context" : "Add business context",
    },
    {
      number: 2,
      done: hasConnection,
      icon: <Link2 />,
      title: "Connect one place where work happens",
      copy: "Start with the system needed for your first outcome. You can add everything else later.",
      detail: hasConnection ? `${readyConnections.length} ready` : "One connection is enough",
      href: "/dashboard/connections",
      action: hasConnection ? "Manage connections" : "Choose a connection",
    },
    {
      number: 3,
      done: hasWorkflow,
      icon: <WandSparkles />,
      title: "Give Dobly a real outcome",
      copy: "Describe what should move forward. Dobly will research, plan, build the right Operator, and show its assumptions.",
      detail: hasWorkflow ? `${(workflows ?? []).length} system${(workflows ?? []).length === 1 ? "" : "s"} created` : "Use plain language",
      href: "/dashboard/generate",
      action: hasWorkflow ? "Create another" : "Build the first Operator",
    },
    {
      number: 4,
      done: readyToOperate,
      icon: <ShieldCheck />,
      title: "Review before anything goes live",
      copy: "Inspect access, approval points, tests, and failure handling before Dobly begins operating.",
      detail: readyToOperate ? "Ready for review" : "Unlocks after steps 1-3",
      href: readyToOperate ? "/dashboard/health" : "#onboarding-steps",
      action: readyToOperate ? "Review readiness" : "Complete setup first",
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done) ?? steps[3];
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <div className="ref-onboarding">
      <header className="ref-onboarding-head">
        <div>
          <div className="ref-greeting"><Sparkles size={16} /> Welcome to Dobly, {firstName}</div>
          <h1>Put your first operation in motion.</h1>
          <p>Dobly only needs enough context and access to handle one real outcome. Start narrow, verify it, then expand.</p>
        </div>
        <Link href={nextStep.href} className="ref-button primary">
          Continue setup <ArrowRight size={15} />
        </Link>
      </header>

      <div className="ref-onboarding-layout">
        <main>
          <section className="ref-card ref-onboarding-progress">
            <div className="ref-between">
              <div>
                <strong>{completed === steps.length ? "Workspace ready" : `${completed} of ${steps.length} steps complete`}</strong>
                <p>{completed === steps.length ? "Dobly has the minimum context to begin supervised work." : `Next: ${nextStep.title}`}</p>
              </div>
              <span>{progress}%</span>
            </div>
            <div className="ref-progress-line"><i style={{ width: `${progress}%` }} /></div>
          </section>

          <section id="onboarding-steps" className="ref-onboarding-steps">
            {steps.map((step) => <ChecklistCard key={step.number} step={step} active={step.number === nextStep.number} />)}
          </section>
        </main>

        <aside className="ref-onboarding-rail">
          <section className="ref-card ref-panel">
            <div className="ref-between"><strong>What Dobly needs</strong><ShieldCheck size={17} /></div>
            <div className="ref-onboarding-needs">
              <p><Check size={14} /> Business context, not a perfect company profile</p>
              <p><Check size={14} /> Only the access required for the first outcome</p>
              <p><Check size={14} /> Clear approval points for risky actions</p>
            </div>
          </section>
          <section className="ref-card ref-panel">
            <strong>What happens next</strong>
            <p className="ref-muted">Homebase will show live Operators, work in progress, approvals, failures, and results from your workspace.</p>
            <Link href="/dashboard" className="ref-text-link">Preview Homebase <ArrowRight size={14} /></Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ChecklistCard({ step, active }: { step: OnboardingStep; active: boolean }) {
  return (
    <article className={`ref-card ref-onboarding-step ${active ? "is-active" : ""} ${step.done ? "is-done" : ""}`}>
      <div className="ref-onboarding-step-top">
        <span className="ref-onboarding-number">{step.done ? <Check size={15} /> : step.number}</span>
        <span className="ref-onboarding-step-icon">{step.icon}</span>
        <span className="ref-onboarding-state">{step.done ? "Complete" : active ? "Up next" : "Not started"}</span>
      </div>
      <h2>{step.title}</h2>
      <p>{step.copy}</p>
      <div className="ref-onboarding-detail">{step.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}{step.detail}</div>
      <Link href={step.href} className={`ref-button ${active ? "primary" : ""}`} aria-disabled={!step.done && step.number === 4}>
        {step.action}<ArrowRight size={14} />
      </Link>
    </article>
  );
}
