import { inferDoblyExecutionIntent, type DoblyExecutionIntent } from "./dobly-inference.ts";

type JsonRecord = Record<string, unknown>;

export type OutcomeContractEntityType = "operator" | "coworker" | "runtime_command";
export type OutcomeContractStatus = "draft" | "approved" | "needs_review";

export interface OutcomeContractEntityInput {
  entityType: OutcomeContractEntityType;
  entityId?: string | null;
  name: string;
  mission: string;
  outcome?: string | null;
  prompt?: string | null;
  workspaceId?: string | null;
  targetOutcomes?: string[];
  capabilityTags?: string[];
  tools?: string[];
  guardrails?: JsonRecord | null;
  approvalMode?: string | null;
  standards?: JsonRecord | null;
}

export interface OutcomeContractArtifactSpec {
  kind:
    | "message"
    | "task"
    | "alert"
    | "brief"
    | "document"
    | "presentation"
    | "spreadsheet_report"
    | "image_design"
    | "video"
    | "code_context_package"
    | "approval_request";
  label: string;
  whyItExists: string;
  proofRequired: string;
}

export interface OutcomeContractDimensionScore {
  label: string;
  score: number;
  reason: string;
}

export interface OutcomeContractCritique {
  dimensions: OutcomeContractDimensionScore[];
  rewriteReasons: string[];
  passes: boolean;
  overallScore: number;
}

export interface OutcomeContractQualityBar {
  minimumOverallScore: number;
  hardBlockers: string[];
  antiAiSignals: string[];
  selectedPreferences: string[];
  learningReadiness: string;
}

export interface OutcomeContract {
  contractVersion: number;
  status: OutcomeContractStatus;
  title: string;
  summary: string;
  generatedAt: string;
  entity: {
    type: OutcomeContractEntityType;
    id: string | null;
    name: string;
  };
  intent: DoblyExecutionIntent;
  mission: string;
  primaryOutcome: string;
  standardOfDone: string;
  explicitSignals: string[];
  inferredAssumptions: string[];
  unresolvedQuestions: string[];
  requiredArtifacts: OutcomeContractArtifactSpec[];
  successCriteria: string[];
  verificationChecklist: string[];
  unacceptableOutcomes: string[];
  edgeCases: string[];
  approvalBoundaries: string[];
  improvementTargets: string[];
  proofOfDone: string[];
  domainPlaybook: string[];
  evidence: {
    explicit: string[];
    inferred: string[];
    memoryOrStandards: string[];
  };
  qualityBar: OutcomeContractQualityBar;
  critique: OutcomeContractCritique;
}

const GENERIC_BAD_PATTERNS = [
  /generic/i,
  /some/i,
  /various/i,
  /etc\./i,
  /do the task/i,
  /handle the request/i,
  /help the user/i,
];

function nowIso() {
  return new Date().toISOString();
}

function unique(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.map((item) => String(item ?? "").trim()).filter(Boolean)));
}

function toTitle(text: string) {
  return text.trim().replace(/\s+/g, " ").slice(0, 120);
}

function safeOutcome(input: OutcomeContractEntityInput) {
  return input.outcome?.trim() || input.targetOutcomes?.[0]?.trim() || input.mission.trim();
}

function artifactSpecsForIntent(intent: DoblyExecutionIntent): OutcomeContractArtifactSpec[] {
  const primary: OutcomeContractArtifactSpec = {
    kind: intent.outputTypeId,
    label:
      intent.outputTypeId === "code_context_package" ? "Code Context Package" :
      intent.outputTypeId === "image_design" ? "Image / Design Package" :
      intent.outputTypeId === "spreadsheet_report" ? "Spreadsheet / Report" :
      intent.outputTypeId === "approval_request" ? "Approval Request" :
      intent.outputTypeId === "presentation" ? "Presentation Deck" :
      intent.outputTypeId[0].toUpperCase() + intent.outputTypeId.slice(1).replaceAll("_", " "),
    whyItExists:
      intent.outputTypeId === "video" ? "The outcome needs a ready-to-use motion asset, not just an idea." :
      intent.outputTypeId === "presentation" ? "The outcome needs slides that can be reviewed or presented immediately." :
      intent.outputTypeId === "code_context_package" ? "Engineering needs enough context to act without guessing." :
      intent.outputTypeId === "message" ? "The work only counts when the message is specific and send-ready." :
      "The outcome needs a concrete deliverable, not only a plan.",
    proofRequired:
      intent.outputTypeId === "message" ? "A final message draft with recipient/channel intent and approval state." :
      intent.outputTypeId === "video" ? "A shot list, production brief, or rendered asset path with review notes." :
      intent.outputTypeId === "presentation" ? "A slide structure or deck package that covers the full narrative." :
      "A final artifact that can be inspected, reviewed, or handed off.",
  };

  const additions: OutcomeContractArtifactSpec[] = [];
  if (intent.departmentId === "marketing") {
    additions.push(
      {
        kind: "brief",
        label: "Campaign Brief",
        whyItExists: "Creative work should be grounded in angle, audience, offer, and channel role.",
        proofRequired: "A brief with positioning, audience, and message hierarchy.",
      },
      {
        kind: "approval_request",
        label: "Publishing Approval",
        whyItExists: "Brand-risk or public-facing work should stop for a human sign-off when needed.",
        proofRequired: "A clear approval package with final assets and what will be published.",
      },
    );
  }
  if (intent.departmentId === "engineering_product") {
    additions.push({
      kind: "task",
      label: "Next-step Execution Tasks",
      whyItExists: "A technical outcome is only useful if owners know the next concrete action.",
      proofRequired: "Actionable issue/task entries or an explicit no-action-needed decision.",
    });
  }
  if (intent.departmentId === "leadership") {
    additions.push({
      kind: "brief",
      label: "Decision Brief",
      whyItExists: "Leadership work should end in a decision-ready narrative, not scattered findings.",
      proofRequired: "A concise recommendation with tradeoffs, risks, and next moves.",
    });
  }
  return [primary, ...additions];
}

function domainPlaybookForIntent(intent: DoblyExecutionIntent): string[] {
  const common = [
    "Make the result specific enough that a strong human would not need to re-interpret the request.",
    "Avoid filler, repetition, and generic AI phrasing.",
    "Show clear proof that the work is complete, not merely attempted.",
  ];

  if (intent.departmentId === "marketing") {
    return [
      "Define audience, offer, angle, and channel role before producing assets.",
      "Make every asset distinct in purpose instead of rewording the same idea.",
      "Brand-sensitive claims, visuals, and publishing should be reviewable before going live.",
      ...common,
    ];
  }
  if (intent.departmentId === "engineering_product") {
    return [
      "Turn ambiguity into explicit technical context, next steps, and ownership.",
      "A good outcome includes dependencies, blockers, and release implications.",
      "Do not summarize issues vaguely; package them for execution.",
      ...common,
    ];
  }
  if (intent.departmentId === "support") {
    return [
      "Resolve the actual customer problem, not just the visible message.",
      "Escalations should include the exact risk, urgency, and missing answer.",
      ...common,
    ];
  }
  if (intent.departmentId === "finance") {
    return [
      "Never let completion outrun control; money-moving work must remain explicit and reviewable.",
      "Every action should show the source record, consequence, and approval state.",
      ...common,
    ];
  }
  return common;
}

function buildSignals(input: OutcomeContractEntityInput, intent: DoblyExecutionIntent) {
  const explicit = unique([
    input.prompt,
    input.mission,
    input.outcome,
    ...(input.targetOutcomes ?? []),
  ]).map((item) => item.length > 180 ? `${item.slice(0, 177)}...` : item);

  const inferred = unique([
    `Department inferred as ${intent.departmentId}.`,
    `Work type inferred as ${intent.workTypeId}.`,
    `Primary output inferred as ${intent.outputTypeId}.`,
    intent.trustLevelId === "approval_required" ? "This work should pause before risky external action." : null,
    intent.trustLevelId === "human_only" ? "Dobly should prepare, explain, and gate rather than act directly." : null,
    input.approvalMode ? `Current autonomy preference is ${input.approvalMode}.` : null,
  ]);

  const unresolved = unique([
    input.prompt && input.prompt.trim().length < 20 ? "The request may still need sharper scope or destination details." : null,
    intent.outputTypeId === "message" ? "Recipient/channel details must be confirmed before send." : null,
    intent.outputTypeId === "video" ? "Visual style, duration, and publishing destination should be explicit if absent." : null,
    intent.departmentId === "engineering_product" ? "Ownership, environment, and release timing should be explicit if available." : null,
    input.tools?.length ? null : "No connected tools are declared yet, so execution paths may still be partially assisted.",
  ]);

  return { explicit, inferred, unresolved };
}

function readQualityContract(input: OutcomeContractEntityInput) {
  const candidate = input.standards?.operatorQualityContract;
  if (!candidate || typeof candidate !== "object") return null;
  const value = candidate as JsonRecord;
  const list = (key: string) => Array.isArray(value[key]) ? value[key].map((item) => String(item)).filter(Boolean) : [];
  const qualityBarValue =
    value.qualityBar && typeof value.qualityBar === "object" ? (value.qualityBar as JsonRecord) : null;
  return {
    summaryLines: list("summaryLines"),
    successCriteria: list("successCriteria"),
    verificationChecklist: list("verificationChecklist"),
    unacceptableOutcomes: list("unacceptableOutcomes"),
    improvementTargets: list("improvementTargets"),
    approvalBoundaries: list("approvalBoundaries"),
    evidenceLines: list("evidenceLines"),
    qualityBar: {
      minimumOverallScore:
        typeof qualityBarValue?.minimumOverallScore === "number" ? qualityBarValue.minimumOverallScore : 0.82,
      hardBlockers:
        Array.isArray(qualityBarValue?.hardBlockers) ? qualityBarValue.hardBlockers.map((item) => String(item)) : [],
      antiAiSignals:
        Array.isArray(qualityBarValue?.antiAiSignals) ? qualityBarValue.antiAiSignals.map((item) => String(item)) : [],
      selectedPreferences:
        Array.isArray(qualityBarValue?.selectedPreferences) ? qualityBarValue.selectedPreferences.map((item) => String(item)) : [],
      learningReadiness:
        typeof qualityBarValue?.learningReadiness === "string" ? qualityBarValue.learningReadiness : "bootstrapping",
    } satisfies OutcomeContractQualityBar,
  };
}

function buildSuccessCriteria(input: OutcomeContractEntityInput, intent: DoblyExecutionIntent, artifacts: OutcomeContractArtifactSpec[]) {
  const primaryOutcome = safeOutcome(input);
  const qualityContract = readQualityContract(input);
  return unique([
    `The final work clearly achieves this outcome: ${primaryOutcome}.`,
    `Dobly produces ${artifacts.map((artifact) => artifact.label).join(", ")} rather than stopping at a vague recommendation.`,
    intent.departmentId === "marketing" ? "Creative outputs feel intentional, differentiated, and on-brand rather than generic." : null,
    intent.departmentId === "engineering_product" ? "Engineering outputs are executable, contextualized, and ownership-ready." : null,
    intent.departmentId === "support" ? "Customer-facing outputs solve the issue and make escalation status explicit." : null,
    intent.trustLevelId === "approval_required" ? "Anything public, financial, or irreversible is paused for explicit approval." : null,
    ...qualityContract?.successCriteria ?? [],
  ]);
}

function buildVerificationChecklist(input: OutcomeContractEntityInput, intent: DoblyExecutionIntent, artifacts: OutcomeContractArtifactSpec[]) {
  const qualityContract = readQualityContract(input);
  return unique([
    ...artifacts.map((artifact) => `${artifact.label}: ${artifact.proofRequired}`),
    "Check the result against the original ask and the stronger inferred intent, not just the literal wording.",
    "Reject outputs that could have been produced for almost any company or request.",
    intent.departmentId === "marketing" ? "Check that each channel/asset plays a distinct role in the campaign." : null,
    intent.departmentId === "engineering_product" ? "Check that blockers, dependencies, and next steps are explicit." : null,
    intent.departmentId === "finance" ? "Check every amount, record reference, and approval boundary before calling it done." : null,
    ...qualityContract?.verificationChecklist ?? [],
  ]);
}

function buildUnacceptableOutcomes(intent: DoblyExecutionIntent) {
  return unique([
    "Generic output that sounds polished but could fit dozens of unrelated requests.",
    "A result that looks complete but still leaves key decisions or missing data implicit.",
    intent.outputTypeId === "message" ? "A send-ready message without recipient context, tone control, or approval clarity." : null,
    intent.outputTypeId === "video" ? "A video idea with no structure, hook, or production direction." : null,
    intent.outputTypeId === "presentation" ? "Slides that restate information without a strong narrative or decision arc." : null,
    intent.outputTypeId === "code_context_package" ? "Technical output without ownership, next action, or implementation context." : null,
  ]);
}

function buildApprovalBoundaries(input: OutcomeContractEntityInput, intent: DoblyExecutionIntent) {
  const guardrails = input.guardrails ? Object.keys(input.guardrails).slice(0, 4).map((key) => `${key}: ${String(input.guardrails?.[key])}`) : [];
  const qualityContract = readQualityContract(input);
  return unique([
    intent.trustLevelId === "human_only" ? "Dobly must not execute the final external action; prepare and surface the work only." : null,
    intent.trustLevelId === "approval_required" ? "Dobly must stop for explicit approval before any send, publish, money, booking, delete, or software-changing action." : null,
    ...guardrails,
    input.approvalMode ? `Current operator approval mode: ${input.approvalMode}.` : null,
    ...qualityContract?.approvalBoundaries ?? [],
  ]);
}

function buildImprovementTargets(intent: DoblyExecutionIntent) {
  return unique([
    "Find one way to make the outcome sharper than the minimum requested result.",
    intent.departmentId === "marketing" ? "Improve messaging hierarchy, not just grammar or formatting." : null,
    intent.departmentId === "engineering_product" ? "Improve execution readiness by surfacing blockers before handoff." : null,
    intent.departmentId === "leadership" ? "Improve decision quality by making tradeoffs explicit." : null,
  ]);
}

function buildImprovementTargetsFromInput(input: OutcomeContractEntityInput, intent: DoblyExecutionIntent) {
  const qualityContract = readQualityContract(input);
  return unique([
    ...buildImprovementTargets(intent),
    ...qualityContract?.improvementTargets ?? [],
  ]);
}

function buildProofOfDone(intent: DoblyExecutionIntent, artifacts: OutcomeContractArtifactSpec[]) {
  return unique([
    ...artifacts.map((artifact) => `${artifact.label} exists and can be inspected.`),
    "Dobly can explain why this result is good, what assumptions were used, and what still needs approval.",
    intent.trustLevelId === "approval_required" || intent.trustLevelId === "human_only"
      ? "Approval state is recorded clearly before any external action is marked complete."
      : "Completion state is explicit and traceable.",
  ]);
}

function buildEdgeCases(intent: DoblyExecutionIntent) {
  return unique([
    "The user request may be underspecified even if it sounds confident.",
    intent.departmentId === "marketing" ? "A strong creative direction can still fail if audience, offer, or channel role is wrong." : null,
    intent.departmentId === "engineering_product" ? "A technically correct summary can still fail if it does not unblock the next owner." : null,
    intent.departmentId === "support" ? "A polite reply can still fail if it does not close the issue or escalate correctly." : null,
    intent.departmentId === "finance" ? "A seemingly small finance action can have large downstream consequences." : null,
  ]);
}

export function critiqueOutcomeContract(contract: OutcomeContract): OutcomeContractCritique {
  const dimensions: OutcomeContractDimensionScore[] = [];

  const specificity = Math.min(
    1,
    (contract.successCriteria.length >= 4 ? 0.35 : 0.15) +
      (contract.verificationChecklist.length >= 4 ? 0.25 : 0.1) +
      (contract.requiredArtifacts.length >= 1 ? 0.2 : 0) +
      (contract.explicitSignals.length >= 2 ? 0.2 : 0.1),
  );
  dimensions.push({
    label: "specificity",
    score: specificity,
    reason: "A strong contract should translate the ask into concrete deliverables and checks.",
  });

  const verification = Math.min(
    1,
    (contract.proofOfDone.length >= 3 ? 0.5 : 0.2) +
      (contract.verificationChecklist.length >= 5 ? 0.35 : 0.2) +
      (contract.approvalBoundaries.length >= 1 ? 0.15 : 0),
  );
  dimensions.push({
    label: "verification",
    score: verification,
    reason: "A good contract should make completion and review observable.",
  });

  const antiGenericPenalty = GENERIC_BAD_PATTERNS.some((pattern) =>
    [contract.summary, contract.standardOfDone, ...contract.successCriteria, ...contract.unacceptableOutcomes].some((line) => pattern.test(line)),
  )
    ? 0.2
    : 0;
  const antiGeneric = Math.max(
    0,
    Math.min(
      1,
      0.55 +
        (contract.unacceptableOutcomes.length >= 3 ? 0.2 : 0.05) +
        (contract.domainPlaybook.length >= 4 ? 0.15 : 0.05) +
        (contract.improvementTargets.length >= 2 ? 0.1 : 0.03) -
        antiGenericPenalty,
    ),
  );
  dimensions.push({
    label: "anti_genericness",
    score: antiGeneric,
    reason: "The contract should reject bland output and force intentional work.",
  });

  const evidence = Math.min(
    1,
    (contract.evidence.explicit.length >= 2 ? 0.5 : 0.2) +
      (contract.evidence.inferred.length >= 2 ? 0.25 : 0.1) +
      (contract.evidence.memoryOrStandards.length >= 1 ? 0.25 : 0.1),
  );
  dimensions.push({
    label: "evidence",
    score: evidence,
    reason: "Claims about what good looks like should be grounded in explicit or structured context.",
  });

  const ambition = Math.min(
    1,
    (contract.improvementTargets.length >= 2 ? 0.45 : 0.2) +
      (contract.edgeCases.length >= 2 ? 0.25 : 0.1) +
      (contract.requiredArtifacts.length >= 2 ? 0.3 : 0.15),
  );
  dimensions.push({
    label: "ambition",
    score: ambition,
    reason: "Dobly should aim for a result better than the bare minimum.",
  });

  const overallScore = Number((dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length).toFixed(3));
  const rewriteReasons = dimensions.filter((dimension) => dimension.score < 0.8).map((dimension) => `Strengthen ${dimension.label}.`);
  return {
    dimensions,
    rewriteReasons,
    passes: overallScore >= 0.82 && rewriteReasons.length <= 2,
    overallScore,
  };
}

export function draftOutcomeContract(input: OutcomeContractEntityInput): OutcomeContract {
  const primaryOutcome = safeOutcome(input);
  const promptSeed = unique([input.prompt, input.mission, primaryOutcome, ...(input.targetOutcomes ?? [])]).join(". ");
  const intent = inferDoblyExecutionIntent({
    prompt: promptSeed,
  });
  const artifacts = artifactSpecsForIntent(intent);
  const signals = buildSignals(input, intent);
  const qualityContract = readQualityContract(input);
  const evidenceMemory = unique([
    typeof input.standards === "object" && input.standards && Object.keys(input.standards).length
      ? "Existing standards were available and should shape the quality bar."
      : null,
    input.tools?.length ? `Connected tools declared: ${input.tools.slice(0, 5).join(", ")}.` : null,
    ...qualityContract?.evidenceLines ?? [],
  ]);

  const contract: OutcomeContract = {
    contractVersion: 1,
    status: "draft",
    title: `${toTitle(input.name)} Standard of Done`,
    summary: `${input.name} should deliver a ${intent.outputTypeId.replaceAll("_", " ")} outcome for ${intent.departmentId} work without generic filler, obvious AI fingerprints, or hidden ambiguity.`,
    generatedAt: nowIso(),
    entity: {
      type: input.entityType,
      id: input.entityId ?? null,
      name: input.name,
    },
    intent,
    mission: input.mission.trim(),
    primaryOutcome,
    standardOfDone: `A job well done means Dobly achieves "${primaryOutcome}" with outputs that are specific, verifiable, approval-safe, structurally strong, and strong enough that the user does not need to rewrite the result from scratch.`,
    explicitSignals: unique([...signals.explicit, ...(qualityContract?.summaryLines ?? [])]),
    inferredAssumptions: signals.inferred,
    unresolvedQuestions: signals.unresolved,
    requiredArtifacts: artifacts,
    successCriteria: buildSuccessCriteria(input, intent, artifacts),
    verificationChecklist: buildVerificationChecklist(input, intent, artifacts),
    unacceptableOutcomes: unique([
      ...buildUnacceptableOutcomes(intent),
      ...(qualityContract?.unacceptableOutcomes ?? []),
    ]),
    edgeCases: buildEdgeCases(intent),
    approvalBoundaries: buildApprovalBoundaries(input, intent),
    improvementTargets: buildImprovementTargetsFromInput(input, intent),
    proofOfDone: buildProofOfDone(intent, artifacts),
    domainPlaybook: domainPlaybookForIntent(intent),
    evidence: {
      explicit: signals.explicit,
      inferred: signals.inferred,
      memoryOrStandards: evidenceMemory,
    },
    qualityBar: qualityContract?.qualityBar ?? {
      minimumOverallScore: 0.82,
      hardBlockers: ["Generic output that feels polished but empty."],
      antiAiSignals: ["The output should not sound obviously AI-generated."],
      selectedPreferences: [],
      learningReadiness: "bootstrapping",
    },
    critique: {
      dimensions: [],
      rewriteReasons: [],
      passes: false,
      overallScore: 0,
    },
  };

  const critique = critiqueOutcomeContract(contract);
  return {
    ...contract,
    status: critique.passes ? "approved" : "needs_review",
    critique,
  };
}

export function improveOutcomeContract(contract: OutcomeContract): OutcomeContract {
  const additions = unique([
    contract.unresolvedQuestions.length ? "Convert unresolved ambiguity into an explicit verification gate before completion." : null,
    contract.requiredArtifacts.some((artifact) => artifact.kind === "presentation") ? "Check whether the narrative arc would still make sense to a new reviewer." : null,
    contract.intent.departmentId === "marketing" ? "Make sure each deliverable has a distinct role in the campaign system." : null,
    contract.intent.departmentId === "engineering_product" ? "Make sure ownership and next action are explicit for every technical artifact." : null,
  ]);

  const improved: OutcomeContract = {
    ...contract,
    generatedAt: nowIso(),
    verificationChecklist: unique([
      ...contract.verificationChecklist,
      ...additions,
    ]),
    successCriteria: unique([
      ...contract.successCriteria,
      "The result is strong enough that the user would likely keep it, approve it, or use it with only minor edits.",
    ]),
    unacceptableOutcomes: unique([
      ...contract.unacceptableOutcomes,
      "A result that is technically complete but still feels interchangeable with generic AI output.",
    ]),
    improvementTargets: unique([
      ...contract.improvementTargets,
      "Raise the work from acceptable to clearly intentional and high-signal.",
    ]),
  };

  const critique = critiqueOutcomeContract(improved);
  return {
    ...improved,
    status: critique.passes ? "approved" : "needs_review",
    critique,
  };
}

export function generateOutcomeContract(input: OutcomeContractEntityInput): OutcomeContract {
  let contract = draftOutcomeContract(input);
  if (!contract.critique.passes) {
    contract = improveOutcomeContract(contract);
  }
  if (!contract.critique.passes) {
    contract = improveOutcomeContract(contract);
  }
  return {
    ...contract,
    status: contract.critique.passes ? "approved" : "needs_review",
  };
}
