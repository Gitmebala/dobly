import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Decision, DecisionOutcome } from "@/types";

interface CreateDecisionParams {
  userId: string;
  coworkerId?: string;
  situationType: string;
  context: Record<string, unknown>;
  doblyRecommendation: Record<string, unknown>;
  doblyConfidence: number;
  ownerChoice: Record<string, unknown>;
  ownerReasoning?: string;
}

interface UpdateDecisionParams {
  decisionId: string;
  userId: string;
  updates: {
    outcome?: DecisionOutcome;
    outcomeMetrics?: Record<string, unknown>;
    outcomeAt?: string;
    patternExtracted?: Record<string, unknown>;
    shouldAutomate?: boolean;
    automationConditions?: Record<string, unknown>;
  };
}

interface AnalyzeDecisionPatternParams {
  situationType: string;
  userId: string;
  limit?: number;
}

/**
 * Create a decision record
 */
export async function createDecision(params: CreateDecisionParams): Promise<Decision> {
  const admin = createAdminSupabaseClient();
  
  const { data, error } = await admin
    .from("decisions")
    .insert({
      user_id: params.userId,
      coworker_id: params.coworkerId || null,
      situation_type: params.situationType,
      context: params.context,
      dobly_recommendation: params.doblyRecommendation,
      dobly_confidence: params.doblyConfidence,
      owner_choice: params.ownerChoice,
      owner_reasoning: params.ownerReasoning || null,
      outcome: "partial" as DecisionOutcome, // Default until outcome is known
      outcome_metrics: {},
      pattern_extracted: null,
      should_automate: null,
      automation_conditions: null,
      created_at: new Date().toISOString(),
      outcome_at: null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create decision: ${error.message}`);
  }

  return data as Decision;
}

/**
 * Update decision with outcome
 */
export async function updateDecision(params: UpdateDecisionParams): Promise<Decision> {
  const admin = createAdminSupabaseClient();
  
  const { data, error } = await admin
    .from("decisions")
    .update({
      ...params.updates,
      outcome_at: params.updates.outcomeAt || new Date().toISOString(),
    })
    .eq("id", params.decisionId)
    .eq("user_id", params.userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update decision: ${error.message}`);
  }

  // If outcome is provided, analyze the pattern
  if (params.updates.outcome) {
    const analysis = await analyzeDecisionPattern({ situationType: data.situation_type, userId: params.userId });
    await maybePromoteDecisionPattern({
      userId: params.userId,
      coworkerId: data.coworker_id ?? undefined,
      situationType: data.situation_type,
      analysis,
    });
  }

  return data as Decision;
}

/**
 * Get decisions for a user
 */
export async function getDecisions(userId: string, filters?: {
  coworkerId?: string;
  situationType?: string;
  outcome?: DecisionOutcome;
  limit?: number;
}): Promise<Decision[]> {
  const admin = createAdminSupabaseClient();
  
  let query = admin
    .from("decisions")
    .select("*")
    .eq("user_id", userId);

  if (filters?.coworkerId) {
    query = query.eq("coworker_id", filters.coworkerId);
  }
  if (filters?.situationType) {
    query = query.eq("situation_type", filters.situationType);
  }
  if (filters?.outcome) {
    query = query.eq("outcome", filters.outcome);
  }

  query = query.order("created_at", { ascending: false });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch decisions: ${error.message}`);
  }

  return (data || []) as Decision[];
}

/**
 * Analyze decision patterns for a situation type
 */
export async function analyzeDecisionPattern(params: AnalyzeDecisionPatternParams): Promise<{
  pattern: {
    situationType: string;
    totalDecisions: number;
    agreementRate: number;
    successRate: number;
    averageConfidence: number;
    commonOwnerChoices: Array<{ choice: string; count: number }>;
    automationReady: boolean;
  };
  recommendations: string[];
}> {
  const decisions = await getDecisions(params.userId, {
    situationType: params.situationType,
    limit: params.limit || 50,
  });

  const totalDecisions = decisions.length;
  if (totalDecisions === 0) {
    return {
      pattern: {
        situationType: params.situationType,
        totalDecisions: 0,
        agreementRate: 0,
        successRate: 0,
        averageConfidence: 0,
        commonOwnerChoices: [],
        automationReady: false,
      },
      recommendations: ["Need more decision data to analyze patterns"],
    };
  }

  // Calculate agreement rate (how often owner agrees with Dobly)
  const agreements = decisions.filter(d => 
    JSON.stringify(d.dobly_recommendation) === JSON.stringify(d.owner_choice)
  ).length;
  const agreementRate = agreements / totalDecisions;

  // Calculate success rate
  const successfulDecisions = decisions.filter(d => d.outcome === "success").length;
  const successRate = successfulDecisions / totalDecisions;

  // Calculate average confidence
  const averageConfidence = decisions.reduce((sum, d) => sum + d.dobly_confidence, 0) / totalDecisions;

  // Find common owner choices
  const choiceCounts: Record<string, number> = {};
  for (const decision of decisions) {
    const choiceKey = JSON.stringify(decision.owner_choice);
    choiceCounts[choiceKey] = (choiceCounts[choiceKey] || 0) + 1;
  }

  const commonOwnerChoices = Object.entries(choiceCounts)
    .map(([choice, count]) => ({ choice, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Determine if the pattern is ready to propose. This does not auto-promote
  // autonomy; Dobly still needs explicit owner approval before auto-running it.
  const automationReady = 
    totalDecisions >= 10 &&
    agreementRate >= 0.8 &&
    successRate >= 0.85 &&
    averageConfidence >= 0.75;

  // Generate recommendations
  const recommendations: string[] = [];

  if (automationReady) {
    recommendations.push("This decision pattern is ready to propose as a rule candidate. Owner approval is still required before Dobly auto-runs it.");
  } else if (totalDecisions < 10) {
    recommendations.push("Need more decision data before considering automation.");
  } else if (agreementRate < 0.7) {
    recommendations.push("Low agreement rate between Dobly and owner. Review Dobly's recommendations.");
  } else if (successRate < 0.8) {
    recommendations.push("Success rate is below target. Review decision outcomes.");
  } else if (averageConfidence < 0.7) {
    recommendations.push("Dobly's confidence is low. Consider improving context or rules.");
  } else {
    recommendations.push("Pattern is developing. Continue monitoring.");
  }

  return {
    pattern: {
      situationType: params.situationType,
      totalDecisions,
      agreementRate,
      successRate,
      averageConfidence,
      commonOwnerChoices,
      automationReady,
    },
    recommendations,
  };
}

/**
 * Get decision learning summary for a user
 */
export async function getDecisionLearningSummary(userId: string): Promise<{
  totalDecisions: number;
  automatedDecisions: number;
  pendingAutomation: number;
  bySituationType: Record<string, {
    count: number;
    automationReady: boolean;
    agreementRate: number;
  }>;
  overallAutomationReadiness: number;
}> {
  const admin = createAdminSupabaseClient();
  
  const { data: decisions, error } = await admin
    .from("decisions")
    .select("situation_type, should_automate")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to fetch decisions: ${error.message}`);
  }

  const totalDecisions = decisions?.length || 0;
  const automatedDecisions = decisions?.filter(d => d.should_automate === true).length || 0;
  const pendingAutomation = decisions?.filter(d => d.should_automate === null).length || 0;

  // Group by situation type
  const bySituationType: Record<string, { count: number; automationReady: boolean; agreementRate: number }> = {};
  
  // Get detailed analysis for each situation type
  const situationTypes = Array.from(
    new Set<string>((decisions ?? []).map((decision) => String(decision.situation_type)).filter(Boolean)),
  );
  for (const situationType of situationTypes) {
    const analysis = await analyzeDecisionPattern({ situationType, userId });
    bySituationType[situationType] = {
      count: analysis.pattern.totalDecisions,
      automationReady: analysis.pattern.automationReady,
      agreementRate: analysis.pattern.agreementRate,
    };
  }

  // Calculate overall automation readiness
  const typesWithAutomation = Object.values(bySituationType).filter(t => t.automationReady).length;
  const overallAutomationReadiness = situationTypes.length > 0 
    ? typesWithAutomation / situationTypes.length 
    : 0;

  return {
    totalDecisions,
    automatedDecisions,
    pendingAutomation,
    bySituationType,
    overallAutomationReadiness,
  };
}

/**
 * Apply learned pattern to coworker
 */
export async function applyLearnedPattern(
  coworkerId: string,
  userId: string,
  situationType: string,
  pattern: Record<string, unknown>
): Promise<void> {
  const admin = createAdminSupabaseClient();
  
  // Get coworker
  const { data: coworker } = await admin
    .from("coworkers")
    .select("learning_loop")
    .eq("id", coworkerId)
    .eq("user_id", userId)
    .single();

  if (!coworker) {
    throw new Error("Coworker not found");
  }

  // Update learning loop with new pattern
  const learningLoop = coworker.learning_loop as Record<string, unknown> || {};
  const patterns = (learningLoop.decision_patterns || []) as Array<{ situationType: string; pattern: Record<string, unknown> }>;
  
  // Update or add pattern
  const existingIndex = patterns.findIndex(p => p.situationType === situationType);
  if (existingIndex >= 0) {
    patterns[existingIndex].pattern = pattern;
  } else {
    patterns.push({ situationType, pattern });
  }

  await admin
    .from("coworkers")
    .update({
      learning_loop: {
        ...learningLoop,
        decision_patterns: patterns,
        last_updated: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", coworkerId);
}

/**
 * Get decision recommendation based on learned patterns
 */
export async function getDecisionRecommendation(
  coworkerId: string,
  userId: string,
  situationType: string,
  context: Record<string, unknown>
): Promise<{
  recommendation: Record<string, unknown> | null;
  confidence: number;
  source: "pattern" | "default" | "none";
  reasoning: string;
}> {
  const admin = createAdminSupabaseClient();
  
  // Get coworker's learned patterns
  const { data: coworker } = await admin
    .from("coworkers")
    .select("learning_loop")
    .eq("id", coworkerId)
    .single();

  if (!coworker) {
    return {
      recommendation: null,
      confidence: 0,
      source: "none",
      reasoning: "Coworker not found",
    };
  }

  const learningLoop = coworker.learning_loop as Record<string, unknown> || {};
  const patterns = (learningLoop.decision_patterns || []) as Array<{ situationType: string; pattern: Record<string, unknown> }>;
  
  const learnedPattern = patterns.find(p => p.situationType === situationType);
  
  if (
    learnedPattern &&
    learnedPattern.pattern.automationReady === true &&
    learnedPattern.pattern.promotionStatus === "approved" &&
    learnedPattern.pattern.ownerApprovedAt
  ) {
    const recommendedAction =
      learnedPattern.pattern.recommendedAction &&
      typeof learnedPattern.pattern.recommendedAction === "object"
        ? (learnedPattern.pattern.recommendedAction as Record<string, unknown>)
        : null;

    return {
      recommendation: recommendedAction,
      confidence: learnedPattern.pattern.averageConfidence as number || 0.5,
      source: "pattern",
      reasoning: "Based on an owner-approved learned rule from previous decisions.",
    };
  }

  const missingFields = Object.entries(context)
    .filter(([, value]) => value === null || value === undefined || value === "")
    .map(([key]) => key)
    .slice(0, 10);
  const riskText = `${situationType} ${Object.keys(context).join(" ")}`.toLowerCase();
  const highRisk = /payment|refund|legal|medical|security|credential|delete|publish|send|contract/.test(riskText);

  return {
    recommendation: {
      action: missingFields.length ? "request_missing_information" : "request_human_review",
      situationType,
      missingFields,
      riskLevel: highRisk ? "high" : "medium",
      mayExecuteAutomatically: false,
    },
    confidence: missingFields.length ? 0.35 : 0.2,
    source: "default",
    reasoning: missingFields.length
      ? "No owner-approved rule exists and required context is missing. Collect it before asking for a decision."
      : "No owner-approved rule exists. Dobly prepared a bounded review recommendation without taking action.",
  };
}

async function maybePromoteDecisionPattern(params: {
  userId: string;
  coworkerId?: string;
  situationType: string;
  analysis: Awaited<ReturnType<typeof analyzeDecisionPattern>>;
}) {
  const admin = createAdminSupabaseClient();
  const { pattern } = params.analysis;
  if (!pattern.automationReady) return;

  const dominantChoice = pattern.commonOwnerChoices[0];
  const recommendedAction = dominantChoice ? safeParseJson(dominantChoice.choice) : null;
  const learnedPattern = {
    situationType: pattern.situationType,
    totalDecisions: pattern.totalDecisions,
    agreementRate: pattern.agreementRate,
    successRate: pattern.successRate,
    averageConfidence: pattern.averageConfidence,
    recommendedAction,
    ruleCandidate: true,
    automationReady: false,
    promotionStatus: "candidate",
    requiresOwnerApproval: true,
    candidateCreatedAt: new Date().toISOString(),
  };

  if (params.coworkerId) {
    await applyLearnedPattern(params.coworkerId, params.userId, params.situationType, learnedPattern);
  }

  const memoryKind = inferMemoryKindFromSituation(params.situationType);
  const memoryScope = inferMemoryScopeFromSituation(params.situationType);
  const memoryTitle = `${humanizeSituationType(params.situationType)} rule candidate`;
  const memoryBody = buildPromotedRuleBody(params.situationType, pattern, recommendedAction);

  const { data: existing } = await admin
    .from("business_memory_items")
    .select("id, metadata")
    .eq("user_id", params.userId)
    .eq("kind", memoryKind)
    .eq("title", memoryTitle)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await admin
      .from("business_memory_items")
      .update({
        body: memoryBody,
        metadata: {
          ...((existing.metadata as Record<string, unknown> | null) ?? {}),
          source: "decision_rule_candidate",
          pattern: learnedPattern,
          requiresOwnerApproval: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", params.userId);
    return;
  }

  await admin.from("business_memory_items").insert({
    user_id: params.userId,
    workspace_id: null,
    kind: memoryKind,
    scope: memoryScope,
    title: memoryTitle,
    body: memoryBody,
    tags: [params.situationType, "rule-candidate", "decision-learning", "needs-owner-approval"],
    source: "decision_rule_candidate",
    confidence: Math.max(0.75, pattern.averageConfidence),
    metadata: {
      pattern: learnedPattern,
      automationReady: false,
      ruleCandidate: true,
      requiresOwnerApproval: true,
    },
    updated_at: new Date().toISOString(),
  });
}

function inferMemoryKindFromSituation(situationType: string) {
  const lower = situationType.toLowerCase();
  if (/sales|lead|quote|pricing|follow/.test(lower)) return "sales_rule" as const;
  if (/support|refund|complaint|ticket/.test(lower)) return "support_rule" as const;
  if (/finance|payment|invoice|collection/.test(lower)) return "finance_rule" as const;
  if (/escalat|approval|legal|risk/.test(lower)) return "escalation_rule" as const;
  return "decision" as const;
}

function inferMemoryScopeFromSituation(situationType: string) {
  const lower = situationType.toLowerCase();
  if (/sales|lead|quote|pricing|follow/.test(lower)) return "sales";
  if (/support|refund|complaint|ticket/.test(lower)) return "support";
  if (/finance|payment|invoice|collection/.test(lower)) return "finance";
  if (/reception|inbound|booking/.test(lower)) return "reception";
  return "global";
}

function humanizeSituationType(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildPromotedRuleBody(
  situationType: string,
  pattern: Awaited<ReturnType<typeof analyzeDecisionPattern>>["pattern"],
  recommendedAction: Record<string, unknown> | null,
) {
  const actionSummary = recommendedAction ? JSON.stringify(recommendedAction) : "Use the dominant owner choice for this situation.";
  return [
    `Dobly found a candidate rule for "${humanizeSituationType(situationType)}", but it cannot auto-run until the owner approves promotion.`,
    `Evidence: ${pattern.totalDecisions} owner decisions, ${Math.round(pattern.agreementRate * 100)}% agreement, ${Math.round(pattern.successRate * 100)}% success, and ${Math.round(pattern.averageConfidence * 100)}% average confidence.`,
    `Proposed action: ${actionSummary}`,
    `Promotion gate: approve only if this is low-risk, reversible, well-scoped, and no broader than the examples that produced it.`,
    `Sensitive exceptions stay approval-gated even after promotion.`,
  ].join(" ");
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return { choice: value };
  }
}
