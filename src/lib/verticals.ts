import type { DoblyWorkTalentId } from "@/lib/dobly-operating-model";

export type DoblyVerticalId =
  | "lead-intake-follow-up"
  | "client-onboarding"
  | "support-triage"
  | "ai-receptionist"
  | "invoice-payment-follow-up"
  | "weekly-business-reporting"
  | "freelancer-project-coordination"
  | "inbox-calendar-assistant"
  | "social-growth-automation"
  | "ecommerce-operations"
  | "recruiting-hiring-ops"
  | "research-monitoring";

export type DoblyVerticalAudience = "business" | "personal" | "both";
export type DoblyVerticalFamily =
  | "customer-flow"
  | "business-ops"
  | "workday-assistant"
  | "creator-growth"
  | "research-intelligence";

export interface DoblyVerticalQuestion {
  id: string;
  label: string;
  help: string;
  placeholder: string;
}

export interface DoblyVerticalDefinition {
  id: DoblyVerticalId;
  title: string;
  tagline: string;
  audience: DoblyVerticalAudience;
  family: DoblyVerticalFamily;
  purpose: string;
  templates: string[];
  recommendedConnections: string[];
  toolkit: string[];
  workflowLogic: string[];
  memoryFields: string[];
  approvalRules: string[];
  outputs: string[];
  talents: DoblyWorkTalentId[];
  responsibilities: string[];
  watchAreas: string[];
  doblyHandled: string[];
  optionalAccess: string[];
  onboardingQuestions: DoblyVerticalQuestion[];
}

export const DOBLY_DEEP_VERTICALS: DoblyVerticalDefinition[] = [
  {
    id: "lead-intake-follow-up",
    title: "Lead Intake And Follow-Up",
    tagline: "Capture, qualify, route, and follow up without losing momentum.",
    audience: "business",
    family: "customer-flow",
    purpose: "Turn new demand into qualified opportunities and consistent follow-up.",
    templates: ["service-lead-qualification", "sales-lead-research-agent", "sales-follow-up-agent"],
    recommendedConnections: ["Google Workspace", "WhatsApp", "HubSpot", "Salesforce", "Calendly", "Notion"],
    toolkit: ["Lead intake", "Qualification logic", "CRM updates", "Follow-up drafting", "Meeting booking"],
    workflowLogic: ["Dedupe repeat leads", "Score lead quality", "Escalate high-value leads", "Chase no-reply leads"],
    memoryFields: ["lead_stage", "last_contact_at", "lead_source", "fit_score", "meeting_status"],
    approvalRules: ["Ask before bulk outreach", "Ask before discounts or custom commitments", "Auto-handle low-risk follow-up"],
    outputs: ["Hot lead alerts", "Daily lead digest", "Qualified shortlist", "Stalled lead report"],
    talents: ["intake", "qualification", "coordination", "communication", "recordkeeping", "execution"],
    responsibilities: ["Own inbound demand from the first request through a clear next step."],
    watchAreas: ["New leads", "Lead quality", "No-reply leads", "Hot opportunities"],
    doblyHandled: ["Qualification logic", "Follow-up sequencing", "Digest generation"],
    optionalAccess: ["A CRM can be added later for cleaner pipeline sync."],
    onboardingQuestions: [
      {
        id: "lead_source",
        label: "Where do your leads come from?",
        help: "Mention forms, WhatsApp, phone intake, chat, DM, or inbox sources.",
        placeholder: "Website form, Instagram DMs, and a sales inbox.",
      },
      {
        id: "lead_qualification",
        label: "What counts as a qualified lead?",
        help: "Define fit, urgency, value, location, or service criteria.",
        placeholder: "Qualified if budget is above $500 and they want setup this month.",
      },
    ],
  },
  {
    id: "client-onboarding",
    title: "Client Onboarding",
    tagline: "Collect everything needed, chase blockers, and keep kickoff moving.",
    audience: "business",
    family: "customer-flow",
    purpose: "Turn signed clients into ready-to-start projects without manual chasing.",
    templates: ["service-client-onboarding", "client-onboarding-agent"],
    recommendedConnections: ["Google Workspace", "Notion", "ClickUp", "Trello", "Asana", "Dropbox", "DocuSign"],
    toolkit: ["Welcome sequence", "Document collection", "Task creation", "Status tracking", "Reminder automation"],
    workflowLogic: ["Track checklist completion", "Remind on missing items", "Escalate blocked onboarding", "Notify when ready"],
    memoryFields: ["client_stage", "missing_items", "kickoff_date", "owner", "last_reminder_at"],
    approvalRules: ["Ask before promising delivery dates", "Auto-send checklist reminders", "Escalate blocked accounts after threshold"],
    outputs: ["Onboarding status summary", "Blocked client list", "Ready-for-kickoff report"],
    talents: ["intake", "coordination", "recordkeeping", "verification", "recovery", "reporting"],
    responsibilities: ["Move new clients from signed to ready-to-start without manual chasing."],
    watchAreas: ["Missing documents", "Stalled onboarding", "Kickoff readiness"],
    doblyHandled: ["Checklist tracking", "Reminder timing", "Status summaries"],
    optionalAccess: ["Task tools and doc storage can be added later for deeper tracking."],
    onboardingQuestions: [
      {
        id: "required_assets",
        label: "What must every client submit before kickoff?",
        help: "List documents, forms, approvals, or assets Dobly should track.",
        placeholder: "Signed contract, brand assets, intake form, and access credentials.",
      },
      {
        id: "onboarding_owner",
        label: "Who should Dobly notify when onboarding stalls or completes?",
        help: "Give a person, team, or destination channel.",
        placeholder: "Notify operations in Slack and email me when onboarding is ready.",
      },
    ],
  },
  {
    id: "support-triage",
    title: "Support Triage",
    tagline: "Sort urgency, draft replies, and escalate risky issues fast.",
    audience: "business",
    family: "customer-flow",
    purpose: "Keep the support queue moving while protecting high-risk conversations.",
    templates: ["service-support-triage", "support-triage-agent"],
    recommendedConnections: ["Google Workspace", "Outlook", "WhatsApp", "Zendesk", "Intercom", "Slack"],
    toolkit: ["Inbox monitoring", "Urgency classification", "Reply drafting", "Escalation routing", "Knowledge lookup"],
    workflowLogic: ["Detect refunds and billing risk", "Tag sentiment and urgency", "Avoid duplicate replies", "Escalate VIP issues"],
    memoryFields: ["customer_priority", "issue_status", "last_reply_at", "escalation_state", "faq_match"],
    approvalRules: ["Ask before refunds or compensation", "Ask before legal or sensitive sends", "Auto-draft common low-risk responses"],
    outputs: ["Queue summary", "Escalation inbox", "Recurring issue digest", "Reply drafts"],
    talents: ["intake", "qualification", "communication", "coordination", "reporting", "execution"],
    responsibilities: ["Keep the support queue moving while protecting risky conversations."],
    watchAreas: ["Urgency", "Sentiment", "Refund or legal triggers", "VIP issues"],
    doblyHandled: ["Triage", "Drafting", "Issue digests"],
    optionalAccess: ["Helpdesk access can be added later if email is enough to start."],
    onboardingQuestions: [
      {
        id: "support_channels",
        label: "Which support channels should Dobly watch?",
        help: "Mention inboxes, WhatsApp numbers, helpdesks, or chat tools.",
        placeholder: "Support Gmail inbox and WhatsApp business line.",
      },
      {
        id: "support_escalations",
        label: "Which issues always need a human?",
        help: "Define refund, billing, angry customer, legal, or VIP cases.",
        placeholder: "Refunds, billing disputes, abusive messages, and enterprise customers.",
      },
    ],
  },
  {
    id: "ai-receptionist",
    title: "AI Receptionist / Inquiry Handling",
    tagline: "Handle inbound inquiries, qualify them, and route or book correctly.",
    audience: "business",
    family: "customer-flow",
    purpose: "Give service businesses a consistent front desk across chat, voice, or messaging.",
    templates: ["service-appointment-ops", "ai-receptionist-agent"],
    recommendedConnections: ["WhatsApp", "Twilio", "Google Calendar", "Calendly", "HubSpot", "Google Workspace"],
    toolkit: ["Inquiry intake", "Qualification questions", "Booking coordination", "Routing rules", "Business knowledge"],
    workflowLogic: ["Intent detection", "Hours-aware responses", "Availability checks", "Escalate urgent inquiries"],
    memoryFields: ["service_interest", "booking_status", "location", "urgency_level", "preferred_time"],
    approvalRules: ["Ask before exceptions outside policy", "Escalate unclear or urgent inquiries", "Auto-book only within approved rules"],
    outputs: ["Inquiry summary", "Booked appointment", "Missed inquiry alert", "Escalation note"],
    talents: ["intake", "qualification", "coordination", "communication", "verification", "execution"],
    responsibilities: ["Handle the first touch for inbound inquiries and route or book correctly."],
    watchAreas: ["Business hours", "Availability", "Urgent callers or chats", "Booking completion"],
    doblyHandled: ["Qualification questions", "Handoff summaries", "Follow-up prompts"],
    optionalAccess: ["Voice and messaging channels can be layered in after the core booking flow works."],
    onboardingQuestions: [
      {
        id: "service_catalog",
        label: "What services or appointment types should Dobly handle?",
        help: "List the main service types and what the receptionist should collect.",
        placeholder: "Consultation, installation booking, and support callback requests.",
      },
      {
        id: "booking_rules",
        label: "When can Dobly book automatically, and when should it escalate?",
        help: "Define business hours, buffers, approval cases, or no-book situations.",
        placeholder: "Book during business hours only and escalate same-day urgent requests.",
      },
    ],
  },
  {
    id: "invoice-payment-follow-up",
    title: "Invoice And Payment Follow-Up",
    tagline: "Stay on top of unpaid invoices and failed payments without awkward chasing.",
    audience: "business",
    family: "business-ops",
    purpose: "Recover revenue and surface risky overdue accounts quickly.",
    templates: ["service-invoice-reminders", "finance-follow-up-agent"],
    recommendedConnections: ["Stripe", "QuickBooks", "Xero", "Google Workspace", "WhatsApp"],
    toolkit: ["Invoice monitoring", "Reminder cadence", "Payment status sync", "Escalation triggers", "Collection summary"],
    workflowLogic: ["Stop reminders when paid", "Escalate overdue high-value accounts", "Retry failed delivery", "Track aging buckets"],
    memoryFields: ["invoice_age_bucket", "last_reminder_at", "payment_status", "risk_level", "owner_follow_up"],
    approvalRules: ["Ask before final notices", "Escalate high-value overdue clients", "Auto-send polite reminder stages"],
    outputs: ["Overdue summary", "Recovered payment report", "High-risk account alert"],
    talents: ["oversight", "verification", "communication", "recovery", "reconciliation", "reporting"],
    responsibilities: ["Keep receivables moving without awkward manual chasing."],
    watchAreas: ["Overdue invoices", "Failed payments", "VIP accounts", "Reminder effectiveness"],
    doblyHandled: ["Reminder cadence", "Escalation timing", "Recovery summaries"],
    optionalAccess: ["Accounting tools can be added later if Stripe is enough to launch."],
    onboardingQuestions: [
      {
        id: "invoice_schedule",
        label: "How often should Dobly remind overdue clients?",
        help: "Describe the reminder cadence and escalation timing.",
        placeholder: "Send at 3, 7, and 14 days overdue, then alert me.",
      },
      {
        id: "invoice_risk",
        label: "What invoices should Dobly escalate instead of handling automatically?",
        help: "Use amount, client type, age, or special account rules.",
        placeholder: "Escalate any invoice above $2,000 or any VIP account after 7 days overdue.",
      },
    ],
  },
  {
    id: "weekly-business-reporting",
    title: "Weekly Business Reporting",
    tagline: "Pull the business into one clear brief every week.",
    audience: "business",
    family: "business-ops",
    purpose: "Give owners and operators a concise operating picture instead of scattered updates.",
    templates: ["service-weekly-owner-brief", "weekly-business-briefing-agent"],
    recommendedConnections: ["Google Sheets", "Stripe", "HubSpot", "Slack", "Notion"],
    toolkit: ["Metric collection", "Trend comparison", "Risk detection", "Owner-ready summarization"],
    workflowLogic: ["Compare week over week", "Highlight anomalies", "Aggregate multiple systems", "Filter to material changes"],
    memoryFields: ["tracked_kpis", "last_report_date", "baseline_metrics", "recipient_list", "report_style"],
    approvalRules: ["Usually no approval required", "Ask before external distribution if needed"],
    outputs: ["Owner briefing", "Team summary", "KPI snapshot", "Risk and blocker digest"],
    talents: ["research", "reconciliation", "oversight", "reporting", "packaging"],
    responsibilities: ["Pull the business into one clear operating picture every week."],
    watchAreas: ["KPIs", "Risks", "Changes worth attention", "Week-over-week movement"],
    doblyHandled: ["Brief assembly", "Anomaly highlighting", "Recipient-ready summaries"],
    optionalAccess: ["More systems can be added later as the weekly brief matures."],
    onboardingQuestions: [
      {
        id: "report_metrics",
        label: "Which metrics and signals matter most each week?",
        help: "List revenue, leads, support, operations, or business-specific measures.",
        placeholder: "Revenue, new leads, booked work, overdue invoices, and open support issues.",
      },
      {
        id: "report_recipients",
        label: "Who should receive the weekly brief, and in what format?",
        help: "Choose email, Slack, PDF, or concise in-app summary style.",
        placeholder: "Email me and post a shorter summary in Slack every Monday morning.",
      },
    ],
  },
  {
    id: "freelancer-project-coordination",
    title: "Freelancer Project Coordination",
    tagline: "Keep client work moving, gather feedback, and reduce admin drag.",
    audience: "both",
    family: "business-ops",
    purpose: "Help freelancers and small operators manage open projects without losing track of status or follow-up.",
    templates: ["founder-chief-of-staff", "client-onboarding-agent", "freelancer-project-coordinator"],
    recommendedConnections: ["Google Workspace", "Notion", "ClickUp", "Trello", "Dropbox", "Calendly"],
    toolkit: ["Project tracking", "Client follow-up", "Revision management", "Asset collection", "Weekly updates"],
    workflowLogic: ["Track blocked projects", "Chase missing feedback", "Manage revision rounds", "Surface deadlines"],
    memoryFields: ["project_stage", "pending_feedback", "next_deadline", "client_priority", "last_update_at"],
    approvalRules: ["Ask before sensitive client-facing sends", "Auto-send low-risk reminders and updates"],
    outputs: ["Weekly client update", "Blocked project list", "Today priorities", "Deadline watchlist"],
    talents: ["coordination", "communication", "planning", "recordkeeping", "recovery", "reporting"],
    responsibilities: ["Keep client work moving with less admin drag."],
    watchAreas: ["Blocked projects", "Missing assets", "Revision loops", "Upcoming deadlines"],
    doblyHandled: ["Reminder timing", "Project summaries", "Priority digests"],
    optionalAccess: ["Project tools can be added later if inbox and calendar are enough to start."],
    onboardingQuestions: [
      {
        id: "project_stages",
        label: "What stages do your projects move through?",
        help: "Define the workflow so Dobly can track progress properly.",
        placeholder: "Discovery, draft, review, revisions, final delivery, invoice sent.",
      },
      {
        id: "client_update_style",
        label: "How should Dobly handle client check-ins and reminders?",
        help: "Describe timing, tone, and what should be automated versus drafted.",
        placeholder: "Send gentle reminders automatically, but draft weekly updates for me to review first.",
      },
    ],
  },
  {
    id: "inbox-calendar-assistant",
    title: "Inbox And Calendar Assistant",
    tagline: "Surface what matters from your day without drowning you in noise.",
    audience: "both",
    family: "workday-assistant",
    purpose: "Give people and operators a reliable daily brief plus follow-up support.",
    templates: ["personal-assistant", "inbox-calendar-manager"],
    recommendedConnections: ["Gmail", "Outlook", "Google Calendar", "Microsoft 365", "Notion"],
    toolkit: ["Inbox prioritization", "Meeting prep", "Follow-up detection", "Daily briefing", "Schedule review"],
    workflowLogic: ["Rank urgency", "Detect unanswered threads", "Flag conflicts", "Create concise morning brief"],
    memoryFields: ["vip_contacts", "follow_up_rules", "workday_start", "meeting_preferences", "urgent_keywords"],
    approvalRules: ["Ask before sending replies", "Auto-summarize and prioritize freely"],
    outputs: ["Morning brief", "Follow-up list", "Meeting prep notes", "Priority summary"],
    talents: ["intake", "qualification", "planning", "communication", "reporting"],
    responsibilities: ["Turn messy daily communication into a clean operating view."],
    watchAreas: ["VIP contacts", "Unanswered messages", "Calendar conflicts", "Important meetings"],
    doblyHandled: ["Prioritization", "Briefing", "Meeting prep"],
    optionalAccess: ["Notes or task tools can be added later after inbox and calendar access."],
    onboardingQuestions: [
      {
        id: "calendar_window",
        label: "When should Dobly prepare your brief and what counts as important?",
        help: "Set the timing and threshold for what deserves attention.",
        placeholder: "Send the brief by 7am and only flag messages from clients, money, or today's meetings.",
      },
      {
        id: "reply_policy",
        label: "Should Dobly draft replies or only summarize and flag them?",
        help: "Choose how proactive the assistant should be with inbox handling.",
        placeholder: "Draft replies for routine follow-ups, but never send without my approval.",
      },
    ],
  },
  {
    id: "social-growth-automation",
    title: "Social Growth And Creator Automation",
    tagline: "Turn social activity into leads, bookings, and cleaner content operations.",
    audience: "both",
    family: "creator-growth",
    purpose: "Help creators, coaches, freelancers, and brands automate inbound social workflows without losing the personal feel.",
    templates: ["instagram-agent", "tiktok-agent", "creator-content-engine"],
    recommendedConnections: ["Instagram", "TikTok", "Meta", "Notion", "Google Sheets", "Calendly"],
    toolkit: ["Keyword comment flows", "DM qualification", "Lead routing", "Publishing workflow", "Performance reporting"],
    workflowLogic: ["Dedupe repeat inbound users", "Route hot leads to booking", "Separate publishing from moderation", "Summarize weekly growth signals"],
    memoryFields: ["campaign_goal", "lead_magnet_map", "reply_stage", "top_content_theme", "platform_policy"],
    approvalRules: ["Ask before custom outbound messages", "Approve branded posts if needed", "Auto-handle low-risk comment and DM handoffs"],
    outputs: ["Daily social lead digest", "Booked-call alerts", "Content ops summary", "Weekly growth brief"],
    talents: ["intake", "qualification", "communication", "publishing", "reporting", "execution"],
    responsibilities: ["Turn social activity into leads, bookings, and cleaner content operations."],
    watchAreas: ["Comments and DMs", "Lead magnet flow", "Publishing queue", "Growth signals"],
    doblyHandled: ["Routing", "Lead digests", "Content summaries"],
    optionalAccess: ["CRM or scheduling access can be added after the first social loop works."],
    onboardingQuestions: [
      {
        id: "social_platforms",
        label: "Which social channels should Dobly run for you first?",
        help: "Choose where the first agent should be strongest.",
        placeholder: "Instagram for lead capture and TikTok for content publishing.",
      },
      {
        id: "social_goal",
        label: "What should this agent optimize for?",
        help: "Define the job clearly: leads, bookings, lead magnet delivery, content pipeline, or reporting.",
        placeholder: "Turn Instagram comments and DMs into booked calls and keep a weekly creator report.",
      },
    ],
  },
  {
    id: "ecommerce-operations",
    title: "Ecommerce Operations",
    tagline: "Keep orders, inventory, exceptions, and customer follow-up moving together.",
    audience: "business",
    family: "business-ops",
    purpose: "Give stores a tighter operating loop around orders, payments, stock, and customer communication.",
    templates: ["ecommerce-ops-agent", "shopify-recovery-flow"],
    recommendedConnections: ["Shopify", "Stripe", "Klaviyo", "Gmail", "Slack", "Google Sheets"],
    toolkit: ["Order monitoring", "Exception handling", "Inventory watch", "Recovery messaging", "Ops reporting"],
    workflowLogic: ["Detect failed payments", "Flag low stock", "Escalate fulfillment exceptions", "Route VIP customer issues fast"],
    memoryFields: ["inventory_threshold", "order_exception_type", "vip_customer_rule", "fulfillment_sla", "campaign_window"],
    approvalRules: ["Ask before refunds or manual discounts", "Auto-handle low-risk order updates", "Escalate fulfillment failures after threshold"],
    outputs: ["Exception queue", "Low-stock alert", "Recovery summary", "Daily store ops brief"],
    talents: ["oversight", "verification", "coordination", "communication", "reconciliation", "execution"],
    responsibilities: ["Keep store operations moving across orders, stock, and customer exceptions."],
    watchAreas: ["Payment failures", "Low stock", "Fulfillment exceptions", "VIP customer issues"],
    doblyHandled: ["Exception tracking", "Ops summaries", "Recovery prompts"],
    optionalAccess: ["Email or messaging access can be added later after store sync is live."],
    onboardingQuestions: [
      {
        id: "store_channels",
        label: "Which store systems and channels matter most?",
        help: "Mention storefront, payments, email, support, or warehouse tools.",
        placeholder: "Shopify, Stripe, Gmail, and Slack for daily alerts.",
      },
      {
        id: "store_priorities",
        label: "What should Dobly treat as urgent in the store?",
        help: "Define the exceptions that deserve immediate action.",
        placeholder: "Failed payments, delayed fulfillment, low stock on best sellers, and angry customer replies.",
      },
    ],
  },
  {
    id: "recruiting-hiring-ops",
    title: "Recruiting And Hiring Ops",
    tagline: "Keep applicants, interviews, and follow-up moving without dropping people.",
    audience: "business",
    family: "customer-flow",
    purpose: "Help teams and operators run a tighter hiring process with better response speed and less admin drag.",
    templates: ["recruiting-coordinator", "candidate-follow-up-agent"],
    recommendedConnections: ["Gmail", "Google Calendar", "Airtable", "Notion", "Slack", "Zoom"],
    toolkit: ["Applicant intake", "Interview scheduling", "Candidate follow-up", "Evaluation collection", "Hiring summary"],
    workflowLogic: ["Tag role fit", "Track stage movement", "Chase interview feedback", "Alert on stalled candidates"],
    memoryFields: ["role_priority", "candidate_stage", "feedback_missing", "interview_status", "decision_owner"],
    approvalRules: ["Ask before final candidate communication", "Auto-send scheduling and reminder messages", "Escalate stalled feedback loops"],
    outputs: ["Hiring pipeline summary", "Interview reminder list", "Candidate follow-up drafts", "Stalled-role alert"],
    talents: ["intake", "qualification", "coordination", "communication", "recordkeeping", "reporting"],
    responsibilities: ["Keep the hiring pipeline moving without dropping applicants or feedback."],
    watchAreas: ["Stage movement", "Interview scheduling", "Missing feedback", "Cooling candidates"],
    doblyHandled: ["Scheduling reminders", "Pipeline updates", "Hiring summaries"],
    optionalAccess: ["Video or ATS tools can be added later once the basic pipeline is working."],
    onboardingQuestions: [
      {
        id: "roles_open",
        label: "Which roles or hiring pipelines should Dobly manage first?",
        help: "Start with the one lane where follow-up matters most.",
        placeholder: "Sales rep and customer support roles.",
      },
      {
        id: "hiring_rules",
        label: "What should Dobly automate versus leave for the hiring manager?",
        help: "Define where scheduling, reminders, and communications are safe.",
        placeholder: "Handle scheduling and reminders automatically, but draft final candidate messages for approval.",
      },
    ],
  },
  {
    id: "research-monitoring",
    title: "Research And Monitoring",
    tagline: "Watch important signals and send only high-signal findings with reasoning.",
    audience: "both",
    family: "research-intelligence",
    purpose: "Give founders, operators, and individuals a dependable research loop instead of noisy feeds.",
    templates: ["opportunity-researcher", "competitor-intelligence-agent", "market-watch-brief"],
    recommendedConnections: ["Perplexity", "Google Sheets", "Notion", "Slack", "Email", "Webhook"],
    toolkit: ["Topic tracking", "Source comparison", "Signal ranking", "Threshold monitoring", "Brief generation"],
    workflowLogic: ["Deduplicate repeated stories", "Score signal quality", "Compare against baseline", "Alert only on meaningful changes"],
    memoryFields: ["tracked_topics", "signal_threshold", "watchlist", "baseline_view", "delivery_cadence"],
    approvalRules: ["Usually no approval required", "Escalate only if the system would publish externally or trigger a downstream action"],
    outputs: ["Research brief", "Signal alert", "Competitor change log", "Market watch summary"],
    talents: ["research", "qualification", "oversight", "reporting", "packaging"],
    responsibilities: ["Watch the right signals continuously and send only high-signal findings."],
    watchAreas: ["Topics", "Competitors", "Market shifts", "Opportunity signals"],
    doblyHandled: ["Signal ranking", "Source comparison", "Brief generation"],
    optionalAccess: ["A spreadsheet or notes tool can be added later for archived watchlists."],
    onboardingQuestions: [
      {
        id: "research_scope",
        label: "What should Dobly monitor or research continuously?",
        help: "Choose topics, competitors, markets, niches, or opportunity spaces.",
        placeholder: "Competitors, category pricing changes, and new partnership opportunities.",
      },
      {
        id: "research_signal",
        label: "What counts as signal instead of noise?",
        help: "Define thresholds, credibility, urgency, or business impact.",
        placeholder: "Only send findings with a clear commercial impact, a trusted source, or a strong strategic change.",
      },
    ],
  },
];

export const DOBLY_VERTICAL_FAMILY_LABELS: Record<DoblyVerticalFamily, string> = {
  "customer-flow": "Customer Flow",
  "business-ops": "Business Ops",
  "workday-assistant": "Workday Assistant",
  "creator-growth": "Creator Growth",
  "research-intelligence": "Research Intelligence",
};

export function getDoblyVerticalById(id: string | null | undefined) {
  return DOBLY_DEEP_VERTICALS.find((vertical) => vertical.id === id) ?? null;
}

export function getDoblyVerticalByTemplate(templateId: string) {
  return DOBLY_DEEP_VERTICALS.find((vertical) => vertical.templates.includes(templateId)) ?? null;
}

export function guessDoblyVertical(prompt: string) {
  const text = prompt.toLowerCase();
  if (/(lead|crm|follow-up|follow up|prospect|qualification|booked call)/.test(text)) {
    return getDoblyVerticalById("lead-intake-follow-up");
  }
  if (/(onboarding|welcome|documents|kickoff|intake form)/.test(text)) {
    return getDoblyVerticalById("client-onboarding");
  }
  if (/(support|refund|ticket|customer issue|triage|helpdesk)/.test(text)) {
    return getDoblyVerticalById("support-triage");
  }
  if (/(reception|appointment|bookings|book appointment|inquiry|phone line|front desk)/.test(text)) {
    return getDoblyVerticalById("ai-receptionist");
  }
  if (/(invoice|payment|overdue|failed payment|collections|accounts receivable)/.test(text)) {
    return getDoblyVerticalById("invoice-payment-follow-up");
  }
  if (/(weekly report|weekly brief|business briefing|owner summary|kpi|digest)/.test(text)) {
    return getDoblyVerticalById("weekly-business-reporting");
  }
  if (/(freelancer|revision|client project|project coordination|deliverable|project manager)/.test(text)) {
    return getDoblyVerticalById("freelancer-project-coordination");
  }
  if (/(inbox|calendar|morning brief|meeting prep|follow-up list|email summary)/.test(text)) {
    return getDoblyVerticalById("inbox-calendar-assistant");
  }
  if (/(instagram|tiktok|creator|social|comment keyword|dm flow|lead magnet|content ops)/.test(text)) {
    return getDoblyVerticalById("social-growth-automation");
  }
  if (/(shopify|ecommerce|order|inventory|cart|fulfillment|store ops)/.test(text)) {
    return getDoblyVerticalById("ecommerce-operations");
  }
  if (/(candidate|recruit|hiring|interview|applicant|role pipeline)/.test(text)) {
    return getDoblyVerticalById("recruiting-hiring-ops");
  }
  if (/(research|monitor|watchlist|competitor|market scan|trend|brief me|opportunity)/.test(text)) {
    return getDoblyVerticalById("research-monitoring");
  }
  return null;
}
