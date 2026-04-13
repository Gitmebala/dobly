import Link from "next/link";

const sections = [
  {
    title: "What we collect",
    body: "Dobly collects account information, profile details, workflow definitions, run history, approval events, billing records, support messages, connection metadata, and other operational data needed to provide the product. Connected service credentials are stored separately and protected as sensitive secrets.",
  },
  {
    title: "How we use it",
    body: "Dobly uses your data to authenticate users, generate and run automations, maintain workflow history, operate billing, detect abuse, support customer service, and improve product reliability, safety, and usability.",
  },
  {
    title: "Legal bases and sharing",
    body: "Dobly processes data to provide the service you request, operate connected accounts, meet legal obligations, prevent fraud and abuse, and protect the product. We may share data with core subprocessors such as infrastructure, email, payment, logging, or integration providers when necessary to operate the platform.",
  },
  {
    title: "How it is protected",
    body: "Dobly uses authenticated access controls, encrypted transport, rate limiting, secret isolation, and provider-specific security checks where available. No system is perfect, but Dobly is designed to minimize exposure of sensitive credentials and operational data.",
  },
  {
    title: "Retention",
    body: "Dobly keeps data for as long as it is reasonably needed to provide the service, meet security and billing obligations, investigate incidents, or comply with law. Some records may remain for audit, fraud prevention, or backup recovery even after account closure.",
  },
  {
    title: "Your control",
    body: "You can update your profile, remove connections, manage billing, and request account deletion through support. Depending on your location, you may also have rights to access, correct, export, or delete certain personal data subject to legal and operational limits.",
  },
  {
    title: "Subprocessors and transfers",
    body: "Dobly relies on a small set of core subprocessors for hosting, billing, email, and AI planning. Those providers may process data in different regions depending on the service involved. Dobly aims to keep that list current and to avoid sending unnecessary sensitive data to providers that do not need it.",
  },
  {
    title: "Questions and requests",
    body: "If you need help with privacy, security, or a data request, contact Dobly through the support or security channels listed on the site. Business customers that need a data processing addendum should request it before moving regulated or sensitive workloads into production.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface py-24">
      <div className="container-main max-w-4xl">
        <Link href="/auth/signup" className="btn-ghost mb-8 inline-flex">
          Back
        </Link>
        <div className="card">
          <div className="badge-muted mb-4">Legal</div>
          <h1 className="font-display text-4xl font-bold text-text">Privacy Policy</h1>
          <p className="mt-4 text-base leading-7 text-text-muted">
            This page explains the main categories of information Dobly stores, how that
            information is used, and the controls customers have over their data.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/subprocessors" className="btn-ghost">
              View subprocessors
            </Link>
            <Link href="/security" className="btn-ghost">
              Security
            </Link>
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
