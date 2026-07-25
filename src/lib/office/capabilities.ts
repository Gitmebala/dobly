import type { OfficeDepartmentId, OfficeRiskLevel } from "@/lib/office/types";
import { formatPlaybookForArtifact } from "@/lib/office/vertical-playbooks";
import { createConversationReply } from "@/lib/anthropic";

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

interface ArtifactSpec {
  kind: OfficeExecutionArtifactKind;
  title: string;
  guidance: string;
}

function artifactSpecsForWorker(workerKey: string): ArtifactSpec[] {
  const specs: ArtifactSpec[] = [];
  if (/communication|front_desk|chatbot|whatsapp|sms|email|reception/.test(workerKey)) {
    specs.push({ kind: "reply_draft", title: "Customer-ready response", guidance: "Write the actual reply Dobly would send, grounded only in the provided context. Ask a clarifying question instead of inventing missing facts." });
  }
  if (/lead|qualification/.test(workerKey)) {
    specs.push({ kind: "lead_score", title: "Lead qualification", guidance: "Assess purchase/booking intent from the actual text. State what's missing to qualify and the concrete next step." });
  }
  if (/followup|follow_up|proposal|sales/.test(workerKey)) {
    specs.push({ kind: "follow_up_plan", title: "Sales follow-up plan", guidance: "Propose a short, specific follow-up sequence grounded in the actual deal context given, not a generic 3-touch template." });
  }
  if (/invoice|payment|receipt|finance|reconciliation/.test(workerKey)) {
    specs.push({ kind: "finance_check", title: "Finance check", guidance: "Using the actual amount, reference, and payer/invoice details given, describe the specific reconciliation or reminder action. Flag mismatches rather than forcing a match." });
  }
  if (/support|ticket|recovery|faq/.test(workerKey)) {
    specs.push({ kind: "support_triage", title: "Support triage", guidance: "Assess the actual customer message for urgency and emotional sensitivity. If it reads as a complaint or refund/legal risk, say so explicitly and recommend escalation." });
  }
  if (/content|campaign|newsletter|social/.test(workerKey)) {
    specs.push({ kind: "content_package", title: "Content package", guidance: "Turn the actual idea/context into a specific angle and 1-2 concrete asset ideas. Never invent offers, claims, testimonials, or pricing not present in context." });
  }
  if (/operations|supplier|order|task_coordination/.test(workerKey)) {
    specs.push({ kind: "operations_plan", title: "Operations next-move plan", guidance: "Identify the actual owner, blocker, deadline, and customer impact from context, and the specific next move." });
  }
  if (/briefing|general_manager|board/.test(workerKey) || specs.length === 0) {
    specs.push({ kind: "briefing", title: "Briefing", guidance: "Summarize what changed, what needs a decision, and the one next move the owner should consider, using only the actual context given." });
  }
  return specs;
}

function fallbackArtifact(spec: ArtifactSpec, payload: Record<string, any>): OfficeExecutionArtifact {
  const text = textFromPayload(payload);
  return {
    kind: spec.kind,
    title: spec.title,
    body: `${spec.guidance} Context: ${text.slice(0, 300)}`,
    confidence: "low",
    nextAction: "Review manually — automatic drafting was unavailable.",
  };
}

async function generateArtifact(spec: ArtifactSpec, workerKey: string, departmentId: OfficeDepartmentId, task: Record<string, any>): Promise<OfficeExecutionArtifact> {
  const payload = (task.tool_payload ?? {}) as Record<string, any>;
  const text = textFromPayload(payload);
  const amount = moneyText(payload);

  try {
    const raw = await createConversationReply({
      system: `You are producing one work artifact for a Dobly office worker ("${workerKey}", ${departmentId} department). ${spec.guidance} Ground every claim in the given context — never invent facts, offers, prices, or promises. Respond with ONLY valid JSON: {"body": string, "confidence": "low"|"medium"|"high", "nextAction": string}. body should be 1-4 sentences.`,
      messages: [
        {
          role: "user",
          content: `Task: ${String(task.title ?? "")}\nSummary: ${String(task.summary ?? "")}\nAmount (if relevant): ${amount}\nContext: ${text}`,
        },
      ],
      maxTokens: 350,
    });
    const parsed = JSON.parse(raw) as { body: string; confidence: "low" | "medium" | "high"; nextAction: string };
    return {
      kind: spec.kind,
      title: spec.title,
      body: parsed.body,
      confidence: parsed.confidence,
      nextAction: parsed.nextAction,
    };
  } catch {
    return fallbackArtifact(spec, payload);
  }
}

export async function buildOfficeWorkerExecutionPlan(task: Record<string, any>): Promise<OfficeWorkerExecutionPlan> {
  const workerKey = String(task.worker_key ?? "unknown_worker");
  const departmentId = String(task.department_id ?? "general_manager") as OfficeDepartmentId;
  const riskLevel = String(task.risk_level ?? "medium") as OfficeRiskLevel;
  const specs = artifactSpecsForWorker(workerKey);

  const artifacts = await Promise.all(specs.map((spec) => generateArtifact(spec, workerKey, departmentId, task)));

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
