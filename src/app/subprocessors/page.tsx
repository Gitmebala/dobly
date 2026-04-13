import Link from "next/link";

const processors = [
  {
    name: "Supabase",
    role: "Authentication, database, and operational state",
    data: "Account records, workflow metadata, runtime state, approvals, and connection records",
    notes:
      "Used for Dobly auth and core application storage. Production backup and access policy depend on the configured Supabase project.",
  },
  {
    name: "Stripe",
    role: "Payments, subscriptions, and billing events",
    data: "Customer billing identifiers, plan state, invoices, and subscription events",
    notes:
      "Used only for billing and subscription management. Dobly does not store raw card details directly.",
  },
  {
    name: "Resend",
    role: "Transactional email delivery",
    data: "Recipient email addresses, email metadata, and email content needed for delivery",
    notes:
      "Used for product email such as verification, onboarding, and operational notices.",
  },
  {
    name: "Anthropic",
    role: "AI planning and plain-English workflow generation",
    data: "Workflow prompts and product context needed to interpret or explain automations",
    notes:
      "Dobly should avoid sending raw provider secrets or unnecessary sensitive content to AI systems.",
  },
];

export default function SubprocessorsPage() {
  return (
    <div className="min-h-screen bg-surface py-24">
      <div className="container-main max-w-5xl">
        <Link href="/" className="btn-ghost mb-8 inline-flex">
          Back
        </Link>
        <div className="card">
          <div className="badge-muted mb-4">Trust</div>
          <h1 className="font-display text-4xl font-bold text-text">Subprocessors</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-muted">
            This page lists the core third-party processors Dobly uses to operate the service.
            Customer-configured integrations are not listed here as subprocessors because they are
            selected by the customer as workflow destinations or sources.
          </p>

          <div className="mt-10 overflow-hidden rounded-[1.5rem] border border-border">
            <div className="grid gap-px bg-border md:grid-cols-[1.2fr_1fr_1.2fr_1.6fr]">
              <div className="bg-surface-2 px-5 py-4 text-xs uppercase tracking-[0.22em] text-text-dim">
                Provider
              </div>
              <div className="bg-surface-2 px-5 py-4 text-xs uppercase tracking-[0.22em] text-text-dim">
                Role
              </div>
              <div className="bg-surface-2 px-5 py-4 text-xs uppercase tracking-[0.22em] text-text-dim">
                Data handled
              </div>
              <div className="bg-surface-2 px-5 py-4 text-xs uppercase tracking-[0.22em] text-text-dim">
                Notes
              </div>
              {processors.map((processor) => (
                <FragmentRow key={processor.name} {...processor} />
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-[1.25rem] border border-border bg-surface-2/60 p-5 text-sm leading-7 text-text-muted">
            If Dobly adds new production processors that materially affect customer data handling,
            this page should be updated before or at the same time the provider is enabled.
          </div>

          <div className="mt-10 border-t border-border pt-5 text-xs uppercase tracking-[0.22em] text-text-dim">
            Last updated: April 4, 2026
          </div>
        </div>
      </div>
    </div>
  );
}

function FragmentRow({
  name,
  role,
  data,
  notes,
}: {
  name: string;
  role: string;
  data: string;
  notes: string;
}) {
  return (
    <>
      <div className="bg-surface px-5 py-5 text-sm font-medium text-text">{name}</div>
      <div className="bg-surface px-5 py-5 text-sm text-text-muted">{role}</div>
      <div className="bg-surface px-5 py-5 text-sm text-text-muted">{data}</div>
      <div className="bg-surface px-5 py-5 text-sm text-text-muted">{notes}</div>
    </>
  );
}
