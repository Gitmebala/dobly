import type { DoblyExecutionIntent } from "../dobly-inference.ts";
import {
  buildDefaultOperatorQualityProfile,
  detectOperatorTaskLane,
  type OperatorQualityProfileShape,
} from "../operator-quality.ts";
import { findOperatorQualityReferenceSet } from "../operator-quality-examples.ts";
import { ensureOutcomeContract } from "../outcome-contracts.ts";
import { scoreArtifactAgainstContract, type ArtifactQualityReview } from "./artifact-quality-core.ts";
import { compareArtifactToReferenceExamples, decideArtifactRelease } from "./release-gate.ts";

type JsonRecord = Record<string, unknown>;

export async function reviewRuntimeArtifact(input: {
  userId: string;
  workspaceId?: string | null;
  runId: string;
  title: string;
  kind: string;
  content: JsonRecord;
  intent: DoblyExecutionIntent;
  task: string;
  metadata?: JsonRecord;
}) {
  const ensured = await ensureOutcomeContract({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    entityType: "runtime_command",
    entityId: input.runId,
    name: input.title,
    mission: input.task,
    outcome: input.title,
    prompt: input.task,
    capabilityTags: [input.intent.departmentId, input.intent.workTypeId, input.intent.outputTypeId],
    tools: typeof input.metadata?.toolId === "string" ? [input.metadata.toolId] : [],
    standards: {
      doblyIntent: input.intent,
      artifactKind: input.kind,
      operatorQualityContract:
        input.metadata?.operatorQualityContract && typeof input.metadata.operatorQualityContract === "object"
          ? input.metadata.operatorQualityContract
          : null,
    },
  });

  const review = scoreArtifactAgainstContract({
    contract: ensured.contract,
    title: input.title,
    kind: input.kind,
    content: input.content,
    intent: input.intent,
  });

  const profile =
    input.metadata?.operatorQualityProfile && typeof input.metadata.operatorQualityProfile === "object"
      ? (input.metadata.operatorQualityProfile as OperatorQualityProfileShape)
      : buildDefaultOperatorQualityProfile({
          operatorKind: "business",
          mission: input.task,
          outcome: input.title,
        });

  const lane = detectOperatorTaskLane({
    profile,
    prompt: input.task,
    intent: input.intent,
  });

  const operatorId = typeof input.metadata?.operatorId === "string" ? input.metadata.operatorId : null;
  const references = lane
    ? await findOperatorQualityReferenceSet({
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        operatorId,
        laneId: lane.id,
        artifactKind: input.kind,
      }).catch(() => ({ gold: null, acceptable: null, rejected: null, all: [] }))
    : { gold: null, acceptable: null, rejected: null, all: [] };

  const referenceComparison = compareArtifactToReferenceExamples({
    content: input.content,
    references,
  });

  const releaseGate = decideArtifactRelease({
    title: input.title,
    task: input.task,
    kind: input.kind,
    intent: input.intent,
    contract: ensured.contract,
    review,
    comparison: referenceComparison,
  });

  return {
    ...review,
    referenceComparison,
    releaseGate,
  } satisfies ArtifactQualityReview;
}
