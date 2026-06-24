import type { OfficeDepartmentId } from "@/lib/office/types";

export interface VerticalPlaybook {
  departmentId: OfficeDepartmentId;
  baseline: string;
  operatingPrinciples: string[];
  qualityBar: string[];
  escalationTriggers: string[];
}

export const VERTICAL_PLAYBOOKS: Partial<Record<OfficeDepartmentId, VerticalPlaybook>> = {
  sales: {
    departmentId: "sales",
    baseline: "Lead-gen and CRM tools are the floor; Dobly must qualify, prioritize, follow up, and preserve context across the whole office.",
    operatingPrinciples: [
      "Speed-to-lead matters most when intent is hot.",
      "Every follow-up should add proof, clarity, or a concrete next step.",
      "Do not push bad-fit leads into proposals just to create activity.",
    ],
    qualityBar: [
      "Capture need, timeline, budget/value, location, and decision-maker.",
      "Score lead urgency and value before recommending owner attention.",
      "Create the next follow-up with a reason, channel, and deadline.",
    ],
    escalationTriggers: [
      "High-value lead with unclear pricing or custom terms.",
      "Customer asks for contract, discount, refund, or legal commitment.",
      "Lead mentions competitor, deadline today, or urgent purchase intent.",
    ],
  },
  support: {
    departmentId: "support",
    baseline: "Ticket bots are the floor; Dobly must protect trust, maintain memory, and turn recurring pain into better operations.",
    operatingPrinciples: [
      "Acknowledge first, solve second, never sound defensive.",
      "Sensitive cases need supervised autonomy until the business has enough examples.",
      "Every recurring issue should become a Training Room rule or knowledge item.",
    ],
    qualityBar: [
      "Classify severity, customer emotion, likely cause, and missing details.",
      "Separate safe replies from compensation, liability, and policy exceptions.",
      "Leave a clear next action on the support case.",
    ],
    escalationTriggers: [
      "Refund, cancellation, legal threat, angry customer, chargeback, or public complaint.",
      "Private information, financial data, or account access request.",
      "Repeated complaint about the same product, supplier, or process.",
    ],
  },
  finance: {
    departmentId: "finance",
    baseline: "Accounting tools are the floor; Dobly must keep cash pressure visible and route money actions through guardrails.",
    operatingPrinciples: [
      "Never invent balances, payment status, or tax advice.",
      "Clean reconciliation beats fast reconciliation.",
      "Cash collection should be respectful, specific, and logged.",
    ],
    qualityBar: [
      "Capture amount, currency, payer, reference, due date, and confidence.",
      "Match payments only when reference and amount are clean.",
      "Queue owner review for disputes, penalties, discounts, and write-offs.",
    ],
    escalationTriggers: [
      "Mismatch between amount, payer, invoice, or payment reference.",
      "Customer disputes payment, asks for payment plan, refund, or penalty removal.",
      "Any instruction to move money, delete records, or alter amounts.",
    ],
  },
  operations: {
    departmentId: "operations",
    baseline: "Task/project tools are the floor; Dobly must expose blockers before they damage customers.",
    operatingPrinciples: [
      "Every operations item needs owner, dependency, deadline, and customer impact.",
      "Do not create motion without deciding the blocker.",
      "Supplier and fulfillment failures should surface early to Sales and Support.",
    ],
    qualityBar: [
      "Identify whether the item is order, inventory, supplier, delivery, or internal process.",
      "Write the next action as a concrete assignment.",
      "Escalate blockers that affect customer promises or revenue.",
    ],
    escalationTriggers: [
      "Blocked order, delayed delivery, stockout, failed supplier handoff, or angry customer.",
      "No owner or deadline on an item affecting a customer.",
      "Repeated failure in the same operational process.",
    ],
  },
  marketing: {
    departmentId: "marketing",
    baseline: "Schedulers and AI writers are the floor; Dobly must convert real business pressure into content that sells and teaches.",
    operatingPrinciples: [
      "Content should come from customer language, objections, proof, and strategy.",
      "Do not invent offers, results, testimonials, or claims.",
      "Repurpose only after the core message is sharp.",
    ],
    qualityBar: [
      "State audience, pain, promise, proof, channel, and call to action.",
      "Separate idea, draft, approval, scheduled, published, and performance states.",
      "Use support questions and sales objections as content inputs.",
    ],
    escalationTriggers: [
      "Unapproved claim, price, promotion, testimonial, or regulated advice.",
      "Post references customer data or private business information.",
      "Campaign depends on a product, stock, or service promise operations cannot support.",
    ],
  },
  reception: {
    departmentId: "reception",
    baseline: "Chat widgets are the floor; Dobly must route every inbound signal to the correct department with memory and urgency.",
    operatingPrinciples: [
      "The first response should reduce uncertainty.",
      "Routing is as important as replying.",
      "Low-risk answers can move fast; trust, money, and legal signals pause.",
    ],
    qualityBar: [
      "Classify intent, risk, channel, customer identity, and next department.",
      "Draft a short response that asks only for missing information.",
      "Create the right record: lead, support case, finance record, or operations item.",
    ],
    escalationTriggers: [
      "Urgent purchase, angry complaint, payment issue, confidential request, or legal wording.",
      "Message cannot be answered from approved memory.",
      "The same person has multiple open issues across departments.",
    ],
  },
};

export function getVerticalPlaybook(departmentId: OfficeDepartmentId) {
  return VERTICAL_PLAYBOOKS[departmentId] ?? null;
}

export function formatPlaybookForArtifact(departmentId: OfficeDepartmentId) {
  const playbook = getVerticalPlaybook(departmentId);
  if (!playbook) return null;

  return [
    `Vertical baseline: ${playbook.baseline}`,
    `Quality bar: ${playbook.qualityBar.join(" ")}`,
    `Escalate when: ${playbook.escalationTriggers.join(" ")}`,
  ].join("\n");
}
