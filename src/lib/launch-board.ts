export type LaunchBoardStatus = "done" | "working" | "blocked" | "external";

export interface LaunchBoardItem {
  id: string;
  title: string;
  status: LaunchBoardStatus;
  owner: string;
  notes: string;
}

export interface LaunchBoardSection {
  id: string;
  title: string;
  description: string;
  items: LaunchBoardItem[];
}

export const launchBoardSections: LaunchBoardSection[] = [
  {
    id: "platform",
    title: "Platform And Launch Ops",
    description:
      "These items decide whether Dobly can be deployed safely and whether launch-day issues will be visible fast enough to fix.",
    items: [
      {
        id: "prod-env",
        title: "Production env vars completed and validated",
        status: "working",
        owner: "Engineering",
        notes:
          "The validator and env template exist. Live values still need to be added in the deploy environment and verified with npm run validate:env.",
      },
      {
        id: "build-smoke",
        title: "Typecheck, build, and smoke tests pass in the deploy environment",
        status: "working",
        owner: "Engineering",
        notes:
          "Final pass still depends on the real deployment target, real env vars, and provider callbacks.",
      },
      {
        id: "domain",
        title: "Production domain, DNS, TLS, redirects, and callback URLs verified",
        status: "working",
        owner: "Ops",
        notes:
          "Dobly needs one clean production URL, matching OAuth callbacks, and confirmed billing and legal links before public launch.",
      },
      {
        id: "monitoring",
        title: "Error monitoring, alert ownership, and on-call contact defined",
        status: "working",
        owner: "Ops",
        notes:
          "Internal status checks exist, but a launch-ready monitoring owner and escalation path still need to be finalized.",
      },
    ],
  },
  {
    id: "commercial",
    title: "Commercial And Company Ops",
    description:
      "A working SaaS also needs a real company wrapper around the code: billing clarity, records, and a clean path to collect revenue.",
    items: [
      {
        id: "entity",
        title: "Company formation, banking, tax IDs, and bookkeeping stack in place",
        status: "external",
        owner: "Founder",
        notes:
          "This is outside the repo. Before taking recurring revenue at scale, Dobly needs the right legal entity, bank account, bookkeeping process, and tax calendar.",
      },
      {
        id: "paystack-live",
        title: "Paystack live keys, checkout, plan codes, and webhook events verified",
        status: "working",
        owner: "Engineering",
        notes:
          "The Kenya-first code path exists. Dobly still needs live Paystack setup, event delivery verification, and a full upgrade-downgrade-cancel support test. Stripe remains optional for supported-country entities.",
      },
      {
        id: "billing-policy",
        title: "Cancellation, renewal, refund, and billing-support expectations are clearly documented",
        status: "working",
        owner: "Founder",
        notes:
          "Terms cover renewals at a high level. Dobly still needs a sharper subscription operations policy for customer trust and support consistency.",
      },
      {
        id: "support",
        title: "Customer support inbox and escalation ownership confirmed",
        status: "working",
        owner: "Ops",
        notes:
          "Public contact links exist. Dobly still needs a real operating rule for response time, incident escalation, and account or data requests.",
      },
    ],
  },
  {
    id: "legal",
    title: "Legal, Privacy, And Trust",
    description:
      "These surfaces shape trust before a customer reads a feature list. They also reduce launch-day ambiguity around data handling and complaints.",
    items: [
      {
        id: "legal-pages",
        title: "Terms, privacy, and cookie pages are live",
        status: "done",
        owner: "Legal",
        notes: "Core legal pages exist in the app and are linked from signup and the footer.",
      },
      {
        id: "security-page",
        title: "Public security page and vulnerability disclosure path are live",
        status: "done",
        owner: "Engineering",
        notes:
          "Dobly now has a public security surface and a published security.txt path for responsible disclosure.",
      },
      {
        id: "subprocessors",
        title: "Subprocessors and core data-handling dependencies are published",
        status: "done",
        owner: "Legal",
        notes:
          "Dobly now exposes a subprocessor list so customers can see which providers handle core operational data.",
      },
      {
        id: "dpa-rights",
        title: "DPA workflow and data-access or deletion request process are defined",
        status: "working",
        owner: "Founder",
        notes:
          "Privacy language exists, but a repeatable DPA and request-handling process still needs to be documented operationally.",
      },
    ],
  },
  {
    id: "security",
    title: "Security And Resilience",
    description:
      "This is the layer that keeps a SaaS from becoming fragile once real customers and real secrets arrive.",
    items: [
      {
        id: "mfa",
        title: "MFA and least-privilege access are enforced for admin accounts",
        status: "external",
        owner: "Founder",
        notes:
          "This must be completed in Supabase, Stripe, email, DNS, hosting, and any staff-facing provider dashboards.",
      },
      {
        id: "backup-restore",
        title: "Backup and restore process is documented and tested",
        status: "working",
        owner: "Ops",
        notes:
          "Database backups depend on the production Supabase setup. Dobly still needs a restore drill and a short written recovery procedure.",
      },
      {
        id: "incident",
        title: "Incident response and customer communication playbook exist",
        status: "working",
        owner: "Ops",
        notes:
          "Legal pages mention security and incidents. Dobly still needs a practical step-by-step runbook for outages, breaches, and provider failures.",
      },
      {
        id: "securitytxt",
        title: "security.txt is published under .well-known",
        status: "done",
        owner: "Engineering",
        notes:
          "The disclosure file is part of the public surface so researchers have a standard place to report issues.",
      },
    ],
  },
  {
    id: "product",
    title: "Product QA And Provider Verification",
    description:
      "The last mile is less about more code and more about proving the paths customers will actually use.",
    items: [
      {
        id: "route-qa",
        title: "Route-by-route manual QA completed across landing, auth, billing, settings, and workflows",
        status: "working",
        owner: "Engineering",
        notes:
          "The product is much cleaner now, but a full human QA sweep still needs to be recorded against the live deployment.",
      },
      {
        id: "accessibility",
        title: "Accessibility pass completed for keyboard flow, focus, contrast, and reduced motion",
        status: "working",
        owner: "Engineering",
        notes:
          "Dobly needs a deliberate WCAG-focused pass before launch instead of assuming the UI is accessible by default.",
      },
      {
        id: "mobile-qa",
        title: "Mobile and tablet responsive QA completed on critical pages",
        status: "working",
        owner: "Engineering",
        notes:
          "Landing, auth, pricing, workflow generation, and settings should all be tested on real phone widths before launch.",
      },
      {
        id: "providers",
        title: "Live provider verification completed for Stripe, OAuth providers, WhatsApp, and M-PESA",
        status: "working",
        owner: "Engineering",
        notes:
          "Code paths are in place. The remaining work is real credentials, real callbacks, and real delivery verification.",
      },
    ],
  },
];

export function getLaunchBoardSummary(sections: LaunchBoardSection[]) {
  const items = sections.flatMap((section) => section.items);
  return {
    total: items.length,
    done: items.filter((item) => item.status === "done").length,
    working: items.filter((item) => item.status === "working").length,
    blocked: items.filter((item) => item.status === "blocked").length,
    external: items.filter((item) => item.status === "external").length,
  };
}
