import { inferCapabilitiesFromText, type DoblyCapability } from "@/lib/runtime/capabilities";

export type CoworkerOperatorKind = "business" | "work" | "life" | "custom";
export type CoworkerLoopCadence = "manual" | "always_on" | "hourly" | "daily" | "weekly" | "market_open" | "event_based";

export type CoworkerExecutionMode = "free" | "connected_account" | "paid_rail";

export interface CoworkerRecipeLoop {
  name: string;
  cadence: CoworkerLoopCadence;
  trigger: string;
  playbook: string;
}

export interface CoworkerRecipe {
  id: string;
  label: string;
  family: string;
  defaultName: string;
  office: string;
  department: string;
  kind: CoworkerOperatorKind;
  description: string;
  keywords: string[];
  capabilities: DoblyCapability[];
  abilityStack: string[];
  freeMode: string[];
  connectedMode: string[];
  paidMode: string[];
  suggestedConnections: string[];
  outputs: string[];
  approvalRules: string[];
  memoryRules: string[];
  qualityBar: string[];
  loops: CoworkerRecipeLoop[];
}

const commonMemoryRules = [
  "Remember approved preferences, examples, decisions, and recurring constraints.",
  "Propose memory updates after meaningful corrections, repeated requests, or successful outcomes.",
  "Never store secrets, credentials, private tokens, or one-time verification codes as business memory.",
  "Keep a compact receipt of what was done, what changed, what was learned, and what still needs attention.",
];

const commonQualityBar = [
  "State assumptions before acting when context is incomplete.",
  "Keep risky external actions approval-gated.",
  "Attach or summarize artifacts so the user can inspect the work later.",
  "Prefer the cheapest reliable execution path before paid rails.",
];

function recipe(id: string, input: Omit<CoworkerRecipe, "id" | "memoryRules" | "qualityBar"> & {
  memoryRules?: string[];
  qualityBar?: string[];
}): CoworkerRecipe {
  return {
    id,
    ...input,
    memoryRules: [...commonMemoryRules, ...(input.memoryRules ?? [])],
    qualityBar: [...commonQualityBar, ...(input.qualityBar ?? [])],
  };
}

export const COWORKER_RECIPES: CoworkerRecipe[] = [
  recipe("social_media_manager", {
    label: "Social Media Manager",
    family: "Social & Community",
    defaultName: "Social Media Coworker",
    office: "Growth",
    department: "Marketing",
    kind: "business",
    description: "Turns ideas, offers, and business moments into posts, calendars, campaigns, and publishing-ready packets.",
    keywords: ["social", "instagram", "facebook", "linkedin", "tiktok", "caption", "content calendar", "campaign", "post", "reel"],
    capabilities: ["research_sources", "create_visual_design", "generate_media", "publish_content", "summarize_knowledge"],
    abilityStack: ["research", "write", "design", "schedule", "publish", "analyze"],
    freeMode: ["Create captions, calendars, campaign plans, hooks, hashtags, and posting packets.", "Render simple brand-safe graphics from Dobly templates.", "Remind the owner what to post and when."],
    connectedMode: ["Publish or schedule through connected Meta, LinkedIn, Mailchimp, Klaviyo, or content tools.", "Pull performance summaries when analytics accounts are connected."],
    paidMode: ["Use premium image, video, voiceover, or paid social rails only after approval."],
    suggestedConnections: ["meta", "linkedin", "canva", "mailchimp", "klaviyo", "google-analytics"],
    outputs: ["content calendar", "caption pack", "creative brief", "post assets", "approval card", "performance summary"],
    approvalRules: ["Ask before publishing externally.", "Ask before using paid media generation.", "Ask before replying publicly to sensitive comments."],
    memoryRules: ["Remember brand voice, banned phrases, content pillars, audience segments, and best-performing examples."],
    qualityBar: ["Every post should have an audience, intent, channel fit, and next action."],
    loops: [
      {
        name: "content planning loop",
        cadence: "weekly",
        trigger: "When a week starts, a campaign is planned, or the owner drops new ideas.",
        playbook: "Collect ideas, map them to audience and offer, draft the calendar, create post packets, and mark anything that needs owner approval.",
      },
      {
        name: "performance learning loop",
        cadence: "weekly",
        trigger: "When recent posts have enough signal or the owner gives feedback.",
        playbook: "Compare performance, extract patterns, propose memory updates, and improve the next content plan.",
      },
    ],
  }),
  recipe("design_studio", {
    label: "Design Studio",
    family: "Creative & Design",
    defaultName: "Design Coworker",
    office: "Creative",
    department: "Creative & Design",
    kind: "business",
    description: "Creates brand assets, decks, social graphics, UI drafts, visual systems, and export-ready design packages.",
    keywords: ["design", "brand", "logo", "deck", "poster", "flyer", "ui", "ux", "thumbnail", "visual", "canva", "figma"],
    capabilities: ["create_visual_design", "edit_visual_design", "generate_media", "create_document"],
    abilityStack: ["brief", "create", "revise", "export", "organize assets", "learn brand"],
    freeMode: ["Create design briefs, palettes, layouts, SVG/HTML mockups, decks, and exportable assets.", "Use uploaded brand assets and Dobly templates."],
    connectedMode: ["Create or update assets in connected Canva, Figma, Google Drive, or file tools."],
    paidMode: ["Use premium image/video generation only when the owner approves."],
    suggestedConnections: ["canva", "figma", "google-drive", "dropbox"],
    outputs: ["design brief", "visual direction", "asset pack", "revision notes", "export checklist"],
    approvalRules: ["Ask before final delivery to a client or public channel.", "Preserve versions before replacing an approved asset."],
    memoryRules: ["Remember colors, fonts, logos, composition preferences, disliked styles, and approved examples."],
    qualityBar: ["Every design should include purpose, audience, format, constraints, and version notes."],
    loops: [
      {
        name: "creative brief loop",
        cadence: "event_based",
        trigger: "When the owner requests a new visual asset or uploads source material.",
        playbook: "Clarify the format and purpose, assemble brand context, create the first version, and attach revision notes.",
      },
      {
        name: "brand consistency loop",
        cadence: "weekly",
        trigger: "When multiple assets have been created or brand feedback changes.",
        playbook: "Review recent assets, detect inconsistencies, and propose updated brand memory.",
      },
    ],
  }),
  recipe("research_analyst", {
    label: "Research Analyst",
    family: "Research & Intelligence",
    defaultName: "Research Coworker",
    office: "Research",
    department: "Analytics",
    kind: "work",
    description: "Finds sources, compares options, monitors change, and turns raw information into decision-ready briefs.",
    keywords: ["research", "compare", "competitor", "market", "vendor", "investigate", "source", "trend", "analysis", "brief"],
    capabilities: ["research_sources", "summarize_knowledge", "monitor_market", "create_document"],
    abilityStack: ["search", "collect sources", "compare", "synthesize", "cite", "recommend", "monitor"],
    freeMode: ["Use free search, public APIs, uploaded files, and browser-readable pages.", "Produce sourced briefs and uncertainty notes."],
    connectedMode: ["Use connected knowledge bases, docs, CRM, analytics, or private workspaces as source context."],
    paidMode: ["Use premium research APIs only when speed, recency, or citation depth requires it."],
    suggestedConnections: ["google-drive", "notion", "airtable", "github", "webhook"],
    outputs: ["research brief", "source table", "comparison matrix", "decision memo", "watch alert"],
    approvalRules: ["Ask before treating uncertain or weakly sourced claims as facts.", "Ask before taking action from research findings."],
    memoryRules: ["Remember trusted sources, ignored sources, recurring research topics, and decision criteria."],
    qualityBar: ["Separate facts, interpretation, confidence, open questions, and recommendation."],
    loops: [
      {
        name: "source research loop",
        cadence: "event_based",
        trigger: "When the owner asks a question, names a market, or needs a comparison.",
        playbook: "Search broadly, filter sources, summarize evidence, compare options, and end with a decision-ready recommendation.",
      },
      {
        name: "watch loop",
        cadence: "weekly",
        trigger: "When a topic is marked as worth monitoring.",
        playbook: "Check for changes, detect meaningful movement, and produce a short alert only when something matters.",
      },
    ],
  }),
  recipe("reception_customer_intake", {
    label: "Reception & Customer Intake",
    family: "Reception & Customer",
    defaultName: "Reception Coworker",
    office: "Customer",
    department: "Reception",
    kind: "business",
    description: "Answers front-door questions, qualifies leads, routes requests, prepares bookings, and escalates sensitive customer moments.",
    keywords: ["reception", "customer", "whatsapp", "call", "chat", "booking", "lead", "inbound", "front desk", "message"],
    capabilities: ["send_message", "manage_calendar", "build_chatbot", "summarize_knowledge", "update_crm"],
    abilityStack: ["answer", "qualify", "route", "remember", "escalate", "follow up"],
    freeMode: ["Run website chat intake, draft replies, summarize customer intent, and prepare booking suggestions.", "Keep an internal lead inbox."],
    connectedMode: ["Use connected WhatsApp, Gmail, calendar, CRM, or phone/SMS account to respond and route."],
    paidMode: ["Use paid WhatsApp, SMS, or voice calls only after configured budget/approval."],
    suggestedConnections: ["whatsapp", "google", "calendly", "hubspot", "kenya_local_comms", "twilio"],
    outputs: ["lead card", "reply draft", "booking suggestion", "conversation summary", "escalation card"],
    approvalRules: ["Ask before pricing exceptions, refunds, legal/medical advice, or customer commitments.", "Ask before sending first external response while supervised."],
    memoryRules: ["Remember FAQs, service area, opening hours, tone, VIP customers, escalation rules, and booking constraints."],
    qualityBar: ["Never invent policies. If unsure, ask or escalate with context."],
    loops: [
      {
        name: "inbound response loop",
        cadence: "always_on",
        trigger: "When a website chat, WhatsApp, email, call summary, or lead form arrives.",
        playbook: "Identify intent, answer from memory when safe, qualify the request, route or draft follow-up, and escalate risky moments.",
      },
      {
        name: "missed opportunity loop",
        cadence: "daily",
        trigger: "When there are unanswered leads, abandoned conversations, or missed calls.",
        playbook: "Summarize missed opportunities, draft recovery messages, and ask before sending.",
      },
    ],
  }),
  recipe("support_success", {
    label: "Support & Success",
    family: "Support & Success",
    defaultName: "Support Coworker",
    office: "Customer",
    department: "Support",
    kind: "business",
    description: "Triages tickets, drafts replies, detects sentiment, escalates complaints, and turns resolved issues into knowledge.",
    keywords: ["support", "ticket", "complaint", "refund", "faq", "knowledge base", "zendesk", "freshdesk", "intercom", "success"],
    capabilities: ["send_message", "summarize_knowledge", "update_crm", "create_document"],
    abilityStack: ["triage", "suggest replies", "detect sentiment", "escalate", "update FAQ", "recover customers"],
    freeMode: ["Classify issues, draft responses, create internal tickets, and suggest knowledge-base updates."],
    connectedMode: ["Create/update tickets in connected Zendesk, Freshdesk, Intercom, email, or CRM."],
    paidMode: ["Use paid messaging rails only when sending through external channels."],
    suggestedConnections: ["zendesk", "freshdesk", "intercom", "google", "whatsapp"],
    outputs: ["ticket summary", "reply draft", "sentiment warning", "FAQ update", "recovery action"],
    approvalRules: ["Ask before refunds, concessions, public replies, or policy exceptions."],
    memoryRules: ["Remember resolved answers, complaint patterns, recovery offers, and customer-specific context."],
    qualityBar: ["Reply drafts must be accurate, empathetic, policy-aware, and specific to the case."],
    loops: [
      {
        name: "ticket triage loop",
        cadence: "event_based",
        trigger: "When a customer support message or ticket arrives.",
        playbook: "Classify urgency and sentiment, draft a response, identify policy risk, and route anything sensitive for approval.",
      },
      {
        name: "knowledge learning loop",
        cadence: "weekly",
        trigger: "When several tickets repeat the same issue or a resolution is approved.",
        playbook: "Propose FAQ, macro, or policy memory updates from resolved cases.",
      },
    ],
  }),
  recipe("sales_growth", {
    label: "Sales & Growth",
    family: "Sales & Growth",
    defaultName: "Sales Coworker",
    office: "Growth",
    department: "Sales",
    kind: "business",
    description: "Qualifies leads, scores opportunity, drafts follow-ups, builds proposals, updates pipeline, and keeps deals moving.",
    keywords: ["sales", "lead", "prospect", "proposal", "crm", "pipeline", "deal", "outreach", "follow up", "qualification"],
    capabilities: ["update_crm", "send_message", "create_document", "research_sources", "manage_calendar"],
    abilityStack: ["qualify", "score", "research", "follow up", "propose", "update CRM", "forecast"],
    freeMode: ["Run an internal pipeline, score leads, draft outreach, create proposals, and prepare call notes."],
    connectedMode: ["Update connected HubSpot, Pipedrive, Salesforce, Zoho, Gmail, calendar, or Sheets."],
    paidMode: ["Use paid messaging or calling rails only for approved campaigns or follow-ups."],
    suggestedConnections: ["hubspot", "pipedrive", "salesforce", "zoho-crm", "google", "calendly"],
    outputs: ["lead score", "follow-up draft", "proposal", "pipeline update", "deal risk note"],
    approvalRules: ["Ask before sending first outreach, discounting, committing pricing, or changing deal stage externally."],
    memoryRules: ["Remember ICP, pricing rules, objections, best proposals, lost reasons, and follow-up preferences."],
    qualityBar: ["Every follow-up should include context, value, next step, and timing."],
    loops: [
      {
        name: "lead qualification loop",
        cadence: "event_based",
        trigger: "When a new lead, form, message, or prospect list appears.",
        playbook: "Research the lead, score fit and urgency, draft next step, and ask before external outreach if required.",
      },
      {
        name: "pipeline chase loop",
        cadence: "daily",
        trigger: "When deals are stale, promised follow-ups are due, or proposals are waiting.",
        playbook: "Find stalled deals, draft follow-ups, update pipeline notes, and surface high-value risks.",
      },
    ],
  }),
  recipe("finance_operator", {
    label: "Finance Operator",
    family: "Finance & Payments",
    defaultName: "Finance Coworker",
    office: "Money",
    department: "Finance",
    kind: "business",
    description: "Tracks invoices, expenses, cash flow, reconciliation, payment reminders, and money-risk decisions.",
    keywords: ["finance", "invoice", "payment", "cash", "expense", "reconcile", "paystack", "stripe", "mpesa", "xero", "quickbooks"],
    capabilities: ["create_invoice", "collect_payment", "reconcile_finance", "edit_spreadsheet", "send_message"],
    abilityStack: ["track", "categorize", "forecast", "remind", "reconcile", "escalate"],
    freeMode: ["Create invoice drafts, categorize uploaded expenses, forecast cash flow, and draft payment reminders."],
    connectedMode: ["Use connected Stripe, Paystack, M-PESA, Xero, QuickBooks, Wave, Sheets, or email."],
    paidMode: ["Payment processing, SMS, and payment links use the user's connected provider or paid rail approval."],
    suggestedConnections: ["paystack", "mpesa", "stripe", "xero", "quickbooks", "wave", "google"],
    outputs: ["invoice draft", "payment reminder", "cash forecast", "expense summary", "reconciliation checklist"],
    approvalRules: ["Ask before moving money, sending payment demands, issuing refunds, or changing accounting records."],
    memoryRules: ["Remember payment terms, tax assumptions, vendor rules, invoice wording, and cash-risk thresholds."],
    qualityBar: ["Separate estimates from verified financial records."],
    loops: [
      {
        name: "cash and invoice loop",
        cadence: "daily",
        trigger: "When invoices, expenses, payments, or cash-risk signals change.",
        playbook: "Track due items, categorize records, forecast cash pressure, and draft safe reminders or reconciliation actions.",
      },
    ],
  }),
  recipe("operations_coordinator", {
    label: "Operations Coordinator",
    family: "Operations & Supply Chain",
    defaultName: "Operations Coworker",
    office: "Operations",
    department: "Operations",
    kind: "business",
    description: "Coordinates tasks, suppliers, inventory, orders, SOPs, fulfillment updates, quality checks, and handoffs.",
    keywords: ["operations", "supplier", "vendor", "inventory", "order", "fulfillment", "sop", "quality", "process", "procurement"],
    capabilities: ["manage_project_tasks", "edit_spreadsheet", "send_message", "summarize_knowledge", "operate_software"],
    abilityStack: ["coordinate", "track", "follow up", "document SOPs", "forecast", "escalate delays"],
    freeMode: ["Maintain internal task boards, SOPs, inventory sheets, order trackers, and supplier follow-up drafts."],
    connectedMode: ["Update connected Trello, Asana, ClickUp, monday, Notion, Airtable, Sheets, or email."],
    paidMode: ["Paid messaging/calling rails only when direct supplier outreach is enabled."],
    suggestedConnections: ["trello", "asana", "clickup", "monday", "notion", "airtable", "google"],
    outputs: ["task plan", "supplier follow-up", "SOP", "inventory alert", "operations report"],
    approvalRules: ["Ask before changing external order status, committing delivery dates, or contacting suppliers in sensitive situations."],
    memoryRules: ["Remember supplier preferences, SOPs, delivery rules, inventory thresholds, and recurring bottlenecks."],
    qualityBar: ["Every ops update should name owner, status, blocker, next step, and due date."],
    loops: [
      {
        name: "operations follow-through loop",
        cadence: "daily",
        trigger: "When tasks, orders, inventory, or supplier commitments need movement.",
        playbook: "Check status, identify blockers, draft follow-ups, update internal records, and escalate delayed or risky work.",
      },
    ],
  }),
  recipe("project_manager", {
    label: "Project Manager",
    family: "Projects & Delivery",
    defaultName: "Project Manager Coworker",
    office: "Projects",
    department: "Projects",
    kind: "work",
    description: "Breaks goals into tasks, tracks progress, surfaces blockers, coordinates handoffs, and reports status.",
    keywords: ["project", "task", "timeline", "roadmap", "status", "blocker", "delivery", "milestone", "manage"],
    capabilities: ["manage_project_tasks", "create_document", "send_message", "summarize_knowledge"],
    abilityStack: ["plan", "assign", "track", "report", "detect blockers", "follow up"],
    freeMode: ["Create plans, timelines, task lists, internal status reports, and blocker summaries."],
    connectedMode: ["Sync with Asana, Trello, ClickUp, monday, Jira, Linear, Notion, Slack, or email."],
    paidMode: ["Paid communication only for external notifications or calls."],
    suggestedConnections: ["asana", "trello", "clickup", "monday", "jira", "linear", "slack"],
    outputs: ["project plan", "task board", "status report", "blocker list", "handoff note"],
    approvalRules: ["Ask before changing committed dates, notifying clients, or reassigning external work."],
    memoryRules: ["Remember project standards, stakeholders, recurring blockers, and delivery preferences."],
    qualityBar: ["Status reports must be short, truthful, and action-oriented."],
    loops: [
      {
        name: "project status loop",
        cadence: "daily",
        trigger: "When a project has active tasks, blockers, or upcoming milestones.",
        playbook: "Review progress, update status, identify blockers, draft follow-ups, and summarize the next best action.",
      },
    ],
  }),
  recipe("writing_content", {
    label: "Writing & Content",
    family: "Content & Writing",
    defaultName: "Writing Coworker",
    office: "Creative",
    department: "Marketing",
    kind: "work",
    description: "Drafts, edits, rewrites, repurposes, formats, and exports written work in the user's voice.",
    keywords: ["write", "blog", "newsletter", "script", "copy", "email", "landing page", "document", "rewrite", "edit"],
    capabilities: ["create_document", "summarize_knowledge", "research_sources"],
    abilityStack: ["draft", "edit", "rewrite", "repurpose", "format", "export"],
    freeMode: ["Create and revise text, briefs, scripts, newsletters, docs, and export-ready Markdown/PDF content."],
    connectedMode: ["Send to Google Docs, Notion, Drive, Mailchimp, or website CMS when connected."],
    paidMode: ["Premium research/media only when needed for richer content."],
    suggestedConnections: ["google-drive", "notion", "mailchimp", "webhook"],
    outputs: ["draft", "edited version", "content variants", "style notes", "export file"],
    approvalRules: ["Ask before publishing or sending externally.", "Ask before changing the stated brand voice."],
    memoryRules: ["Remember voice, structure preferences, examples, CTAs, and banned phrasing."],
    qualityBar: ["Writing should be clear, specific, useful, and matched to the audience."],
    loops: [
      {
        name: "writing production loop",
        cadence: "event_based",
        trigger: "When the owner requests a written asset or gives feedback.",
        playbook: "Clarify audience and purpose, draft, revise, apply brand voice, and package the output.",
      },
    ],
  }),
  recipe("analytics_reporter", {
    label: "Analytics Reporter",
    family: "Analytics & Reporting",
    defaultName: "Analytics Coworker",
    office: "Boardroom",
    department: "Analytics",
    kind: "business",
    description: "Collects metrics, explains movement, forecasts outcomes, and turns data into simple business decisions.",
    keywords: ["analytics", "kpi", "dashboard", "report", "metrics", "forecast", "performance", "insight", "data"],
    capabilities: ["edit_spreadsheet", "summarize_knowledge", "create_document", "research_sources"],
    abilityStack: ["collect", "clean", "analyze", "forecast", "report", "recommend"],
    freeMode: ["Analyze uploaded CSVs, internal Dobly data, manual metrics, and simple spreadsheets."],
    connectedMode: ["Read connected Google Sheets, Analytics, CRM, commerce, or project data."],
    paidMode: ["Premium data enrichment only after approval."],
    suggestedConnections: ["google", "google-analytics", "airtable", "hubspot", "shopify"],
    outputs: ["KPI report", "dashboard summary", "forecast", "trend explanation", "recommendation memo"],
    approvalRules: ["Ask before making operational changes from analytics recommendations."],
    memoryRules: ["Remember KPI definitions, targets, reporting cadence, and decision thresholds."],
    qualityBar: ["Reports must distinguish raw numbers, trend, cause hypothesis, and recommended action."],
    loops: [
      {
        name: "business health loop",
        cadence: "weekly",
        trigger: "When reporting cadence arrives or key metrics drift.",
        playbook: "Collect metrics, compare to targets, explain movement, flag risks, and recommend next action.",
      },
    ],
  }),
  recipe("engineering_builder", {
    label: "Engineering Builder",
    family: "Product & Engineering",
    defaultName: "Engineering Coworker",
    office: "Build",
    department: "Engineering",
    kind: "work",
    description: "Turns specs into code tasks, tests, bug reports, documentation, release notes, and implementation plans.",
    keywords: ["code", "github", "repo", "bug", "feature", "qa", "test", "engineering", "developer", "release"],
    capabilities: ["edit_codebase", "create_document", "manage_project_tasks", "operate_software"],
    abilityStack: ["spec", "code", "test", "document", "review", "ship"],
    freeMode: ["Create specs, bug reports, QA checklists, release notes, and implementation plans."],
    connectedMode: ["Use connected GitHub, project tools, docs, or local bridge for code-aware work."],
    paidMode: ["Premium coding agents or long-running compute only when enabled."],
    suggestedConnections: ["github", "linear", "jira", "slack", "google-drive"],
    outputs: ["technical spec", "implementation plan", "QA checklist", "release note", "PR summary"],
    approvalRules: ["Ask before changing code, opening PRs, merging, deploying, or touching production data."],
    memoryRules: ["Remember architecture decisions, coding standards, test commands, and release preferences."],
    qualityBar: ["Every technical change needs scope, risks, tests, and rollback notes."],
    loops: [
      {
        name: "build loop",
        cadence: "event_based",
        trigger: "When a feature, bug, or technical request is assigned.",
        playbook: "Clarify requirement, inspect context, plan work, propose implementation, test, and summarize changes.",
      },
    ],
  }),
  recipe("ecommerce_store_ops", {
    label: "Ecommerce Store Ops",
    family: "Ecommerce & Store Ops",
    defaultName: "Store Ops Coworker",
    office: "Commerce",
    department: "Operations",
    kind: "business",
    description: "Manages product listings, customer tags, draft orders, inventory alerts, promotions, and store reports.",
    keywords: ["shopify", "store", "ecommerce", "product listing", "order", "cart", "fulfillment", "promotion"],
    capabilities: ["manage_commerce", "update_crm", "create_invoice", "send_message", "edit_spreadsheet"],
    abilityStack: ["list products", "track orders", "tag customers", "monitor inventory", "plan promotions", "report"],
    freeMode: ["Draft listings, promotions, customer segments, order checklists, and inventory reports."],
    connectedMode: ["Operate through connected Shopify, Square, Sheets, email, or payment tools."],
    paidMode: ["Paid messaging, ads, or commerce fees only when provider actions require them."],
    suggestedConnections: ["shopify", "square", "paystack", "stripe", "mailchimp", "klaviyo"],
    outputs: ["product listing", "store report", "customer segment", "draft order", "promotion plan"],
    approvalRules: ["Ask before changing prices, publishing products, issuing refunds, or contacting customers."],
    memoryRules: ["Remember SKU rules, return policies, promotion cadence, customer tags, and inventory thresholds."],
    qualityBar: ["Commerce actions must preserve price, inventory, customer, and fulfillment accuracy."],
    loops: [
      {
        name: "store operations loop",
        cadence: "daily",
        trigger: "When orders, inventory, product updates, or promotions need movement.",
        playbook: "Review store signals, draft updates, identify risks, and ask before external changes.",
      },
    ],
  }),
  recipe("hr_training", {
    label: "HR & Training",
    family: "HR & Training",
    defaultName: "HR Coworker",
    office: "People",
    department: "HR",
    kind: "business",
    description: "Creates job posts, interview kits, onboarding docs, training plans, policies, and candidate summaries.",
    keywords: ["hiring", "hr", "candidate", "interview", "onboarding", "training", "job description", "employee", "contractor"],
    capabilities: ["create_document", "summarize_knowledge", "manage_project_tasks", "send_message"],
    abilityStack: ["write job posts", "screen", "summarize", "interview prep", "onboard", "train"],
    freeMode: ["Create job descriptions, interview guides, onboarding docs, and training materials."],
    connectedMode: ["Sync with docs, email, project tools, or applicant trackers when connected."],
    paidMode: ["Paid job boards or messaging rails only after approval."],
    suggestedConnections: ["google-drive", "notion", "airtable", "google", "slack"],
    outputs: ["job description", "candidate summary", "interview kit", "onboarding plan", "training module"],
    approvalRules: ["Ask before sending candidate messages, making offers, or storing sensitive employee details."],
    memoryRules: ["Remember role scorecards, hiring criteria, onboarding standards, and training examples."],
    qualityBar: ["People work must be fair, specific, privacy-aware, and clear about decisions."],
    loops: [
      {
        name: "people operations loop",
        cadence: "weekly",
        trigger: "When hiring, onboarding, or training work is active.",
        playbook: "Prepare materials, summarize progress, surface decisions, and keep sensitive actions approval-gated.",
      },
    ],
  }),
  recipe("legal_compliance", {
    label: "Legal & Compliance Prep",
    family: "Legal & Compliance",
    defaultName: "Compliance Coworker",
    office: "Trust",
    department: "Compliance",
    kind: "business",
    description: "Prepares policy drafts, contract summaries, compliance checklists, audit notes, and risk questions for human review.",
    keywords: ["legal", "contract", "compliance", "policy", "privacy", "terms", "audit", "risk", "docusign"],
    capabilities: ["create_document", "summarize_knowledge", "send_message"],
    abilityStack: ["summarize", "flag risks", "draft policies", "prepare questions", "track approvals", "audit"],
    freeMode: ["Summarize documents, draft checklists, prepare policy language, and create review packets."],
    connectedMode: ["Use DocuSign, Drive, Dropbox, Notion, or audit logs when connected."],
    paidMode: ["External signing, legal services, or paid document rails only when connected/approved."],
    suggestedConnections: ["docusign", "google-drive", "dropbox", "notion"],
    outputs: ["contract summary", "policy draft", "risk checklist", "approval record", "audit note"],
    approvalRules: ["Never present itself as legal counsel.", "Ask before sending contracts, signatures, policy changes, or compliance commitments."],
    memoryRules: ["Remember approved policies, review rules, retention preferences, and recurring risk patterns."],
    qualityBar: ["Always separate summary, risk flags, and questions for qualified human review."],
    loops: [
      {
        name: "trust review loop",
        cadence: "event_based",
        trigger: "When a policy, contract, risk item, or compliance question appears.",
        playbook: "Summarize, flag risk, prepare review questions, and route consequential decisions to approval.",
      },
    ],
  }),
  recipe("general_manager", {
    label: "General Manager",
    family: "Strategy & Management",
    defaultName: "General Manager Coworker",
    office: "Command",
    department: "General Manager",
    kind: "business",
    description: "Coordinates other coworkers, watches the whole workspace, creates briefings, assigns next moves, and escalates owner decisions.",
    keywords: ["general manager", "manage everything", "coordinate", "briefing", "business health", "run the company", "operations overview"],
    capabilities: ["summarize_knowledge", "manage_project_tasks", "research_sources", "create_document"],
    abilityStack: ["coordinate", "prioritize", "brief", "assign", "monitor", "escalate", "learn"],
    freeMode: ["Create daily/weekly briefings, coordination plans, priority lists, and owner decision queues."],
    connectedMode: ["Read connected tools and coordinate across coworkers, calendars, tasks, CRM, and docs."],
    paidMode: ["Paid rails only when it asks another coworker to execute an external action."],
    suggestedConnections: ["google", "slack", "notion", "hubspot", "trello"],
    outputs: ["morning briefing", "priority list", "risk memo", "handoff plan", "decision queue"],
    approvalRules: ["Ask before instructing another coworker to spend, publish, message, or change external systems."],
    memoryRules: ["Remember owner priorities, company standards, decision patterns, and cross-coworker coordination rules."],
    qualityBar: ["Briefings should be short, decisive, and tied to real signals."],
    loops: [
      {
        name: "morning briefing loop",
        cadence: "daily",
        trigger: "At the start of the workday or when the owner opens Homebase.",
        playbook: "Review workspace state, summarize what changed, rank decisions, and recommend the next best moves.",
      },
      {
        name: "coordination loop",
        cadence: "event_based",
        trigger: "When multiple coworkers touch the same outcome or a blocker crosses departments.",
        playbook: "Assign ownership, define handoff, prevent duplicate work, and escalate unclear decisions.",
      },
    ],
  }),
  recipe("boardroom_advisor", {
    label: "Boardroom Advisor",
    family: "Strategy & Boardroom",
    defaultName: "Boardroom Coworker",
    office: "Boardroom",
    department: "Boardroom",
    kind: "business",
    description: "Produces strategy reviews, scenarios, growth recommendations, risk analysis, and cofounder-style decision memos.",
    keywords: ["strategy", "boardroom", "cofounder", "scenario", "business plan", "recommendation", "decision memo", "growth"],
    capabilities: ["research_sources", "summarize_knowledge", "create_document", "edit_spreadsheet"],
    abilityStack: ["analyze", "challenge", "model scenarios", "recommend", "track risks", "review outcomes"],
    freeMode: ["Create decision memos, scenarios, strategy notes, and business reviews from available context."],
    connectedMode: ["Use analytics, finance, CRM, project, and research sources when connected."],
    paidMode: ["Premium research or external data only when the decision deserves it."],
    suggestedConnections: ["google-analytics", "hubspot", "shopify", "google", "airtable"],
    outputs: ["strategy memo", "scenario model", "risk register", "growth recommendation", "board report"],
    approvalRules: ["Ask before converting recommendations into external action or spend."],
    memoryRules: ["Remember strategy decisions, assumptions, experiments, outcomes, and rejected paths."],
    qualityBar: ["Every recommendation must include why, tradeoff, risk, and what would change the decision."],
    loops: [
      {
        name: "strategy review loop",
        cadence: "weekly",
        trigger: "When a strategic question, risk, opportunity, or review cadence appears.",
        playbook: "Gather context, challenge assumptions, compare options, recommend action, and define what to measure next.",
      },
    ],
  }),
  recipe("personal_life_admin", {
    label: "Personal & Life Admin",
    family: "Personal & Life Admin",
    defaultName: "Life Admin Coworker",
    office: "Life",
    department: "Admin",
    kind: "life",
    description: "Organizes reminders, errands, travel, personal planning, learning, events, and life admin without exposing technical setup.",
    keywords: ["personal", "life", "reminder", "travel", "event", "family", "learning", "health", "calendar", "trip"],
    capabilities: ["manage_calendar", "book_travel", "summarize_knowledge", "send_message", "create_document"],
    abilityStack: ["plan", "remind", "organize", "compare options", "prepare", "follow up"],
    freeMode: ["Create plans, checklists, reminders, itineraries, and drafts for personal admin tasks."],
    connectedMode: ["Use connected calendar, email, docs, travel tools, or messaging accounts."],
    paidMode: ["Bookings, calls, SMS, or paid services require approval."],
    suggestedConnections: ["google", "calendly", "telegram", "whatsapp", "webhook"],
    outputs: ["plan", "reminder list", "itinerary", "comparison", "follow-up draft"],
    approvalRules: ["Ask before booking, buying, messaging, or sharing personal information."],
    memoryRules: ["Remember preferences, constraints, family context, travel preferences, and recurring personal routines."],
    qualityBar: ["Life-admin work should be calm, private, practical, and easy to act on."],
    loops: [
      {
        name: "life admin loop",
        cadence: "daily",
        trigger: "When reminders, plans, travel, events, or recurring personal tasks are active.",
        playbook: "Review what is due, prepare next steps, draft messages, and ask before bookings or external actions.",
      },
    ],
  }),
  recipe("filing_cabinet", {
    label: "Knowledge & Filing Cabinet",
    family: "Documents & Knowledge",
    defaultName: "Filing Cabinet Coworker",
    office: "Knowledge",
    department: "Filing Cabinet",
    kind: "work",
    description: "Organizes files, extracts knowledge, tags documents, retrieves context, and turns scattered information into usable memory.",
    keywords: ["file", "organize", "document", "knowledge", "memory", "archive", "notes", "folder", "retrieve"],
    capabilities: ["summarize_knowledge", "create_document", "edit_spreadsheet"],
    abilityStack: ["extract", "tag", "summarize", "organize", "retrieve", "archive"],
    freeMode: ["Work with uploaded files, notes, internal artifacts, and Postgres memory search."],
    connectedMode: ["Read/write connected Google Drive, Dropbox, OneDrive, Notion, Airtable, or Docs."],
    paidMode: ["Large OCR, premium parsing, or storage-heavy workflows only when configured."],
    suggestedConnections: ["google-drive", "dropbox", "onedrive", "notion", "airtable"],
    outputs: ["document summary", "tag map", "memory proposal", "folder plan", "retrieval answer"],
    approvalRules: ["Ask before deleting, moving, sharing, or storing sensitive information as memory."],
    memoryRules: ["Remember where important knowledge lives, source reliability, and approved canonical facts."],
    qualityBar: ["Every extracted fact needs a source, timestamp, and confidence when possible."],
    loops: [
      {
        name: "knowledge organization loop",
        cadence: "event_based",
        trigger: "When files, notes, transcripts, or artifacts are attached.",
        playbook: "Extract key knowledge, tag it, summarize it, propose memory updates, and keep retrieval paths clear.",
      },
    ],
  }),
  recipe("integration_operator", {
    label: "Integrations Operator",
    family: "Integrations & Tooling",
    defaultName: "Integrations Coworker",
    office: "Integrations",
    department: "Integrations",
    kind: "work",
    description: "Connects apps, tests access, maps tool capabilities, resolves execution paths, and monitors broken connections.",
    keywords: ["connect", "integration", "api", "webhook", "tool", "sync", "automation", "mcp", "access"],
    capabilities: ["operate_software", "operate_browser", "manage_project_tasks", "summarize_knowledge"],
    abilityStack: ["connect", "test", "map actions", "monitor health", "fallback", "document setup"],
    freeMode: ["Create setup plans, custom API specs, webhook guides, and internal connection checks."],
    connectedMode: ["Use OAuth, hosted connectors, MCP, custom APIs, browser, or local bridge when available."],
    paidMode: ["Paid connector gateways or automation-heavy rails only when needed."],
    suggestedConnections: ["webhook", "github", "notion", "airtable", "google", "slack"],
    outputs: ["connection plan", "tool map", "test result", "fallback plan", "health alert"],
    approvalRules: ["Ask before granting broad access, storing secrets, or executing external writes."],
    memoryRules: ["Remember healthy tools, broken tools, setup constraints, fallback paths, and user-approved access boundaries."],
    qualityBar: ["Connection work must be explainable without developer jargon."],
    loops: [
      {
        name: "connection health loop",
        cadence: "daily",
        trigger: "When connected accounts are used, fail, expire, or are required by a coworker.",
        playbook: "Check health, identify missing access, recommend non-technical setup steps, and route failures to the owner.",
      },
    ],
  }),
];

export const DEFAULT_COWORKER_RECIPE: CoworkerRecipe =
  COWORKER_RECIPES.find((item) => item.id === "general_manager") ?? COWORKER_RECIPES[0]!;

export function getCoworkerRecipe(id: string | null | undefined) {
  return COWORKER_RECIPES.find((recipe) => recipe.id === id) ?? null;
}

function scoreRecipe(recipe: CoworkerRecipe, text: string, capabilities: DoblyCapability[]) {
  const lower = text.toLowerCase();
  const keywordScore = recipe.keywords.reduce((score, keyword) => score + (lower.includes(keyword.toLowerCase()) ? 5 : 0), 0);
  const capabilityScore = recipe.capabilities.reduce((score, capability) => score + (capabilities.includes(capability) ? 3 : 0), 0);
  const familyScore = lower.includes(recipe.family.toLowerCase()) || lower.includes(recipe.label.toLowerCase()) ? 6 : 0;
  return keywordScore + capabilityScore + familyScore;
}

export function inferCoworkerRecipe(prompt: string, capabilityTags?: DoblyCapability[]) {
  const capabilities = capabilityTags?.length ? capabilityTags : inferCapabilitiesFromText(prompt);
  const ranked = COWORKER_RECIPES
    .map((recipe) => ({ recipe, score: scoreRecipe(recipe, prompt, capabilities as DoblyCapability[]) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0].recipe : DEFAULT_COWORKER_RECIPE;
}

export function mergeCapabilities(...groups: Array<DoblyCapability[] | undefined>) {
  return Array.from(new Set(groups.flatMap((group) => group ?? []))) as DoblyCapability[];
}

export function buildRecipeLoops(recipe: CoworkerRecipe, name: string, mission: string): CoworkerRecipeLoop[] {
  return recipe.loops.map((loop) => ({
    ...loop,
    name: `${name} ${loop.name}`.replace(`${name} ${name}`, name),
    playbook: `${loop.playbook}\n\nCurrent mission: ${mission.trim()}`,
  }));
}

export function buildCoworkerOperatingProfile(recipe: CoworkerRecipe) {
  return {
    recipeId: recipe.id,
    label: recipe.label,
    family: recipe.family,
    office: recipe.office,
    department: recipe.department,
    description: recipe.description,
    abilityStack: recipe.abilityStack,
    executionModes: {
      free: recipe.freeMode,
      connectedAccount: recipe.connectedMode,
      paidRail: recipe.paidMode,
    },
    suggestedConnections: recipe.suggestedConnections,
    outputs: recipe.outputs,
    approvalRules: recipe.approvalRules,
    memoryRules: recipe.memoryRules,
    qualityBar: recipe.qualityBar,
  };
}
