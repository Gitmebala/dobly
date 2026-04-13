import Link from "next/link";

const sections = [
  {
    title: "Essential cookies",
    body: "Dobly uses essential cookies to keep you signed in, protect secure sessions, route authenticated requests correctly, and preserve login and connection state.",
  },
  {
    title: "Operational preferences",
    body: "Dobly may store limited browser preferences such as dismissed notices, setup progress, or interface state so the product behaves consistently while you work.",
  },
  {
    title: "Analytics and diagnostics",
    body: "Dobly may use operational diagnostics and service telemetry to keep the product reliable and secure. If broader analytics or marketing cookies are enabled later, Dobly should disclose them clearly, explain their purpose, and update this notice before relying on them in production.",
  },
  {
    title: "Your choices",
    body: "You can clear cookies in your browser at any time, but doing so may sign you out and interrupt active connection, approval, or onboarding flows that rely on a secure session.",
  },
];

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-surface py-24">
      <div className="container-main max-w-4xl">
        <Link href="/auth/signup" className="btn-ghost mb-8 inline-flex">
          Back
        </Link>
        <div className="card">
          <div className="badge-muted mb-4">Legal</div>
          <h1 className="font-display text-4xl font-bold text-text">Cookie Notice</h1>
          <p className="mt-4 text-base leading-7 text-text-muted">
            This notice explains how Dobly uses cookies and similar browser storage technologies
            to keep the product secure, reliable, and usable.
          </p>

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
