import type { BusinessChannelId } from "@/lib/business-channels";
import type { DoblyOutputTypeId, DoblyTrustLevelId, DoblyWorkTypeId } from "@/lib/dobly-product-model";
import type { OfficeDepartmentId } from "@/lib/office/types";

export type LaunchDepartmentId =
  | "reception"
  | "sales"
  | "marketing"
  | "creative"
  | "support"
  | "finance"
  | "engineering"
  | "operations"
  | "admin"
  | "projects"
  | "hr"
  | "growth"
  | "analytics"
  | "compliance";

export interface DepartmentBundle {
  id: LaunchDepartmentId;
  name: string;
  outcome: string;
  description: string;
  workTypeIds: DoblyWorkTypeId[];
  outputTypeIds: DoblyOutputTypeId[];
  starterStandards: string[];
  trustLevel: DoblyTrustLevelId;
  recommendedChannels: BusinessChannelId[];
  workerTemplateKeys: string[];
  activationPromise: string;
  orchestrationModes: string[];
  autonomyBoundary: string;
}

export const DEPARTMENT_BUNDLES: DepartmentBundle[] = [
  {
    id: "reception",
    name: "Reception",
    outcome: "Answer, qualify, book, and route every inbound customer moment.",
    description:
      "Reception combines phone, SMS, WhatsApp, website chat, calendar, and CRM so Dobly can handle the front door of the business.",
    workTypeIds: ["communicate", "coordinate", "monitor"],
    outputTypeIds: ["message", "task", "brief", "approval_request"],
    starterStandards: [
      "Every new inquiry gets a clear response within 5 minutes.",
      "Bookings should happen without dropping the customer into confusion.",
    ],
    trustLevel: "approval_required",
    recommendedChannels: ["business_phone", "business_sms", "whatsapp_business", "business_email", "website_chat", "calendar", "crm"],
    workerTemplateKeys: [
      "front_desk_bot",
      "website_reception_chatbot",
      "appointment_booking_worker",
      "missed_call_recovery_worker",
    ],
    activationPromise: "Dobly can answer inbound conversations, capture leads, book appointments, and escalate exceptions.",
    orchestrationModes: ["Omnichannel inbox coverage", "Auto-routing and booking", "Lead capture and memory logging"],
    autonomyBoundary: "Can act live on approved inbound workflows, but pauses on legal, refund, VIP, and trust-sensitive edge cases.",
  },
  {
    id: "sales",
    name: "Sales",
    outcome: "Qualify leads, follow up, and keep pipeline work moving.",
    description:
      "Sales turns captured demand into structured follow-up, CRM updates, callbacks, proposal reminders, and owner alerts.",
    workTypeIds: ["communicate", "coordinate", "monitor", "decide"],
    outputTypeIds: ["message", "task", "brief", "approval_request"],
    starterStandards: [
      "Every lead should get a meaningful follow-up before it cools.",
      "Sensitive offers and discounts must stop for approval.",
    ],
    trustLevel: "approval_required",
    recommendedChannels: ["business_phone", "business_sms", "whatsapp_business", "business_email", "calendar", "crm"],
    workerTemplateKeys: ["lead_qualification_agent", "sales_followup_worker", "proposal_reminder_worker"],
    activationPromise: "Dobly can qualify leads, follow up on time, update CRM records, and surface hot opportunities.",
    orchestrationModes: ["Pipeline chasing", "Multi-touch follow-up", "Proposal and callback orchestration"],
    autonomyBoundary: "Can run guarded outreach and CRM updates, but pauses on discounts, custom terms, and deal-structure changes.",
  },
  {
    id: "marketing",
    name: "Marketing / Content",
    outcome: "Plan, draft, repurpose, and route content through approval.",
    description:
      "Marketing packages content strategy, social drafts, newsletters, campaign planning, Canva handoff, and publishing approvals.",
    workTypeIds: ["research", "create", "monitor", "coordinate"],
    outputTypeIds: ["document", "presentation", "image_design", "video", "brief", "approval_request"],
    starterStandards: [
      "Every campaign should produce usable assets, not just ideas.",
      "Brand-risk claims and unapproved offers must pause for review.",
    ],
    trustLevel: "draft_propose",
    recommendedChannels: ["content_tools", "business_email", "crm"],
    workerTemplateKeys: ["campaign_planner_agent", "social_content_worker", "newsletter_worker", "social_publisher_automation"],
    activationPromise: "Dobly can turn offers and ideas into campaigns, posts, newsletters, and approval-ready content.",
    orchestrationModes: ["Content repurposing engine", "Campaign sequencing", "Scheduled publishing and performance sync"],
    autonomyBoundary: "Can generate and schedule approved content, but pauses on unapproved claims, offers, and brand-risk messaging.",
  },
  {
    id: "creative",
    name: "Creative & Design",
    outcome: "Create brand assets, slides, videos, design briefs, and campaign deliverables.",
    description:
      "Creative gives Dobly a production desk for designs, presentations, short videos, creative variants, brand kits, and asset handoff.",
    workTypeIds: ["research", "create", "coordinate", "build"],
    outputTypeIds: ["image_design", "presentation", "video", "document", "brief", "approval_request"],
    starterStandards: [
      "Creative work should produce usable deliverables, not vague ideas.",
      "Public-facing claims, pricing, brand changes, and final publishing require approval.",
    ],
    trustLevel: "draft_propose",
    recommendedChannels: ["content_tools", "business_email"],
    workerTemplateKeys: ["creative_director_agent", "design_asset_worker", "presentation_builder_worker", "video_campaign_worker"],
    activationPromise: "Dobly can turn campaign goals into designs, slides, videos, creative briefs, and approval-ready assets.",
    orchestrationModes: ["Design production", "Slide and deck creation", "Video and campaign asset packaging"],
    autonomyBoundary: "Can create and revise assets, but pauses before final publishing, brand-sensitive changes, and paid media launch.",
  },
  {
    id: "engineering",
    name: "Engineering & Product",
    outcome: "Track product work, convert feedback into tasks, prepare releases, and keep engineering context moving.",
    description:
      "Engineering gives Dobly a product and technical delivery desk for issue triage, release notes, QA checks, docs, research, and handoff.",
    workTypeIds: ["research", "build", "coordinate", "monitor"],
    outputTypeIds: ["task", "brief", "document", "code_context_package", "approval_request"],
    starterStandards: [
      "Customer feedback should turn into clear product context.",
      "Code-changing or production-impacting actions require explicit approval.",
    ],
    trustLevel: "approval_required",
    recommendedChannels: ["content_tools", "business_email"],
    workerTemplateKeys: ["product_triage_agent", "engineering_issue_worker", "qa_release_worker", "technical_docs_worker"],
    activationPromise: "Dobly can triage bugs, package product requests, prepare QA, draft docs, and coordinate release work.",
    orchestrationModes: ["Issue triage", "Release preparation", "Product feedback synthesis", "Technical documentation"],
    autonomyBoundary: "Can prepare and coordinate engineering work, but pauses before code changes, deployment, security, or production-impacting actions.",
  },
  {
    id: "support",
    name: "Support",
    outcome: "Answer FAQs, triage tickets, and recover unhappy customers.",
    description:
      "Support combines chat, WhatsApp, email, ticketing, CRM context, escalation, and customer recovery workflows.",
    workTypeIds: ["communicate", "coordinate", "monitor"],
    outputTypeIds: ["message", "task", "brief", "approval_request"],
    starterStandards: [
      "Routine questions should close fast with the right context.",
      "Complaints, refunds, and emotional escalations must pause for review.",
    ],
    trustLevel: "approval_required",
    recommendedChannels: ["whatsapp_business", "business_email", "website_chat", "crm"],
    workerTemplateKeys: ["support_faq_chatbot", "ticket_triage_worker", "customer_recovery_agent"],
    activationPromise: "Dobly can resolve common questions, create cases, detect complaints, and escalate sensitive issues.",
    orchestrationModes: ["24/7 triage", "Knowledge-backed replies", "Recovery escalation loops"],
    autonomyBoundary: "Can resolve routine cases and route the rest, but pauses on refunds, liability, and emotionally sensitive escalations.",
  },
  {
    id: "finance",
    name: "Finance",
    outcome: "Chase invoices, match payments, and brief cash risks.",
    description:
      "Finance handles invoice reminders, payment matching, overdue alerts, finance briefs, and approval-required money actions.",
    workTypeIds: ["monitor", "coordinate", "decide"],
    outputTypeIds: ["alert", "brief", "document", "presentation", "approval_request"],
    starterStandards: [
      "Cash risk should surface before it becomes a surprise.",
      "No money-impacting action should go out without approval.",
    ],
    trustLevel: "human_only",
    recommendedChannels: ["business_email", "business_sms", "whatsapp_business"],
    workerTemplateKeys: ["invoice_chaser_automation", "payment_reconciliation_automation", "receipt_matching_worker", "finance_briefing_agent"],
    activationPromise: "Dobly can prepare payment reminders, flag mismatches, summarize cash risk, and pause risky money actions.",
    orchestrationModes: ["Invoice monitoring", "Cash-risk briefing", "Payment signal reconciliation"],
    autonomyBoundary: "Finance is recommendation-only: Dobly can analyze, draft, and flag, but owner approval is required before any external money-impacting action.",
  },
  {
    id: "operations",
    name: "Operations",
    outcome: "Coordinate tasks, suppliers, orders, blockers, and handoffs.",
    description:
      "Operations keeps supplier follow-ups, project updates, fulfillment signals, internal reminders, and blockers moving.",
    workTypeIds: ["coordinate", "monitor", "research"],
    outputTypeIds: ["task", "alert", "brief", "approval_request"],
    starterStandards: [
      "Blocked work should surface before the day slips.",
      "Supplier or fulfillment drift should trigger immediate follow-through.",
    ],
    trustLevel: "safe_auto_run",
    recommendedChannels: ["business_email", "content_tools", "crm"],
    workerTemplateKeys: ["task_coordination_worker", "supplier_followup_worker", "operations_briefing_agent"],
    activationPromise: "Dobly can coordinate operational work, chase suppliers, track blockers, and brief the owner.",
    orchestrationModes: ["Task orchestration", "Supplier chasing", "Cross-team blocker clearing"],
    autonomyBoundary: "Can run internal coordination and approved follow-ups, but pauses on customer commitments, purchasing changes, and irreversible ops decisions.",
  },
  {
    id: "admin",
    name: "Admin",
    outcome: "Keep calendars, inbox admin, documents, and recurring office work moving without babysitting.",
    description:
      "Admin acts like an infinite executive assistant across scheduling, reminders, internal follow-up, records, and recurring back-office cleanup.",
    workTypeIds: ["communicate", "coordinate", "decide"],
    outputTypeIds: ["message", "task", "document", "presentation", "approval_request"],
    starterStandards: [
      "Routine admin should keep moving without becoming owner homework.",
      "Sensitive people or legal admin changes must pause for approval.",
    ],
    trustLevel: "safe_auto_run",
    recommendedChannels: ["business_email", "calendar"],
    workerTemplateKeys: ["calendar_command_worker", "admin_followthrough_worker", "document_filing_worker"],
    activationPromise: "Dobly can schedule, remind, organize, and keep repetitive admin work moving all day.",
    orchestrationModes: ["Calendar and reminder loops", "Document and record upkeep", "Recurring admin automation"],
    autonomyBoundary: "Can execute routine internal admin flows, but pauses on sensitive personnel, legal, or payment-adjacent changes.",
  },
  {
    id: "projects",
    name: "Projects",
    outcome: "Drive multi-step delivery, approvals, deadlines, and handoffs across complex work.",
    description:
      "Projects turns Dobly into a persistent project coordinator that watches dependencies, chases updates, packages deliverables, and keeps momentum alive even when the team is offline.",
    workTypeIds: ["coordinate", "build", "create", "decide"],
    outputTypeIds: ["task", "brief", "document", "presentation", "approval_request"],
    starterStandards: [
      "Every deliverable should move with the right context attached.",
      "Scope and commitment changes should pause for review.",
    ],
    trustLevel: "approval_required",
    recommendedChannels: ["business_email", "crm", "content_tools"],
    workerTemplateKeys: ["project_orchestrator_agent", "deliverable_packaging_worker", "approval_chase_worker"],
    activationPromise: "Dobly can coordinate deadlines, package deliverables, chase approvals, and keep delivery moving.",
    orchestrationModes: ["Dependency tracking", "Approval chasing", "Deliverable packaging and handoff"],
    autonomyBoundary: "Can move project coordination forward, but pauses on scope, pricing, and commitment changes.",
  },
  {
    id: "hr",
    name: "HR",
    outcome: "Coordinate onboarding, people reminders, policy checklists, and internal team requests.",
    description:
      "HR gives Dobly an always-on people-ops desk for onboarding flows, leave reminders, policy acknowledgments, and manager follow-through.",
    workTypeIds: ["coordinate", "monitor", "decide"],
    outputTypeIds: ["task", "document", "presentation", "brief", "approval_request"],
    starterStandards: [
      "Onboarding should happen consistently without dropped steps.",
      "Confidential people decisions remain human-only.",
    ],
    trustLevel: "approval_required",
    recommendedChannels: ["business_email", "calendar"],
    workerTemplateKeys: ["onboarding_sequence_worker", "people_ops_reminder_worker", "policy_acknowledgement_worker"],
    activationPromise: "Dobly can run onboarding, people reminders, and internal HR coordination with audit trails.",
    orchestrationModes: ["Onboarding sequences", "Leave and policy follow-through", "Manager reminder loops"],
    autonomyBoundary: "Can manage routine internal workflows, but pauses on payroll, disciplinary action, and confidential people decisions.",
  },
  {
    id: "growth",
    name: "Growth",
    outcome: "Run experiments, monitor opportunities, and surface new revenue moves continuously.",
    description:
      "Growth acts like a nonstop opportunity engine that researches, compares, scores, drafts experiments, and keeps a pipeline of expansion ideas alive.",
    workTypeIds: ["research", "monitor", "create", "decide"],
    outputTypeIds: ["brief", "document", "presentation", "image_design", "approval_request"],
    starterStandards: [
      "New opportunities should show up with evidence, not just noise.",
      "Spend, pricing, and partner commitments must pause for approval.",
    ],
    trustLevel: "draft_propose",
    recommendedChannels: ["crm", "content_tools", "business_email"],
    workerTemplateKeys: ["opportunity_radar_agent", "experiment_ops_worker", "partnership_scout_agent"],
    activationPromise: "Dobly can watch the market, draft growth experiments, and keep opportunity queues fresh.",
    orchestrationModes: ["Competitor and trend watching", "Experiment design", "Partnership and channel scouting"],
    autonomyBoundary: "Can research and prepare growth actions, but pauses before major spend, pricing, or partnership commitments.",
  },
  {
    id: "analytics",
    name: "Analytics",
    outcome: "Watch the business, explain what changed, and surface anomalies before humans notice.",
    description:
      "Analytics turns Dobly into an always-on analyst that scans signals, explains movements, builds briefings, and flags what needs attention.",
    workTypeIds: ["monitor", "research", "decide"],
    outputTypeIds: ["alert", "brief", "spreadsheet_report", "document", "presentation"],
    starterStandards: [
      "Leaders should get the signal, not the noise.",
      "Anomalies should come with an explanation and next step.",
    ],
    trustLevel: "informational",
    recommendedChannels: ["crm", "content_tools"],
    workerTemplateKeys: ["signal_watch_analyst", "briefing_generator_worker", "anomaly_explainer_agent"],
    activationPromise: "Dobly can monitor signals, generate briefs, and point leadership to the next decision-worthy pattern.",
    orchestrationModes: ["Signal monitoring", "Anomaly explanation", "Executive-ready reporting"],
    autonomyBoundary: "Can monitor and explain automatically, but pauses before making strategic or financial decisions on its own.",
  },
  {
    id: "compliance",
    name: "Compliance",
    outcome: "Watch consent, privacy, policies, and audit readiness across the office.",
    description:
      "Compliance gives Dobly a policy watchdog that tracks risky actions, monitors exceptions, and keeps approval trails readable.",
    workTypeIds: ["monitor", "coordinate", "decide"],
    outputTypeIds: ["alert", "brief", "document", "presentation", "approval_request"],
    starterStandards: [
      "Risky exceptions should surface before they become incidents.",
      "Audit trails should stay readable and complete.",
    ],
    trustLevel: "informational",
    recommendedChannels: ["business_email", "crm"],
    workerTemplateKeys: ["policy_guard_worker", "consent_audit_worker", "risk_escalation_agent"],
    activationPromise: "Dobly can monitor policy drift, track consent, and escalate high-risk exceptions early.",
    orchestrationModes: ["Audit monitoring", "Consent tracking", "Policy exception escalation"],
    autonomyBoundary: "Can observe, log, and escalate automatically, but pauses on legal interpretation or binding policy decisions.",
  },
];

export function getDepartmentBundle(id: LaunchDepartmentId) {
  return DEPARTMENT_BUNDLES.find((bundle) => bundle.id === id) ?? null;
}

export function asOfficeDepartmentId(id: LaunchDepartmentId): OfficeDepartmentId {
  return id as OfficeDepartmentId;
}
