import Link from "next/link";

const sections = [
  {
    title: "How Dobly approaches security",
    body: "Dobly is designed around authenticated access, encrypted transport, protected internal routes, secret isolation, rate limiting on critical writes, workflow validation, and provider-specific verification where supported. Security work is ongoing and treated as part of the product, not an afterthought.",
  },
  {
    title: "Reporting a vulnerability",
    body: "If you believe you have found a security issue in Dobly, please report it privately before sharing details publicly. Include the affected route or feature, the steps required to reproduce the issue, any impact you observed, and whether customer data or account access may be involved.",
  },
  {
    title: "What to expect from us",
    body: "Dobly will review good-faith reports, reproduce issues where possible, fix confirmed vulnerabilities based on severity and risk, and communicate responsibly with affected customers if an incident materially impacts security, privacy, or availability.",
  },
  {
    title: "Data protection operations",
    body: "Dobly separates sensitive provider credentials from ordinary workflow content where possible, restricts internal service routes with shared secrets, and expects production environments to use least-privilege access, MFA, backup coverage, and incident-response ownership.",
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-surface py-24">
      <div className="container-main max-w-4xl">
        <Link href="/" className="btn-ghost mb-8 inline-flex">
          Back
        </Link>
        <div className="card">
          <div className="badge-muted mb-4">Trust</div>
          <h1 className="font-display text-4xl font-bold text-text">Security</h1>
          <p className="mt-4 text-base leading-7 text-text-muted">
            This page explains how Dobly thinks about security, how to report a vulnerability,
            and what customers should expect if a material security issue is found.
          </p>

          <div className="mt-10 grid gap-6 rounded-[1.5rem] border border-border bg-surface-2/60 p-6 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-text-dim">Security contact</div>
              <a
                href="mailto:security@dobly.io"
                className="mt-3 block font-display text-2xl text-text transition-colors hover:text-accent"
              >
                security@dobly.io
              </a>
              <p className="mt-3 text-sm leading-7 text-text-muted">
                If you do not yet have this mailbox configured in production, route it before launch
                or forward security reports from your primary support address immediately.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-text-dim">Related trust docs</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/privacy" className="btn-ghost">
                  Privacy
                </Link>
                <Link href="/subprocessors" className="btn-ghost">
                  Subprocessors
                </Link>
                <Link href="/terms" className="btn-ghost">
                  Terms
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-display text-2xl font-semibold text-text">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-text-muted">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 border-t border-border pt-5 text-xs uppercase tracking-[0.22em] text-text-dim">
            Last updated: April 4, 2026
          </div>
        </div>
      </div>
    </div>
  );
}
