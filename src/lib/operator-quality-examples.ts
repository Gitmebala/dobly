import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type JsonRecord = Record<string, unknown>;

export type OperatorQualityExampleLevel = "gold" | "acceptable" | "rejected";

export interface OperatorQualityExampleRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  operator_id: string | null;
  lane_id: string;
  artifact_kind: string;
  quality_level: OperatorQualityExampleLevel;
  title: string;
  content: JsonRecord;
  rationale: string | null;
  tags: string[];
  source_artifact_id: string | null;
  source_feedback_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperatorQualityReferenceSet {
  gold: OperatorQualityExampleRecord | null;
  acceptable: OperatorQualityExampleRecord | null;
  rejected: OperatorQualityExampleRecord | null;
  all: OperatorQualityExampleRecord[];
}

function isMissingRelationOrColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /does not exist|Could not find the '.*' column|relation .* does not exist/i.test(message);
}

function pickBestMatch(
  examples: OperatorQualityExampleRecord[],
  qualityLevel: OperatorQualityExampleLevel,
  operatorId?: string | null,
  workspaceId?: string | null,
) {
  const filtered = examples.filter((example) => example.quality_level === qualityLevel);
  if (filtered.length === 0) return null;

  const exactOperator = operatorId ? filtered.find((example) => example.operator_id === operatorId) : null;
  if (exactOperator) return exactOperator;

  const exactWorkspace = workspaceId ? filtered.find((example) => example.workspace_id === workspaceId) : null;
  if (exactWorkspace) return exactWorkspace;

  return filtered[0] ?? null;
}

export async function listOperatorQualityExamples(input: {
  userId: string;
  workspaceId?: string | null;
  operatorId?: string | null;
  laneId?: string | null;
  artifactKind?: string | null;
  qualityLevel?: OperatorQualityExampleLevel | null;
  limit?: number;
}) {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("operator_quality_examples")
    .select("*")
    .eq("user_id", input.userId)
    .order("updated_at", { ascending: false })
    .limit(Math.max(1, Math.min(50, input.limit ?? 12)));

  if (input.laneId) query = query.eq("lane_id", input.laneId);
  if (input.artifactKind) query = query.eq("artifact_kind", input.artifactKind);
  if (input.qualityLevel) query = query.eq("quality_level", input.qualityLevel);

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationOrColumn(error)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).filter((example: any) => {
    if (input.operatorId && example.operator_id && example.operator_id !== input.operatorId) return false;
    if (input.workspaceId && example.workspace_id && example.workspace_id !== input.workspaceId) return false;
    return true;
  }) as OperatorQualityExampleRecord[];
}

export async function findOperatorQualityReferenceSet(input: {
  userId: string;
  workspaceId?: string | null;
  operatorId?: string | null;
  laneId: string;
  artifactKind: string;
}) {
  const examples = await listOperatorQualityExamples({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    operatorId: input.operatorId ?? null,
    laneId: input.laneId,
    artifactKind: input.artifactKind,
    limit: 24,
  }).catch(() => []);

  return {
    gold: pickBestMatch(examples, "gold", input.operatorId, input.workspaceId),
    acceptable: pickBestMatch(examples, "acceptable", input.operatorId, input.workspaceId),
    rejected: pickBestMatch(examples, "rejected", input.operatorId, input.workspaceId),
    all: examples,
  } satisfies OperatorQualityReferenceSet;
}

export async function saveOperatorQualityExample(input: {
  userId: string;
  workspaceId?: string | null;
  operatorId?: string | null;
  laneId: string;
  artifactKind: string;
  qualityLevel: OperatorQualityExampleLevel;
  title: string;
  content: JsonRecord;
  rationale?: string | null;
  tags?: string[] | null;
  sourceArtifactId?: string | null;
  sourceFeedbackId?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const payload = {
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    operator_id: input.operatorId ?? null,
    lane_id: input.laneId,
    artifact_kind: input.artifactKind,
    quality_level: input.qualityLevel,
    title: input.title,
    content: input.content,
    rationale: input.rationale ?? null,
    tags: input.tags ?? [],
    source_artifact_id: input.sourceArtifactId ?? null,
    source_feedback_id: input.sourceFeedbackId ?? null,
  };

  const { data, error } = await admin
    .from("operator_quality_examples")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationOrColumn(error)) return null;
    throw new Error(error.message);
  }

  return data as OperatorQualityExampleRecord;
}
