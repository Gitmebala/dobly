import Link from "next/link";

const sections = [
  {
    title: "Using Dobly",
    body: "Dobly is an automation platform for work and life. You may use it to create, review, activate, and run automations for lawful purposes only. You remain responsible for your prompts, connected accounts, uploaded content, configured destinations, and the decisions you make about what Dobly is allowed to run.",
  },
  {
    title: "Accounts and billing",
    body: "You are responsible for keeping your account information accurate and your login credentials secure. Paid plans renew according to the billing cadence you choose unless cancelled. Taxes, local fees, and processor charges may apply depending on your location. Free and paid plans may include workflow, run, connection, or intelligence limits. You should be able to cancel recurring billing through the product or by contacting support if self-service billing is unavailable.",
  },
  {
    title: "Acceptable use",
    body: "You may not use Dobly to break the law, violate third-party terms, send spam, misuse payment systems, attempt unauthorized access, process data you do not have rights to use, or automate harmful, deceptive, abusive, or unsafe behavior. Dobly may suspend or terminate accounts that create operational, billing, trust, or security risk.",
  },
  {
    title: "Third-party services",
    body: "Dobly depends on outside providers such as email, messaging, payment, authentication, and app integrations. Those services may change, fail, rate-limit requests, or revoke access independently of Dobly. We will do our best to make failures understandable, but we cannot guarantee uninterrupted availability of third-party systems.",
  },
  {
    title: "Service changes and availability",
    body: "Dobly may improve, modify, replace, or remove product features over time. We aim to keep the service reliable, but Dobly is provided on an as-available basis and may occasionally be unavailable because of maintenance, incidents, provider outages, or security controls.",
  },
  {
    title: "Data, suspension, and termination",
    body: "You may stop using Dobly at any time. We may suspend or terminate access when necessary to protect the platform, our customers, or third parties. Some records such as billing history, security logs, and operational events may be retained where reasonably necessary for compliance, fraud prevention, or service integrity.",
  },
  {
    title: "Liability and responsibility",
    body: "Dobly is meant to reduce repetitive work, but you remain responsible for reviewing high-impact automations, sensitive actions, and regulated use cases. To the maximum extent allowed by law, Dobly is not liable for indirect, incidental, special, or consequential losses arising from your use of the product or from third-party platform failures.",
  },
  {
    title: "Support and notices",
    body: "Operational notices, billing notices, and security notices may be sent to the email address tied to your account. If you need help with billing, privacy, or product issues, use the support channels published by Dobly. Material changes to these terms may be published in-product or on the site before they take effect where required.",
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface py-24">
      <div className="container-main max-w-4xl">
        <Link href="/auth/signup" className="btn-ghost mb-8 inline-flex">
          Back
        </Link>
        <div className="card">
          <div className="badge-muted mb-4">Legal</div>
          <h1 className="font-display text-4xl font-bold text-text">Terms of Service</h1>
          <p className="mt-4 text-base leading-7 text-text-muted">
            These terms explain the main rules for using Dobly. They are written in plain
            language so the product remains understandable, but they still govern your use of
            the service.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/privacy" className="btn-ghost">
              Privacy
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
