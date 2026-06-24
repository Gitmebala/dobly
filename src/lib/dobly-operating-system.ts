import { inferDoblyExecutionIntent, type DoblyExecutionIntent } from "./dobly-inference.ts";

type JsonRecord = Record<string, unknown>;

export type DoblyOperatingPhaseId =
  | "research"
  | "reason"
  | "create"
  | "act"
  | "handoff"
  | "watch"
  | "verify"
  | "learn";

export type DoblyOperatingArchetypeId =
  | "reception_and_conversation"
  | "engineering_delivery"
  | "product_design"
  | "creative_engine"
  | "business_operations"
  | "finance_control"
  | "strategy_watchtower"
  | "general_operator";

export type DoblyOperatingMode =
  | "on_demand"
  | "recurring_loop"
  | "event_driven"
  | "incident_response"
  | "watchtower";

export interface DoblyOperatingPhase {
  id: DoblyOperatingPhaseId;
  label: string;
  purpose: string;
  required: boolean;
  defaultLane: DoblyExecutionIntent["executionLaneId"] | "operator_memory" | "approval";
}

export interface DoblyOperatingSpec {
  mission: string;
  archetypeId: DoblyOperatingArchetypeId;
  operatingMode: DoblyOperatingMode;
  intent: DoblyExecutionIntent;
  phases: DoblyOperatingPhase[];
  operatorShape: {
    departmentId: DoblyExecutionIntent["departmentId"];
    suggestedName: string;
    missionStatement: string;
    outcomeStatement: string;
    loopCadence: "manual" | "always_on" | "hourly" | "daily" | "weekly" | "event_based";
  };
  autonomy: {
    defaultApprovalMode: "ask_first" | "approve_risky" | "supervised" | "trusted";
    externalActionsNeedApproval: boolean;
    moneyMovementNeedsApproval: boolean;
    publishingNeedsApproval: boolean;
    codeChangesNeedReview: boolean;
  };
  memoryPolicy: {
    readScopes: Array<DoblyExecutionIntent["memoryScopeId"] | "operator" | "company">;
    writeCandidates: string[];
    promoteLearnedRules: boolean;
  };
  watchPolicy: {
    shouldKeepWatching: boolean;
    signals: string[];
    escalationTriggers: string[];
  };
  deliverables: string[];
  rationale: string[];
}

const PHASE_LABELS: Record<DoblyOperatingPhaseId, string> = {
  research: "Research",
  reason: "Reason",
  create: "Create",
  act: "Act",
  handoff: "Hand off",
  watch: "Keep watching",
  verify: "Verify",
  learn: "Learn",
};

function includesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function archetypeForIntent(intent: DoblyExecutionIntent): DoblyOperatingArchetypeId {
  if (intent.departmentId === "reception" || intent.outputTypeId === "message") return "reception_and_conversation";
  if (intent.departmentId === "engineering_product") return "engineering_delivery";
  if (intent.departmentId === "marketing" && ["image_design", "video"].includes(intent.outputTypeId)) return "creative_engine";
  if (intent.departmentId === "marketing" || intent.departmentId === "support") return "product_design";
  if (intent.departmentId === "finance") return "finance_control";
  if (intent.departmentId === "leadership" || intent.workTypeId === "decide") return "strategy_watchtower";
  if (intent.departmentId === "operations" || intent.departmentId === "sales") return "business_operations";
  return "general_operator";
}

function operatingModeForPrompt(prompt: string, intent: DoblyExecutionIntent): DoblyOperatingMode {
  if (includesAny(prompt, [/continuously/i, /\balways\b/i, /\bwatch\b/i, /\bmonitor\b/i, /keep an eye/i, /before .* hits/i])) return "watchtower";
  if (includesAny(prompt, [/production error/i, /\bincident\b/i, /\boutage\b/i, /\bfailed\b/i, /\bbroken\b/i, /\bcomplaint\b/i])) return "incident_response";
  if (intent.triggerTypeId === "scheduled_trigger") return "recurring_loop";
  if (intent.triggerTypeId === "inbound_signal" || intent.triggerTypeId === "external_event" || intent.triggerTypeId === "threshold_alert") return "event_driven";
  return "on_demand";
}

function phaseRequired(prompt: string, phase: DoblyOperatingPhaseId, intent: DoblyExecutionIntent, mode: DoblyOperatingMode) {
  if (phase === "reason" || phase === "verify" || phase === "learn") return true;
  if (phase === "research") {
    return intent.workTypeId === "research" || includesAny(prompt, [/\bresearch\b/i, /\bstudy\b/i, /\banalyze\b/i, /\baudit\b/i, /\breview\b/i, /\bcompare\b/i, /\binspect\b/i]);
  }
  if (phase === "create") {
    return ["create", "build", "decide"].includes(intent.workTypeId) || includesAny(prompt, [/\bcreate\b/i, /\bdraft\b/i, /\bdesign\b/i, /\bgenerate\b/i, /\bprepare\b/i, /\bpackage\b/i, /\bscaffold\b/i, /\brewrite\b/i]);
  }
  if (phase === "act") {
    return includesAny(prompt, [/\bact\b/i, /\bimplement\b/i, /\bship\b/i, /\bpush\b/i, /\bopen .*pr\b/i, /pull request/i, /\bsend\b/i, /\bpublish\b/i, /\bdeploy\b/i, /\bupdate\b/i, /\bpatch\b/i, /\bqueue\b/i, /\bbook\b/i, /\bcollect\b/i]);
  }
  if (phase === "handoff") {
    return includesAny(prompt, [/\bhandoff\b/i, /hand off/i, /\bescalat/i, /\broute\b/i, /\bnotify\b/i, /\bprepare .*tickets?\b/i, /\bopen .*pr\b/i, /pull request/i]) ||
      ["approval_required", "human_only"].includes(intent.trustLevelId);
  }
  if (phase === "watch") {
    return mode === "watchtower" || mode === "recurring_loop" || mode === "event_driven" || includesAny(prompt, [/\bwatch\b/i, /\bmonitor\b/i, /\bkeep\b/i, /\brecurring\b/i, /\bweekly\b/i, /\bdaily\b/i, /\balert\b/i]);
  }
  return false;
}

function phaseLane(phase: DoblyOperatingPhaseId, intent: DoblyExecutionIntent): DoblyOperatingPhase["defaultLane"] {
  if (phase === "research") return "http_webhook";
  if (phase === "create") return intent.executionLaneId;
  if (phase === "act") return intent.executionLaneId === "voice" ? "voice" : "native_api";
  if (phase === "handoff") return "approval";
  if (phase === "watch" || phase === "learn") return "operator_memory";
  if (phase === "verify") return "approval";
  return "native_api";
}

function buildPhases(prompt: string, intent: DoblyExecutionIntent, mode: DoblyOperatingMode): DoblyOperatingPhase[] {
  const ids: DoblyOperatingPhaseId[] = ["research", "reason", "create", "act", "handoff", "watch", "verify", "learn"];
  return ids
    .map((id) => ({
      id,
      label: PHASE_LABELS[id],
      purpose:
        id === "research" ? "Gather current facts, source evidence, and relevant business context." :
        id === "reason" ? "Decide the right path, risks, missing context, and success criteria before work starts." :
        id === "create" ? "Produce the artifact, plan, code package, message, campaign, report, or operational output." :
        id === "act" ? "Use connected tools or runtime lanes to move approved work forward in the real world." :
        id === "handoff" ? "Route risky, cross-department, or human-owned work to the right person/operator with context." :
        id === "watch" ? "Keep checking the relevant signal after the first run and escalate only meaningful changes." :
        id === "verify" ? "Check the output against the standard of done, safety boundaries, and business outcome." :
        "Capture reusable preferences, rules, failures, and outcome signals for future runs.",
      required: phaseRequired(prompt, id, intent, mode),
      defaultLane: phaseLane(id, intent),
    }))
    .filter((phase) => phase.required);
}

function suggestedName(archetypeId: DoblyOperatingArchetypeId, intent: DoblyExecutionIntent) {
  if (archetypeId === "reception_and_conversation") return "Reception Operator";
  if (archetypeId === "engineering_delivery") return "Engineering Operator";
  if (archetypeId === "creative_engine") return "Creative Operator";
  if (archetypeId === "product_design") return `${humanize(intent.departmentId)} Operator`;
  if (archetypeId === "finance_control") return "Finance Operator";
  if (archetypeId === "strategy_watchtower") return "Boardroom Operator";
  if (archetypeId === "business_operations") return `${humanize(intent.departmentId)} Operator`;
  return "Dobly Operator";
}

function loopCadence(mode: DoblyOperatingMode): DoblyOperatingSpec["operatorShape"]["loopCadence"] {
  if (mode === "watchtower") return "always_on";
  if (mode === "recurring_loop") return "daily";
  if (mode === "event_driven" || mode === "incident_response") return "event_based";
  return "manual";
}

function deliverablesForIntent(intent: DoblyExecutionIntent, phases: DoblyOperatingPhase[]) {
  const deliverables = new Set<string>();
  if (phases.some((phase) => phase.id === "research")) deliverables.add("source-backed brief");
  if (intent.outputTypeId === "code_context_package") deliverables.add("reviewable code/change package");
  if (intent.outputTypeId === "message") deliverables.add("customer-ready message or conversation plan");
  if (intent.outputTypeId === "document") deliverables.add("document artifact");
  if (intent.outputTypeId === "presentation") deliverables.add("presentation/deck artifact");
  if (intent.outputTypeId === "spreadsheet_report") deliverables.add("spreadsheet/report artifact");
  if (intent.outputTypeId === "image_design") deliverables.add("design asset package");
  if (intent.outputTypeId === "video") deliverables.add("media production package");
  if (intent.outputTypeId === "alert") deliverables.add("escalation alert");
  if (phases.some((phase) => phase.id === "handoff")) deliverables.add("handoff packet");
  if (phases.some((phase) => phase.id === "watch")) deliverables.add("watch rule and escalation criteria");
  deliverables.add("run summary and learned-memory candidates");
  return Array.from(deliverables);
}

function watchSignals(prompt: string, intent: DoblyExecutionIntent) {
  const signals = new Set<string>();
  if (intent.departmentId === "reception") ["missed calls", "new chats", "booking requests", "handoff failures"].forEach((item) => signals.add(item));
  if (intent.departmentId === "engineering_product") ["production errors", "failed tests", "blocked pull requests", "performance regressions"].forEach((item) => signals.add(item));
  if (intent.departmentId === "sales") ["new leads", "stalled deals", "unanswered follow-ups", "proposal inactivity"].forEach((item) => signals.add(item));
  if (intent.departmentId === "finance") ["overdue invoices", "failed payments", "margin variance", "reconciliation gaps"].forEach((item) => signals.add(item));
  if (intent.departmentId === "operations") ["supplier delays", "inventory pressure", "delivery risk", "handoff gaps"].forEach((item) => signals.add(item));
  if (intent.departmentId === "leadership") ["market shifts", "competitor changes", "cash risk", "strategic opportunity"].forEach((item) => signals.add(item));
  if (includesAny(prompt, [/competitor/i])) signals.add("competitor movement");
  if (includesAny(prompt, [/complaint/i])) signals.add("complaint recurrence");
  return Array.from(signals);
}

export function buildDoblyOperatingSpec(input: {
  prompt: string;
  context?: JsonRecord;
  intent?: DoblyExecutionIntent | null;
  availability?: Parameters<typeof inferDoblyExecutionIntent>[0]["availability"];
}): DoblyOperatingSpec {
  const mission = input.prompt.trim();
  const intent = input.intent ?? inferDoblyExecutionIntent({
    prompt: mission,
    context: input.context ?? {},
    availability: input.availability,
  });
  const archetypeId = archetypeForIntent(intent);
  const operatingMode = operatingModeForPrompt(mission, intent);
  const phases = buildPhases(mission, intent, operatingMode);
  const isHighRisk = intent.trustLevelId === "approval_required" || intent.trustLevelId === "human_only";
  const shouldKeepWatching = phases.some((phase) => phase.id === "watch");
  const signals = watchSignals(mission, intent);

  return {
    mission,
    archetypeId,
    operatingMode,
    intent,
    phases,
    operatorShape: {
      departmentId: intent.departmentId,
      suggestedName: suggestedName(archetypeId, intent),
      missionStatement: `Handle ${humanize(intent.departmentId)} work by moving from research and judgment into concrete outputs, approved action, handoff, and learning.`,
      outcomeStatement: `A completed ${humanize(intent.outputTypeId)} outcome with clear evidence, next action, owner, and memory updates.`,
      loopCadence: loopCadence(operatingMode),
    },
    autonomy: {
      defaultApprovalMode: isHighRisk ? "approve_risky" : operatingMode === "watchtower" ? "supervised" : "approve_risky",
      externalActionsNeedApproval: isHighRisk || includesAny(mission, [/\bsend\b/i, /\bpublish\b/i, /\bpost live\b/i, /\bbook\b/i]),
      moneyMovementNeedsApproval: intent.departmentId === "finance" || includesAny(mission, [/\bpayment\b/i, /\bcharge\b/i, /\brefund\b/i, /\binvoice\b/i]),
      publishingNeedsApproval: includesAny(mission, [/\bpublish\b/i, /\bpost live\b/i, /\bschedule post\b/i]),
      codeChangesNeedReview: intent.departmentId === "engineering_product" || intent.outputTypeId === "code_context_package",
    },
    memoryPolicy: {
      readScopes: Array.from(new Set([intent.memoryScopeId, "operator", intent.departmentId === "leadership" ? "company" : intent.memoryScopeId])),
      writeCandidates: [
        "successful action pattern",
        "owner correction or approval decision",
        "recurring failure or risk signal",
        "customer/business preference",
      ],
      promoteLearnedRules: phases.some((phase) => phase.id === "learn"),
    },
    watchPolicy: {
      shouldKeepWatching,
      signals,
      escalationTriggers: [
        "risk exceeds configured threshold",
        "external action requires approval",
        "same failure repeats",
        "material customer, cash, or reputation impact appears",
      ],
    },
    deliverables: deliverablesForIntent(intent, phases),
    rationale: [
      `Mission compiles as ${archetypeId} in ${operatingMode} mode.`,
      `Intent is ${intent.departmentId} / ${intent.workTypeId} / ${intent.outputTypeId}.`,
      `Phases: ${phases.map((phase) => phase.label).join(" -> ")}.`,
    ],
  };
}
