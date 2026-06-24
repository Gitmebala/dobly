import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Simulation, ScenarioType, SimulationOutcome, RiskLevel } from "@/types";

interface CreateSimulationParams {
  coworkerId: string;
  operatingSpecId?: string;
  scenarioName: string;
  scenarioType: ScenarioType;
  scenarioInput: Record<string, unknown>;
  userId: string;
}

interface RunSimulationParams {
  coworkerId: string;
  scenarioInput: Record<string, unknown>;
  scenarioType?: ScenarioType;
  userId: string;
}

type CoworkerSimulationContext = {
  id: string;
  desk: string;
  role: string;
  autonomy_level: string | null;
  tools: string[] | null;
  permissions: Record<string, unknown> | null;
  approval_boundaries: Record<string, unknown> | null;
  standards: Record<string, unknown> | null;
};

export async function createSimulation(params: CreateSimulationParams): Promise<Simulation> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from("simulations")
    .insert({
      coworker_id: params.coworkerId,
      operating_spec_id: params.operatingSpecId || null,
      scenario_name: params.scenarioName,
      scenario_type: params.scenarioType,
      scenario_input: params.scenarioInput,
      actions_taken: [],
      decisions_made: [],
      tools_used: [],
      outcome: "uncertain" as SimulationOutcome,
      confidence: 0,
      risk_level: null,
      strengths: [],
      weaknesses: [],
      escalation_points: [],
      created_by: params.userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create simulation: ${error.message}`);
  }

  return data as Simulation;
}

export async function runSimulation(params: RunSimulationParams): Promise<Simulation> {
  const simulation = await createSimulation({
    coworkerId: params.coworkerId,
    scenarioName: params.scenarioType || "custom",
    scenarioType: params.scenarioType || "custom",
    scenarioInput: params.scenarioInput,
    userId: params.userId,
  });

  const coworker = await getCoworkerContext(params.coworkerId, params.userId);
  const result = evaluateScenario(coworker, params.scenarioInput, params.scenarioType || "custom");

  return updateSimulationResult({
    simulationId: simulation.id,
    userId: params.userId,
    result,
  });
}

export async function updateSimulationResult(params: {
  simulationId: string;
  userId: string;
  result: {
    actions_taken: Record<string, unknown>[];
    decisions_made: Record<string, unknown>[];
    tools_used: Record<string, unknown>[];
    outcome: SimulationOutcome;
    confidence: number;
    risk_level: RiskLevel | null;
    strengths: Record<string, unknown>[];
    weaknesses: Record<string, unknown>[];
    escalation_points: Record<string, unknown>[];
  };
}): Promise<Simulation> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from("simulations")
    .update(params.result)
    .eq("id", params.simulationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update simulation result: ${error.message}`);
  }

  return data as Simulation;
}

export async function getSimulations(coworkerId: string, userId: string, filters?: {
  scenarioType?: ScenarioType;
  outcome?: SimulationOutcome;
  limit?: number;
}): Promise<Simulation[]> {
  const admin = createAdminSupabaseClient();
  let query = admin.from("simulations").select("*").eq("coworker_id", coworkerId);
  if (filters?.scenarioType) query = query.eq("scenario_type", filters.scenarioType);
  if (filters?.outcome) query = query.eq("outcome", filters.outcome);
  query = query.order("created_at", { ascending: false });
  if (filters?.limit) query = query.limit(filters.limit);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch simulations: ${error.message}`);
  return (data || []) as Simulation[];
}

export async function getSimulationSummary(coworkerId: string, userId: string): Promise<{
  totalSimulations: number;
  successRate: number;
  averageConfidence: number;
  byScenarioType: Record<string, { count: number; successRate: number }>;
  commonWeaknesses: string[];
  commonStrengths: string[];
}> {
  const simulations = await getSimulations(coworkerId, userId);
  const totalSimulations = simulations.length;
  const successfulSimulations = simulations.filter((simulation) => simulation.outcome === "success").length;
  const successRate = totalSimulations > 0 ? successfulSimulations / totalSimulations : 0;
  const averageConfidence =
    totalSimulations > 0
      ? simulations.reduce((sum, simulation) => sum + simulation.confidence, 0) / totalSimulations
      : 0;

  const byScenarioType: Record<string, { count: number; successRate: number }> = {};
  const weaknessCounts: Record<string, number> = {};
  const strengthCounts: Record<string, number> = {};

  for (const simulation of simulations) {
    if (!byScenarioType[simulation.scenario_type]) {
      byScenarioType[simulation.scenario_type] = { count: 0, successRate: 0 };
    }
    byScenarioType[simulation.scenario_type].count += 1;
    if (simulation.outcome === "success") byScenarioType[simulation.scenario_type].successRate += 1;

    for (const weakness of simulation.weaknesses as Array<{ aspect: string }>) {
      weaknessCounts[weakness.aspect] = (weaknessCounts[weakness.aspect] || 0) + 1;
    }
    for (const strength of simulation.strengths as Array<{ aspect: string }>) {
      strengthCounts[strength.aspect] = (strengthCounts[strength.aspect] || 0) + 1;
    }
  }

  for (const key of Object.keys(byScenarioType)) {
    byScenarioType[key].successRate /= byScenarioType[key].count;
  }

  const commonWeaknesses = Object.entries(weaknessCounts)
    .filter(([, count]) => count >= Math.max(1, totalSimulations * 0.3))
    .map(([aspect]) => aspect);
  const commonStrengths = Object.entries(strengthCounts)
    .filter(([, count]) => count >= Math.max(1, totalSimulations * 0.3))
    .map(([aspect]) => aspect);

  return {
    totalSimulations,
    successRate,
    averageConfidence,
    byScenarioType,
    commonWeaknesses,
    commonStrengths,
  };
}

export async function runScenarioSuite(coworkerId: string, userId: string): Promise<{
  results: Simulation[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    needsReview: number;
  };
}> {
  const scenarios = getPredefinedScenarios();
  const results: Simulation[] = [];

  for (const scenario of scenarios) {
    results.push(
      await runSimulation({
        coworkerId,
        scenarioInput: scenario.input,
        scenarioType: scenario.type,
        userId,
      }),
    );
  }

  return {
    results,
    summary: {
      total: results.length,
      passed: results.filter((simulation) => simulation.outcome === "success").length,
      failed: results.filter((simulation) => simulation.outcome === "failure").length,
      needsReview: results.filter((simulation) => simulation.outcome === "uncertain" || simulation.outcome === "escalation").length,
    },
  };
}

function evaluateScenario(
  coworker: CoworkerSimulationContext | null,
  scenarioInput: Record<string, unknown>,
  scenarioType: ScenarioType,
) {
  const eventType = String(scenarioInput.event_type ?? "custom");
  const message = String(scenarioInput.message ?? "").trim();
  const urgency = String(scenarioInput.urgency ?? "normal").toLowerCase();
  const sentiment = String(scenarioInput.sentiment ?? "").toLowerCase();
  const invoiceAge = Number(scenarioInput.invoice_age_days ?? 0);
  const hasConflict = Boolean(scenarioInput.conflicting_requirements);
  const missingMessage = eventType === "inbound_message" && message.length === 0;
  const risky = urgency === "critical" || sentiment === "angry" || invoiceAge >= 30 || hasConflict;
  const riskLevel: RiskLevel =
    urgency === "critical" || sentiment === "angry" || hasConflict ? "high" : urgency === "high" || invoiceAge >= 21 ? "medium" : "low";

  const tools = coworker?.tools ?? [];
  const canOperate = Boolean(coworker);
  const baseConfidence = inferConfidence(coworker, scenarioType, riskLevel, missingMessage);
  const requiresEscalation = !canOperate || missingMessage || (risky && baseConfidence < 0.75);

  const actionsTaken = [
    { action: "classify_input", result: eventType, confidence: clamp(baseConfidence, 0, 1) },
    { action: "check_context", result: coworker?.desk ?? "unknown_desk" },
    {
      action: requiresEscalation ? "prepare_escalation" : "prepare_execution",
      result: requiresEscalation ? "owner_review_needed" : "safe_to_continue",
    },
  ];

  if (eventType === "payment_reminder") {
    actionsTaken.push({
      action: "set_collections_tone",
      result: invoiceAge >= 30 ? "firm" : "polite",
    });
  }

  const decisionsMade = [
    {
      decision: "autonomy_gate",
      choice: requiresEscalation ? "escalate" : "proceed",
      confidence: clamp(baseConfidence, 0, 1),
    },
    {
      decision: "risk_level",
      choice: riskLevel,
      confidence: risky ? 0.88 : 0.74,
    },
  ];

  const toolsUsed = (tools.length > 0 ? tools : inferFallbackTools(eventType, coworker?.desk)).slice(0, 4).map((tool) => ({ tool }));
  const strengths = buildStrengths(coworker, riskLevel, tools.length);
  const weaknesses = buildWeaknesses(coworker, missingMessage, risky, tools.length);
  const escalationPoints = requiresEscalation
    ? [
        {
          reason: missingMessage ? "missing_context" : "risk_threshold",
          recommendation: missingMessage
            ? "Collect basic context before taking action."
            : "Route this scenario to the owner or a stricter approval boundary.",
        },
      ]
    : [];

  let outcome: SimulationOutcome = "success";
  if (!canOperate || missingMessage) outcome = "failure";
  else if (requiresEscalation) outcome = "escalation";
  else if (baseConfidence < 0.68) outcome = "uncertain";

  return {
    actions_taken: actionsTaken,
    decisions_made: decisionsMade,
    tools_used: toolsUsed,
    outcome,
    confidence: clamp(baseConfidence, 0, 1),
    risk_level: riskLevel,
    strengths,
    weaknesses,
    escalation_points: escalationPoints,
  };
}

async function getCoworkerContext(coworkerId: string, userId: string): Promise<CoworkerSimulationContext | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("coworkers")
    .select("id,desk,role,autonomy_level,tools,permissions,approval_boundaries,standards")
    .eq("id", coworkerId)
    .eq("user_id", userId)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`Failed to fetch coworker: ${error.message}`);
  return data as CoworkerSimulationContext;
}

function inferConfidence(
  coworker: CoworkerSimulationContext | null,
  scenarioType: ScenarioType,
  riskLevel: RiskLevel,
  missingMessage: boolean,
) {
  let confidence = 0.62;
  if (coworker?.autonomy_level === "delegated") confidence += 0.08;
  if (coworker?.autonomy_level === "guarded") confidence += 0.04;
  confidence += Math.min((coworker?.tools ?? []).length, 4) * 0.04;
  if (scenarioType === "hard") confidence -= 0.12;
  if (scenarioType === "edge_case") confidence -= 0.18;
  if (riskLevel === "high") confidence -= 0.12;
  if (riskLevel === "medium") confidence -= 0.05;
  if (missingMessage) confidence -= 0.25;
  return confidence;
}

function buildStrengths(coworker: CoworkerSimulationContext | null, riskLevel: RiskLevel, toolCount: number) {
  const strengths: Record<string, unknown>[] = [];
  if (toolCount >= 3) strengths.push({ aspect: "tool_coverage", score: 0.86 });
  if (coworker?.autonomy_level === "delegated") strengths.push({ aspect: "autonomy_readiness", score: 0.84 });
  if (riskLevel === "low") strengths.push({ aspect: "safe_operating_envelope", score: 0.8 });
  if (strengths.length === 0) strengths.push({ aspect: "baseline_reasoning", score: 0.65 });
  return strengths;
}

function buildWeaknesses(coworker: CoworkerSimulationContext | null, missingMessage: boolean, risky: boolean, toolCount: number) {
  const weaknesses: Record<string, unknown>[] = [];
  if (!coworker) weaknesses.push({ aspect: "missing_coworker_context", score: 0.2 });
  if (missingMessage) weaknesses.push({ aspect: "missing_context", score: 0.25 });
  if (toolCount === 0) weaknesses.push({ aspect: "tool_readiness", score: 0.4 });
  if (risky) weaknesses.push({ aspect: "high_risk_judgment", score: 0.45 });
  return weaknesses;
}

function inferFallbackTools(eventType: string, desk?: string | null) {
  if (eventType === "payment_reminder" || desk === "finance_desk") return ["payment_checker", "reminder_scheduler"];
  if (eventType === "support_case" || desk === "support_desk") return ["ticket_classifier", "knowledge_base_search"];
  return ["message_classifier", "response_generator"];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getPredefinedScenarios(): Array<{ type: ScenarioType; input: Record<string, unknown> }> {
  return [
    {
      type: "common",
      input: {
        event_type: "inbound_message",
        message: "Hi, I'm interested in your services. Can you send me more info?",
        customer_type: "new_lead",
        urgency: "normal",
      },
    },
    {
      type: "common",
      input: {
        event_type: "support_case",
        message: "I haven't received my order yet. It's been 2 weeks.",
        customer_type: "existing_customer",
        urgency: "high",
      },
    },
    {
      type: "hard",
      input: {
        event_type: "support_case",
        message: "This is unacceptable! I want a refund immediately or I'll report you!",
        customer_type: "vip_customer",
        urgency: "critical",
        sentiment: "angry",
      },
    },
    {
      type: "hard",
      input: {
        event_type: "payment_reminder",
        invoice_age_days: 45,
        amount: 50000,
        previous_reminders: 3,
      },
    },
    {
      type: "edge_case",
      input: {
        event_type: "inbound_message",
        message: "",
        customer_type: "unknown",
        urgency: "unknown",
      },
    },
    {
      type: "edge_case",
      input: {
        event_type: "complex_request",
        message: "I need X, Y, and Z, but only if you can also do A and B, and the price should be under C.",
        customer_type: "enterprise",
        urgency: "medium",
        conflicting_requirements: true,
      },
    },
  ];
}
