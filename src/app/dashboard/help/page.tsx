import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BellRing,
  CreditCard,
  LifeBuoy,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const supportCards = [
  {
    title: "Workflow help",
    copy:
      "Use this when Dobly built the right idea but you want to tune the workflow before it goes live.",
    href: "/dashboard/workflows",
    cta: "Open workflows",
    icon: Workflow,
  },
  {
    title: "Notifications and approvals",
    copy:
      "Review approval requests, failed runs, and the signals Dobly is surfacing so nothing important gets missed.",
    href: "/dashboard/notifications",
    cta: "Review signals",
    icon: BellRing,
  },
  {
    title: "Billing and plan changes",
    copy:
      "Upgrade, switch plans, or manage an active subscription without leaving the product guessing what happens next.",
    href: "/dashboard/settings?tab=billing",
    cta: "Open billing",
    icon: CreditCard,
  },
  {
    title: "Security and account access",
    copy:
      "Reset your password, review trust information, and find the right path for account or data requests.",
    href: "/dashboard/settings?tab=security",
    cta: "Open security",
    icon: LockKeyhole,
  },
];

const resourceLinks = [
  { href: "/security", label: "Security overview" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookie notice" },
  { href: "/subprocessors", label: "Subprocessors" },
];

export default async function HelpPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Help and support</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">
              Clear paths when you need a human or a fix
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
              Dobly should stay simple when things are going well and stay understandable when they are not.
              Use this page to get back to the right workflow, account, or support surface quickly.
            </p>
          </div>
          <div className="badge-green">
            <LifeBuoy className="h-3.5 w-3.5" />
            Support ready
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {supportCards.map(({ title, copy, href, cta, icon: Icon }) => (
          <div key={title} className="premium-tile">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-border bg-surface p-3">
                <Icon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-text">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-text-muted">{copy}</p>
              </div>
            </div>
            <div className="mt-5">
              <Link href={href} className="btn-secondary">
                {cta}
              </Link>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card">
          <div className="mb-5 flex items-center gap-3">
            <Mail className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-semibold text-text">Contact Dobly support</h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-text-muted">
            <p>
              Email <a className="text-accent hover:text-accent/80" href="mailto:hello@dobly.io">hello@dobly.io</a>{" "}
              for account help, billing questions, data requests, or workflow issues that need a person to step in.
            </p>
            <p>
              Include the workflow name, what you expected to happen, and the time you last saw the issue. That gives
              us the fastest path to reproducing and fixing it.
            </p>
            <div className="rounded-[1rem] border border-border bg-surface px-4 py-4">
              <div className="font-display text-sm font-semibold text-text">Best route by issue</div>
              <ul className="mt-3 space-y-2 text-sm text-text-muted">
                <li>Workflow or run problem: include the workflow name and last run time</li>
                <li>Billing question: include the billing email and plan name</li>
                <li>Privacy or deletion request: send from the account email when possible</li>
                <li>Security report: use the public security page for responsible disclosure details</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-semibold text-text">Reference surfaces</h2>
          </div>
          <div className="space-y-3">
            {resourceLinks.map((resource) => (
              <Link
                key={resource.href}
                href={resource.href}
                className="flex items-center justify-between rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-text-muted transition-all hover:border-border-bright hover:text-text"
              >
                <span>{resource.label}</span>
                <Sparkles className="h-4 w-4 text-accent" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
