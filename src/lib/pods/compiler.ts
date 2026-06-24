import { resolvePodCapabilities, summarizeCapabilityKinds } from "@/lib/pods/capabilities";
import { inferVerticalBaselineForPrompt } from "@/lib/office/vertical-baselines";
import { podSpecSchema, type PodAudience, type PodBuildContext, type PodSpec } from "@/lib/pods/types";

const BUSINESS_HINTS = /customer|client|lead|crm|invoice|payment|booking|appointment|support|shop|order|sales|team|staff|business|company|agency|store/i;
const PERSONAL_HINTS = /personal|family|meal|fitness|habit|travel|home|study|budget|journal|life|reminder/i;

export function compilePodSpec(context: PodBuildContext): PodSpec {
  const prompt = context.prompt.trim();
  const lower = prompt.toLowerCase();
  const capabilities = resolvePodCapabilities(prompt);
  const kinds = summarizeCapabilityKinds(capabilities);
  const audience = inferAudience(prompt);
  const label = inferLabel(prompt);
  const tools = inferTools(prompt, capabilities, context.connections ?? []);
  const channels = inferChannels(prompt);
  const hasConversation = kinds.includes("conversation");
  const hasDocuments = kinds.includes("document");
  const hasWorkflow = kinds.includes("workflow");
  const hasSensitiveAction = /refund|charge|payment|discount|delete|cancel|contract|legal|medical|bank|password|private|sensitive/i.test(prompt);
  const verticalBaseline = inferVerticalBaselineForPrompt(prompt);

  const spec: PodSpec = {
    version: 1,
    name: `${label} Pod`,
    label,
    sourcePrompt: prompt,
    audience,
    purpose: sentence(
      `Handle ${label.toLowerCase()} work by using only the capabilities, tools, rules, and approval boundaries in this Pod.`,
    ),
    job: {
      summary: sentence(`A ${label.toLowerCase()} Pod for ${summarizeJob(prompt, audience)}`),
      duties: inferDuties(prompt, { hasConversation, hasDocuments, hasWorkflow }),
      outcomes: inferOutcomes(prompt, { hasConversation, hasDocuments, hasWorkflow }),
      notResponsibleFor: [
        "Making irreversible or high-risk changes without approval.",
        "Inventing missing facts, prices, policies, or commitments.",
        "Working outside the job described in the Pod instructions.",
      ],
    },
    mode: "draft",
    capabilities,
    channels,
    tools,
    memory: {
      enabled: true,
      scopes: [
        "Pod rules and corrections",
        "Approved examples",
        "Preferred tone and formatting",
        ...(context.businessProfile?.context_summary ? ["Saved workspace context"] : []),
      ],
      firstFactsToLearn: inferFirstFacts(prompt, audience),
    },
    approvalPolicy: {
      defaultMode: hasSensitiveAction ? "ask_first" : "supervised",
      alwaysAskFor: [
        "Sending payment, refund, discount, legal, medical, or contract-related messages.",
        "Deleting records, cancelling bookings, changing prices, or making promises.",
        "Any action outside the Pod duties or below confidence threshold.",
      ],
      canDoWithoutAsking: [
        "Draft summaries, classifications, and internal notes.",
        "Prepare suggested replies and low-risk reports.",
        "Organize information using already-approved rules.",
      ],
      neverDo: [
        "Pretend to be a human.",
        "Act outside connected tools and approved channels.",
        "Use private data not provided to this Pod.",
      ],
    },
    rules: [
      {
        id: "stay-in-scope",
        title: "Stay in scope",
        rule: "Only handle the job described by this Pod and escalate anything outside it.",
        enforcement: "always",
        riskLevel: "medium",
      },
      {
        id: "approval-for-risk",
        title: "Ask before risky actions",
        rule: "Create an approval request before sensitive external actions or irreversible changes.",
        enforcement: "approval",
        riskLevel: "high",
      },
      {
        id: "show-your-work",
        title: "Show what changed",
        rule: "Log every meaningful decision, tool call, skipped action, and handoff.",
        enforcement: "always",
        riskLevel: "low",
      },
    ],
    reporting: {
      cadence: lower.includes("daily") ? "daily" : lower.includes("weekly") ? "weekly" : "on_activity",
      style: audience === "personal" ? "brief" : "standard",
      metrics: inferMetrics(prompt, { hasConversation, hasDocuments, hasWorkflow }, verticalBaseline.workerDepth),
    },
    verticalBaseline,
    launch: {
      readinessScore: estimateReadiness(tools, context.connections ?? [], hasSensitiveAction),
      missingConnections: missingConnections(tools, context.connections ?? []),
      nextSteps: [
        "Review the Pod duties, boundaries, and approval policy.",
        `Review the ${verticalBaseline.title} depth baseline against ${verticalBaseline.competitorBaseline.slice(0, 3).join(", ")}.`,
        "Run the simulation examples before live work.",
        tools.length > 0 ? "Connect or confirm the required tools." : "Start supervised mode with Dobly-native capabilities.",
        "Train the Pod from approvals, edits, and rejected actions.",
      ],
      safestFirstMode: "supervised",
    },
    simulations: inferSimulations(label, { hasConversation, hasDocuments, hasWorkflow, hasSensitiveAction }),
  };

  return podSpecSchema.parse(spec);
}

function inferAudience(prompt: string): PodAudience {
  const business = BUSINESS_HINTS.test(prompt);
  const personal = PERSONAL_HINTS.test(prompt);
  if (business && personal) return "both";
  if (business) return "business";
  if (personal) return "personal";
  return "both";
}

function inferLabel(prompt: string) {
  const lower = prompt.toLowerCase();
  if (/reception|receptionist|front desk|booking/.test(lower)) return "Reception";
  if (/invoice|receipt|bill|payment/.test(lower)) return "Invoice";
  if (/lead|sales|follow/.test(lower)) return "Lead Follow-up";
  if (/support|ticket|customer/.test(lower)) return "Support";
  if (/content|post|social|newsletter/.test(lower)) return "Content";
  if (/report|summary|briefing|digest/.test(lower)) return "Reporting";
  if (/travel|trip|itinerary/.test(lower)) return "Travel";
  if (/admin|assistant|organize/.test(lower)) return "Admin";
  return "Custom";
}

function summarizeJob(prompt: string, audience: PodAudience) {
  const cleaned = prompt.replace(/\s+/g, " ").slice(0, 140);
  if (cleaned.length > 0) return cleaned;
  return audience === "personal" ? "repeat personal work" : "repeat work";
}

function inferDuties(
  prompt: string,
  flags: { hasConversation: boolean; hasDocuments: boolean; hasWorkflow: boolean },
) {
  const duties = new Set<string>();
  if (flags.hasConversation) duties.add("Understand inbound messages and prepare the right response or handoff.");
  if (flags.hasDocuments) duties.add("Read documents, extract key fields, summarize, and flag unusual items.");
  if (flags.hasWorkflow) duties.add("Run the repeat process when the trigger or schedule occurs.");
  if (/lead|qualif/i.test(prompt)) duties.add("Qualify leads and separate routine cases from high-priority ones.");
  if (/book|appointment|calendar/i.test(prompt)) duties.add("Prepare bookings and scheduling updates within the rules.");
  if (/invoice|payment|overdue/i.test(prompt)) duties.add("Track invoice or payment status and prepare clear summaries.");
  for (const item of inferVerticalBaselineForPrompt(prompt).mustMatch.slice(0, 4)) {
    duties.add(item);
  }
  duties.add("Report completed work, blocked items, and decisions that need the user.");
  return Array.from(duties);
}

function inferOutcomes(
  prompt: string,
  flags: { hasConversation: boolean; hasDocuments: boolean; hasWorkflow: boolean },
) {
  const outcomes = new Set<string>();
  if (flags.hasConversation) outcomes.add("Faster, more consistent replies.");
  if (flags.hasDocuments) outcomes.add("Important document details surfaced without manual reading.");
  if (flags.hasWorkflow) outcomes.add("Repeat work runs without being rebuilt each time.");
  outcomes.add("Risky work pauses for approval instead of guessing.");
  outcomes.add("The user can see what happened and correct the Pod over time.");
  for (const item of inferVerticalBaselineForPrompt(prompt).doblyAdvantage.slice(0, 2)) {
    outcomes.add(item);
  }
  return Array.from(outcomes);
}

function inferTools(prompt: string, capabilities: ReturnType<typeof resolvePodCapabilities>, connections: PodBuildContext["connections"]) {
  const lower = prompt.toLowerCase();
  const tools = new Set<string>();
  const explicitProviders = [
    "gmail",
    "google",
    "calendar",
    "whatsapp",
    "slack",
    "hubspot",
    "salesforce",
    "stripe",
    "shopify",
    "notion",
    "airtable",
    "zendesk",
    "mailchimp",
    "quickbooks",
    "xero",
    "trello",
    "asana",
    "clickup",
  ];

  for (const provider of explicitProviders) {
    if (lower.includes(provider)) tools.add(provider);
  }

  for (const capability of capabilities) {
    for (const tool of capability.requiredTools) tools.add(tool);
  }

  for (const connection of connections ?? []) {
    if (connection.status === "active" && lower.includes(connection.provider.toLowerCase())) {
      tools.add(connection.provider);
    }
  }

  return Array.from(tools);
}

function inferChannels(prompt: string) {
  const lower = prompt.toLowerCase();
  const channels = new Set<string>();
  if (/whatsapp/.test(lower)) channels.add("whatsapp");
  if (/sms|text/.test(lower)) channels.add("sms");
  if (/email|gmail|inbox/.test(lower)) channels.add("email");
  if (/website|chat|web/.test(lower)) channels.add("web");
  if (/voice|call|phone|reception/.test(lower)) channels.add("voice");
  if (channels.size === 0) channels.add("dashboard");
  return Array.from(channels);
}

function inferFirstFacts(prompt: string, audience: PodAudience) {
  const facts = ["What good output looks like", "When to ask for approval", "Preferred tone"];
  if (audience !== "personal") facts.push("Business policies and operating hours");
  if (/customer|lead|support|reception/i.test(prompt)) facts.push("Frequently asked questions");
  if (/invoice|payment/i.test(prompt)) facts.push("Invoice fields, vendors, and reminder policy");
  return facts;
}

function inferMetrics(
  prompt: string,
  flags: { hasConversation: boolean; hasDocuments: boolean; hasWorkflow: boolean },
  depthItems: string[] = [],
) {
  const metrics = new Set<string>(["actions completed", "approvals requested", "items escalated"]);
  if (flags.hasConversation) metrics.add("messages handled");
  if (flags.hasDocuments) metrics.add("documents processed");
  if (flags.hasWorkflow) metrics.add("runs completed");
  if (/lead|sales/i.test(prompt)) metrics.add("qualified opportunities");
  if (/invoice|payment/i.test(prompt)) metrics.add("money flagged or recovered");
  for (const item of depthItems.slice(0, 4)) metrics.add(item.toLowerCase());
  return Array.from(metrics);
}

function inferSimulations(
  label: string,
  flags: { hasConversation: boolean; hasDocuments: boolean; hasWorkflow: boolean; hasSensitiveAction: boolean },
) {
  return [
    {
      id: "common-case",
      title: `${label} common case`,
      input: flags.hasConversation
        ? "A normal message arrives with enough information to respond."
        : flags.hasDocuments
          ? "A normal file arrives with readable details."
          : "A normal trigger starts the Pod.",
      expectedBehavior: "Handle the safe parts, log the decision, and report the result.",
      needsApproval: false,
      riskLevel: "low" as const,
    },
    {
      id: "missing-info",
      title: "Missing information",
      input: "The request is incomplete or important fields are missing.",
      expectedBehavior: "Ask for the missing information or create a clear review item instead of guessing.",
      needsApproval: true,
      riskLevel: "medium" as const,
    },
    {
      id: "risky-case",
      title: "Risky or out-of-scope case",
      input: flags.hasSensitiveAction
        ? "The action involves payment, cancellation, deletion, private data, or a promise."
        : "The situation is unusual, emotional, or outside the Pod's duties.",
      expectedBehavior: "Pause, explain the risk, and request approval with a preview.",
      needsApproval: true,
      riskLevel: "high" as const,
    },
  ];
}

function estimateReadiness(tools: string[], connections: NonNullable<PodBuildContext["connections"]>, sensitive: boolean) {
  const missing = missingConnections(tools, connections).length;
  const toolPenalty = Math.min(35, missing * 12);
  const riskPenalty = sensitive ? 10 : 0;
  return Math.max(35, 88 - toolPenalty - riskPenalty);
}

function missingConnections(tools: string[], connections: NonNullable<PodBuildContext["connections"]>) {
  const active = new Set(
    connections
      .filter((connection) => connection.status === "active")
      .map((connection) => connection.provider.toLowerCase()),
  );

  return tools.filter((tool) => !["email", "calendar"].includes(tool) && !active.has(tool.toLowerCase()));
}

function sentence(value: string) {
  return value.endsWith(".") ? value : `${value}.`;
}
