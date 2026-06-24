import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  generateOutcomeContract,
  type OutcomeContract,
  type OutcomeContractEntityInput,
  type OutcomeContractEntityType,
} from "@/lib/outcome-contracts-core";

type JsonRecord = Record<string, unknown>;

export interface OutcomeContractRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  entity_type: OutcomeContractEntityType;
  entity_id: string | null;
  title: string;
  status: string;
  score: number;
  summary: string;
  contract: OutcomeContract;
  created_at: string;
  updated_at: string;
}

function isMissingRelationOrColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /does not exist|Could not find the '.*' column|relation .* does not exist/i.test(message);
}

export async function getLatestOutcomeContract(params: {
  userId: string;
  entityType: OutcomeContractEntityType;
  entityId: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("outcome_contracts")
    .select("*")
    .eq("user_id", params.userId)
    .eq("entity_type", params.entityType)
    .eq("entity_id", params.entityId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingRelationOrColumn(error)) return null;
    throw new Error(error.message);
  }

  return (data as OutcomeContractRecord | null) ?? null;
}

export async function saveOutcomeContract(params: {
  userId: string;
  workspaceId?: string | null;
  entityType: OutcomeContractEntityType;
  entityId?: string | null;
  contract: OutcomeContract;
}) {
  const admin = createAdminSupabaseClient();
  const payload = {
    user_id: params.userId,
    workspace_id: params.workspaceId ?? null,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    title: params.contract.title,
    status: params.contract.status,
    score: params.contract.critique.overallScore,
    summary: params.contract.summary,
    contract: params.contract,
  };

  const { data, error } = await admin
    .from("outcome_contracts")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationOrColumn(error)) return null;
    throw new Error(error.message);
  }

  return data as OutcomeContractRecord;
}

export async function ensureOutcomeContract(input: OutcomeContractEntityInput & {
  userId: string;
  minimumScore?: number;
  forceRegenerate?: boolean;
}) {
  const minimumScore = input.minimumScore ?? 0.82;
  if (!input.entityId) {
    const contract = generateOutcomeContract(input);
    return { contract, record: null, reused: false };
  }

  const existing = !input.forceRegenerate
    ? await getLatestOutcomeContract({
        userId: input.userId,
        entityType: input.entityType,
        entityId: input.entityId,
      }).catch(() => null)
    : null;

  if (existing?.contract && existing.score >= minimumScore && existing.status === "approved") {
    return { contract: existing.contract, record: existing, reused: true };
  }

  const contract = generateOutcomeContract(input);
  const record = await saveOutcomeContract({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    contract,
  }).catch(() => null);

  return { contract, record, reused: false };
}

export async function generateOutcomeContractForJob(payload: JsonRecord) {
  const entityType = String(payload.entityType ?? "") as OutcomeContractEntityType;
  if (!["operator", "coworker", "runtime_command"].includes(entityType)) {
    throw new Error("Outcome contract job is missing a supported entity type.");
  }

  const entityId = typeof payload.entityId === "string" ? payload.entityId : null;
  const userId = String(payload.userId ?? "");
  if (!userId) throw new Error("Outcome contract job is missing userId.");

  const admin = createAdminSupabaseClient();

  if (entityType === "operator" && entityId) {
    const { data, error } = await admin
      .from("dobly_operators")
      .select("*")
      .eq("id", entityId)
      .eq("user_id", userId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Operator not found for outcome contract generation.");

    return ensureOutcomeContract({
      userId,
      entityType,
      entityId,
      workspaceId: (data as JsonRecord).workspace_id as string | null | undefined,
      name: String((data as JsonRecord).name ?? "Operator"),
      mission: String((data as JsonRecord).mission ?? ""),
      outcome: String((data as JsonRecord).outcome ?? ""),
      prompt: typeof payload.prompt === "string" ? payload.prompt : String((data as JsonRecord).mission ?? ""),
      capabilityTags: Array.isArray((data as JsonRecord).capability_tags) ? (data as JsonRecord).capability_tags as string[] : [],
      guardrails: ((data as JsonRecord).guardrails as JsonRecord | null | undefined) ?? null,
      approvalMode: typeof (data as JsonRecord).approval_mode === "string" ? String((data as JsonRecord).approval_mode) : null,
      tools: Array.isArray((data as JsonRecord).connected_tool_ids) ? (data as JsonRecord).connected_tool_ids as string[] : [],
      minimumScore: typeof payload.minimumScore === "number" ? Number(payload.minimumScore) : undefined,
      forceRegenerate: Boolean(payload.forceRegenerate),
    });
  }

  if (entityType === "coworker" && entityId) {
    const { data, error } = await admin
      .from("coworkers")
      .select("*")
      .eq("id", entityId)
      .eq("user_id", userId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Coworker not found for outcome contract generation.");

    return ensureOutcomeContract({
      userId,
      entityType,
      entityId,
      workspaceId: null,
      name: String((data as JsonRecord).name ?? "Coworker"),
      mission: String((data as JsonRecord).mission ?? ""),
      outcome: Array.isArray((data as JsonRecord).target_outcomes)
        ? String(((data as JsonRecord).target_outcomes as unknown[])[0] ?? (data as JsonRecord).mission ?? "")
        : String((data as JsonRecord).mission ?? ""),
      targetOutcomes: Array.isArray((data as JsonRecord).target_outcomes) ? (data as JsonRecord).target_outcomes as string[] : [],
      tools: Array.isArray((data as JsonRecord).tools) ? (data as JsonRecord).tools as string[] : [],
      guardrails: ((data as JsonRecord).approval_boundaries as JsonRecord | null | undefined) ?? null,
      approvalMode: typeof (data as JsonRecord).autonomy_level === "string" ? String((data as JsonRecord).autonomy_level) : null,
      standards: ((data as JsonRecord).standards as JsonRecord | null | undefined) ?? null,
      minimumScore: typeof payload.minimumScore === "number" ? Number(payload.minimumScore) : undefined,
      forceRegenerate: Boolean(payload.forceRegenerate),
    });
  }

  return ensureOutcomeContract({
    userId,
    entityType,
    entityId,
    workspaceId: typeof payload.workspaceId === "string" ? payload.workspaceId : null,
    name: String(payload.name ?? "Dobly Runtime"),
    mission: String(payload.mission ?? payload.prompt ?? "Execute the requested work well."),
    outcome: typeof payload.outcome === "string" ? payload.outcome : null,
    prompt: typeof payload.prompt === "string" ? payload.prompt : null,
    targetOutcomes: Array.isArray(payload.targetOutcomes) ? payload.targetOutcomes.map(String) : [],
    capabilityTags: Array.isArray(payload.capabilityTags) ? payload.capabilityTags.map(String) : [],
    tools: Array.isArray(payload.tools) ? payload.tools.map(String) : [],
    guardrails: typeof payload.guardrails === "object" && payload.guardrails ? (payload.guardrails as JsonRecord) : null,
    approvalMode: typeof payload.approvalMode === "string" ? payload.approvalMode : null,
    standards: typeof payload.standards === "object" && payload.standards ? (payload.standards as JsonRecord) : null,
    minimumScore: typeof payload.minimumScore === "number" ? Number(payload.minimumScore) : undefined,
    forceRegenerate: Boolean(payload.forceRegenerate),
  });
}
