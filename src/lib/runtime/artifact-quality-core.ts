import type { DoblyExecutionIntent } from "../dobly-inference.ts";
import type { OutcomeContract } from "../outcome-contracts-core.ts";

type JsonRecord = Record<string, unknown>;

export interface ArtifactQualityDimension {
  label: string;
  score: number;
  reason: string;
}

export interface ArtifactQualityReferenceExample {
  id: string;
  qualityLevel: string;
  title: string;
  rationale: string | null;
}

export interface ArtifactQualityReferenceComparison {
  floorCleared: boolean;
  goldAligned: boolean;
  rejectedOverlapRisk: boolean;
  summary: string;
  examplesUsed: ArtifactQualityReferenceExample[];
}

export interface ArtifactQualityReviewPacket {
  whyProduced: string;
  contextUsed: string[];
  standardChecked: string[];
  examplesCompared: ArtifactQualityReferenceExample[];
  reviewState: "ready" | "needs_revision" | "pending_approval" | "blocked";
  confidence: "high" | "medium" | "low";
  remainingRisk: string[];
  releaseDecision: "release" | "revise" | "approval_required" | "block";
  revisionPlan: string[];
}

export interface ArtifactQualityReleaseGate {
  decision: "release" | "revise" | "approval_required" | "block";
  reason: string;
  confidence: "high" | "medium" | "low";
  reviewState: ArtifactQualityReviewPacket["reviewState"];
  packet: ArtifactQualityReviewPacket;
}

export interface ArtifactQualityReview {
  status: "approved" | "needs_revision";
  overallScore: number;
  dimensions: ArtifactQualityDimension[];
  contractScore: number;
  blockers: string[];
  revisionPlan: string[];
  summary: string;
  contractTitle: string;
  reviewedAt: string;
  referenceComparison?: ArtifactQualityReferenceComparison;
  releaseGate?: ArtifactQualityReleaseGate;
}

function nowIso() {
  return new Date().toISOString();
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

function snapshotArtifact(content: JsonRecord) {
  const strings = extractStrings(content).map((item) => item.trim()).filter(Boolean);
  const joined = strings.join(" ").replace(/\s+/g, " ").trim();
  return {
    text: joined,
    textLength: joined.length,
    uniqueTerms: new Set(joined.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean)).size,
    keys: Object.keys(content),
  };
}

function genericPenalty(text: string) {
  return [
    /\bgeneric\b/i,
    /\bvarious\b/i,
    /\betc\b/i,
    /\bsome\b/i,
    /\bhelp the user\b/i,
    /\bdo the task\b/i,
  ].reduce((penalty, pattern) => penalty + (pattern.test(text) ? 0.06 : 0), 0);
}

function obviousAiPenalty(text: string) {
  return [
    /\bin today'?s fast-paced/i,
    /\bplease let me know if you have any questions\b/i,
    /\bi hope this message finds you well\b/i,
    /\bfurthermore\b/i,
    /\badditionally\b/i,
    /\bdelve into\b/i,
    /\bseamless\b/i,
    /\bnot only .* but also\b/i,
    /\bkey takeaways\b/i,
    /\bhelpful assistant\b/i,
  ].reduce((penalty, pattern) => penalty + (pattern.test(text) ? 0.08 : 0), 0);
}

function scoreCompleteness(contract: OutcomeContract, snapshot: ReturnType<typeof snapshotArtifact>, kind: string) {
  const primaryMatch = contract.requiredArtifacts.some((artifact) => artifact.kind === kind);
  const score = Math.min(
    1,
    (primaryMatch ? 0.45 : 0.2) +
      (snapshot.textLength > 240 ? 0.25 : snapshot.textLength > 120 ? 0.15 : 0.05) +
      (snapshot.keys.length >= 3 ? 0.15 : 0.05) +
      (contract.proofOfDone.length >= 3 ? 0.15 : 0.05),
  );
  return {
    label: "completeness",
    score,
    reason: "The artifact should look materially finished, not like a placeholder or thin wrapper.",
  } satisfies ArtifactQualityDimension;
}

function scoreSpecificity(contract: OutcomeContract, snapshot: ReturnType<typeof snapshotArtifact>) {
  const score = Math.min(
    1,
    0.25 +
      (snapshot.textLength > 350 ? 0.25 : snapshot.textLength > 180 ? 0.15 : 0.05) +
      (snapshot.uniqueTerms > 40 ? 0.2 : snapshot.uniqueTerms > 22 ? 0.12 : 0.05) +
      (contract.successCriteria.length >= 4 ? 0.15 : 0.08) +
      (contract.verificationChecklist.length >= 4 ? 0.15 : 0.08) -
      genericPenalty(snapshot.text),
  );
  return {
    label: "specificity",
    score: Math.max(0, score),
    reason: "A good artifact should be rich enough that a strong human does not need to guess what comes next.",
  } satisfies ArtifactQualityDimension;
}

function scoreIntentAlignment(contract: OutcomeContract, snapshot: ReturnType<typeof snapshotArtifact>, intent: DoblyExecutionIntent) {
  const lower = snapshot.text.toLowerCase();
  const cues = [
    intent.departmentId.replaceAll("_", " "),
    intent.workTypeId.replaceAll("_", " "),
    intent.outputTypeId.replaceAll("_", " "),
    ...contract.explicitSignals.slice(0, 2),
  ].map((item) => item.toLowerCase());
  const matches = cues.filter((cue) => cue && lower.includes(cue)).length;
  const score = Math.min(1, 0.3 + matches * 0.12 + (contract.standardOfDone.length > 80 ? 0.1 : 0));
  return {
    label: "intent_alignment",
    score,
    reason: "The result should feel clearly tied to the actual job and department, not like a generic output template.",
  } satisfies ArtifactQualityDimension;
}

function scoreVerificationReadiness(contract: OutcomeContract, snapshot: ReturnType<typeof snapshotArtifact>) {
  const lower = snapshot.text.toLowerCase();
  const verificationHints = ["checklist", "approval", "proof", "source", "next step", "owner", "status", "risk"];
  const hits = verificationHints.filter((hint) => lower.includes(hint)).length;
  const score = Math.min(1, 0.24 + hits * 0.08 + (contract.verificationChecklist.length >= 4 ? 0.22 : 0.1) + (contract.approvalBoundaries.length >= 1 ? 0.18 : 0.06));
  return {
    label: "verification_readiness",
    score,
    reason: "Dobly should be able to explain how the artifact proves completion and what still needs review.",
  } satisfies ArtifactQualityDimension;
}

function scoreAntiGeneric(contract: OutcomeContract, snapshot: ReturnType<typeof snapshotArtifact>) {
  const unacceptableHits = contract.unacceptableOutcomes.filter((item) => snapshot.text.toLowerCase().includes(item.toLowerCase().slice(0, 24))).length;
  const score = Math.max(0, Math.min(1, 0.74 - genericPenalty(snapshot.text) - unacceptableHits * 0.08 + (contract.improvementTargets.length >= 2 ? 0.12 : 0.05)));
  return {
    label: "anti_genericness",
    score,
    reason: "The artifact should avoid the polished-but-empty feel that makes agent output disappointing.",
  } satisfies ArtifactQualityDimension;
}

function scoreAntiAiFingerprints(contract: OutcomeContract, snapshot: ReturnType<typeof snapshotArtifact>) {
  const lower = snapshot.text.toLowerCase();
  const contractHits = (contract.qualityBar?.antiAiSignals ?? []).filter((item) =>
    lower.includes(item.toLowerCase().replace(/[^\w\s]/g, "").slice(0, 18)),
  ).length;
  const penalty = obviousAiPenalty(snapshot.text) + contractHits * 0.04 + genericPenalty(snapshot.text) * 0.6;
  const score = Math.max(0, Math.min(1, 0.96 - penalty));
  return {
    label: "anti_ai_fingerprints",
    score,
    reason: "The artifact should not read like obvious AI output, even when the wording is polished.",
  } satisfies ArtifactQualityDimension;
}

function scoreOutcomeFitByKind(contract: OutcomeContract, snapshot: ReturnType<typeof snapshotArtifact>, kind: string) {
  const lower = snapshot.text.toLowerCase();
  const hasAny = (patterns: RegExp[]) => patterns.some((pattern) => pattern.test(lower));
  let score = 0.52;
  let reason = "The artifact should satisfy the expectations of its output type, not just look complete.";

  if (kind === "message") {
    score += hasAny([/next step/, /reply/, /question/, /today/, /confirm/, /schedule/]) ? 0.22 : 0.04;
    score += snapshot.textLength < 1200 ? 0.12 : 0.06;
    score += !/please let me know if you have any questions/.test(lower) ? 0.14 : 0;
    reason = "A message should move the conversation forward with context and a clear next move.";
  } else if (kind === "task") {
    score += hasAny([/owner/, /due/, /by /, /complete/, /deliver/, /blocker/]) ? 0.24 : 0.06;
    score += snapshot.keys.length >= 3 ? 0.12 : 0.05;
    reason = "A task should define action, ownership, and completion clearly.";
  } else if (kind === "brief" || kind === "document" || kind === "presentation") {
    score += hasAny([/recommend/, /decision/, /risk/, /tradeoff/, /next step/, /why this matters/]) ? 0.24 : 0.08;
    score += snapshot.textLength > 260 ? 0.14 : 0.05;
    reason = "Narrative artifacts should have a point of view, evidence, and a usable structure.";
  } else if (kind === "spreadsheet_report") {
    score += hasAny([/metric/, /trend/, /variance/, /forecast/, /risk/, /recommend/]) ? 0.24 : 0.06;
    reason = "Reports should surface signal, not just display numbers.";
  } else if (kind === "image_design" || kind === "video") {
    score += hasAny([/audience/, /hook/, /visual/, /scene/, /brand/, /purpose/, /message/]) ? 0.24 : 0.08;
    reason = "Creative artifacts should show communication intent, not just style words.";
  } else if (kind === "code_context_package") {
    score += hasAny([/owner/, /blocker/, /implement/, /file/, /module/, /release/, /next action/]) ? 0.24 : 0.08;
    reason = "Technical artifacts should unblock execution, not merely summarize the system.";
  } else if (kind === "approval_request") {
    score += hasAny([/approve/, /risk/, /consequence/, /if approved/, /if rejected/, /decision/]) ? 0.24 : 0.08;
    reason = "Approval packets should make the pending action and consequence explicit.";
  } else if (kind === "alert") {
    score += hasAny([/now/, /risk/, /because/, /next step/, /action/]) ? 0.22 : 0.08;
    reason = "Alerts should explain why the change matters and what should happen next.";
  }

  return {
    label: "outcome_fit",
    score: Math.min(1, score),
    reason,
  } satisfies ArtifactQualityDimension;
}

function findBlockers(contract: OutcomeContract, snapshot: ReturnType<typeof snapshotArtifact>) {
  const blockers: string[] = [];
  const lower = snapshot.text.toLowerCase();
  if (obviousAiPenalty(snapshot.text) >= 0.16) {
    blockers.push("The artifact still contains obvious AI-sounding language.");
  }
  for (const blocker of contract.qualityBar?.hardBlockers ?? []) {
    const needle = blocker.toLowerCase().replace(/[^\w\s]/g, "").slice(0, 28).trim();
    if (needle && lower.includes(needle)) {
      blockers.push(blocker);
    }
  }
  if (snapshot.textLength < 80) {
    blockers.push("The artifact is too thin to qualify as finished work.");
  }
  return Array.from(new Set(blockers));
}

function buildRevisionPlan(contract: OutcomeContract, dimensions: ArtifactQualityDimension[]) {
  const low = dimensions.filter((dimension) => dimension.score < 0.8);
  const steps = low.map((dimension) => {
    if (dimension.label === "completeness") {
      return `Add or expand the concrete deliverables promised by the contract: ${contract.requiredArtifacts.map((artifact) => artifact.label).join(", ")}.`;
    }
    if (dimension.label === "specificity") {
      return "Replace vague phrasing with concrete structure, named sections, explicit owners, and more detailed proof of work.";
    }
    if (dimension.label === "intent_alignment") {
      return `Refocus the artifact around the contract mission: ${contract.primaryOutcome}.`;
    }
    if (dimension.label === "verification_readiness") {
      return "Add clearer proof, checklist-style completion signals, and explicit approval or next-step state.";
    }
    return "Tighten the output so it feels intentional and materially better than a generic AI draft.";
  });
  return Array.from(new Set(steps));
}

export function scoreArtifactAgainstContract(input: {
  contract: OutcomeContract;
  title: string;
  kind: string;
  content: JsonRecord;
  intent: DoblyExecutionIntent;
}) {
  const contract = input.contract;
  const snapshot = snapshotArtifact(input.content);
  const dimensions = [
    scoreCompleteness(contract, snapshot, input.kind),
    scoreSpecificity(contract, snapshot),
    scoreIntentAlignment(contract, snapshot, input.intent),
    scoreVerificationReadiness(contract, snapshot),
    scoreAntiGeneric(contract, snapshot),
    scoreAntiAiFingerprints(contract, snapshot),
    scoreOutcomeFitByKind(contract, snapshot, input.kind),
  ];
  const overallScore = Number((dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length).toFixed(3));
  const blockers = findBlockers(contract, snapshot);
  const revisionPlan = buildRevisionPlan(contract, dimensions);
  const minimumScore = contract.qualityBar?.minimumOverallScore ?? 0.82;
  const status = blockers.length === 0 && overallScore >= minimumScore ? "approved" : "needs_revision";

  return {
    status,
    overallScore,
    dimensions,
    contractScore: contract.critique.overallScore,
    blockers,
    revisionPlan,
    summary:
      status === "approved"
        ? "Artifact meets Dobly's current standard of done."
        : blockers.length
          ? `Artifact failed Dobly's hard quality blockers: ${blockers.join(" ")}`
          : "Artifact landed below Dobly's quality threshold and should be revised before being treated as excellent.",
    contractTitle: contract.title,
    reviewedAt: nowIso(),
  } satisfies ArtifactQualityReview;
}
