import { assessAutonomyGate, type AutonomyGateDecision } from "@/lib/safety/autonomy";
import type { OfficeEventType, OfficeRiskLevel, OfficeRuntimeKind } from "@/lib/office/types";

export type AgentCognitionDecision = "act_now" | "ask_owner" | "simulate_first" | "prepare_only";

export interface RichContextItem {
  kind: "text" | "image" | "file" | "record" | "connection" | "memory" | "tool_result";
  title: string;
  summary: string;
  confidence?: "low" | "medium" | "high";
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentCognitionInput {
  command: string;
  eventType: OfficeEventType;
  riskLevel: OfficeRiskLevel;
  runtimeKind?: OfficeRuntimeKind;
  title: string;
  source: string;
  richContext?: RichContextItem[];
  availableTools?: string[];
}

export interface AgentCognitionCycle {
  observe: {
    command: string;
    signals: string[];
    contextUsed: RichContextItem[];
    missingContext: string[];
  };
  understand: {
    intent: string;
    operatingDomain: "customer" | "revenue" | "cash" | "delivery" | "content" | "strategy" | "general";
    riskLevel: OfficeRiskLevel;
    assumptions: string[];
  };
  plan: {
    objective: string;
    steps: string[];
    proposedTools: string[];
    expectedOutput: string;
  };
  critique: {
    failureModes: string[];
    saferRevision: string;
    approvalQuestion: string | null;
  };
  autonomy: AutonomyGateDecision;
  decision: {
    mode: AgentCognitionDecision;
    reason: string;
    ownerVisibleSummary: string;
  };
  learn: {
    memoryWrites: string[];
    ruleCandidateSignals: string[];
  };
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function operatingDomain(command: string): AgentCognitionCycle["understand"]["operatingDomain"] {
  const text = command.toLowerCase();
  if (hasAny(text, [/customer|support|complaint|ticket|reply|message|whatsapp|email|dm|call/])) return "customer";
  if (hasAny(text, [/lead|sales|pipeline|quote|proposal|prospect|book|booking/])) return "revenue";
  if (hasAny(text, [/invoice|payment|cash|mpesa|m-pesa|stripe|refund|collection|expense/])) return "cash";
  if (hasAny(text, [/order|supplier|inventory|delivery|fulfillment|operations|blocked/])) return "delivery";
  if (hasAny(text, [/content|post|campaign|newsletter|instagram|tiktok|linkedin|social/])) return "content";
  if (hasAny(text, [/strategy|board|risk|healthy|forecast|plan|priority/])) return "strategy";
  return "general";
}

function inferMissingContext(domain: AgentCognitionCycle["understand"]["operatingDomain"], context: RichContextItem[]) {
  const available = context.map((item) => `${item.kind} ${item.title} ${item.summary}`).join(" ").toLowerCase();
  const missing: string[] = [];
  if (domain === "customer" && !/customer|conversation|history|policy/.test(available)) {
    missing.push("Customer history or approved response policy.");
  }
  if (domain === "cash" && !/invoice|payment|amount|reference|mpesa|stripe/.test(available)) {
    missing.push("Payment reference, amount, invoice, or provider status.");
  }
  if (domain === "revenue" && !/lead|crm|source|budget|timeline/.test(available)) {
    missing.push("Lead source, fit, budget, timeline, or CRM context.");
  }
  if (domain === "delivery" && !/deadline|owner|supplier|order|dependency/.test(available)) {
    missing.push("Owner, deadline, dependency, supplier, or order status.");
  }
  return missing;
}

function toolsForDomain(domain: AgentCognitionCycle["understand"]["operatingDomain"], availableTools: string[]) {
  const preferred: Record<AgentCognitionCycle["understand"]["operatingDomain"], string[]> = {
    customer: ["knowledge_base_search", "message_classifier", "communication_reply", "whatsapp", "email"],
    revenue: ["lead_qualifier", "crm", "calendar_check", "communication_reply"],
    cash: ["payment_checker", "invoice_generator", "mpesa", "stripe"],
    delivery: ["order_processor", "supplier_tracker", "inventory_monitor"],
    content: ["content_package", "notion", "slack", "instagram"],
    strategy: ["data_analyzer", "pattern_detector", "opportunity_scorer"],
    general: ["data_analyzer", "pattern_detector"],
  };
  const allowed = new Set(availableTools.map((tool) => tool.toLowerCase()));
  const matching = preferred[domain].filter((tool) => allowed.size === 0 || allowed.has(tool.toLowerCase()));
  return matching.length > 0 ? matching : preferred[domain].slice(0, 2);
}

function signalsFromCommand(command: string) {
  const signals: string[] = [];
  if (hasAny(command, [/urgent|today|now|asap/i])) signals.push("Urgency signal detected.");
  if (hasAny(command, [/refund|payment|invoice|cash|mpesa|m-pesa|stripe/i])) signals.push("Money-sensitive signal detected.");
  if (hasAny(command, [/complaint|angry|legal|cancel|terrible/i])) signals.push("Customer trust or legal sensitivity detected.");
  if (hasAny(command, [/send|publish|commit|delete|refund|charge|book/i])) signals.push("External side-effect requested.");
  if (signals.length === 0) signals.push("No obvious high-risk signal in the wording.");
  return signals;
}

export function buildAgentCognitionCycle(input: AgentCognitionInput): AgentCognitionCycle {
  const context = input.richContext ?? [];
  const domain = operatingDomain(input.command);
  const missingContext = inferMissingContext(domain, context);
  const autonomy = assessAutonomyGate({
    workerKind: input.runtimeKind ?? "agent",
    riskLevel: input.riskLevel,
    eventType: input.eventType,
    title: input.title,
    summary: input.command,
  });
  const proposedTools = toolsForDomain(domain, input.availableTools ?? []);
  const hasExternalSideEffect = hasAny(input.command, [/send|publish|commit|delete|refund|charge|book|update|pay/i]);
  const shouldSimulate = missingContext.length > 0 || (hasExternalSideEffect && !autonomy.canAutoRun);
  const mode: AgentCognitionDecision = autonomy.requiresApproval
    ? "ask_owner"
    : shouldSimulate
      ? "simulate_first"
      : autonomy.canAutoRun
        ? "act_now"
        : "prepare_only";

  return {
    observe: {
      command: input.command,
      signals: signalsFromCommand(input.command),
      contextUsed: context.slice(0, 8),
      missingContext,
    },
    understand: {
      intent: `Handle ${domain} work requested by the owner without losing context or safety.`,
      operatingDomain: domain,
      riskLevel: input.riskLevel,
      assumptions: [
        "Dobly should keep the owner-visible reasoning short and plain-language.",
        "Dobly should prefer preparation or simulation before irreversible external actions.",
      ],
    },
    plan: {
      objective: input.title,
      steps: [
        "Normalize the request into an operating record.",
        "Gather relevant memory, policies, recent records, and connected-tool state.",
        "Draft the safest next action and required artifact.",
        "Run the autonomy gate before any external side effect.",
        "Record the outcome, owner decision, and learning signal in the feed.",
      ],
      proposedTools,
      expectedOutput: domain === "strategy" ? "Board-level recommendation" : "Prepared action, task, or draft with approval context.",
    },
    critique: {
      failureModes: [
        "Acting without enough source context.",
        "Treating a sensitive business action as routine.",
        "Promoting a pattern before the owner has approved it.",
      ],
      saferRevision: shouldSimulate
        ? "Prepare or simulate the action first, then ask for approval with context."
        : "Proceed with logging, rollback context, and feed visibility.",
      approvalQuestion: autonomy.requiresApproval
        ? "Do you want Dobly to execute this exact action, revise it, or keep it as a draft?"
        : null,
    },
    autonomy,
    decision: {
      mode,
      reason: autonomy.reasons.join(" "),
      ownerVisibleSummary:
        mode === "act_now"
          ? "Dobly can run this low-risk action and record what happened."
          : mode === "ask_owner"
            ? "Dobly should ask before acting because this touches risk, money, trust, or external commitments."
            : mode === "simulate_first"
              ? "Dobly should simulate or prepare first because more context is needed before live action."
              : "Dobly should prepare the work but not execute it yet.",
    },
    learn: {
      memoryWrites: [
        `Record owner preference for ${domain} work if they approve, reject, or revise the proposal.`,
        "Capture missing context fields that blocked confident execution.",
      ],
      ruleCandidateSignals: autonomy.canBecomeRuleCandidate
        ? ["If this exact pattern repeats successfully, propose it as a rule candidate, not an auto-rule."]
        : ["Do not create a rule candidate from this pattern because the risk profile is too sensitive."],
    },
  };
}
