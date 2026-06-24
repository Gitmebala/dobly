import type { OfficeDepartmentId, OfficeRiskLevel } from "@/lib/office/types";
import { formatPlaybookForArtifact } from "@/lib/office/vertical-playbooks";

export type OfficeExecutionArtifactKind =
  | "reply_draft"
  | "lead_score"
  | "follow_up_plan"
  | "finance_check"
  | "support_triage"
  | "content_package"
  | "operations_plan"
  | "briefing"
  | "connection_action";

export interface OfficeExecutionArtifact {
  kind: OfficeExecutionArtifactKind;
  title: string;
  body: string;
  confidence: "low" | "medium" | "high";
  nextAction?: string;
}

export interface OfficeWorkerExecutionPlan {
  workerKey: string;
  departmentId: OfficeDepartmentId;
  objective: string;
  riskLevel: OfficeRiskLevel;
  artifacts: OfficeExecutionArtifact[];
  approvalReason: string | null;
  successMetric: string;
}

function textFromPayload(payload: Record<string, any>) {
  const direct = [
    payload.body,
    payload.message,
    payload.summary,
    payload.title,
    payload?.draft?.summary,
    payload?.inbound?.body,
    payload?.payload?.body,
  ].find((value) => typeof value === "string" && value.trim().length > 0);

  return String(direct ?? JSON.stringify(payload)).slice(0, 900);
}

function moneyText(payload: Record<string, any>) {
  const amount = payload.amount ?? payload?.payload?.amount ?? payload?.invoice?.amount;
  const currency = payload.currency ?? payload?.payload?.currency ?? "KES";
  return amount ? `${currency} ${amount}` : "the open amount";
}

function approvalReason(riskLevel: OfficeRiskLevel, workerKey: string) {
  if (riskLevel === "critical" || riskLevel === "high") return "High-risk work must be reviewed before execution.";
  if (/finance|invoice|payment|refund|recovery|proposal|newsletter/.test(workerKey)) {
    return "This affects money, customer trust, or outbound communication.";
  }
  return null;
}

function communicationArtifact(payload: Record<string, any>): OfficeExecutionArtifact {
  const draft = payload?.draft?.suggestedReply ?? payload.body ?? "I prepared a response using current Homebase memory.";
  return {
    kind: "reply_draft",
    title: "Customer-ready response",
    body: String(draft),
    confidence: payload?.draft?.riskLevel === "low" ? "high" : "medium",
    nextAction: "Send after approval or route to the correct department.",
  };
}

function leadScoreArtifact(payload: Record<string, any>): OfficeExecutionArtifact {
  const text = textFromPayload(payload);
  const hot = /(urgent|today|now|price|quote|book|buy|available|call)/i.test(text);
  return {
    kind: "lead_score",
    title: hot ? "Hot lead detected" : "Lead needs qualification",
    body: hot
      ? "The lead shows purchase or booking intent. Ask one clarifying question, then move quickly to scheduling or proposal."
      : "The lead is not fully qualified yet. Capture need, budget/timeline, location, and decision-maker before escalating.",
    confidence: hot ? "high" : "medium",
    nextAction: hot ? "Create a sales follow-up task within 15 minutes." : "Ask a qualification question.",
  };
}

function followUpArtifact(payload: Record<string, any>): OfficeExecutionArtifact {
  const text = textFromPayload(payload);
  return {
    kind: "follow_up_plan",
    title: "Sales follow-up sequence",
    body: [
      "Touch 1: helpful reply that confirms the need and asks for the next concrete step.",
      "Touch 2: reminder with one proof point or example.",
      "Touch 3: polite close-the-loop message if there is no response.",
      `Context used: ${text.slice(0, 220)}`,
    ].join("\n"),
    confidence: "medium",
    nextAction: "Send touch 1 now, then schedule follow-ups only inside the configured cadence.",
  };
}

function financeArtifact(workerKey: string, payload: Record<string, any>): OfficeExecutionArtifact {
  const amount = moneyText(payload);
  const title = workerKey.includes("reconciliation") || workerKey.includes("receipt")
    ? "Payment reconciliation check"
    : "Invoice/payment follow-up";

  return {
    kind: "finance_check",
    title,
    body: workerKey.includes("reconciliation") || workerKey.includes("receipt")
      ? `Compare provider reference, payer, timestamp, and ${amount} against open invoices. Flag mismatch instead of forcing a match.`
      : `Prepare a respectful reminder for ${amount}, mention the invoice/reference if available, and escalate disputes or promises to pay.`,
    confidence: "medium",
    nextAction: "Update invoice/payment status only when the match is clean.",
  };
}

function supportArtifact(payload: Record<string, any>): OfficeExecutionArtifact {
  const text = textFromPayload(payload);
  const angry = /(angry|terrible|refund|cancel|broken|complaint|lawsuit|legal)/i.test(text);
  return {
    kind: "support_triage",
    title: angry ? "Sensitive support case" : "Support triage",
    body: angry
      ? "Acknowledge the customer, avoid blame or liability, gather order/account details, and escalate before compensation."
      : "Answer from approved memory where possible, ask for missing details, and create a ticket if resolution needs follow-up.",
    confidence: angry ? "high" : "medium",
    nextAction: angry ? "Queue owner review before sending." : "Reply or route to support workflow.",
  };
}

function contentArtifact(payload: Record<string, any>): OfficeExecutionArtifact {
  const text = textFromPayload(payload);
  return {
    kind: "content_package",
    title: "Content package",
    body: [
      "Angle: turn the business idea into a specific customer problem and outcome.",
      "Assets: one short post, one longer caption/newsletter seed, and one visual brief.",
      "Guardrail: do not invent offers, claims, testimonials, or pricing.",
      `Idea/context: ${text.slice(0, 260)}`,
    ].join("\n"),
    confidence: "medium",
    nextAction: "Queue draft for owner approval, then schedule only approved versions.",
  };
}

function operationsArtifact(payload: Record<string, any>): OfficeExecutionArtifact {
  return {
    kind: "operations_plan",
    title: "Operations next-move plan",
    body: "Identify owner, blocker, deadline, dependency, and customer impact. Create or update the operational task before sending reminders.",
    confidence: "medium",
    nextAction: "Create the internal task and escalate any blocker affecting customer commitments.",
  };
}

function briefingArtifact(departmentId: OfficeDepartmentId): OfficeExecutionArtifact {
  return {
    kind: "briefing",
    title: `${departmentId.replaceAll("_", " ")} briefing`,
    body: "Summarize what changed, what needs a decision, what risk is building, and the one next move the owner should consider.",
    confidence: "medium",
    nextAction: "Attach briefing to Homebase and surface it in the General Manager feed.",
  };
}

export function buildOfficeWorkerExecutionPlan(task: Record<string, any>): OfficeWorkerExecutionPlan {
  const workerKey = String(task.worker_key ?? "unknown_worker");
  const departmentId = String(task.department_id ?? "general_manager") as OfficeDepartmentId;
  const riskLevel = String(task.risk_level ?? "medium") as OfficeRiskLevel;
  const payload = (task.tool_payload ?? {}) as Record<string, any>;
  const artifacts: OfficeExecutionArtifact[] = [];

  if (/communication|front_desk|chatbot|whatsapp|sms|email|reception/.test(workerKey)) {
    artifacts.push(communicationArtifact(payload));
  }
  if (/lead|qualification/.test(workerKey)) artifacts.push(leadScoreArtifact(payload));
  if (/followup|follow_up|proposal|sales/.test(workerKey)) artifacts.push(followUpArtifact(payload));
  if (/invoice|payment|receipt|finance|reconciliation/.test(workerKey)) artifacts.push(financeArtifact(workerKey, payload));
  if (/support|ticket|recovery|faq/.test(workerKey)) artifacts.push(supportArtifact(payload));
  if (/content|campaign|newsletter|social/.test(workerKey)) artifacts.push(contentArtifact(payload));
  if (/operations|supplier|order|task_coordination/.test(workerKey)) artifacts.push(operationsArtifact(payload));
  if (/briefing|general_manager|board/.test(workerKey) || artifacts.length === 0) {
    artifacts.push(briefingArtifact(departmentId));
  }

  return {
    workerKey,
    departmentId,
    objective: String(task.summary ?? task.title ?? "Complete the office task."),
    riskLevel,
    artifacts: artifacts.map((artifact) => enrichWithPlaybook(artifact, departmentId)),
    approvalReason: approvalReason(riskLevel, workerKey),
    successMetric: successMetricForWorker(workerKey, departmentId),
  };
}

function successMetricForWorker(workerKey: string, departmentId: OfficeDepartmentId) {
  if (/lead|sales|proposal/.test(workerKey) || departmentId === "sales") return "qualified leads moved or followed up";
  if (/invoice|payment|finance|receipt/.test(workerKey) || departmentId === "finance") return "cash visibility improved";
  if (/support|ticket|recovery/.test(workerKey) || departmentId === "support") return "customer issue moved toward resolution";
  if (/content|campaign|newsletter|social/.test(workerKey) || departmentId === "marketing") return "approved content assets created";
  if (/operations|supplier|order/.test(workerKey) || departmentId === "operations") return "blocked operational work unblocked";
  if (departmentId === "reception") return "inbound conversation handled or routed";
  return "owner clarity improved";
}

function enrichWithPlaybook(artifact: OfficeExecutionArtifact, departmentId: OfficeDepartmentId): OfficeExecutionArtifact {
  const playbook = formatPlaybookForArtifact(departmentId);
  if (!playbook) return artifact;

  return {
    ...artifact,
    body: `${artifact.body}\n\n${playbook}`,
  };
}
