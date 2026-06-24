import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Signal, SignalType, ImpactLevel, SignalActionType, SignalStatus } from "@/types";

interface CreateSignalParams {
  userId: string;
  coworkerId?: string;
  signalType: SignalType;
  title: string;
  description: string;
  confidence: number;
  evidence: Record<string, unknown>[];
  affectedEntities: Record<string, unknown>[];
  impactLevel?: ImpactLevel;
  estimatedImpact?: Record<string, unknown>;
  recommendedAction?: string;
  actionType?: SignalActionType;
}

interface DetectSignalsParams {
  userId: string;
  coworkerId?: string;
  timeWindow?: string;
}

interface UpdateSignalParams {
  signalId: string;
  userId: string;
  updates: {
    status?: SignalStatus;
    ownerAction?: string;
    actionType?: SignalActionType;
    resolvedAt?: string;
  };
}

type SignalCandidate = Omit<CreateSignalParams, "userId" | "coworkerId">;

interface SignalData {
  workspaceIds: string[];
  customers: any[];
  invoices: any[];
  conversations: any[];
  leads: any[];
  supportCases: any[];
  financeRecords: any[];
  officeTasks: any[];
  workflowRuns: any[];
  approvals: any[];
}

export async function createSignal(params: CreateSignalParams): Promise<Signal> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from("signals")
    .insert({
      user_id: params.userId,
      coworker_id: params.coworkerId || null,
      signal_type: params.signalType,
      title: params.title,
      description: params.description,
      confidence: params.confidence,
      evidence: params.evidence,
      affected_entities: params.affectedEntities,
      impact_level: params.impactLevel || null,
      estimated_impact: params.estimatedImpact || {},
      recommended_action: params.recommendedAction || null,
      action_type: params.actionType || null,
      status: "new" as SignalStatus,
      detected_at: new Date().toISOString(),
      resolved_at: null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create signal: ${error.message}`);
  }

  return data as Signal;
}

export async function detectSignals(params: DetectSignalsParams): Promise<Signal[]> {
  const detectedSignals: Signal[] = [];
  const operationalData = await gatherSignalData(params.userId, params.coworkerId, params.timeWindow);
  const candidates = [
    ...detectChurnRisks(operationalData),
    ...detectDemandSignals(operationalData),
    ...detectCollectionGaps(operationalData),
    ...detectUnusualPatterns(operationalData),
    ...detectGrowthOpportunities(operationalData),
  ];

  const existingSignals = await getSignals(params.userId, { unresolvedOnly: true, limit: 200 });
  const existingKeys = new Set(existingSignals.map((signal) => `${signal.signal_type}:${signal.title}`));

  for (const candidate of candidates) {
    const key = `${candidate.signalType}:${candidate.title}`;
    if (existingKeys.has(key)) continue;
    const created = await createSignal({
      userId: params.userId,
      coworkerId: params.coworkerId,
      ...candidate,
    });
    existingKeys.add(key);
    detectedSignals.push(created);
  }

  return detectedSignals;
}

export async function getSignals(userId: string, filters?: {
  signalType?: SignalType;
  status?: SignalStatus;
  impactLevel?: ImpactLevel;
  coworkerId?: string;
  unresolvedOnly?: boolean;
  limit?: number;
}): Promise<Signal[]> {
  const admin = createAdminSupabaseClient();

  let query = admin.from("signals").select("*").eq("user_id", userId);

  if (filters?.signalType) query = query.eq("signal_type", filters.signalType);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.impactLevel) query = query.eq("impact_level", filters.impactLevel);
  if (filters?.coworkerId) query = query.eq("coworker_id", filters.coworkerId);
  if (filters?.unresolvedOnly) query = query.in("status", ["new", "acknowledged", "in_progress"]);

  query = query.order("detected_at", { ascending: false });
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch signals: ${error.message}`);
  }

  return (data || []) as Signal[];
}

export async function updateSignal(params: UpdateSignalParams): Promise<Signal> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from("signals")
    .update({
      ...params.updates,
      resolved_at: params.updates.resolvedAt || (params.updates.status === "resolved" ? new Date().toISOString() : null),
    })
    .eq("id", params.signalId)
    .eq("user_id", params.userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update signal: ${error.message}`);
  }

  return data as Signal;
}

export async function getSignalSummary(userId: string): Promise<{
  totalSignals: number;
  unresolvedSignals: number;
  criticalSignals: number;
  byType: Record<string, number>;
  byImpact: Record<string, number>;
  recentSignals: Signal[];
}> {
  const signals = await getSignals(userId);
  const totalSignals = signals.length;
  const unresolvedSignals = signals.filter((signal) => ["new", "acknowledged", "in_progress"].includes(signal.status)).length;
  const criticalSignals = signals.filter((signal) => signal.impact_level === "critical" || signal.impact_level === "high").length;

  const byType: Record<string, number> = {};
  const byImpact: Record<string, number> = {};

  for (const signal of signals) {
    byType[signal.signal_type] = (byType[signal.signal_type] || 0) + 1;
    if (signal.impact_level) byImpact[signal.impact_level] = (byImpact[signal.impact_level] || 0) + 1;
  }

  return {
    totalSignals,
    unresolvedSignals,
    criticalSignals,
    byType,
    byImpact,
    recentSignals: signals.slice(0, 5),
  };
}

async function gatherSignalData(userId: string, coworkerId?: string, timeWindow?: string): Promise<SignalData> {
  const admin = createAdminSupabaseClient();
  const since = timeWindow ?? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const previousWindowStart = new Date(Date.parse(since) - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: workspaces } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_user_id", userId)
    .in("status", ["active", "paused"])
    .limit(20);

  const workspaceIds = (workspaces ?? []).map((row: any) => String(row.id));
  const coworkerFilter = coworkerId ? { coworker_id: coworkerId } : null;

  const [
    customers,
    invoices,
    conversations,
    leads,
    supportCases,
    financeRecords,
    officeTasks,
    workflowRuns,
    approvals,
  ] = await Promise.all([
    safeRows(() =>
      workspaceIds.length === 0
        ? emptyRows()
        : admin
            .from("customers")
            .select("*")
            .in("workspace_id", workspaceIds)
            .order("updated_at", { ascending: false })
            .limit(100),
    ),
    safeRows(() =>
      workspaceIds.length === 0
        ? emptyRows()
        : admin
            .from("invoices")
            .select("*")
            .in("workspace_id", workspaceIds)
            .order("updated_at", { ascending: false })
            .limit(100),
    ),
    safeRows(() =>
      workspaceIds.length === 0
        ? emptyRows()
        : admin
            .from("communication_conversations")
            .select("*")
            .in("workspace_id", workspaceIds)
            .gte("last_message_at", previousWindowStart)
            .order("last_message_at", { ascending: false })
            .limit(120),
    ),
    safeRows(() =>
      workspaceIds.length === 0
        ? emptyRows()
        : admin
            .from("leads")
            .select("*")
            .in("workspace_id", workspaceIds)
            .gte("updated_at", previousWindowStart)
            .order("updated_at", { ascending: false })
            .limit(120),
    ),
    safeRows(() =>
      workspaceIds.length === 0
        ? emptyRows()
        : admin
            .from("support_cases")
            .select("*")
            .in("workspace_id", workspaceIds)
            .gte("updated_at", previousWindowStart)
            .order("updated_at", { ascending: false })
            .limit(100),
    ),
    safeRows(() =>
      workspaceIds.length === 0
        ? emptyRows()
        : admin
            .from("finance_records")
            .select("*")
            .in("workspace_id", workspaceIds)
            .gte("updated_at", previousWindowStart)
            .order("updated_at", { ascending: false })
            .limit(100),
    ),
    safeRows(() => {
      let query = admin
        .from("office_tasks")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", previousWindowStart)
        .order("created_at", { ascending: false })
        .limit(200);
      if (coworkerFilter) query = query.match(coworkerFilter);
      return query;
    }),
    safeRows(() =>
      admin
        .from("workflow_runs")
        .select("*")
        .eq("user_id", userId)
        .gte("started_at", previousWindowStart)
        .order("started_at", { ascending: false })
        .limit(200),
    ),
    safeRows(() =>
      admin
        .from("approvals")
        .select("*")
        .eq("user_id", userId)
        .gte("requested_at", previousWindowStart)
        .order("requested_at", { ascending: false })
        .limit(120),
    ),
  ]);

  return {
    workspaceIds,
    customers,
    invoices,
    conversations,
    leads,
    supportCases,
    financeRecords,
    officeTasks,
    workflowRuns,
    approvals,
  };
}

function detectChurnRisks(data: SignalData): SignalCandidate[] {
  const atRiskCustomers = data.customers
    .filter((customer) => Number(customer.churn_risk_score ?? 0) >= 0.72)
    .sort((a, b) => Number(b.churn_risk_score ?? 0) - Number(a.churn_risk_score ?? 0))
    .slice(0, 5);

  const staleSupportCases = data.supportCases.filter((item) =>
    /open|waiting|blocked|escalated/i.test(String(item.status ?? "")),
  );

  if (atRiskCustomers.length === 0 && staleSupportCases.length < 4) return [];

  const confidence = Math.min(
    0.95,
    0.55 + atRiskCustomers.length * 0.08 + Math.min(staleSupportCases.length, 5) * 0.04,
  );

  return [
    {
      signalType: "churn_risk",
      title: "Customer churn risk is rising",
      description:
        atRiskCustomers.length > 0
          ? `${atRiskCustomers.length} customer records are now above the churn threshold, and unresolved service pressure may be reinforcing that risk.`
          : `${staleSupportCases.length} support cases are still open or blocked, which often precedes churn for active accounts.`,
      confidence,
      evidence: [
        ...atRiskCustomers.map((customer) => ({
          type: "customer",
          id: customer.id,
          name: customer.full_name ?? customer.email ?? customer.phone ?? "Customer",
          churnRiskScore: customer.churn_risk_score ?? null,
          lastSeenAt: customer.last_seen_at ?? null,
        })),
        ...staleSupportCases.slice(0, 3).map((supportCase) => ({
          type: "support_case",
          id: supportCase.id,
          title: supportCase.title ?? "Support case",
          status: supportCase.status ?? "open",
          priority: supportCase.priority ?? null,
        })),
      ].slice(0, 6),
      affectedEntities: atRiskCustomers.map((customer) => ({
        type: "customer",
        id: customer.id,
      })),
      impactLevel: atRiskCustomers.some((customer) => Number(customer.churn_risk_score ?? 0) >= 0.85) ? "high" : "medium",
      estimatedImpact: {
        atRiskCustomers: atRiskCustomers.length,
        openSupportCases: staleSupportCases.length,
      },
      recommendedAction: "Review at-risk accounts, close the oldest support issues, and queue a proactive owner-safe follow-up.",
      actionType: "review",
    },
  ];
}

function detectDemandSignals(data: SignalData): SignalCandidate[] {
  const now = Date.now();
  const recentCutoff = now - 7 * 24 * 60 * 60 * 1000;
  const previousCutoff = now - 14 * 24 * 60 * 60 * 1000;
  const recentLeadCount = data.leads.filter((lead) => toMillis(lead.updated_at) >= recentCutoff).length;
  const previousLeadCount = data.leads.filter((lead) => {
    const time = toMillis(lead.updated_at);
    return time >= previousCutoff && time < recentCutoff;
  }).length;
  const recentConversationCount = data.conversations.filter((item) => toMillis(item.last_message_at) >= recentCutoff).length;

  if (recentLeadCount < 5 && recentConversationCount < 8) return [];

  const growthRatio = previousLeadCount > 0 ? recentLeadCount / previousLeadCount : recentLeadCount;
  const impactLevel: ImpactLevel = growthRatio >= 2 || recentLeadCount >= 10 ? "high" : "medium";

  return [
    {
      signalType: "demand_signal",
      title: "Inbound demand is accelerating",
      description: `Dobly saw ${recentLeadCount} recent leads and ${recentConversationCount} active conversations in the latest week, suggesting demand pressure is building faster than normal.`,
      confidence: Math.min(0.94, 0.58 + Math.min(recentLeadCount, 12) * 0.03 + Math.min(recentConversationCount, 15) * 0.01),
      evidence: [
        { metric: "recent_leads", value: recentLeadCount },
        { metric: "previous_leads", value: previousLeadCount },
        { metric: "recent_conversations", value: recentConversationCount },
      ],
      affectedEntities: [],
      impactLevel,
      estimatedImpact: {
        leadGrowthRatio: Number.isFinite(growthRatio) ? Number(growthRatio.toFixed(2)) : null,
        recentLeadCount,
        recentConversationCount,
      },
      recommendedAction: "Increase response capacity in Reception and Sales, and tighten qualification so high-intent leads move first.",
      actionType: "investigate",
    },
  ];
}

function detectCollectionGaps(data: SignalData): SignalCandidate[] {
  const overdueInvoices = data.invoices.filter((invoice) => /overdue|past_due|late/i.test(String(invoice.status ?? "")));
  const unpaidAmount = overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0);
  const financeEscalations = data.financeRecords.filter((record) => /needs_review|overdue|failed/i.test(String(record.status ?? "")));

  if (overdueInvoices.length === 0 && financeEscalations.length < 2) return [];

  return [
    {
      signalType: "collections_gap",
      title: "Collections need attention",
      description: `${overdueInvoices.length} invoice${overdueInvoices.length === 1 ? "" : "s"} are overdue and ${financeEscalations.length} finance records still need review, so cash follow-through is lagging behind activity.`,
      confidence: Math.min(0.96, 0.62 + Math.min(overdueInvoices.length, 8) * 0.04),
      evidence: overdueInvoices.slice(0, 5).map((invoice) => ({
        type: "invoice",
        id: invoice.id,
        status: invoice.status ?? "overdue",
        amount: invoice.amount ?? 0,
        currency: invoice.currency ?? "KES",
      })),
      affectedEntities: overdueInvoices.slice(0, 10).map((invoice) => ({
        type: "invoice",
        id: invoice.id,
      })),
      impactLevel: unpaidAmount >= 250000 || overdueInvoices.length >= 5 ? "high" : "medium",
      estimatedImpact: {
        overdueInvoices: overdueInvoices.length,
        unpaidAmount,
      },
      recommendedAction: "Launch a collections follow-up loop, route disputed invoices to approvals, and close unresolved finance records.",
      actionType: "review",
    },
  ];
}

function detectUnusualPatterns(data: SignalData): SignalCandidate[] {
  const failedTasks = data.officeTasks.filter((task) => String(task.status) === "failed");
  const waitingApprovals = data.officeTasks.filter((task) => String(task.status) === "waiting_approval");
  const failedRuns = data.workflowRuns.filter((run) => /failed|error/i.test(String(run.status ?? "")));
  const totalRuns = Math.max(data.workflowRuns.length, 1);
  const failureRate = failedRuns.length / totalRuns;

  if (failedTasks.length < 3 && waitingApprovals.length < 4 && failureRate < 0.25) return [];

  return [
    {
      signalType: "unusual_pattern",
      title: "Operational friction is spiking",
      description: `Dobly detected ${failedTasks.length} failed office tasks, ${waitingApprovals.length} approvals waiting, and a ${Math.round(failureRate * 100)}% workflow failure rate in the current window.`,
      confidence: Math.min(0.93, 0.6 + failureRate * 0.4 + Math.min(waitingApprovals.length, 8) * 0.02),
      evidence: [
        { metric: "failed_tasks", value: failedTasks.length },
        { metric: "waiting_approvals", value: waitingApprovals.length },
        { metric: "failed_runs", value: failedRuns.length },
      ],
      affectedEntities: [
        ...failedTasks.slice(0, 5).map((task) => ({ type: "office_task", id: task.id })),
        ...failedRuns.slice(0, 5).map((run) => ({ type: "workflow_run", id: run.id })),
      ],
      impactLevel: failureRate >= 0.4 || failedTasks.length >= 6 ? "high" : "medium",
      estimatedImpact: {
        failureRate: Number(failureRate.toFixed(2)),
        failedTasks: failedTasks.length,
        waitingApprovals: waitingApprovals.length,
      },
      recommendedAction: "Inspect the failed runs first, clear approval bottlenecks, and tighten retries or guardrails where failures repeat.",
      actionType: "investigate",
    },
  ];
}

function detectGrowthOpportunities(data: SignalData): SignalCandidate[] {
  const qualifiedLeads = data.leads.filter((lead) => /qualified|proposal|won|booked/i.test(String(lead.status ?? "")));
  const pipelineValue = qualifiedLeads.reduce((sum, lead) => sum + Number(lead.value_estimate ?? 0), 0);
  const highValueCustomers = data.customers.filter((customer) => Number(customer.lifetime_value ?? 0) >= 100000);

  if (qualifiedLeads.length < 3 && highValueCustomers.length < 2) return [];

  return [
    {
      signalType: "growth_opportunity",
      title: "There is expansion room in the current pipeline",
      description: `${qualifiedLeads.length} qualified leads and ${highValueCustomers.length} high-value customer records suggest Dobly can push for conversion, upsell, or faster follow-through right now.`,
      confidence: Math.min(0.92, 0.57 + Math.min(qualifiedLeads.length, 8) * 0.04),
      evidence: [
        { metric: "qualified_leads", value: qualifiedLeads.length },
        { metric: "pipeline_value", value: pipelineValue },
        { metric: "high_value_customers", value: highValueCustomers.length },
      ],
      affectedEntities: qualifiedLeads.slice(0, 8).map((lead) => ({
        type: "lead",
        id: lead.id,
      })),
      impactLevel: pipelineValue >= 500000 ? "high" : "medium",
      estimatedImpact: {
        pipelineValue,
        qualifiedLeads: qualifiedLeads.length,
      },
      recommendedAction: "Prioritize the hottest leads, route tailored follow-up into Sales, and package a fast owner-ready offer path.",
      actionType: "review",
    },
  ];
}

async function safeRows(callback: () => Promise<{ data: any[] | null; error: any }>) {
  try {
    const { data, error } = await callback();
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

async function emptyRows() {
  return { data: [], error: null };
}

function toMillis(value: unknown) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
