import type { OfficeEventType, OfficeRiskLevel, OfficeWorkerKind } from "@/lib/office/types";

export type AutonomyStage =
  | "draft"
  | "simulation"
  | "supervised"
  | "guarded_live"
  | "rule_candidate"
  | "owner_approved_rule";

export interface AutonomyGateInput {
  workerKind: OfficeWorkerKind | "system";
  riskLevel: OfficeRiskLevel;
  departmentId?: string | null;
  workerKey?: string | null;
  eventType?: OfficeEventType | string | null;
  title?: string | null;
  summary?: string | null;
  hasOwnerApprovedRule?: boolean;
}

export interface AutonomyGateDecision {
  stage: AutonomyStage;
  requiresApproval: boolean;
  canAutoRun: boolean;
  canBecomeRuleCandidate: boolean;
  reasons: string[];
}

function riskRank(level: OfficeRiskLevel) {
  return level === "critical" ? 4 : level === "high" ? 3 : level === "medium" ? 2 : 1;
}

function hasSensitiveSignal(input: AutonomyGateInput) {
  const text = `${input.departmentId ?? ""} ${input.workerKey ?? ""} ${input.eventType ?? ""} ${input.title ?? ""} ${input.summary ?? ""}`.toLowerCase();
  return /(refund|discount|payment|invoice|collection|legal|complaint|angry|vip|high.value|commitment|contract|private|delete|cancel|payout|mpesa|m-pesa|stripe|bank)/.test(text);
}

function isFinanceBoundary(input: AutonomyGateInput) {
  const text = `${input.departmentId ?? ""} ${input.workerKey ?? ""} ${input.eventType ?? ""} ${input.title ?? ""} ${input.summary ?? ""}`.toLowerCase();
  return /\bfinance\b|invoice|payment|receipt|reconciliation|cash|payout|mpesa|m-pesa|stripe|bank/.test(text);
}

export function assessAutonomyGate(input: AutonomyGateInput): AutonomyGateDecision {
  const reasons: string[] = [];
  const sensitive = hasSensitiveSignal(input);
  const financeBoundary = isFinanceBoundary(input);
  const highRisk = riskRank(input.riskLevel) >= riskRank("high");
  const mediumRisk = riskRank(input.riskLevel) >= riskRank("medium");
  const reasoningWorker = input.workerKind === "agent" || input.workerKind === "bot";

  if (highRisk) reasons.push("High-risk work needs owner review before action.");
  if (sensitive) reasons.push("Sensitive business action detected: money, trust, legal, customer, or commitment risk.");
  if (financeBoundary) reasons.push("Finance actions stay recommendation-only until a human approves the move.");
  if (reasoningWorker && mediumRisk) reasons.push("Reasoning workers stay supervised for medium-risk actions.");

  const requiresApproval = financeBoundary || highRisk || sensitive || (reasoningWorker && mediumRisk);
  const approvedRuleCanRun = Boolean(input.hasOwnerApprovedRule) && !highRisk && !sensitive;
  const canAutoRun = !financeBoundary && (approvedRuleCanRun || (!requiresApproval && input.riskLevel === "low"));

  return {
    stage: approvedRuleCanRun ? "owner_approved_rule" : requiresApproval ? "supervised" : "guarded_live",
    requiresApproval,
    canAutoRun,
    canBecomeRuleCandidate: !highRisk && !sensitive && !financeBoundary,
    reasons: reasons.length > 0 ? reasons : ["Low-risk action can run with logging and rollback context."],
  };
}
