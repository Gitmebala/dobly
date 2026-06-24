export type DoblyAudience = "business_owner" | "freelancer" | "individual";
export type DoblySystemType = "automation" | "agent" | "pipeline" | "hybrid";
export type DoblyReadiness = "verified_live" | "partial" | "planned";
export type DoblyWorkTypeId = "communicate" | "research" | "create" | "coordinate" | "build" | "monitor" | "decide";
export type DoblyOutputTypeId =
  | "message"
  | "task"
  | "alert"
  | "brief"
  | "document"
  | "presentation"
  | "spreadsheet_report"
  | "image_design"
  | "video"
  | "code_context_package"
  | "approval_request";
export type DoblyTriggerTypeId =
  | "owner_request"
  | "inbound_signal"
  | "scheduled_trigger"
  | "threshold_alert"
  | "workflow_handoff"
  | "external_event";
export type DoblyTrustLevelId =
  | "informational"
  | "draft_propose"
  | "safe_auto_run"
  | "approval_required"
  | "human_only";
export type DoblyMemoryScopeId = "run" | "department" | "workspace" | "customer" | "project" | "company";
export type DoblyExecutionLaneId = "native_api" | "browser" | "http_webhook" | "local_desktop" | "voice" | "artifact_pipeline";
export type DoblyCapabilityDepartmentId =
  | "reception"
  | "sales"
  | "marketing"
  | "support"
  | "finance"
  | "operations"
  | "engineering_product"
  | "leadership"
  | "admin";

export interface DoblyWorkerDefinition {
  id: string;
  officeOrArea: string;
  title: string;
  audience: DoblyAudience[];
  systemType: DoblySystemType;
  mission: string;
  livePrerequisites: string[];
  safetyNotes: string[];
  readiness: DoblyReadiness;
}

export interface DoblyCommunicationCapability {
  id: string;
  title: string;
  userChoice: "existing_number" | "new_dobly_number" | "channel_runtime";
  verifiedNow: boolean;
  currentRuntime: string;
  targetRuntime: string;
  missingPieces: string[];
}

export interface DoblyMemoryTier {
  id: "short_term" | "medium_term" | "long_term" | "synthesis";
  storage: string;
  purpose: string;
  readiness: DoblyReadiness;
}

export interface DoblyWorkTypeDefinition {
  id: DoblyWorkTypeId;
  title: string;
  summary: string;
  examples: string[];
}

export interface DoblyOutputTypeDefinition {
  id: DoblyOutputTypeId;
  title: string;
  summary: string;
}

export interface DoblyTriggerTypeDefinition {
  id: DoblyTriggerTypeId;
  title: string;
  summary: string;
}

export interface DoblyTrustLevelDefinition {
  id: DoblyTrustLevelId;
  title: string;
  summary: string;
}

export interface DoblyExecutionLaneDefinition {
  id: DoblyExecutionLaneId;
  title: string;
  summary: string;
}

export interface DoblyDepartmentCapabilityProfile {
  id: DoblyCapabilityDepartmentId;
  title: string;
  summary: string;
  workTypeIds: DoblyWorkTypeId[];
  outputTypeIds: DoblyOutputTypeId[];
  trustDefault: DoblyTrustLevelId;
}

export const DOBLY_SYSTEM_TYPES: Array<{
  id: DoblySystemType;
  description: string;
  userChooses: false;
}> = [
  {
    id: "automation",
    description: "Repeatable trigger-action work with deterministic runtime once the path is safe and approved.",
    userChooses: false,
  },
  {
    id: "agent",
    description: "A bounded intelligent worker with role, memory, judgment, and escalation rules.",
    userChooses: false,
  },
  {
    id: "pipeline",
    description: "A multi-step artifact job where each step passes output to the next.",
    userChooses: false,
  },
  {
    id: "hybrid",
    description: "A deterministic structure with agent reasoning at the moments that need judgment.",
    userChooses: false,
  },
];

export const DOBLY_WORK_TYPES: DoblyWorkTypeDefinition[] = [
  {
    id: "communicate",
    title: "Communicate",
    summary: "Handle live conversations, follow-up, reminders, and outbound updates across channels.",
    examples: ["Calls", "WhatsApp", "Email", "Chat", "Reminders"],
  },
  {
    id: "research",
    title: "Research",
    summary: "Gather, compare, track, and synthesize information that informs business action.",
    examples: ["Competitors", "Market scans", "Customer themes", "Deep briefs"],
  },
  {
    id: "create",
    title: "Create",
    summary: "Produce the artifacts a business needs to move, explain, sell, and report.",
    examples: ["Docs", "Slides", "Designs", "Images", "Videos"],
  },
  {
    id: "coordinate",
    title: "Coordinate",
    summary: "Route work, chase approvals, track dependencies, and keep teams moving.",
    examples: ["Tasks", "Projects", "Scheduling", "Approvals", "Handoffs"],
  },
  {
    id: "build",
    title: "Build",
    summary: "Support engineering and product execution with issue, release, and handoff flows.",
    examples: ["Issue triage", "Release notes", "Design handoff", "Code context"],
  },
  {
    id: "monitor",
    title: "Monitor",
    summary: "Watch the business for risk, drift, thresholds, anomalies, and opportunities.",
    examples: ["SLAs", "Cash risk", "Campaign changes", "Queue health", "Alerts"],
  },
  {
    id: "decide",
    title: "Decide",
    summary: "Prepare briefings, recommendations, and decision-ready context for humans.",
    examples: ["Owner briefings", "Boardroom reports", "Next moves", "Escalations"],
  },
];

export const DOBLY_OUTPUT_TYPES: DoblyOutputTypeDefinition[] = [
  { id: "message", title: "Message", summary: "A sent or drafted communication across chat, SMS, email, or voice follow-up." },
  { id: "task", title: "Task", summary: "A tracked next action created for a person, team, or system." },
  { id: "alert", title: "Alert", summary: "A proactive signal that something changed, drifted, or needs attention." },
  { id: "brief", title: "Brief", summary: "A concise decision-ready summary with context and recommended next steps." },
  { id: "document", title: "Document", summary: "A generated or updated doc, proposal, memo, or report." },
  { id: "presentation", title: "Presentation", summary: "A deck, slides, or presentation package ready for review, delivery, or narration." },
  { id: "spreadsheet_report", title: "Spreadsheet / Report", summary: "A structured data output, spreadsheet, or analytical report." },
  { id: "image_design", title: "Image / Design", summary: "A visual asset, creative concept, or editable design handoff." },
  { id: "video", title: "Video", summary: "A produced or staged video asset with supporting context." },
  { id: "code_context_package", title: "Code / Context Package", summary: "A technical handoff, engineering issue package, or release context bundle." },
  { id: "approval_request", title: "Approval Request", summary: "A gated request that pauses for a human decision before continuing." },
];

export const DOBLY_TRIGGER_TYPES: DoblyTriggerTypeDefinition[] = [
  { id: "owner_request", title: "Owner Request", summary: "A plain-English instruction, standard, or direct ask from the user." },
  { id: "inbound_signal", title: "Inbound Signal", summary: "A customer, team, or system event that needs to be handled." },
  { id: "scheduled_trigger", title: "Scheduled Trigger", summary: "A recurring cadence such as a daily report, reminder, or audit." },
  { id: "threshold_alert", title: "Threshold Alert", summary: "A rule-based condition such as SLA breach, cash risk, or anomaly." },
  { id: "workflow_handoff", title: "Workflow Handoff", summary: "A downstream step created by another department or job in progress." },
  { id: "external_event", title: "External Event", summary: "A webhook, provider callback, or third-party change." },
];

export const DOBLY_TRUST_LEVELS: DoblyTrustLevelDefinition[] = [
  { id: "informational", title: "Informational", summary: "Observe and report only. No downstream action." },
  { id: "draft_propose", title: "Draft / Propose", summary: "Prepare drafts, recommendations, and next steps for review." },
  { id: "safe_auto_run", title: "Safe Auto-Run", summary: "Run low-risk actions automatically inside guardrails." },
  { id: "approval_required", title: "Approval Required", summary: "Pause for human approval before sending or changing something important." },
  { id: "human_only", title: "Human Only", summary: "Surface context, but leave execution entirely to a person." },
];

export const DOBLY_EXECUTION_LANES: DoblyExecutionLaneDefinition[] = [
  { id: "native_api", title: "Native API", summary: "Direct API integrations for the fastest and most reliable execution path." },
  { id: "browser", title: "Browser", summary: "Browser automation for tools without a useful direct integration path." },
  { id: "http_webhook", title: "HTTP / Webhook", summary: "Generic requests and callbacks for custom systems and service hooks." },
  { id: "local_desktop", title: "Local / Desktop", summary: "Desktop-side execution when work must happen in a local environment." },
  { id: "voice", title: "Voice", summary: "Realtime voice loops for calls, reception, and spoken follow-through." },
  { id: "artifact_pipeline", title: "Artifact Pipeline", summary: "Media and document production across docs, slides, spreadsheets, design, and video." },
];

export const DOBLY_DEPARTMENT_CAPABILITY_PROFILES: DoblyDepartmentCapabilityProfile[] = [
  {
    id: "reception",
    title: "Reception",
    summary: "The front door for live customer intent, booking, and routing.",
    workTypeIds: ["communicate", "coordinate", "monitor"],
    outputTypeIds: ["message", "task", "brief", "approval_request"],
    trustDefault: "approval_required",
  },
  {
    id: "sales",
    title: "Sales",
    summary: "Persistent follow-up, qualification, and pipeline momentum.",
    workTypeIds: ["communicate", "coordinate", "monitor", "decide"],
    outputTypeIds: ["message", "task", "brief", "approval_request"],
    trustDefault: "approval_required",
  },
  {
    id: "marketing",
    title: "Marketing",
    summary: "Campaign thinking, content creation, asset production, and performance loops.",
    workTypeIds: ["research", "create", "monitor", "coordinate"],
    outputTypeIds: ["document", "presentation", "image_design", "video", "brief", "approval_request"],
    trustDefault: "draft_propose",
  },
  {
    id: "support",
    title: "Support",
    summary: "Customer recovery, ticket handling, and escalation with context.",
    workTypeIds: ["communicate", "coordinate", "monitor"],
    outputTypeIds: ["message", "task", "brief", "approval_request"],
    trustDefault: "approval_required",
  },
  {
    id: "finance",
    title: "Finance",
    summary: "Money visibility, follow-through, and carefully gated action.",
    workTypeIds: ["monitor", "coordinate", "decide"],
    outputTypeIds: ["alert", "brief", "document", "approval_request"],
    trustDefault: "human_only",
  },
  {
    id: "operations",
    title: "Operations",
    summary: "Cross-team movement, blocker clearing, and exception handling.",
    workTypeIds: ["coordinate", "monitor", "research"],
    outputTypeIds: ["task", "alert", "brief", "approval_request"],
    trustDefault: "safe_auto_run",
  },
  {
    id: "engineering_product",
    title: "Engineering / Product",
    summary: "Issue flow, release context, product signals, and technical handoffs.",
    workTypeIds: ["build", "coordinate", "monitor", "decide"],
    outputTypeIds: ["code_context_package", "task", "brief", "document", "presentation"],
    trustDefault: "draft_propose",
  },
  {
    id: "leadership",
    title: "Leadership",
    summary: "Decision support, strategic visibility, and company-wide prioritization.",
    workTypeIds: ["decide", "monitor", "coordinate"],
    outputTypeIds: ["brief", "alert", "document", "presentation", "approval_request"],
    trustDefault: "informational",
  },
  {
    id: "admin",
    title: "Admin",
    summary: "Recurring office work, reminders, records, and schedule hygiene.",
    workTypeIds: ["communicate", "coordinate", "decide"],
    outputTypeIds: ["message", "task", "document", "presentation", "approval_request"],
    trustDefault: "safe_auto_run",
  },
];

export const DOBLY_BUSINESS_WORKERS: DoblyWorkerDefinition[] = [
  {
    id: "voice_receptionist_agent",
    officeOrArea: "Customer Office",
    title: "Voice Receptionist Agent",
    audience: ["business_owner", "freelancer"],
    systemType: "agent",
    mission: "Answer calls, understand intent, book appointments, take messages, and escalate sensitive conversations.",
    livePrerequisites: ["Twilio or Africa's Talking number", "real-time STT", "TTS voice", "business calendar", "business memory"],
    safetyNotes: ["Medium and high-risk customer commitments require approval.", "Call summaries must be logged."],
    readiness: "partial",
  },
  {
    id: "whatsapp_agent",
    officeOrArea: "Customer Office",
    title: "WhatsApp Agent",
    audience: ["business_owner", "freelancer"],
    systemType: "agent",
    mission: "Handle inbound WhatsApp, qualify, respond in brand voice, and escalate outside safe bounds.",
    livePrerequisites: ["WhatsApp Business API connection", "conversation ledger", "24-hour template policy"],
    safetyNotes: ["Template-only outside Meta's 24-hour customer-service window.", "Escalate pricing, refunds, complaints, and sensitive issues."],
    readiness: "partial",
  },
  {
    id: "invoice_agent",
    officeOrArea: "Finance Office",
    title: "Invoice Agent",
    audience: ["business_owner", "freelancer"],
    systemType: "hybrid",
    mission: "Generate, send, track, and follow up on invoices with tone adjusted to payment history.",
    livePrerequisites: ["verified finance connector or Dobly records", "email/WhatsApp delivery", "approval thresholds"],
    safetyNotes: ["Collections escalation and aggressive language require owner approval.", "Money actions stay threshold-gated."],
    readiness: "planned",
  },
  {
    id: "payment_reconciliation_agent",
    officeOrArea: "Finance Office",
    title: "Payment Reconciliation Agent",
    audience: ["business_owner"],
    systemType: "automation",
    mission: "Match M-PESA payments to invoices, flag mismatches, and send confirmations.",
    livePrerequisites: ["M-PESA Daraja callbacks", "invoice records", "customer ledger"],
    safetyNotes: ["Unmatched payments are never silently applied."],
    readiness: "partial",
  },
  {
    id: "pipeline_agent",
    officeOrArea: "Sales Office",
    title: "Pipeline Agent",
    audience: ["business_owner", "freelancer"],
    systemType: "hybrid",
    mission: "Track leads, prevent silent drop-off, schedule follow-ups, and surface deal intelligence.",
    livePrerequisites: ["HubSpot or Dobly CRM records", "communication channel", "owner approval for sensitive offers"],
    safetyNotes: ["Discounts and binding promises require approval."],
    readiness: "partial",
  },
  {
    id: "supplier_agent",
    officeOrArea: "Operations Office",
    title: "Supplier Agent",
    audience: ["business_owner"],
    systemType: "hybrid",
    mission: "Monitor supplier performance, reorder thresholds, delivery degradation, and alternative suppliers.",
    livePrerequisites: ["supplier records", "inventory records", "research capability"],
    safetyNotes: ["Vendor switching and purchase commitments require approval."],
    readiness: "planned",
  },
  {
    id: "competitor_intelligence_agent",
    officeOrArea: "Marketing Office",
    title: "Competitor Intelligence Agent",
    audience: ["business_owner", "freelancer"],
    systemType: "pipeline",
    mission: "Monitor competitor pricing, content, hiring, and market moves; produce weekly owner insight.",
    livePrerequisites: ["research runtime", "briefing/feed output"],
    safetyNotes: ["Research output is advisory unless owner approves actions."],
    readiness: "partial",
  },
  {
    id: "contract_agent",
    officeOrArea: "Legal Office",
    title: "Contract Agent",
    audience: ["business_owner", "freelancer"],
    systemType: "agent",
    mission: "Summarize contracts, flag unusual clauses, and prepare owner review.",
    livePrerequisites: ["document intake", "legal-risk guardrails"],
    safetyNotes: ["Never gives final legal advice or signs/accepts terms automatically."],
    readiness: "planned",
  },
];

export const DOBLY_INDIVIDUAL_WORKERS: DoblyWorkerDefinition[] = [
  {
    id: "stock_tracking_agent",
    officeOrArea: "Money",
    title: "Stock Tracking Agent",
    audience: ["individual"],
    systemType: "hybrid",
    mission: "Monitor watchlists against the user's strategy and surface contextual buy/sell alerts.",
    livePrerequisites: ["market data provider", "strategy memory", "optional brokerage connector"],
    safetyNotes: ["Trade execution requires explicit confirmation. Alerts are not financial advice."],
    readiness: "planned",
  },
  {
    id: "bill_monitoring_agent",
    officeOrArea: "Money",
    title: "Bill Monitoring Agent",
    audience: ["individual"],
    systemType: "automation",
    mission: "Track recurring bills, renewals, price increases, and unused subscriptions.",
    livePrerequisites: ["email or bank/payment data", "subscription memory"],
    safetyNotes: ["Cancellation or payment actions require approval."],
    readiness: "planned",
  },
  {
    id: "flight_price_agent",
    officeOrArea: "Travel",
    title: "Flight Price Agent",
    audience: ["individual"],
    systemType: "automation",
    mission: "Monitor routes and dates, alert when prices hit target criteria, and prepare booking context.",
    livePrerequisites: ["flight data provider", "route/date preferences"],
    safetyNotes: ["Booking requires explicit approval."],
    readiness: "planned",
  },
  {
    id: "personal_research_agent",
    officeOrArea: "Information",
    title: "Personal Research Agent",
    audience: ["individual", "freelancer", "business_owner"],
    systemType: "pipeline",
    mission: "Research a topic deeply and return a complete brief without back-and-forth.",
    livePrerequisites: ["research runtime", "document/report output"],
    safetyNotes: ["Cites uncertainty and separates facts from recommendations."],
    readiness: "partial",
  },
];

export const DOBLY_COMMUNICATION_CAPABILITIES: DoblyCommunicationCapability[] = [
  {
    id: "existing_whatsapp_number",
    title: "Use existing WhatsApp number",
    userChoice: "existing_number",
    verifiedNow: false,
    currentRuntime: "Embedded onboarding instructions exist; outbound Meta send exists when token and phoneNumberId are present.",
    targetRuntime: "In-app WhatsApp Business API migration, 24-hour policy automation, templates, feed-visible conversation ledger.",
    missingPieces: ["Template manager", "24-hour window enforcement", "full migration UX", "inbound/outbound E2E verification"],
  },
  {
    id: "existing_call_number",
    title: "Forward existing calls to Dobly",
    userChoice: "existing_number",
    verifiedNow: false,
    currentRuntime: "Twilio Gather webhook can receive speech and route it into communication ingestion.",
    targetRuntime: "Twilio stream + Deepgram + Groq 70B + ElevenLabs sub-second voice loop.",
    missingPieces: ["Media Streams", "Deepgram realtime STT", "ElevenLabs TTS streaming", "latency budget tracking", "call forwarding setup UI"],
  },
  {
    id: "new_dobly_number",
    title: "Provision a new Dobly number",
    userChoice: "new_dobly_number",
    verifiedNow: false,
    currentRuntime: "Connection catalog describes Twilio setup; automatic number provisioning is not complete.",
    targetRuntime: "One-click Twilio/Africa's Talking number provisioning with ready-to-answer agent.",
    missingPieces: ["number search/provisioning", "billing ownership", "regional provider fallback"],
  },
];

export const DOBLY_MEMORY_TIERS: DoblyMemoryTier[] = [
  {
    id: "short_term",
    storage: "Redis / Upstash",
    purpose: "Active session and conversation state for running calls, chats, and agent loops.",
    readiness: "planned",
  },
  {
    id: "medium_term",
    storage: "Supabase",
    purpose: "Structured history: runs, messages, customers, payments, decisions, escalations, briefings, and signals.",
    readiness: "partial",
  },
  {
    id: "long_term",
    storage: "PostgreSQL + pgvector",
    purpose: "Semantic retrieval over historical conversations, decisions, documents, and operating memory.",
    readiness: "planned",
  },
  {
    id: "synthesis",
    storage: "Nightly synthesis jobs into business brain records",
    purpose: "Convert raw events into durable conclusions, preferences, risks, and owner judgment patterns.",
    readiness: "partial",
  },
];

export function getDoblyWorkerDefinitions(audience?: DoblyAudience) {
  const workers = [...DOBLY_BUSINESS_WORKERS, ...DOBLY_INDIVIDUAL_WORKERS];
  return audience ? workers.filter((worker) => worker.audience.includes(audience)) : workers;
}

export function getDoblyDepartmentCapabilityProfile(id: DoblyCapabilityDepartmentId) {
  return DOBLY_DEPARTMENT_CAPABILITY_PROFILES.find((profile) => profile.id === id) ?? null;
}
