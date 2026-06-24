export interface StarterTemplate {
  id: string;
  title: string;
  summary: string;
  prompt: string;
  category: string;
  audience: "personal" | "business" | "both";
  type: "agent" | "automation";
  verticalId?: string;
}

const PERSONAL_TEMPLATES: StarterTemplate[] = [
  {
    id: "personal-assistant",
    title: "Personal assistant",
    summary: "Keep life admin, reminders, and follow-ups moving without mental overload.",
    category: "Personal",
    audience: "personal",
    type: "agent",
    verticalId: "inbox-calendar-assistant",
    prompt:
      "Build me a personal assistant that keeps track of my calendar, important emails, reminders, and admin tasks, and gives me a clear morning brief plus nudges when something important needs attention.",
  },
  {
    id: "investment-watcher",
    title: "Investment watcher",
    summary: "Watch assets or markets and alert only on meaningful changes.",
    category: "Finance",
    audience: "personal",
    type: "automation",
    prompt:
      "Create an investment watcher that monitors my selected assets, tracks notable price and sentiment changes, and sends me alerts only when the move is important enough to act on.",
  },
  {
    id: "opportunity-researcher",
    title: "Opportunity researcher",
    summary: "Track niches, markets, and new opportunities and summarize only the best ones.",
    category: "Research",
    audience: "personal",
    type: "agent",
    verticalId: "research-monitoring",
    prompt:
      "Build me a research agent that monitors topics and opportunities I care about, compares new developments, and sends me only the highest-signal findings with short reasoning.",
  },
  {
    id: "price-drop-finder",
    title: "Price drop finder",
    summary: "Track products, travel, or deals and tell me when timing is finally good.",
    category: "Shopping",
    audience: "personal",
    type: "automation",
    prompt:
      "Create a price drop finder that watches selected products, flights, and hotels and alerts me when the price drops into a range that looks like a good deal.",
  },
  {
    id: "job-hunt-assistant",
    title: "Job hunt assistant",
    summary: "Watch openings, summarize fit, and keep applications moving.",
    category: "Career",
    audience: "personal",
    type: "agent",
    verticalId: "recruiting-hiring-ops",
    prompt:
      "Build me a job hunt assistant that tracks roles at selected companies, highlights the best matches, reminds me about deadlines, and helps me stay on top of applications and follow-ups.",
  },
  {
    id: "travel-planner",
    title: "Travel planner",
    summary: "Monitor travel options, build itineraries, and keep logistics organized.",
    category: "Travel",
    audience: "personal",
    type: "agent",
    prompt:
      "Build me a travel planner that monitors flight and hotel options, organizes my itinerary, keeps important booking details together, and reminds me about the next thing I need to do.",
  },
  {
    id: "subscription-auditor",
    title: "Subscription auditor",
    summary: "Spot recurring charges, waste, and renewals before they drift unnoticed.",
    category: "Life admin",
    audience: "personal",
    type: "automation",
    prompt:
      "Create a subscription auditor that tracks recurring subscriptions and charges, flags price increases or duplicate tools, and reminds me before renewals I may want to cancel.",
  },
  {
    id: "study-coach",
    title: "Study coach",
    summary: "Build plans, pace learning, and tell me what matters next.",
    category: "Learning",
    audience: "personal",
    type: "agent",
    prompt:
      "Build me a study coach that helps me plan learning sessions, reminds me what to review next, and gives me a short clear summary of what I should focus on each week.",
  },
  {
    id: "instagram-agent",
    title: "Instagram agent",
    summary: "Handle inbound social interest, route leads, and keep creator ops tidy.",
    category: "Creator",
    audience: "both",
    type: "agent",
    verticalId: "social-growth-automation",
    prompt:
      "Build me an Instagram agent that handles inbound comment and DM workflows, routes qualified leads into my booking or CRM flow, and gives me a simple summary of what happened each day.",
  },
  {
    id: "tiktok-agent",
    title: "TikTok agent",
    summary: "Run content operations, publishing support, and reporting for a TikTok-first workflow.",
    category: "Creator",
    audience: "both",
    type: "agent",
    verticalId: "social-growth-automation",
    prompt:
      "Build me a TikTok agent that helps manage the content pipeline, prepares publishing steps, tracks performance, and turns high-intent responses into the next action I should take.",
  },
  {
    id: "creator-content-engine",
    title: "Creator content engine",
    summary: "Keep ideas, publishing, and repurposing moving without chaos.",
    category: "Creator",
    audience: "both",
    type: "automation",
    verticalId: "social-growth-automation",
    prompt:
      "Create a creator content engine that tracks content ideas, repurposes finished content across channels, keeps the posting pipeline moving, and sends me a short weekly growth and production summary.",
  },
  {
    id: "inbox-calendar-manager",
    title: "Inbox & calendar manager",
    summary: "Surface what matters from email and calendar without drowning in noise.",
    category: "Productivity",
    audience: "personal",
    type: "automation",
    verticalId: "inbox-calendar-assistant",
    prompt:
      "Create an inbox and calendar manager that gives me a morning brief of important emails, meetings, and follow-ups, and flags anything I need to respond to today.",
  },
  {
    id: "household-coordinator",
    title: "Household coordinator",
    summary: "Track bills, chores, maintenance, and shared reminders in one calm system.",
    category: "Home",
    audience: "personal",
    type: "automation",
    prompt:
      "Create a household coordinator that tracks home-related reminders like bills, maintenance, deliveries, and recurring chores, and sends the right reminders at the right time.",
  },
];

const BUSINESS_TEMPLATES: StarterTemplate[] = [
  {
    id: "service-lead-qualification",
    title: "Service business lead qualification",
    summary: "Qualify inbound leads, route the urgent ones fast, and keep the rest moving automatically.",
    category: "Service business",
    audience: "business",
    type: "automation",
    verticalId: "lead-intake-follow-up",
    prompt:
      "When a new lead comes in from my website, WhatsApp, or phone intake, qualify the lead, capture the right details, update my CRM, and only ask me to step in for high-value or unclear cases.",
  },
  {
    id: "service-client-onboarding",
    title: "Service client onboarding",
    summary: "Collect missing details, documents, approvals, and kickoff steps without manual chasing.",
    category: "Service business",
    audience: "business",
    type: "automation",
    verticalId: "client-onboarding",
    prompt:
      "Create a client onboarding workflow for my service business that sends welcome steps, collects missing documents and intake details, follows up automatically, and shows me which new clients are ready, blocked, or still waiting.",
  },
  {
    id: "service-invoice-reminders",
    title: "Service invoice reminders",
    summary: "Handle overdue invoices professionally and escalate only when the account needs a human call.",
    category: "Service business",
    audience: "business",
    type: "automation",
    verticalId: "invoice-payment-follow-up",
    prompt:
      "Create an invoice reminder workflow for my service business that watches unpaid invoices, sends polite reminders on schedule, retries when delivery fails, and escalates to me only for high-value or repeatedly overdue accounts.",
  },
  {
    id: "service-support-triage",
    title: "Service support triage",
    summary: "Handle common customer questions, collect context, and escalate sensitive issues safely.",
    category: "Service business",
    audience: "business",
    type: "agent",
    verticalId: "support-triage",
    prompt:
      "Build me a customer support triage agent for a service business that handles common questions, gathers the details needed to solve the issue, drafts the right reply, and escalates billing, refund, or high-risk situations to a human teammate.",
  },
  {
    id: "service-appointment-ops",
    title: "Service appointment operations",
    summary: "Keep bookings, reminders, reschedules, and no-show follow-ups consistent.",
    category: "Service business",
    audience: "business",
    type: "automation",
    verticalId: "ai-receptionist",
    prompt:
      "Create an appointment operations workflow for my service business that confirms bookings, sends reminders, handles reschedules, flags likely no-shows, and updates the right records automatically.",
  },
  {
    id: "ai-receptionist-agent",
    title: "AI receptionist agent",
    summary: "Handle inbound inquiries, qualify them, and keep booking flow clean.",
    category: "Service business",
    audience: "business",
    type: "agent",
    verticalId: "ai-receptionist",
    prompt:
      "Build me an AI receptionist that handles inbound inquiries, answers common questions, qualifies intent, and either books the right slot or escalates edge cases to me.",
  },
  {
    id: "service-weekly-owner-brief",
    title: "Service owner weekly brief",
    summary: "Summarize leads, bookings, revenue, support issues, and outstanding risks for the owner.",
    category: "Service business",
    audience: "business",
    type: "automation",
    verticalId: "weekly-business-reporting",
    prompt:
      "Create a weekly owner briefing for my service business that summarizes new leads, booked work, unpaid invoices, client issues, approvals waiting on me, and the biggest operational risks in one short report.",
  },
  {
    id: "sales-lead-research-agent",
    title: "Sales lead research agent",
    summary: "Find, qualify, and summarize the best leads instead of dumping raw lists.",
    category: "Sales",
    audience: "business",
    type: "agent",
    verticalId: "lead-intake-follow-up",
    prompt:
      "Build me a sales lead research agent that gathers new leads from approved business sources, enriches them with useful context, ranks them by fit, and sends me a clean shortlist with reasoning.",
  },
  {
    id: "sales-follow-up-agent",
    title: "Sales follow-up agent",
    summary: "Keep prospects warm, consistent, and visible without manual chasing.",
    category: "Sales",
    audience: "business",
    type: "agent",
    verticalId: "lead-intake-follow-up",
    prompt:
      "Build me a sales follow-up agent that tracks inbound prospects, drafts personalized follow-ups, reminds me when a lead has gone cold, and books meetings when a prospect is ready.",
  },
  {
    id: "support-triage-agent",
    title: "Customer support triage agent",
    summary: "Handle common issues, gather context, and escalate only when needed.",
    category: "Support",
    audience: "business",
    type: "agent",
    verticalId: "support-triage",
    prompt:
      "Build me a customer support triage agent that answers common questions, gathers the information needed to solve a case, and escalates complex or risky issues to a human teammate.",
  },
  {
    id: "client-onboarding-agent",
    title: "Client onboarding agent",
    summary: "Collect documents, keep momentum, and show what is still missing.",
    category: "Operations",
    audience: "business",
    type: "automation",
    verticalId: "client-onboarding",
    prompt:
      "Create a client onboarding system that sends welcome steps, collects missing documents, follows up automatically, and keeps me updated on which clients are ready and which are blocked.",
  },
  {
    id: "competitor-intelligence-agent",
    title: "Competitor intelligence agent",
    summary: "Watch competitors and summarize changes that actually matter.",
    category: "Research",
    audience: "business",
    type: "agent",
    verticalId: "research-monitoring",
    prompt:
      "Build me a competitor intelligence agent that watches selected competitors, tracks meaningful changes in positioning, pricing, and launches, and gives me a concise weekly summary of what matters.",
  },
  {
    id: "marketing-content-repurposer",
    title: "Marketing content repurposer",
    summary: "Turn one source into multiple outputs for channels and teams.",
    category: "Marketing",
    audience: "business",
    type: "automation",
    prompt:
      "Create a content repurposing workflow that takes a new article, video, or announcement and turns it into social post drafts, a short team summary, and a tracked content entry.",
  },
  {
    id: "weekly-business-briefing-agent",
    title: "Weekly business briefing agent",
    summary: "Pull the business into one clear report for owners and operators.",
    category: "Reporting",
    audience: "business",
    type: "automation",
    verticalId: "weekly-business-reporting",
    prompt:
      "Create a weekly business briefing that summarizes important metrics, customer issues, payments, approvals, and risks into one clear owner-ready report every week.",
  },
  {
    id: "finance-follow-up-agent",
    title: "Finance follow-up agent",
    summary: "Handle failed payments and overdue invoices without awkward manual chasing.",
    category: "Finance",
    audience: "business",
    type: "automation",
    verticalId: "invoice-payment-follow-up",
    prompt:
      "Create a finance follow-up agent that watches invoices and failed payments, sends respectful reminders automatically, and alerts me when a high-value account needs human attention.",
  },
  {
    id: "ecommerce-ops-agent",
    title: "Ecommerce ops agent",
    summary: "Watch orders, stock, and customer exceptions and keep fulfillment smooth.",
    category: "Commerce",
    audience: "business",
    type: "automation",
    verticalId: "ecommerce-operations",
    prompt:
      "Create an ecommerce operations agent that monitors orders, low stock, payment exceptions, and customer issues, then sends the right alerts and updates the right systems automatically.",
  },
  {
    id: "shopify-recovery-flow",
    title: "Shopify recovery flow",
    summary: "Recover failed checkout or payment issues with a cleaner customer loop.",
    category: "Commerce",
    audience: "business",
    type: "automation",
    verticalId: "ecommerce-operations",
    prompt:
      "Create a Shopify recovery flow that watches abandoned or failed checkout paths, sends the right follow-up, updates the customer record, and alerts me only when a high-value order needs a manual save.",
  },
  {
    id: "recruiting-coordinator",
    title: "Recruiting coordinator",
    summary: "Move candidates through hiring stages without losing momentum.",
    category: "Operations",
    audience: "business",
    type: "automation",
    verticalId: "recruiting-hiring-ops",
    prompt:
      "Create a recruiting coordinator that handles applicant intake, interview scheduling, reminder messages, and hiring pipeline updates, while escalating only the decisions that need a human.",
  },
  {
    id: "candidate-follow-up-agent",
    title: "Candidate follow-up agent",
    summary: "Keep applicants informed and the hiring team on schedule.",
    category: "Operations",
    audience: "business",
    type: "agent",
    verticalId: "recruiting-hiring-ops",
    prompt:
      "Build me a candidate follow-up agent that keeps applicants updated, chases missing interview feedback, and warns me when a hiring process is stalling or a strong candidate is cooling off.",
  },
  {
    id: "market-watch-brief",
    title: "Market watch brief",
    summary: "Monitor a market, niche, or trend and send only the meaningful shifts.",
    category: "Research",
    audience: "both",
    type: "automation",
    verticalId: "research-monitoring",
    prompt:
      "Create a market watch brief that monitors the topics I care about, ranks what matters, filters out noise, and sends me a concise summary only when there is a meaningful change or opportunity.",
  },
  {
    id: "founder-chief-of-staff",
    title: "Founder chief-of-staff",
    summary: "Prepare the founder, summarize the business, and keep follow-ups moving.",
    category: "Leadership",
    audience: "business",
    type: "agent",
    verticalId: "freelancer-project-coordination",
    prompt:
      "Build me a founder chief-of-staff agent that summarizes priorities, important messages, meetings, follow-ups, and business changes so I can see what matters quickly each day.",
  },
  {
    id: "freelancer-project-coordinator",
    title: "Freelancer project coordinator",
    summary: "Keep projects, revisions, assets, and client nudges moving in one place.",
    category: "Operations",
    audience: "both",
    type: "automation",
    verticalId: "freelancer-project-coordination",
    prompt:
      "Create a freelancer project coordinator that tracks project stages, follows up on missing assets and feedback, manages revision reminders, and keeps me updated on what needs attention today.",
  },
];

export const STARTER_TEMPLATES: StarterTemplate[] = [
  ...PERSONAL_TEMPLATES,
  ...BUSINESS_TEMPLATES,
];

export const PERSONAL_STARTER_TEMPLATES = PERSONAL_TEMPLATES;
export const BUSINESS_STARTER_TEMPLATES = BUSINESS_TEMPLATES;
