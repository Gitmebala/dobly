import type { WorkflowBlueprint } from "@/types";
import type { DoblyPromptAnalysis, DoblyClarificationAnswers } from "@/lib/generation";
import type { DoblyVerticalDefinition } from "@/lib/verticals";

export type DoblyWorkTalentId =
  | "intake"
  | "qualification"
  | "coordination"
  | "communication"
  | "research"
  | "planning"
  | "recordkeeping"
  | "verification"
  | "recovery"
  | "reporting"
  | "publishing"
  | "reconciliation"
  | "oversight"
  | "packaging"
  | "execution";

export interface DoblyWorkTalentDefinition {
  id: DoblyWorkTalentId;
  title: string;
  summary: string;
  capabilities: string[];
}

export const DOBLY_WORK_TALENTS: DoblyWorkTalentDefinition[] = [
  {
    id: "intake",
    title: "Intake",
    summary: "Takes in requests, data, forms, files, and messy inbound signals.",
    capabilities: ["Capture new requests", "Normalize inbound details", "Collect missing fields", "Create structured records"],
  },
  {
    id: "qualification",
    title: "Qualification",
    summary: "Evaluates what matters, what is ready, and what should be ignored or escalated.",
    capabilities: ["Score fit or urgency", "Filter low-value work", "Detect incomplete cases", "Determine readiness"],
  },
  {
    id: "coordination",
    title: "Coordination",
    summary: "Keeps multi-step work moving across people, tools, and deadlines.",
    capabilities: ["Assign next steps", "Chase missing inputs", "Move status forward", "Unblock stalled work"],
  },
  {
    id: "communication",
    title: "Communication",
    summary: "Sends the right follow-up, reminder, confirmation, or update at the right time.",
    capabilities: ["Draft and send messages", "Confirm receipt", "Route conversations", "Update stakeholders"],
  },
  {
    id: "research",
    title: "Research",
    summary: "Finds, compares, tracks, and ranks outside information.",
    capabilities: ["Gather sources", "Compare findings", "Rank opportunities", "Track changes over time"],
  },
  {
    id: "planning",
    title: "Planning",
    summary: "Breaks goals into practical steps and decides what should happen next.",
    capabilities: ["Sequence work", "Build cadences", "Recommend next actions", "Prepare execution plans"],
  },
  {
    id: "recordkeeping",
    title: "Recordkeeping",
    summary: "Maintains clean system state across CRM, docs, tasks, and other records.",
    capabilities: ["Create records", "Update statuses", "Attach notes", "Preserve audit history"],
  },
  {
    id: "verification",
    title: "Verification",
    summary: "Checks whether work, bookings, uploads, or payments actually completed.",
    capabilities: ["Confirm completion", "Verify status changes", "Check delivery", "Detect missing outcomes"],
  },
  {
    id: "recovery",
    title: "Recovery",
    summary: "Retries, reopens, or reroutes failed and abandoned work.",
    capabilities: ["Retry failed steps", "Reopen stalled cases", "Choose fallback path", "Escalate when stuck"],
  },
  {
    id: "reporting",
    title: "Reporting",
    summary: "Turns activity into useful briefs, digests, and decision-ready updates.",
    capabilities: ["Daily briefs", "Weekly summaries", "Blocker reports", "Recommended next moves"],
  },
  {
    id: "publishing",
    title: "Publishing",
    summary: "Schedules and distributes approved content or outputs to the right channels.",
    capabilities: ["Schedule posts", "Distribute content", "Send newsletters", "Deliver assets"],
  },
  {
    id: "reconciliation",
    title: "Reconciliation",
    summary: "Finds mismatches between systems and flags what is out of sync.",
    capabilities: ["Compare two systems", "Find missing records", "Spot duplicates", "Detect mismatched status"],
  },
  {
    id: "oversight",
    title: "Oversight",
    summary: "Watches thresholds, SLAs, anomalies, and unusual inactivity.",
    capabilities: ["Monitor thresholds", "Flag policy drift", "Detect anomalies", "Watch queue health"],
  },
  {
    id: "packaging",
    title: "Packaging",
    summary: "Assembles deliverables, summaries, and handoff bundles into finished outputs.",
    capabilities: ["Build brief packs", "Assemble reports", "Prepare handoffs", "Package results cleanly"],
  },
  {
    id: "execution",
    title: "Execution",
    summary: "Carries out approved actions across the systems Dobly can touch.",
    capabilities: ["Create tasks", "Update fields", "Trigger webhooks", "Launch follow-up paths"],
  },
];

export interface DoblyOperatingModel {
  job_to_be_done: string;
  responsibilities: string[];
  watches: string[];
  work_talents: DoblyWorkTalentId[];
  handled_by_dobly: string[];
  access_needed_now: string[];
  access_optional_later: string[];
  approval_contract: string[];
  update_contract: string[];
  learning_contract: string[];
  success_definition: string[];
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function getTalent(id: DoblyWorkTalentId) {
  return DOBLY_WORK_TALENTS.find((talent) => talent.id === id) ?? null;
}

function inferTalents(prompt: string, vertical: DoblyVerticalDefinition | null | undefined): DoblyWorkTalentId[] {
  const text = prompt.toLowerCase();
  const talents = new Set<DoblyWorkTalentId>(vertical?.talents ?? []);

  if (/(lead|request|inquiry|application|message|comment|dm|form)/.test(text)) talents.add("intake");
  if (/(qualif|score|fit|urgent|priority|spam)/.test(text)) talents.add("qualification");
  if (/(coordinate|handoff|follow up|follow-up|chase|remind|deadline|project)/.test(text)) talents.add("coordination");
  if (/(reply|email|message|send|notify|dm|confirm)/.test(text)) talents.add("communication");
  if (/(research|monitor|competitor|market|watch|track|trend|scan)/.test(text)) talents.add("research");
  if (/(plan|sequence|schedule|next step|cadence)/.test(text)) talents.add("planning");
  if (/(crm|record|update|log|save|notes|status)/.test(text)) talents.add("recordkeeping");
  if (/(verify|check|confirm|received|paid|booked|uploaded)/.test(text)) talents.add("verification");
  if (/(retry|recover|failed|stalled|abandon)/.test(text)) talents.add("recovery");
  if (/(report|summary|brief|digest|update)/.test(text)) talents.add("reporting");
  if (/(publish|post|schedule content|distribute)/.test(text)) talents.add("publishing");
  if (/(reconcile|mismatch|compare systems|out of sync)/.test(text)) talents.add("reconciliation");
  if (/(threshold|sla|anomaly|watch|monitor|alert)/.test(text)) talents.add("oversight");
  if (/(pack|handoff bundle|deliverable|assemble)/.test(text)) talents.add("packaging");
  talents.add("execution");

  return Array.from(talents).slice(0, 6);
}

export function buildDoblyOperatingModel(params: {
  prompt: string;
  analysis: DoblyPromptAnalysis;
  vertical?: DoblyVerticalDefinition | null;
  clarifications?: DoblyClarificationAnswers;
  requiredProviders?: string[];
  optionalProviders?: string[];
}): DoblyOperatingModel {
  const { prompt, analysis, vertical, clarifications, requiredProviders = [], optionalProviders = [] } = params;
  const talents = inferTalents(prompt, vertical);
  const talentLabels = talents
    .map((id) => getTalent(id)?.summary)
    .filter((value): value is string => Boolean(value));

  const responsibilities = unique([
    clarifications?.responsibility || "",
    ...(vertical?.responsibilities ?? []),
    analysis.operatorModel === "report" ? "Turn ongoing activity into clear updates." : "",
  ]).slice(0, 5);

  const watches = unique([
    clarifications?.watch || "",
    ...(vertical?.watchAreas ?? []),
    analysis.classificationReason,
  ]).slice(0, 4);

  const handledByDobly = unique([
    "Drafting, routing, summaries, approvals, and reports are handled inside Dobly first.",
    ...talentLabels,
    ...(vertical?.doblyHandled ?? []),
  ]).slice(0, 5);

  const accessNeededNow = unique(
    requiredProviders.map((provider) => `Give Dobly access to ${provider} only if this needs to run live there.`),
  ).slice(0, 4);

  const accessOptionalLater = unique([
    ...(vertical?.optionalAccess ?? []),
    ...optionalProviders.map((provider) => `${provider} can be added later for richer sync or delivery.`),
  ]).slice(0, 4);

  const approvalContract = unique([
    clarifications?.approvals || "",
    ...(vertical?.approvalRules ?? []),
    "Risky sends, payments, refunds, and sensitive updates should pause instead of continuing silently.",
    "Do not create deterministic rules for customer, money, legal, or trust-sensitive actions without explicit owner approval.",
  ]).slice(0, 5);

  const updateContract = unique([
    clarifications?.updates || "",
    ...(vertical?.outputs ?? []).map((item) => `Report through ${item.toLowerCase()}.`),
    "Show what changed, what was handled, and what still needs a person.",
  ]).slice(0, 5);

  const learningContract = unique([
    "Start in AI-supervised mode for new or unclear patterns.",
    "Collect evidence from successful runs, owner approvals, corrections, overrides, failures, and escalations.",
    "Only mark a pattern as a rule candidate after repeated successful examples with no recent owner corrections.",
    "Ask the owner before promoting any rule candidate into an automatic deterministic path.",
    "Keep novel, high-stakes, ambiguous, financial, legal, emotional, or customer-sensitive situations AI-assisted or approval-gated.",
  ]);

  const successDefinition = unique([
    `This should feel like Dobly owns the ${vertical?.title.toLowerCase() ?? "job"} instead of just firing steps.`,
    "Low-risk proven work can move without babysitting only after the trust gate is passed.",
    "High-risk or unclear work should surface with context and a recommended next move.",
    "The system should leave clean records and clear updates behind every time it runs.",
  ]).slice(0, 4);

  return {
    job_to_be_done: responsibilities[0] ?? prompt,
    responsibilities,
    watches,
    work_talents: talents,
    handled_by_dobly: handledByDobly,
    access_needed_now: accessNeededNow,
    access_optional_later: accessOptionalLater,
    approval_contract: approvalContract,
    update_contract: updateContract,
    learning_contract: learningContract,
    success_definition: successDefinition,
  };
}

export function attachDoblyOperatingModel(
  blueprint: WorkflowBlueprint,
  operatingModel: DoblyOperatingModel,
): WorkflowBlueprint {
  return {
    ...blueprint,
    operating_model: operatingModel,
  };
}
