import type { WorkflowCategory } from "@/types";
import { buildDoblyGenerationBrief } from "@/lib/dobly-ops";
import { guessDoblyVertical } from "@/lib/verticals";
import type { BusinessProfile, Connection, Profile, Workflow } from "@/types";

export type DoblyOperatorModel = "automation" | "agent" | "pipeline" | "hybrid" | "report";
export type DoblyPrimarySegment =
  | "business_owner"
  | "freelancer"
  | "individual"
  | "service_business"
  | "ecommerce"
  | "agency"
  | "creator"
  | "general";

export interface DoblyClarificationAnswers {
  responsibility?: string;
  watch?: string;
  access?: string;
  approvals?: string;
  updates?: string;
}

export interface DoblyClarificationQuestion {
  id: keyof DoblyClarificationAnswers;
  label: string;
  help: string;
  placeholder: string;
}

export interface DoblyPromptAnalysis {
  operatorModel: DoblyOperatorModel;
  classificationReason: string;
  primarySegment: DoblyPrimarySegment;
  likelyCategory: WorkflowCategory;
  questions: DoblyClarificationQuestion[];
  suggestedProviderIds: string[];
  verticalId?: string;
  verticalTitle?: string;
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

export function analyzePromptDesign(prompt: string): DoblyPromptAnalysis {
  const text = prompt.toLowerCase();

  const looksLikeAgent = hasAny(text, [
    /agent/,
    /assistant/,
    /reception/,
    /triage/,
    /reply/,
    /respond/,
    /inbox/,
    /qualif/,
    /support/,
    /chief[- ]of[- ]staff/,
    /operator/,
  ]);

  const looksLikeAutomation = hasAny(text, [
    /\bwhen\b/,
    /\bevery\b/,
    /\bif\b/,
    /\bafter\b/,
    /\bbefore\b/,
    /\bsend\b/,
    /\bupdate\b/,
    /\bnotify\b/,
    /\bremind\b/,
    /\bsync\b/,
    /\btrack\b/,
    /\bwatch\b/,
    /\bmonitor\b/,
  ]);

  const looksLikeReport = hasAny(text, [
    /report/,
    /summary/,
    /brief/,
    /briefing/,
    /digest/,
    /dashboard/,
  ]);
  const looksLikePipeline = hasAny(text, [
    /pipeline/,
    /research.*design/,
    /research.*document/,
    /design.*deliver/,
    /figma/,
    /autodesk/,
    /fusion/,
    /github/,
    /mcp/,
    /multi[- ]step/,
    /then .* then/,
  ]);

  const operatorModel: DoblyOperatorModel = looksLikeReport && !looksLikeAgent
    ? "report"
    : looksLikePipeline
      ? "pipeline"
    : looksLikeAgent && looksLikeAutomation
      ? "hybrid"
      : looksLikeAgent
        ? "agent"
        : "automation";

  const primarySegment: DoblyPrimarySegment = hasAny(text, [/birthday/, /flight/, /bill/, /personal/, /habit/, /home/, /health/, /career/, /stock/, /portfolio/, /subscription/])
    ? "individual"
    : hasAny(text, [/freelance/, /client/, /proposal/, /retainer/, /consultant/, /designer/, /developer/, /creative/])
      ? "freelancer"
      : hasAny(text, [/shopify/, /order/, /inventory/, /cart/, /fulfillment/, /ecommerce/, /store/])
    ? "ecommerce"
    : hasAny(text, [/instagram/, /tiktok/, /creator/, /content/, /social/, /influencer/, /dm/])
      ? "creator"
    : hasAny(text, [/agency/, /client/, /campaign/, /creative/, /proposal/, /brief/])
      ? "agency"
      : hasAny(text, [/appointment/, /booking/, /invoice/, /lead/, /intake/, /service/, /consultation/])
        ? "service_business"
        : hasAny(text, [/business/, /customer/, /whatsapp/, /m-pesa/, /mpesa/, /supplier/, /clinic/, /hotel/, /shop/, /logistics/])
          ? "business_owner"
        : "general";

  const likelyCategory: WorkflowCategory = looksLikeReport
    ? "Data & Reporting"
    : hasAny(text, [/invoice/, /payment/, /billing/, /quote/])
      ? "Finance & Invoicing"
      : hasAny(text, [/lead/, /crm/, /sales/, /follow-up/, /follow up/])
        ? "Sales & Marketing"
      : hasAny(text, [/support/, /ticket/, /customer/, /help/])
          ? "Customer Communication"
          : hasAny(text, [/instagram/, /tiktok/, /creator/, /content/, /social/])
            ? "Sales & Marketing"
          : hasAny(text, [/order/, /shopify/, /inventory/, /delivery/])
            ? "E-commerce"
            : hasAny(text, [/calendar/, /schedule/, /booking/, /ops/, /onboarding/])
              ? "HR & Operations"
              : "Productivity";

  const classificationReason =
    operatorModel === "report"
      ? "This reads like a recurring summary or reporting workflow, so Dobly should optimize for schedule, reporting, and owner visibility."
      : operatorModel === "pipeline"
        ? "This reads like a multi-step job where outputs pass between steps, so Dobly should design a pipeline with checkpoints, artifacts, and escalation boundaries."
      : operatorModel === "hybrid"
        ? "This request mixes ongoing judgment with repeatable steps, so Dobly should treat it as a hybrid system with guardrails and operational actions."
        : operatorModel === "agent"
          ? "This reads like a bounded role that needs judgment and escalation, so Dobly should design it as an agent with clear operating limits."
          : "This reads like a structured process with triggers and actions, so Dobly should design it as a dependable automation.";

  const suggestedProviderIds = primarySegment === "individual"
    ? ["google", "notion", "slack", "webhook"]
    : primarySegment === "freelancer"
      ? ["google", "notion", "paystack", "calendly", "slack", "webhook"]
      : primarySegment === "business_owner" || primarySegment === "service_business"
    ? ["google", "whatsapp", "paystack", "mpesa", "calendly", "slack", "webhook"]
    : primarySegment === "ecommerce"
      ? ["shopify", "paystack", "mpesa", "klaviyo", "google", "slack", "webhook"]
      : primarySegment === "creator"
        ? ["meta", "google", "notion", "calendly", "slack", "webhook"]
      : primarySegment === "agency"
        ? ["google", "slack", "notion", "airtable", "calendly", "webhook"]
        : ["google", "slack", "whatsapp", "paystack", "mpesa", "shopify", "webhook"];

  const vertical = guessDoblyVertical(prompt);

  return {
    operatorModel,
    classificationReason,
    primarySegment,
    likelyCategory,
    questions: [
      {
        id: "responsibility",
        label: "What should Dobly fully own here?",
        help: "Describe the real responsibility, not the software steps.",
        placeholder:
          vertical?.responsibilities[0] ??
          "Own inbound leads from first touch through follow-up and a clear next step.",
      },
      {
        id: "watch",
        label: vertical?.onboardingQuestions[0]?.label ?? "What should Dobly watch most closely?",
        help:
          vertical?.onboardingQuestions[0]?.help ??
          "Describe the signals, inboxes, thresholds, or inputs that matter most.",
        placeholder:
          vertical?.onboardingQuestions[0]?.placeholder ??
          "Watch new inquiries, stale deals, missed replies, and anything urgent enough to act on.",
      },
      {
        id: "access",
        label: "What should Dobly need access to right now?",
        help:
          "Mention only the inboxes, calendars, stores, CRMs, or channels that must be live from day one. Everything else can wait.",
        placeholder:
          "Gmail and HubSpot now. Slack and calendar later if the first version works.",
      },
      {
        id: "approvals",
        label: vertical?.onboardingQuestions[1]?.label ?? "What should run alone, and when should Dobly ask you?",
        help:
          vertical?.onboardingQuestions[1]?.help ??
          "Define the human guardrail clearly so Dobly knows what to draft, escalate, or auto-complete.",
        placeholder:
          vertical?.onboardingQuestions[1]?.placeholder ??
          "Auto-send low-risk messages, but ask me before refunds, discounts, or anything high-value.",
      },
      {
        id: "updates",
        label: "How should Dobly update you?",
        help: "Describe the summaries, alerts, or reports you want to receive once this is running.",
        placeholder: "Send a short morning brief, hot-item alerts right away, and a weekly summary every Monday.",
      },
    ],
    suggestedProviderIds,
    verticalId: vertical?.id,
    verticalTitle: vertical?.title,
  };
}

export function buildGenerationDesignBrief(
  prompt: string,
  analysis: DoblyPromptAnalysis,
  clarifications?: DoblyClarificationAnswers,
  workspaceContext?: {
    businessProfile: BusinessProfile | null;
    workflows: Workflow[];
    connections: Connection[];
    profile?: Pick<Profile, "notification_preference"> | null;
  },
) {
  const generationBrief = buildDoblyGenerationBrief({
    prompt,
    operatorModel: analysis.operatorModel,
    classificationReason: analysis.classificationReason,
    businessProfile: workspaceContext?.businessProfile ?? null,
    workflows: workspaceContext?.workflows ?? [],
    connections: workspaceContext?.connections ?? [],
    notificationPreference: workspaceContext?.profile?.notification_preference ?? null,
    clarifications,
  });
  const answer = (value: string | undefined, fallback: string) =>
    value && value.trim().length > 0 ? value.trim() : fallback;

  return `${prompt}

Dobly classification:
- Recommended system type: ${analysis.operatorModel}
- Reason: ${analysis.classificationReason}
- Primary customer segment: ${analysis.primarySegment}
- Likely category: ${analysis.likelyCategory}
- Deep vertical: ${analysis.verticalTitle ?? "No specific tuned vertical matched. Use flexible defaults."}

Clarifications from the user:
- Responsibility: ${answer(clarifications?.responsibility, "Not specified. Infer the real job this system should own and keep that role visible.")}
- Watch closely: ${answer(clarifications?.watch, "Not specified. Infer the key signals, inboxes, thresholds, or requests this should monitor.")}
- Access needed now: ${answer(clarifications?.access, "Not specified. Prefer Dobly-managed handling first and ask for live access only when necessary.")}
- Approval policy: ${answer(clarifications?.approvals, "Use strong human guardrails for risky or sensitive actions.")}
- Update contract: ${answer(clarifications?.updates, "Send clear updates showing what changed, what Dobly handled, and what still needs a person.")}

Workspace memory:
${generationBrief.workspaceMemory.map((item) => `- ${item}`).join("\n") || "- No saved workspace memory yet. Keep assumptions explicit."}

Policy summary:
${generationBrief.policySummary.map((item) => `- ${item}`).join("\n") || "- No explicit policies saved yet. Favor safer defaults."}

Generation defaults:
- Recommended operator type: ${generationBrief.defaults.operatorType}
- Trigger strategy: ${generationBrief.defaults.triggerStrategy}
- Approval policy: ${generationBrief.defaults.approvalPolicy}
- Retry policy: ${generationBrief.defaults.retryPolicy}
- Best first connection: ${generationBrief.defaults.firstConnection}

Confidence guidance:
- Confidence: ${generationBrief.confidence}% (${generationBrief.confidenceLabel})
- Reason: ${generationBrief.confidenceReason}
- Approval points:
${generationBrief.approvalPoints.map((item) => `  - ${item}`).join("\n")}
- Failure modes to design for:
${generationBrief.failureModes.map((item) => `  - ${item}`).join("\n")}

Product requirements:
- Dobly builds permanent systems for recurring work. The system should keep running until paused, not behave like a one-off chat response.
- Classify the system as one of: automation, agent, pipeline, hybrid, or report. The user should not have to choose this themselves.
- Business owners use offices/workers/General Manager/Board language; freelancers use clients/projects/admin pipeline language; individuals use life areas/watchers/personal systems language.
- Include the operating structure: owned responsibility, memory writes, operation-feed updates, escalation rules, and the first version of the learning loop.
- Do NOT claim the first run is already deterministic forever. Early versions start AI-supervised unless the action is already trivial and low-risk.
- Deterministic rule promotion must be gated: repeated successful examples, no recent owner corrections, low risk, clear rollback, and explicit owner approval before the rule auto-runs.
- Keep novel, high-stakes, ambiguous, financial, legal, emotional, or customer-sensitive situations AI-assisted or approval-gated even when other parts of the system become deterministic.
- Ask for live connections late, not upfront.
- Prefer Dobly-managed drafting, routing, summarization, and approvals first.
- Make the workflow safe for owners to test.
- Include clear approval and exception handling.
- Include practical retries or escalation behavior where relevant.`;
}
