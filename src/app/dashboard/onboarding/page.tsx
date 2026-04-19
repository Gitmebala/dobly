import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Link2, Sparkles, Waypoints } from "lucide-react";
import { isConnectionOperational } from "@/lib/connection-readiness";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: workflows }, { data: connections }, { data: businessProfile }] = await Promise.all([
    supabase.from("workflows").select("id").eq("user_id", user.id),
    supabase.from("connections").select("*").eq("user_id", user.id),
    supabase.from("business_profiles").select("*").eq("user_id", user.id).single(),
  ]);

  const hasWorkflow = (workflows ?? []).length > 0;
  const hasConnection = (connections ?? []).some((connection) => isConnectionOperational(connection));
  const hasBusinessContext = businessProfile?.business_name && businessProfile?.description;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Onboarding</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">Launch Dobly properly</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
              This is the shortest path to a live automation that can actually run, stay healthy, and take repeat work off your plate, whether it is life admin or customer work.
            </p>
          </div>
          <div className="badge-green">Launch checklist</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChecklistCard
          done={hasBusinessContext}
          icon={<Sparkles className="h-5 w-5 text-accent" />}
          title="Set business context"
          copy="Share your website or business details. Dobly analyzes this to make your automations smarter and more aligned with your business."
          href="/dashboard/business"
          action="Set context"
        />
        <ChecklistCard
          done={hasConnection}
          icon={<Link2 className="h-5 w-5 text-accent" />}
          title="Connect your tools"
          copy="Start with the accounts your workflow needs: Google, Slack, Shopify, M-PESA, or custom APIs."
          href="/dashboard/settings?tab=connections"
          action="Open connections"
        />
        <ChecklistCard
          done={hasWorkflow}
          icon={<Sparkles className="h-5 w-5 text-accent" />}
          title="Generate your first workflow"
          copy="Describe the repeat work in plain English. Dobly will compile the trigger, execution path, and setup requirements."
          href="/dashboard/generate"
          action="Build workflow"
        />
        <ChecklistCard
          done={hasConnection && hasWorkflow && hasBusinessContext}
          icon={<Waypoints className="h-5 w-5 text-accent" />}
          title="Review health and approvals"
          copy="Make sure your automations are visible, replayable, and protected by approvals when the action is risky or sensitive."
          href="/dashboard/health"
          action="Open health"
        />
      </section>
    </div>
  );
}

function ChecklistCard({
  done,
  icon,
  title,
  copy,
  href,
  action,
}: {
  done: boolean;
  icon: ReactNode;
  title: string;
  copy: string;
  href: string;
  action: string;
}) {
  return (
    <section className="premium-tile">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon}
          <div className="font-display text-xl font-semibold text-text">{title}</div>
        </div>
        {done ? <CheckCircle2 className="h-5 w-5 text-accent" /> : <div className="badge-muted">Next</div>}
      </div>
      <p className="mt-4 text-sm leading-7 text-text-muted">{copy}</p>
      <Link href={href} className="btn-secondary mt-6">
        {action}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
