import type { DoblyExecutionIntent } from "@/lib/dobly-inference";
import type { OutcomeContract } from "@/lib/outcome-contracts-core";
import type {
  OperatorQualityExampleRecord,
  OperatorQualityReferenceSet,
} from "@/lib/operator-quality-examples";
import type { ArtifactQualityReview } from "./artifact-quality-core";

type JsonRecord = Record<string, unknown>;

export interface ArtifactReferenceExampleUse {
  id: string;
  qualityLevel: string;
  title: string;
  rationale: string | null;
}

export interface ArtifactReferenceComparison {
  floorCleared: boolean;
  goldAligned: boolean;
  rejectedOverlapRisk: boolean;
  summary: string;
  examplesUsed: ArtifactReferenceExampleUse[];
}

export interface ArtifactReviewPacket {
  whyProduced: string;
  contextUsed: string[];
  standardChecked: string[];
  examplesCompared: ArtifactReferenceExampleUse[];
  reviewState: "ready" | "needs_revision" | "pending_approval" | "blocked";
  confidence: "high" | "medium" | "low";
  remainingRisk: string[];
  releaseDecision: "release" | "revise" | "approval_required" | "block";
  revisionPlan: string[];
}

export interface ArtifactReleaseGate {
  decision: "release" | "revise" | "approval_required" | "block";
  reason: string;
  confidence: "high" | "medium" | "low";
  reviewState: ArtifactReviewPacket["reviewState"];
  packet: ArtifactReviewPacket;
}

function extractStrings(value: unknown, depth = 0): string[] {
  if (depth > 4) return [];
  if (typeof value === "string") return [value];
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  if (Array.isArray(value)) return value.flatMap((item) => extractStrings(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.entries(value as JsonRecord).flatMap(([key, inner]) => [key, ...extractStrings(inner, depth + 1)]);
  }
  return [];
}

function tokenize(value: unknown) {
  return new Set(
    extractStrings(value)
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter((token) => token.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection += 1;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function summarizeExample(example: OperatorQualityExampleRecord | null): ArtifactReferenceExampleUse[] {
  if (!example) return [];
  return [{
    id: example.id,
    qualityLevel: example.quality_level,
    title: example.title,
    rationale: example.rationale,
  }];
}

export function compareArtifactToReferenceExamples(input: {
  content: JsonRecord;
  references: OperatorQualityReferenceSet;
}) {
  const artifactTokens = tokenize(input.content);
  const acceptableSimilarity = input.references.acceptable ? jaccard(artifactTokens, tokenize(input.references.acceptable.content)) : null;
  const goldSimilarity = input.references.gold ? jaccard(artifactTokens, tokenize(input.references.gold.content)) : null;
  const rejectedSimilarity = input.references.rejected ? jaccard(artifactTokens, tokenize(input.references.rejected.content)) : null;

  const floorCleared =
    acceptableSimilarity == null
      ? true
      : acceptableSimilarity >= 0.08 || (goldSimilarity ?? 0) >= 0.08;

  const goldAligned =
    input.references.gold == null
      ? true
      : (goldSimilarity ?? 0) >= Math.max(0.06, (rejectedSimilarity ?? 0) + 0.02);

  const rejectedOverlapRisk =
    rejectedSimilarity != null && rejectedSimilarity >= Math.max(0.14, (acceptableSimilarity ?? 0) + 0.04);

  const examplesUsed = [
    ...summarizeExample(input.references.gold),
    ...summarizeExample(input.references.acceptable),
    ...summarizeExample(input.references.rejected),
  ];

  const summary = rejectedOverlapRisk
    ? "The draft overlaps too much with known weak or rejected patterns."
    : !floorCleared
      ? "The draft has not yet cleared the stored acceptable floor for this task lane."
      : !goldAligned
        ? "The draft clears the floor but is not yet close to the strongest approved examples."
        : "The draft clears the stored floor and aligns with the best approved examples available.";

  return {
    floorCleared,
    goldAligned,
    rejectedOverlapRisk,
    summary,
    examplesUsed,
  } satisfies ArtifactReferenceComparison;
}

function buildRiskList(input: {
  review: ArtifactQualityReview;
  comparison: ArtifactReferenceComparison;
  intent: DoblyExecutionIntent;
}) {
  const risks = [...input.review.blockers];
  if (!input.comparison.floorCleared) risks.push("The draft is below the stored acceptable floor for this task lane.");
  if (input.comparison.rejectedOverlapRisk) risks.push("The draft resembles patterns the business should not ship again.");
  if (input.intent.trustLevelId === "approval_required" || input.intent.trustLevelId === "human_only") {
    risks.push("This task lane already has elevated approval boundaries.");
  }
  return Array.from(new Set(risks));
}

export function decideArtifactRelease(input: {
  title: string;
  task: string;
  kind: string;
  intent: DoblyExecutionIntent;
  contract: OutcomeContract;
  review: ArtifactQualityReview;
  comparison: ArtifactReferenceComparison;
}) {
  const risks = buildRiskList({
    review: input.review,
    comparison: input.comparison,
    intent: input.intent,
  });

  let decision: ArtifactReleaseGate["decision"] = "release";
  let reason = "The artifact clears Dobly's current quality controls.";
  if (input.review.blockers.length > 0) {
    decision = "block";
    reason = "The artifact failed hard quality blockers and should not be treated as ready.";
  } else if (input.comparison.rejectedOverlapRisk) {
    decision = "revise";
    reason = "The artifact is too close to known weak patterns and should be rewritten before release.";
  } else if (input.review.status === "needs_revision" || !input.comparison.floorCleared) {
    decision = "revise";
    reason = "The artifact is below Dobly's release bar and should be revised silently before it is surfaced.";
  } else if (!input.comparison.goldAligned && (input.intent.trustLevelId === "approval_required" || input.intent.trustLevelId === "human_only")) {
    decision = "approval_required";
    reason = "The artifact is usable but should pause for human review because this task lane has stricter approval boundaries.";
  }

  const confidence =
    decision === "release"
      ? "high"
      : decision === "approval_required"
        ? "medium"
        : "low";

  const reviewState =
    decision === "release"
      ? "ready"
      : decision === "approval_required"
        ? "pending_approval"
        : decision === "block"
          ? "blocked"
          : "needs_revision";

  const packet = {
    whyProduced: input.task || input.contract.primaryOutcome || input.title,
    contextUsed: Array.from(new Set([
      ...input.contract.evidence.explicit,
      ...input.contract.evidence.inferred,
      ...input.contract.evidence.memoryOrStandards,
    ])).slice(0, 8),
    standardChecked: Array.from(new Set([
      input.contract.standardOfDone,
      ...input.contract.successCriteria.slice(0, 4),
      ...input.contract.verificationChecklist.slice(0, 4),
    ])).slice(0, 8),
    examplesCompared: input.comparison.examplesUsed,
    reviewState,
    confidence,
    remainingRisk: risks,
    releaseDecision: decision,
    revisionPlan: input.review.revisionPlan,
  } satisfies ArtifactReviewPacket;

  return {
    decision,
    reason,
    confidence,
    reviewState,
    packet,
  } satisfies ArtifactReleaseGate;
}
