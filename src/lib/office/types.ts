export type OfficeDepartmentId =
  | "reception"
  | "marketing"
  | "creative"
  | "sales"
  | "finance"
  | "support"
  | "engineering"
  | "operations"
  | "admin"
  | "projects"
  | "hr"
  | "growth"
  | "analytics"
  | "compliance"
  | "integrations"
  | "training_room"
  | "filing_cabinet"
  | "general_manager"
  | "boardroom";

export type OfficeWorkerKind = "automation" | "bot" | "agent";
export type OfficeRuntimeKind = OfficeWorkerKind | "system";
export type OfficeRiskLevel = "low" | "medium" | "high" | "critical";
export type OfficeTaskStatus = "queued" | "running" | "waiting_approval" | "completed" | "failed" | "cancelled";
export type OfficeWorkerStatus = "draft" | "shadow" | "active" | "paused" | "archived";
export type OfficeAutonomyMode = "supervised" | "guarded" | "delegated";

export type OfficeEventType =
  | "message.received"
  | "message.draft_created"
  | "message.sent"
  | "content.idea_received"
  | "content.draft_created"
  | "content.scheduled"
  | "content.published"
  | "content.performance_synced"
  | "lead.created"
  | "lead.qualified"
  | "invoice.created"
  | "invoice.overdue"
  | "payment.received"
  | "payment.reconciled"
  | "support.ticket_created"
  | "support.ticket_resolved"
  | "operations.order_created"
  | "operations.fulfillment_updated"
  | "worker.action_proposed"
  | "worker.action_approved"
  | "worker.action_rejected"
  | "worker.action_executed"
  | "worker.failed"
  | "integration.connected"
  | "integration.failed"
  | "signal.detected"
  | "briefing.created";

export interface OfficeDepartmentDefinition {
  id: OfficeDepartmentId;
  name: string;
  purpose: string;
  coreWorkerKinds: OfficeWorkerKind[];
  eventTypes: OfficeEventType[];
  defaultMetrics: string[];
  launchPriority: number;
  isSpecialRoom?: boolean;
}

export interface OfficeWorkerDefinition {
  key: string;
  name: string;
  kind: OfficeWorkerKind;
  departmentId: OfficeDepartmentId;
  mission: string;
  defaultAutonomy: OfficeAutonomyMode;
  requiredTools: string[];
  handles: OfficeEventType[];
  proposes: string[];
  neverDoes: string[];
}

export interface OfficeEventInput {
  workspaceId?: string | null;
  userId: string;
  departmentId?: OfficeDepartmentId | null;
  workerId?: string | null;
  workerKind?: OfficeRuntimeKind;
  eventType: OfficeEventType;
  source: string;
  entityType?: string | null;
  entityId?: string | null;
  title: string;
  summary?: string | null;
  payload?: Record<string, unknown>;
  riskLevel?: OfficeRiskLevel;
  occurredAt?: string;
}

export interface OfficeEventRecord extends OfficeEventInput {
  id: string;
  workspaceId: string | null;
  departmentId: OfficeDepartmentId | null;
  workerId: string | null;
  workerKind: OfficeRuntimeKind;
  summary: string | null;
  payload: Record<string, unknown>;
  riskLevel: OfficeRiskLevel;
  occurredAt: string;
  createdAt: string;
}

export interface OfficeTaskIntent {
  runtime: OfficeRuntimeKind;
  departmentId: OfficeDepartmentId;
  workerKey: string;
  title: string;
  summary: string;
  riskLevel: OfficeRiskLevel;
  requiresApproval: boolean;
  toolName?: string;
  toolPayload?: Record<string, unknown>;
}

export interface OfficeSnapshot {
  generatedAt: string;
  businessStatus: string;
  focusReason: string;
  departments: Array<{
    id: OfficeDepartmentId;
    name: string;
    status: "quiet" | "active" | "needs_attention";
    activeWorkers: number;
    openTasks: number;
    latestEvent: string | null;
  }>;
  metrics: {
    activeWorkers: number;
    waitingApprovals: number;
    openSignals: number;
    recentEvents: number;
    integrationsNeedingAttention: number;
  };
  whatNeedsAttention: string[];
  whatHappened: string[];
  needsDecision: Array<Record<string, unknown>>;
  opportunities: Array<Record<string, unknown>>;
  risks: Array<Record<string, unknown>>;
}
