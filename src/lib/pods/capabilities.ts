import type { PodCapability, PodCapabilityKind, PodRiskLevel } from "@/lib/pods/types";

type CapabilityTemplate = Omit<PodCapability, "required"> & {
  keywords: RegExp;
};

const CAPABILITY_LIBRARY: CapabilityTemplate[] = [
  {
    id: "conversation.respond",
    kind: "conversation",
    title: "Conversation handling",
    purpose: "Talk with people through a channel while following the Pod rules.",
    riskLevel: "medium",
    requiredTools: [],
    inputs: ["message", "known context", "policy"],
    outputs: ["reply draft", "handoff decision"],
    runtime: "conversation",
    keywords: /chat|reply|respond|answer|reception|receptionist|support|customer|lead|inbox|message|whatsapp|sms|email|call|voice/i,
  },
  {
    id: "workflow.triggered-run",
    kind: "workflow",
    title: "Triggered work",
    purpose: "Run repeatable steps when something happens or on a schedule.",
    riskLevel: "low",
    requiredTools: [],
    inputs: ["trigger payload", "schedule", "event"],
    outputs: ["run log", "step outputs"],
    runtime: "event",
    keywords: /when|every|daily|weekly|schedule|monitor|watch|trigger|if|after|before|follow up|follow-up|remind/i,
  },
  {
    id: "reasoning.classify-and-decide",
    kind: "reasoning",
    title: "Classify and decide",
    purpose: "Interpret messy inputs, classify intent, choose the next safe action, and explain why.",
    riskLevel: "medium",
    requiredTools: [],
    inputs: ["input", "rules", "memory"],
    outputs: ["decision", "confidence", "reasoning"],
    runtime: "instant",
    keywords: /qualify|classify|decide|triage|route|detect|flag|prioritize|judge|recommend|analyze|review/i,
  },
  {
    id: "document.extract-summarize",
    kind: "document",
    title: "Document understanding",
    purpose: "Read files, extract important fields, summarize, and flag unusual items.",
    riskLevel: "low",
    requiredTools: [],
    inputs: ["file", "email attachment", "document text"],
    outputs: ["summary", "extracted fields", "flags"],
    runtime: "file",
    keywords: /invoice|receipt|pdf|document|contract|file|attachment|summarize|extract|scan|statement/i,
  },
  {
    id: "tool.send-message",
    kind: "tool",
    title: "Send messages",
    purpose: "Send approved messages through email, SMS, WhatsApp, Slack, or another connected channel.",
    riskLevel: "medium",
    requiredTools: ["email"],
    inputs: ["recipient", "message", "channel"],
    outputs: ["delivery status"],
    runtime: "event",
    keywords: /send|notify|email|sms|text|whatsapp|slack|message|follow up|follow-up/i,
  },
  {
    id: "tool.update-records",
    kind: "tool",
    title: "Update records",
    purpose: "Create or update CRM rows, tickets, tasks, sheets, orders, or other approved records.",
    riskLevel: "medium",
    requiredTools: [],
    inputs: ["record data", "mapping", "connection"],
    outputs: ["record id", "update status"],
    runtime: "event",
    keywords: /crm|sheet|spreadsheet|ticket|task|record|notion|airtable|hubspot|salesforce|zendesk|asana|trello|clickup|update|log|create/i,
  },
  {
    id: "tool.calendar-booking",
    kind: "tool",
    title: "Booking and calendar",
    purpose: "Check availability, prepare bookings, and manage scheduling within approval boundaries.",
    riskLevel: "medium",
    requiredTools: ["calendar"],
    inputs: ["requested time", "calendar rules", "contact details"],
    outputs: ["booking draft", "calendar event"],
    runtime: "event",
    keywords: /book|booking|appointment|calendar|schedule|meeting|reservation|availability/i,
  },
  {
    id: "approval.guardrails",
    kind: "approval",
    title: "Approval guardrails",
    purpose: "Pause risky work, show a preview, and ask the user before anything sensitive happens.",
    riskLevel: "high",
    requiredTools: [],
    inputs: ["proposed action", "risk reason", "preview"],
    outputs: ["approval request", "decision"],
    runtime: "manual",
    keywords: /approve|approval|permission|refund|charge|payment|discount|delete|cancel|contract|legal|sensitive|high value|risk/i,
  },
  {
    id: "memory.preferences",
    kind: "memory",
    title: "Preference memory",
    purpose: "Remember rules, tone, examples, and corrections for this Pod.",
    riskLevel: "low",
    requiredTools: [],
    inputs: ["user corrections", "approved examples", "profile facts"],
    outputs: ["rules", "preferences", "examples"],
    runtime: "instant",
    keywords: /remember|learn|tone|style|preference|always|never|policy|rules|like this|example/i,
  },
  {
    id: "reporting.outcomes",
    kind: "reporting",
    title: "Outcome reporting",
    purpose: "Report what the Pod handled, what needs attention, and what changed.",
    riskLevel: "low",
    requiredTools: [],
    inputs: ["activity events", "run results", "metrics"],
    outputs: ["summary", "exceptions", "metrics"],
    runtime: "scheduled",
    keywords: /report|summary|summarize|digest|briefing|what happened|daily|weekly|status|metrics/i,
  },
  {
    id: "handoff.escalate",
    kind: "handoff",
    title: "Human handoff",
    purpose: "Escalate uncertain, emotional, high-risk, or out-of-scope situations with context.",
    riskLevel: "high",
    requiredTools: [],
    inputs: ["conversation", "risk flags", "confidence"],
    outputs: ["handoff note", "owner notification"],
    runtime: "manual",
    keywords: /escalate|handoff|human|owner|angry|complaint|unclear|urgent|emergency|manager/i,
  },
];

const DEFAULT_CAPABILITY_IDS = [
  "reasoning.classify-and-decide",
  "approval.guardrails",
  "memory.preferences",
  "reporting.outcomes",
];

export function resolvePodCapabilities(prompt: string): PodCapability[] {
  const selected = new Map<string, PodCapability>();

  for (const template of CAPABILITY_LIBRARY) {
    if (template.keywords.test(prompt) || DEFAULT_CAPABILITY_IDS.includes(template.id)) {
      const { keywords: _keywords, ...capability } = template;
      selected.set(capability.id, {
        ...capability,
        required: DEFAULT_CAPABILITY_IDS.includes(capability.id) || template.keywords.test(prompt),
      });
    }
  }

  return Array.from(selected.values()).sort((a, b) => capabilitySort(a.kind) - capabilitySort(b.kind));
}

export function summarizeCapabilityKinds(capabilities: PodCapability[]) {
  return Array.from(new Set(capabilities.map((capability) => capability.kind)));
}

export function highestRisk(capabilities: PodCapability[]): PodRiskLevel {
  if (capabilities.some((capability) => capability.riskLevel === "high")) return "high";
  if (capabilities.some((capability) => capability.riskLevel === "medium")) return "medium";
  return "low";
}

function capabilitySort(kind: PodCapabilityKind) {
  const order: Record<PodCapabilityKind, number> = {
    reasoning: 0,
    conversation: 1,
    document: 2,
    workflow: 3,
    tool: 4,
    approval: 5,
    memory: 6,
    reporting: 7,
    notification: 8,
    handoff: 9,
  };

  return order[kind];
}
