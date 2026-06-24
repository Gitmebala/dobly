import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { inferDoblyExecutionIntent, type DoblyExecutionIntent } from "@/lib/dobly-inference";
import { calculateCoworkerHealth, getLatestHealthSnapshot } from "@/lib/health/service";
import type { Standard, StandardCategory, EnforcementMode } from "@/types";

interface CreateStandardParams {
  userId: string;
  coworkerId?: string;
  name: string;
  description?: string;
  category: StandardCategory;
  promise: string;
  metric: string;
  targetValue: number;
  unit?: string;
  appliesTo?: Record<string, unknown>;
  exceptions?: Record<string, unknown>;
  enforcementMode?: EnforcementMode;
  escalationThreshold?: Record<string, unknown>;
  intent?: DoblyExecutionIntent | null;
}

interface UpdateStandardParams {
  standardId: string;
  userId: string;
  updates: Partial<{
    name: string;
    description: string;
    promise: string;
    targetValue: number;
    unit: string;
    appliesTo: Record<string, unknown>;
    exceptions: Record<string, unknown>;
    enforcementMode: EnforcementMode;
    escalationThreshold: Record<string, unknown>;
    isActive: boolean;
  }>;
}

interface CheckStandardComplianceParams {
  standardId: string;
  userId: string;
  actualValue: number;
  context?: Record<string, unknown>;
}

/**
 * Create a new standard
 */
export async function createStandard(params: CreateStandardParams): Promise<Standard> {
  const admin = createAdminSupabaseClient();
  const inferredIntent =
    params.intent ??
    inferDoblyExecutionIntent({
      prompt: `${params.name}. ${params.promise}`,
      explicit: {
        departmentId:
          typeof params.appliesTo?.departmentId === "string"
            ? (params.appliesTo.departmentId as DoblyExecutionIntent["departmentId"])
            : undefined,
        workTypeId:
          typeof params.appliesTo?.workTypeId === "string"
            ? (params.appliesTo.workTypeId as DoblyExecutionIntent["workTypeId"])
            : "coordinate",
        outputTypeId:
          typeof params.appliesTo?.outputTypeId === "string"
            ? (params.appliesTo.outputTypeId as DoblyExecutionIntent["outputTypeId"])
            : "task",
        triggerTypeId:
          typeof params.appliesTo?.triggerTypeId === "string"
            ? (params.appliesTo.triggerTypeId as DoblyExecutionIntent["triggerTypeId"])
            : undefined,
        trustLevelId:
          typeof params.appliesTo?.trustLevelId === "string"
            ? (params.appliesTo.trustLevelId as DoblyExecutionIntent["trustLevelId"])
            : undefined,
        memoryScopeId:
          typeof params.appliesTo?.memoryScopeId === "string"
            ? (params.appliesTo.memoryScopeId as DoblyExecutionIntent["memoryScopeId"])
            : undefined,
      },
    });

  const insertPayload = {
    user_id: params.userId,
    coworker_id: params.coworkerId || null,
    name: params.name,
    description: params.description || null,
    category: params.category,
    promise: params.promise,
    metric: params.metric,
    target_value: params.targetValue,
    unit: params.unit || null,
    applies_to: {
      ...(params.appliesTo || {}),
      doblyIntent: inferredIntent as unknown as Record<string, unknown>,
    },
    exceptions: params.exceptions || {},
    enforcement_mode: params.enforcementMode || "soft",
    escalation_threshold: params.escalationThreshold || {},
    is_active: true,
    department_id: inferredIntent.departmentId,
    work_type_id: inferredIntent.workTypeId,
    output_type_id: inferredIntent.outputTypeId,
    trigger_type_id: inferredIntent.triggerTypeId,
    trust_level_id: inferredIntent.trustLevelId,
    memory_scope_id: inferredIntent.memoryScopeId,
    intent: inferredIntent,
  };
  
  let { data, error } = await admin
    .from("standards")
    .insert(insertPayload)
    .select()
    .single();

  if (error && /column .* does not exist|Could not find the '.*' column/i.test(error.message)) {
    const {
      department_id: _departmentId,
      work_type_id: _workTypeId,
      output_type_id: _outputTypeId,
      trigger_type_id: _triggerTypeId,
      trust_level_id: _trustLevelId,
      memory_scope_id: _memoryScopeId,
      intent: _intent,
      ...compatPayload
    } = insertPayload;

    const compatResult = await admin
      .from("standards")
      .insert(compatPayload)
      .select()
      .single();

    data = compatResult.data;
    error = compatResult.error;
  }

  if (error) {
    throw new Error(`Failed to create standard: ${error.message}`);
  }

  return data as Standard;
}

/**
 * Get a standard by ID
 */
export async function getStandard(standardId: string, userId: string): Promise<Standard | null> {
  const admin = createAdminSupabaseClient();
  
  const { data, error } = await admin
    .from("standards")
    .select("*")
    .eq("id", standardId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch standard: ${error.message}`);
  }

  return data as Standard;
}

/**
 * Get all standards for a user
 */
export async function getStandards(userId: string, filters?: {
  coworkerId?: string;
  category?: StandardCategory;
  isActive?: boolean;
}): Promise<Standard[]> {
  const admin = createAdminSupabaseClient();
  
  let query = admin
    .from("standards")
    .select("*")
    .eq("user_id", userId);

  if (filters?.coworkerId) {
    query = query.eq("coworker_id", filters.coworkerId);
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.isActive !== undefined) {
    query = query.eq("is_active", filters.isActive);
  }

  query = query.order("category", { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch standards: ${error.message}`);
  }

  return (data || []) as Standard[];
}

/**
 * Update a standard
 */
export async function updateStandard(params: UpdateStandardParams): Promise<Standard> {
  const admin = createAdminSupabaseClient();
  
  const { data, error } = await admin
    .from("standards")
    .update({
      ...params.updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.standardId)
    .eq("user_id", params.userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update standard: ${error.message}`);
  }

  return data as Standard;
}

/**
 * Delete a standard
 */
export async function deleteStandard(standardId: string, userId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  
  const { error } = await admin
    .from("standards")
    .delete()
    .eq("id", standardId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete standard: ${error.message}`);
  }
}

/**
 * Check if a standard is being met
 */
export async function checkStandardCompliance(params: CheckStandardComplianceParams): Promise<{
  isCompliant: boolean;
  deviation: number;
  deviationPercent: number;
  requiresEscalation: boolean;
  enforcementAction: string;
}> {
  const standard = await getStandard(params.standardId, params.userId);
  if (!standard) {
    throw new Error("Standard not found");
  }

  const deviation = params.actualValue - standard.target_value;
  const deviationPercent = standard.target_value !== 0 
    ? (deviation / standard.target_value) * 100 
    : 0;

  // Determine if compliant (lower is better for time-based metrics, higher is better for quality metrics)
  const isTimeBased = standard.metric.includes("time") || standard.metric.includes("speed");
  const isCompliant = isTimeBased 
    ? params.actualValue <= standard.target_value 
    : params.actualValue >= standard.target_value;

  // Check if escalation is needed
  const threshold = standard.escalation_threshold as Record<string, unknown>;
  const escalationThreshold = (threshold.percent || 20) as number;
  const requiresEscalation = Math.abs(deviationPercent) > escalationThreshold;

  // Determine enforcement action
  let enforcementAction = "monitor";
  if (standard.enforcement_mode === "hard" && !isCompliant) {
    enforcementAction = "block";
  } else if (standard.enforcement_mode === "soft" && requiresEscalation) {
    enforcementAction = "warn";
  }

  return {
    isCompliant,
    deviation,
    deviationPercent,
    requiresEscalation,
    enforcementAction,
  };
}

/**
 * Convert natural language promise into structured standard
 */
export async function promiseToStandard(userId: string, promise: string, coworkerId?: string): Promise<Standard> {
  const category = inferCategoryFromPromise(promise);
  const metric = inferMetricFromCategory(category);
  const targetValue = inferTargetValueFromPromise(promise, metric);
  const unit = inferUnitFromMetric(metric);
  const intent = inferDoblyExecutionIntent({
    prompt: promise,
    explicit: { outputTypeId: "task", workTypeId: "coordinate" },
  });

  return createStandard({
    userId,
    coworkerId,
    name: generateStandardName(promise),
    description: promise,
    category,
    promise,
    metric,
    targetValue,
    unit: unit ?? undefined,
    enforcementMode: "soft",
    intent,
  });
}

/**
 * Bind standards to a coworker
 */
export async function bindStandardsToCoworker(coworkerId: string, userId: string, standardIds: string[]): Promise<void> {
  const admin = createAdminSupabaseClient();
  
  for (const standardId of standardIds) {
    const { error } = await admin
      .from("standards")
      .update({ coworker_id: coworkerId })
      .eq("id", standardId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to bind standard ${standardId}: ${error.message}`);
    }
  }
}

/**
 * Get standards compliance summary for a coworker
 */
export async function getCoworkerStandardsSummary(coworkerId: string, userId: string): Promise<{
  totalStandards: number;
  compliantStandards: number;
  nonCompliantStandards: number;
  overallComplianceRate: number;
  byCategory: Record<string, { total: number; compliant: number }>;
}> {
  const standards = await getStandards(userId, { coworkerId: coworkerId, isActive: true });
  const latest =
    (await getLatestHealthSnapshot(coworkerId, userId)) ??
    (
      await calculateCoworkerHealth({
        coworkerId,
        userId,
        periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date().toISOString(),
      })
    ).healthSnapshot;

  let compliantStandards = 0;
  let nonCompliantStandards = 0;
  const summary = {
    totalStandards: standards.length,
    compliantStandards: 0,
    nonCompliantStandards: 0,
    overallComplianceRate: 0,
    byCategory: {} as Record<string, { total: number; compliant: number }>,
  };

  for (const standard of standards) {
    if (!summary.byCategory[standard.category]) {
      summary.byCategory[standard.category] = { total: 0, compliant: 0 };
    }
    summary.byCategory[standard.category].total++;
    const actualValue = readActualValueForMetric(standard.metric, latest);
    const isCompliant = evaluateStandard(actualValue, standard.metric, standard.target_value);
    if (isCompliant) {
      compliantStandards += 1;
      summary.byCategory[standard.category].compliant += 1;
    } else {
      nonCompliantStandards += 1;
    }
  }

  summary.compliantStandards = compliantStandards;
  summary.nonCompliantStandards = nonCompliantStandards;
  summary.overallComplianceRate = standards.length > 0 ? compliantStandards / standards.length : 1;

  return summary;
}

// Helper functions

function inferCategoryFromPromise(promise: string): StandardCategory {
  const lower = promise.toLowerCase();
  
  if (lower.includes("response") || lower.includes("reply") || lower.includes("within")) {
    return "response_time";
  }
  if (lower.includes("quality") || lower.includes("satisfaction") || lower.includes("resolution")) {
    return "quality";
  }
  if (lower.includes("escalate") || lower.includes("approve") || lower.includes("review")) {
    return "escalation";
  }
  if (lower.includes("payment") || lower.includes("invoice") || lower.includes("collect")) {
    return "payment";
  }
  
  return "communication";
}

function inferMetricFromCategory(category: StandardCategory): string {
  const metrics: Record<StandardCategory, string> = {
    response_time: "response_time_seconds",
    quality: "resolution_rate",
    escalation: "escalation_rate",
    communication: "response_quality_score",
    payment: "collection_rate",
  };
  return metrics[category];
}

function inferTargetValueFromPromise(promise: string, metric: string): number {
  const lower = promise.toLowerCase();
  
  // Extract numbers from promise
  const numberMatch = lower.match(/(\d+)/);
  if (numberMatch) {
    const value = parseInt(numberMatch[1], 10);
    
    // Convert to appropriate unit
    if (metric.includes("seconds") || metric.includes("time")) {
      if (lower.includes("minute")) return value * 60;
      if (lower.includes("hour")) return value * 3600;
      return value;
    }
    
    if (metric.includes("rate") || metric.includes("percent")) {
      return value / 100; // Convert to decimal
    }
    
    return value;
  }
  
  // Default values by metric
  const defaults: Record<string, number> = {
    response_time_seconds: 300, // 5 minutes
    resolution_rate: 0.9, // 90%
    escalation_rate: 0.1, // 10%
    response_quality_score: 4.5, // out of 5
    collection_rate: 0.8, // 80%
  };
  
  return defaults[metric] || 0;
}

function inferUnitFromMetric(metric: string): string | null {
  if (metric.includes("seconds") || metric.includes("time")) return "seconds";
  if (metric.includes("rate") || metric.includes("percent")) return "percent";
  if (metric.includes("score")) return "score";
  return null;
}

function generateStandardName(promise: string): string {
  // Generate a concise name from the promise
  const words = promise.split(" ").slice(0, 5);
  return words.join(" ") + (promise.length > 50 ? "..." : "");
}

function readActualValueForMetric(metric: string, snapshot: {
  response_speed: number;
  resolution_rate: number;
  escalation_rate: number;
  conversion_rate: number;
}): number {
  if (metric === "response_time_seconds") return Number(snapshot.response_speed ?? 0);
  if (metric === "resolution_rate") return Number(snapshot.resolution_rate ?? 0);
  if (metric === "escalation_rate") return Number(snapshot.escalation_rate ?? 0);
  if (metric === "collection_rate") return Number(snapshot.conversion_rate ?? 0);
  if (metric === "response_quality_score") return Number(snapshot.resolution_rate ?? 0) * 5;
  return 0;
}

function evaluateStandard(actualValue: number, metric: string, targetValue: number) {
  const isTimeBased = metric.includes("time") || metric.includes("speed") || metric.includes("seconds");
  return isTimeBased ? actualValue <= targetValue : actualValue >= targetValue;
}
