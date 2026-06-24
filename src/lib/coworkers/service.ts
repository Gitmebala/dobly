import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { ensureOutcomeContract } from "@/lib/outcome-contracts";
import { enqueueOutcomeContractGeneration } from "@/lib/runtime/job-queue";
import type {
  LegacyCoworker as Coworker,
  CoworkerRole,
  CoworkerDesk,
  CoworkerTone,
  CoworkerAutonomyLevel,
  CoworkerDeploymentState,
  CoworkerStatus,
} from "@/types";

interface CreateCoworkerParams {
  userId: string;
  businessProfileId?: string;
  role: CoworkerRole;
  name: string;
  mission: string;
  description?: string;
  desk: CoworkerDesk;
  tone?: CoworkerTone;
  autonomyLevel?: CoworkerAutonomyLevel;
  tools?: string[];
  targetOutcomes?: string[];
}

interface UpdateCoworkerParams {
  coworkerId: string;
  userId: string;
  updates: Partial<{
    name: string;
    mission: string;
    description: string;
    desk: CoworkerDesk;
    tone: CoworkerTone;
    autonomyLevel: CoworkerAutonomyLevel;
    deploymentState: CoworkerDeploymentState;
    status: CoworkerStatus;
    tools: string[];
    targetOutcomes: string[];
    standards: Record<string, unknown>;
    permissions: Record<string, unknown>;
    approval_boundaries: Record<string, unknown>;
    escalation_rules: Record<string, unknown>;
  }>;
}

interface PackageCoworkerParams {
  coworkerId: string;
  userId: string;
  prompt: string;
}

interface DeployCoworkerParams {
  coworkerId: string;
  userId: string;
  targetState: CoworkerDeploymentState;
}

/**
 * Create a new coworker
 */
export async function createCoworker(params: CreateCoworkerParams): Promise<Coworker> {
  const admin = createAdminSupabaseClient();
  
  const { data, error } = await admin
    .from("coworkers")
    .insert({
      user_id: params.userId,
      business_profile_id: params.businessProfileId || null,
      role: params.role,
      name: params.name,
      mission: params.mission,
      description: params.description || null,
      desk: params.desk,
      desk_scope: getDefaultDeskScope(params.desk),
      tone: params.tone || "professional",
      personality: getDefaultPersonality(params.role),
      memory_scope: getDefaultMemoryScope(params.role),
      context_bindings: {},
      permissions: getDefaultPermissions(params.role),
      approval_boundaries: getDefaultApprovalBoundaries(params.autonomyLevel || "supervised"),
      escalation_rules: getDefaultEscalationRules(params.role),
      tools: params.tools || getDefaultTools(params.role),
      tool_permissions: {},
      success_metrics: getDefaultSuccessMetrics(params.role),
      target_outcomes: params.targetOutcomes || [],
      operating_hours: { "24/7": true },
      autonomy_level: params.autonomyLevel || "supervised",
      deployment_state: "draft",
      deployment_stage: {},
      learning_loop: {},
      version: 1,
      status: "draft",
      health_score: 0.50,
      trust_score: 0.50,
      value_score: 0.50,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create coworker: ${error.message}`);
  }

  await enqueueOutcomeContractGeneration({
    userId: params.userId,
    entityType: "coworker",
    entityId: String((data as Record<string, unknown>).id),
    name: params.name,
    mission: params.mission,
    outcome: params.targetOutcomes?.[0] ?? params.mission,
    targetOutcomes: params.targetOutcomes ?? [],
    tools: params.tools || getDefaultTools(params.role),
    guardrails: getDefaultApprovalBoundaries(params.autonomyLevel || "supervised"),
    approvalMode: params.autonomyLevel || "supervised",
    minimumScore: 0.84,
  }).catch(() => undefined);

  return data as Coworker;
}

/**
 * Get a coworker by ID
 */
export async function getCoworker(coworkerId: string, userId: string): Promise<Coworker | null> {
  const admin = createAdminSupabaseClient();
  
  const { data, error } = await admin
    .from("coworkers")
    .select("*")
    .eq("id", coworkerId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch coworker: ${error.message}`);
  }

  return data as Coworker;
}

/**
 * Get all coworkers for a user
 */
export async function getCoworkers(userId: string, filters?: {
  role?: CoworkerRole;
  desk?: CoworkerDesk;
  status?: CoworkerStatus;
  deploymentState?: CoworkerDeploymentState;
}): Promise<Coworker[]> {
  const admin = createAdminSupabaseClient();
  
  let query = admin
    .from("coworkers")
    .select("*")
    .eq("user_id", userId);

  if (filters?.role) {
    query = query.eq("role", filters.role);
  }
  if (filters?.desk) {
    query = query.eq("desk", filters.desk);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.deploymentState) {
    query = query.eq("deployment_state", filters.deploymentState);
  }

  query = query.order("updated_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch coworkers: ${error.message}`);
  }

  return (data || []) as Coworker[];
}

/**
 * Update a coworker
 */
export async function updateCoworker(params: UpdateCoworkerParams): Promise<Coworker> {
  const admin = createAdminSupabaseClient();
  
  const { data, error } = await admin
    .from("coworkers")
    .update({
      ...params.updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.coworkerId)
    .eq("user_id", params.userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update coworker: ${error.message}`);
  }

  return data as Coworker;
}

/**
 * Delete a coworker
 */
export async function deleteCoworker(coworkerId: string, userId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  
  const { error } = await admin
    .from("coworkers")
    .delete()
    .eq("id", coworkerId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete coworker: ${error.message}`);
  }
}

/**
 * Package a coworker - convert natural language prompt into structured coworker config
 */
export async function packageCoworker(params: PackageCoworkerParams): Promise<{
  coworker: Coworker;
  spec: any;
  launchReadiness: number;
  missingElements: string[];
  outcomeContract: Awaited<ReturnType<typeof ensureOutcomeContract>>["contract"];
}> {
  const coworker = await getCoworker(params.coworkerId, params.userId);
  if (!coworker) {
    throw new Error("Coworker not found");
  }

  const outcomeContractState = await ensureOutcomeContract({
    userId: params.userId,
    entityType: "coworker",
    entityId: coworker.id,
    name: coworker.name,
    mission: coworker.mission,
    outcome: coworker.target_outcomes?.[0] ?? coworker.mission,
    prompt: params.prompt,
    targetOutcomes: coworker.target_outcomes ?? [],
    tools: coworker.tools ?? [],
    guardrails: coworker.approval_boundaries ?? {},
    approvalMode: coworker.autonomy_level,
    standards: coworker.standards ?? {},
    minimumScore: 0.84,
  });

  const spec = {
    spec_type: "hybrid" as const,
    spec: {},
    deterministic_paths: [],
    agent_nodes: [],
    fallback_paths: [],
    retry_policy: { attempts: 2, backoffSeconds: 3 },
    timeout_config: { default: 30000 },
    checkpoint_config: {},
    observation_hooks: [],
    memory_writes: [],
    is_valid: true,
    validation_errors: outcomeContractState.contract.critique.passes ? [] : outcomeContractState.contract.critique.rewriteReasons,
    outcome_contract: {
      score: outcomeContractState.contract.critique.overallScore,
      status: outcomeContractState.contract.status,
      standard_of_done: outcomeContractState.contract.standardOfDone,
      success_criteria: outcomeContractState.contract.successCriteria,
      verification_checklist: outcomeContractState.contract.verificationChecklist,
    },
  };

  const missingElements = analyzeMissingElements(coworker);
  const launchReadiness = Math.max(
    0,
    Math.min(1, calculateLaunchReadiness(coworker, missingElements) * 0.6 + outcomeContractState.contract.critique.overallScore * 0.4),
  );

  return {
    coworker,
    spec,
    launchReadiness,
    missingElements,
    outcomeContract: outcomeContractState.contract,
  };
}

/**
 * Deploy a coworker to a specific state
 */
export async function deployCoworker(params: DeployCoworkerParams): Promise<Coworker> {
  const admin = createAdminSupabaseClient();
  const coworker = await getCoworker(params.coworkerId, params.userId);
  if (!coworker) throw new Error("Coworker not found");
  const outcomeContractState = await ensureOutcomeContract({
    userId: params.userId,
    entityType: "coworker",
    entityId: coworker.id,
    name: coworker.name,
    mission: coworker.mission,
    outcome: coworker.target_outcomes?.[0] ?? coworker.mission,
    targetOutcomes: coworker.target_outcomes ?? [],
    tools: coworker.tools ?? [],
    guardrails: coworker.approval_boundaries ?? {},
    approvalMode: coworker.autonomy_level,
    standards: coworker.standards ?? {},
    minimumScore: 0.84,
  });
  if (!outcomeContractState.contract.critique.passes) {
    throw new Error("Dobly will not deploy this coworker yet because its Standard of Done is not strong enough.");
  }
  
  const { data, error } = await admin
    .from("coworkers")
    .update({
      deployment_state: params.targetState,
      deployment_stage: {
        ...(coworker.deployment_stage ?? {}),
        outcomeContractScore: outcomeContractState.contract.critique.overallScore,
        outcomeContractStatus: outcomeContractState.contract.status,
        outcomeContractGeneratedAt: outcomeContractState.contract.generatedAt,
      },
      last_deployed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.coworkerId)
    .eq("user_id", params.userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to deploy coworker: ${error.message}`);
  }

  return data as Coworker;
}

/**
 * Get coworker health snapshot
 */
export async function getCoworkerHealth(coworkerId: string, userId: string): Promise<any> {
  const admin = createAdminSupabaseClient();
  
  const { data, error } = await admin
    .from("coworker_health")
    .select("*")
    .eq("coworker_id", coworkerId)
    .order("period_end", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // No health data yet
    }
    throw new Error(`Failed to fetch coworker health: ${error.message}`);
  }

  return data;
}

// Helper functions for defaults

function getDefaultDeskScope(desk: CoworkerDesk): Record<string, unknown> {
  const scopes: Record<CoworkerDesk, Record<string, unknown>> = {
    customer_desk: {
      owns: ["inbound_messages", "lead_qualification", "initial_response"],
      channels: ["whatsapp", "email", "phone"],
    },
    finance_desk: {
      owns: ["invoicing", "payment_followup", "collections"],
      channels: ["email", "sms", "whatsapp"],
    },
    support_desk: {
      owns: ["support_tickets", "complaints", "escalations"],
      channels: ["email", "whatsapp", "phone"],
    },
    operations_desk: {
      owns: ["inventory", "suppliers", "logistics"],
      channels: ["email", "phone"],
    },
  };
  return scopes[desk] || {};
}

function getDefaultPersonality(role: CoworkerRole): Record<string, unknown> {
  const personalities: Record<CoworkerRole, Record<string, unknown>> = {
    reception: { helpful: 0.9, formal: 0.7, warm: 0.8 },
    collections: { persistent: 0.8, firm: 0.7, respectful: 0.9 },
    support: { empathetic: 0.9, patient: 0.8, solution_oriented: 0.9 },
    growth_research: { analytical: 0.9, curious: 0.8, strategic: 0.7 },
    operations_coordinator: { organized: 0.9, efficient: 0.8, detail_oriented: 0.9 },
  };
  return personalities[role] || {};
}

function getDefaultMemoryScope(role: CoworkerRole): Record<string, unknown> {
  return {
    customer_history: true,
    conversation_context: true,
    previous_decisions: true,
    business_policies: true,
  };
}

function getDefaultPermissions(role: CoworkerRole): Record<string, unknown> {
  const permissions: Record<CoworkerRole, Record<string, unknown>> = {
    reception: { can_send_messages: true, can_qualify_leads: true, can_book_appointments: false },
    collections: { can_send_reminders: true, can_negotiate: false, can_offer_discounts: false },
    support: { can_resolve_tickets: true, can_escalate: true, can_issue_refunds: false },
    growth_research: { can_analyze_data: true, can_suggest_campaigns: false, can_execute_campaigns: false },
    operations_coordinator: { can_monitor_inventory: true, can_place_orders: false, can_manage_suppliers: false },
  };
  return permissions[role] || {};
}

function getDefaultApprovalBoundaries(autonomyLevel: CoworkerAutonomyLevel): Record<string, unknown> {
  const boundaries: Record<CoworkerAutonomyLevel, Record<string, unknown>> = {
    supervised: {
      requires_approval_for: ["sending_messages", "making_commitments", "spending_money"],
      auto_approve_threshold: 0,
    },
    guarded: {
      requires_approval_for: ["making_commitments", "spending_money"],
      auto_approve_threshold: 0.7,
    },
    delegated: {
      requires_approval_for: ["spending_money"],
      auto_approve_threshold: 0.9,
    },
  };
  return boundaries[autonomyLevel] || boundaries.supervised;
}

function getDefaultEscalationRules(role: CoworkerRole): Record<string, unknown> {
  return {
    escalate_on: ["angry_sentiment", "high_value_customer", "legal_risk", "payment_dispute"],
    escalate_after: { failed_attempts: 3, hours_without_resolution: 24 },
    escalate_to: "owner",
  };
}

function getDefaultTools(role: CoworkerRole): string[] {
  const tools: Record<CoworkerRole, string[]> = {
    reception: ["message_classifier", "lead_qualifier", "calendar_check"],
    collections: ["payment_checker", "reminder_scheduler", "invoice_generator"],
    support: ["ticket_classifier", "knowledge_base_search", "resolution_recommender"],
    growth_research: ["data_analyzer", "pattern_detector", "opportunity_scorer"],
    operations_coordinator: ["inventory_monitor", "supplier_tracker", "order_processor"],
  };
  return tools[role] || [];
}

function getDefaultSuccessMetrics(role: CoworkerRole): Record<string, unknown> {
  const metrics: Record<CoworkerRole, Record<string, unknown>> = {
    reception: { response_time_seconds: 300, qualification_rate: 0.8 },
    collections: { recovery_rate: 0.7, days_to_payment: 14 },
    support: { resolution_rate: 0.9, customer_satisfaction: 4.5 },
    growth_research: { opportunities_identified: 5, conversion_rate: 0.3 },
    operations_coordinator: { inventory_accuracy: 0.99, on_time_delivery: 0.95 },
  };
  return metrics[role] || {};
}

function analyzeMissingElements(coworker: Coworker): string[] {
  const missing: string[] = [];
  
  if (!coworker.tools || coworker.tools.length === 0) {
    missing.push("No tools configured");
  }
  if (!coworker.target_outcomes || coworker.target_outcomes.length === 0) {
    missing.push("No target outcomes defined");
  }
  if (Object.keys(coworker.standards || {}).length === 0) {
    missing.push("No standards defined");
  }
  if (Object.keys(coworker.permissions || {}).length === 0) {
    missing.push("No permissions configured");
  }
  
  return missing;
}

function calculateLaunchReadiness(coworker: Coworker, missingElements: string[]): number {
  let readiness = 1.0;
  
  // Deduct for missing elements
  readiness -= missingElements.length * 0.15;
  
  // Deduct for draft status
  if (coworker.status === "draft") {
    readiness -= 0.2;
  }
  
  // Deduct for low trust score
  if (coworker.trust_score < 0.5) {
    readiness -= 0.1;
  }
  
  return Math.max(0, Math.min(1, readiness));
}
