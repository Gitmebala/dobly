import type { PodSpec } from "@/lib/pods/types";

export type VerticalBaselineId =
  | "lead-generation"
  | "sales-crm"
  | "content-social"
  | "support-chat"
  | "finance-reconciliation"
  | "whatsapp-reception"
  | "workflow-automation"
  | "research-monitoring";

export interface VerticalCompetitorBaseline {
  id: VerticalBaselineId;
  title: string;
  departmentId: string;
  competitorBaseline: string[];
  mustMatch: string[];
  doblyAdvantage: string[];
  workerDepth: string[];
}

export const VERTICAL_COMPETITOR_BASELINES: VerticalCompetitorBaseline[] = [
  {
    id: "lead-generation",
    title: "Lead generation and enrichment",
    departmentId: "sales",
    competitorBaseline: ["Mapleads", "Apollo", "Clay", "ZoomInfo", "Instantly"],
    mustMatch: [
      "Find and enrich prospects from a target ICP, geography, niche, or signal.",
      "Deduplicate people and companies across prior outreach, CRM, inbox, and imports.",
      "Score leads by fit, timing, buying signal, and reachable contact quality.",
      "Generate segmented outreach angles with source-backed context.",
      "Track reply, booked meeting, disqualified, bounced, and no-reply states.",
    ],
    doblyAdvantage: [
      "Use Homebase memory to avoid pitching customers, suppliers, and already-contacted people.",
      "Hand qualified leads directly to Sales, Content Studio, Reception, or the General Manager.",
      "Tie lead quality to actual revenue outcomes, not only list size or email replies.",
    ],
    workerDepth: [
      "ICP builder",
      "Lead source finder",
      "Enrichment and dedupe",
      "Fit and intent scorer",
      "Sequence planner",
      "Pipeline handoff",
    ],
  },
  {
    id: "sales-crm",
    title: "CRM and sales follow-up",
    departmentId: "sales",
    competitorBaseline: ["HubSpot", "Pipedrive", "Close", "Salesforce", "Folk"],
    mustMatch: [
      "Represent pipeline stages, next actions, deal value, contacts, and history.",
      "Create follow-up tasks automatically from conversations and stalled stages.",
      "Produce deal summaries, objections, next-best-action, and forecast risk.",
      "Support proposal, contract, and meeting handoffs.",
    ],
    doblyAdvantage: [
      "Read across support, finance, reception, and content signals before recommending the next move.",
      "Let the General Manager flag revenue risk before a pipeline report is opened.",
    ],
    workerDepth: ["Pipeline hygiene", "Follow-up reasoning", "Proposal drafting", "Objection memory", "Forecast risk"],
  },
  {
    id: "content-social",
    title: "Content and social operations",
    departmentId: "marketing",
    competitorBaseline: ["Buffer", "Hootsuite", "Later", "Metricool", "Canva"],
    mustMatch: [
      "Plan campaigns, create drafts, adapt per channel, schedule, and track performance.",
      "Understand platform differences across LinkedIn, X, Instagram, TikTok, email, and blog.",
      "Repurpose long-form source material into multiple channel-native assets.",
      "Summarize what worked and recommend next content.",
    ],
    doblyAdvantage: [
      "Pull content ideas from sales objections, support issues, customer wins, and market signals.",
      "Route high-intent comments and DMs into Reception or Sales automatically.",
    ],
    workerDepth: ["Strategy", "Drafting", "Repurposing", "Publishing", "Community routing", "Performance analysis"],
  },
  {
    id: "support-chat",
    title: "Support chat and ticket triage",
    departmentId: "support",
    competitorBaseline: ["Intercom", "Zendesk", "Freshdesk", "Tidio", "Crisp"],
    mustMatch: [
      "Unify inbound tickets and conversations across channels.",
      "Classify urgency, sentiment, customer tier, issue type, and refund risk.",
      "Answer from a knowledge base and escalate when policy or confidence requires it.",
      "Maintain customer history and recurring issue reports.",
    ],
    doblyAdvantage: [
      "Inform Operations when support patterns point to delivery or supplier problems.",
      "Inform Content Studio when repeated questions should become FAQ or education content.",
    ],
    workerDepth: ["Triage", "Knowledge retrieval", "Draft replies", "Escalation", "Root-cause reporting"],
  },
  {
    id: "finance-reconciliation",
    title: "Invoicing and payment reconciliation",
    departmentId: "finance",
    competitorBaseline: ["QuickBooks", "Xero", "Stripe Billing", "Zoho Books", "Wave"],
    mustMatch: [
      "Track invoices, overdue aging, payments, receipts, expenses, and reconciliation gaps.",
      "Stop reminders once payment is detected and flag partial or ambiguous matches.",
      "Produce cash, overdue, recovered, and risk summaries.",
      "Support M-PESA, Stripe, bank, invoice, and spreadsheet workflows.",
    ],
    doblyAdvantage: [
      "Use Sales and Reception context before chasing a customer.",
      "Let the General Manager connect cash risk to operations and growth decisions.",
    ],
    workerDepth: ["Invoice watcher", "Reminder cadence", "Payment matching", "Exception handling", "Cash briefing"],
  },
  {
    id: "whatsapp-reception",
    title: "WhatsApp and front desk automation",
    departmentId: "reception",
    competitorBaseline: ["WATI", "Respond.io", "Manychat", "Twilio", "Interakt"],
    mustMatch: [
      "Handle WhatsApp/web/social inbound, templates, routing, first response, and handoff.",
      "Qualify the sender, intent, urgency, and required department.",
      "Respect approved business knowledge, hours, escalation rules, and consent.",
    ],
    doblyAdvantage: [
      "Treat Reception as the front door to the whole business, not just a message automation inbox.",
      "Use Filing Cabinet memory to identify repeat customers, leads, unpaid accounts, or support history.",
    ],
    workerDepth: ["Intent detection", "Identity matching", "FAQ answering", "Lead capture", "Routing", "Escalation"],
  },
  {
    id: "workflow-automation",
    title: "Workflow automation and agent orchestration",
    departmentId: "operations",
    competitorBaseline: ["Zapier", "Make", "n8n", "Bardeen", "Relay.app"],
    mustMatch: [
      "Support triggers, tool actions, branching, retries, schedules, approvals, and logs.",
      "Let users compose repeat work without code.",
      "Handle failures visibly and replay or retry safely.",
    ],
    doblyAdvantage: [
      "Compile work into named coworkers inside departments instead of anonymous zaps.",
      "Use General Manager oversight to connect automation failures to business impact.",
    ],
    workerDepth: ["Triggering", "Tool calling", "Branching", "Approval gates", "Retries", "Observability"],
  },
  {
    id: "research-monitoring",
    title: "Research and market monitoring",
    departmentId: "growth",
    competitorBaseline: ["Perplexity", "Crayon", "Similarweb", "Google Alerts", "Feedly"],
    mustMatch: [
      "Track competitors, topics, market changes, pricing, funding, launches, and opportunity signals.",
      "Deduplicate repeated stories and rank by business relevance.",
      "Produce source-aware briefs and alerts only when thresholds are met.",
    ],
    doblyAdvantage: [
      "Turn signals into work for Sales, Content Studio, Growth, or Boardroom.",
      "Compare market signals against the actual business strategy in Homebase.",
    ],
    workerDepth: ["Watchlists", "Source comparison", "Signal scoring", "Briefing", "Opportunity handoff"],
  },
];

export function inferVerticalBaselineForPrompt(prompt: string): VerticalCompetitorBaseline {
  const text = prompt.toLowerCase();
  if (/(lead|prospect|outbound|enrich|apollo|mapleads|clay|qualified)/.test(text)) return VERTICAL_COMPETITOR_BASELINES[0];
  if (/(crm|deal|pipeline|proposal|sales follow|quote|contract)/.test(text)) return VERTICAL_COMPETITOR_BASELINES[1];
  if (/(content|social|post|instagram|tiktok|linkedin|newsletter|campaign)/.test(text)) return VERTICAL_COMPETITOR_BASELINES[2];
  if (/(support|ticket|refund|helpdesk|complaint|customer issue)/.test(text)) return VERTICAL_COMPETITOR_BASELINES[3];
  if (/(invoice|payment|mpesa|m-pesa|stripe|reconcile|expense|cash)/.test(text)) return VERTICAL_COMPETITOR_BASELINES[4];
  if (/(whatsapp|reception|front desk|inquiry|booking|chatbot)/.test(text)) return VERTICAL_COMPETITOR_BASELINES[5];
  if (/(workflow|automation|zapier|make|n8n|trigger)/.test(text)) return VERTICAL_COMPETITOR_BASELINES[6];
  if (/(research|monitor|competitor|market|opportunity|watchlist)/.test(text)) return VERTICAL_COMPETITOR_BASELINES[7];
  return VERTICAL_COMPETITOR_BASELINES[6];
}

export function inferDepartmentForPod(spec: PodSpec) {
  return inferVerticalBaselineForPrompt(`${spec.label} ${spec.sourcePrompt} ${spec.purpose}`).departmentId;
}
