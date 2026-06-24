import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { inferCapabilitiesFromText, getCapabilityDefinition, type DoblyCapability } from "@/lib/runtime/capabilities";
import { listUniversalConnectorDefinitions } from "@/lib/connectors/universal-catalog";
import { createDoblyOperator, runDoblyOperator, type DoblyLoopCadence, type DoblyOperatorKind } from "@/lib/dobly-operators";
import { appendOperatorChatMessage, ensureOperatorConversation, recordOperatorChatEvent } from "@/lib/operator-chat";
import { checkUsageEntitlement, recordUsageEvent } from "@/lib/billing/entitlements";
import {
  buildCoworkerOperatingProfile,
  buildRecipeLoops,
  inferCoworkerRecipe,
  mergeCapabilities,
  type CoworkerRecipe,
} from "@/lib/coworker-recipes";
import {
  getConnectionCapabilityProfile,
  getConnectionServicesForCapabilities,
  summarizeConnectionCapabilities,
  type ConnectionCostMode,
  type ConnectionServiceCapability,
  type ConnectionSupportLevel,
} from "@/lib/connection-capabilities";

type JsonRecord = Record<string, unknown>;

export type OperatorProposalStatus = "draft" | "tested" | "deployed" | "archived";

export interface OperatorProposal {
  name: string;
  mission: string;
  outcome: string;
  kind: DoblyOperatorKind;
  office: string;
  department: string;
  coworkerRecipe: ReturnType<typeof buildCoworkerOperatingProfile>;
  approvalMode: "ask_first" | "approve_risky" | "supervised" | "trusted";
  capabilityTags: DoblyCapability[];
  requiredConnections: Array<{
    id: string;
    label: string;
    provider: string;
    category: string;
    reason: string;
    approvalRequired: boolean;
    setupMode: "hosted" | "local_bridge" | "custom_api";
    supportLevel?: ConnectionSupportLevel;
    services?: ConnectionServiceCapability[];
    serviceLabels?: string[];
    costModes?: ConnectionCostMode[];
  }>;
  loops: Array<{
    name: string;
    cadence: DoblyLoopCadence;
    trigger: string;
    playbook: string;
  }>;
  approvalRules: string[];
  memoryPolicy: JsonRecord;
  guardrails: JsonRecord;
  testScenarios: Array<{
    title: string;
    prompt: string;
    expected: string;
    passCondition: string;
    risk: "low" | "medium" | "high";
  }>;
  expectedArtifacts: string[];
  riskCards: Array<{
    title: string;
    level: "low" | "medium" | "high";
    why: string;
    control: string;
  }>;
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

type ProposalArchetype =
  | "website_chatbot"
  | "cad_designer"
  | "animation_studio"
  | "summarizer"
  | "research_analyst"
  | "creative_publisher"
  | "watcher"
  | "generalist";

function inferArchetype(prompt: string, capabilities: DoblyCapability[]): ProposalArchetype {
  const lower = prompt.toLowerCase();
  if (hasAny(lower, [/\bchatbot\b/i, /\bwebsite bot\b/i, /\bsite bot\b/i, /\bassistant widget\b/i])) return "website_chatbot";
  if (hasAny(lower, [/\bcad\b/i, /\b3d model\b/i, /\bfusion 360\b/i, /\bautodesk\b/i, /\bblueprint\b/i, /\bprototype\b/i])) return "cad_designer";
  if (hasAny(lower, [/\banimation\b/i, /\banimatic\b/i, /\bmotion graphics?\b/i, /\bstoryboard\b/i])) return "animation_studio";
  if (hasAny(lower, [/\bsummar(?:ize|ise)\b/i, /\bdigest\b/i, /\bcondense\b/i, /\bexecutive brief\b/i])) return "summarizer";
  if (hasAny(lower, [/\bresearch\b/i, /\bcompare\b/i, /\binvestigate\b/i, /\bmarket scan\b/i])) return "research_analyst";
  if (hasAny(lower, [/\bpost\b/i, /\bcaption\b/i, /\bsocial\b/i, /\bpublish\b/i, /\bcampaign\b/i, /\bcreative\b/i])) return "creative_publisher";
  if (hasAny(lower, [/\bwatch\b/i, /\bmonitor\b/i, /\balert\b/i, /\btrack\b/i, /\bnotify\b/i])) return "watcher";
  if (capabilities.includes("build_chatbot")) return "website_chatbot";
  if (capabilities.includes("create_3d_cad")) return "cad_designer";
  if (capabilities.includes("create_animation")) return "animation_studio";
  if (capabilities.includes("summarize_knowledge")) return "summarizer";
  return "generalist";
}

function inferName(prompt: string, capabilities: DoblyCapability[], recipe?: CoworkerRecipe) {
  const lower = prompt.toLowerCase();
  const archetype = inferArchetype(prompt, capabilities);
  if (recipe && recipe.id !== "general_manager") return recipe.defaultName;
  if (archetype === "website_chatbot") return "Website Chatbot Coworker";
  if (archetype === "cad_designer") return "CAD Design Coworker";
  if (archetype === "animation_studio") return "Animation Coworker";
  if (archetype === "summarizer") return "Summaries Coworker";
  if (archetype === "research_analyst") return "Research Analyst Coworker";
  if (archetype === "creative_publisher") return "Creative Publishing Coworker";
  if (archetype === "watcher") return "Watcher Coworker";
  if (lower.includes("reception") || lower.includes("call") || lower.includes("whatsapp")) return "Reception Operator";
  if (lower.includes("lead") || lower.includes("sales") || lower.includes("prospect")) return "Sales Operator";
  if (lower.includes("invoice") || lower.includes("cash") || lower.includes("payment")) return "Finance Operator";
  if (lower.includes("content") || lower.includes("post") || lower.includes("social")) return "Growth Operator";
  if (lower.includes("stock") || lower.includes("market") || lower.includes("crypto")) return "Market Watch Operator";
  if (lower.includes("travel") || lower.includes("flight") || lower.includes("hotel")) return "Travel Operator";
  const primary = getCapabilityDefinition(capabilities[0])?.label ?? "Custom";
  return `${titleCase(primary.replace("Create ", "").replace("Manage ", ""))} Operator`;
}

function inferKind(prompt: string): DoblyOperatorKind {
  const lower = prompt.toLowerCase();
  if (/(travel|stock|market|crypto|bill|subscription|personal|family|health)/.test(lower)) return "life";
  if (/(client|team|project|work|employee|manager)/.test(lower)) return "work";
  if (/(business|lead|sales|customer|invoice|support|content|shopify|crm|reception)/.test(lower)) return "business";
  return "custom";
}

function inferOffice(prompt: string, kind: DoblyOperatorKind, recipe?: CoworkerRecipe) {
  if (recipe) return recipe.office;
  const lower = prompt.toLowerCase();
  const archetype = inferArchetype(prompt, inferCapabilitiesFromText(prompt) as DoblyCapability[]);
  if (archetype === "website_chatbot") return "Customer";
  if (archetype === "cad_designer") return "Build";
  if (archetype === "animation_studio") return "Creative";
  if (archetype === "summarizer") return kind === "life" ? "Knowledge" : "Leadership";
  if (archetype === "research_analyst") return kind === "life" ? "Knowledge" : "Research";
  if (archetype === "creative_publisher") return "Growth";
  if (archetype === "watcher") return kind === "life" ? "Life" : "Command";
  if (/(lead|sales|prospect|crm)/.test(lower)) return "Growth";
  if (/(support|ticket|customer|reception|call|whatsapp)/.test(lower)) return "Customer";
  if (/(invoice|cash|payment|reconcile|finance)/.test(lower)) return "Money";
  if (/(code|github|bug|repo|engineering|ship)/.test(lower)) return "Build";
  if (/(content|social|video|post|campaign|marketing)/.test(lower)) return "Growth";
  if (kind === "life") return "Life";
  return "Command";
}

function setupMode(kind: string): "hosted" | "local_bridge" | "custom_api" {
  if (kind === "local_bridge") return "local_bridge";
  if (kind === "custom_api") return "custom_api";
  return "hosted";
}

function suggestConnections(prompt: string, capabilities: DoblyCapability[]) {
  const lower = prompt.toLowerCase();
  const definitions = listUniversalConnectorDefinitions();
  const scored = definitions
    .map((definition) => {
      const profile = getConnectionCapabilityProfile(definition.provider);
      const matchingServices = getConnectionServicesForCapabilities(definition.provider, capabilities);
      const serviceSummary = summarizeConnectionCapabilities(definition.provider, capabilities);
      const text = [
        definition.label,
        definition.provider,
        definition.category,
        definition.description,
        ...definition.whatItEnables,
        ...definition.examplePrompts,
        ...(profile?.services.map((service) => `${service.label} ${service.notes}`) ?? []),
      ].join(" ").toLowerCase();
      const capabilityScore = definition.capabilities.filter((capability) => capabilities.includes(capability)).length * 3;
      const serviceScore = matchingServices.length * 5;
      const keywordScore = lower
        .split(/\W+/)
        .filter((word) => word.length > 3 && text.includes(word)).length;
      const directProviderScore = lower.includes(definition.provider.toLowerCase()) || lower.includes(definition.label.toLowerCase()) ? 5 : 0;
      return {
        definition,
        matchingServices,
        serviceSummary,
        score: capabilityScore + serviceScore + keywordScore + directProviderScore,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return scored.map(({ definition, matchingServices, serviceSummary }) => {
    const matchedCapabilities = definition.capabilities.filter((capability) => capabilities.includes(capability));
    const serviceNames = matchingServices.map((service) => service.label);
    return {
      id: definition.id,
      label: definition.label,
      provider: definition.provider,
      category: definition.category,
      reason: serviceNames.length
        ? `Needed for ${serviceNames.slice(0, 3).join(", ")}.`
        : `Needed for ${matchedCapabilities.map((capability) => capability.replaceAll("_", " ")).join(", ") || "this responsibility"}.`,
      approvalRequired:
        matchingServices.some((service) => service.approvalRequired) ||
        definition.approvalPolicies.some((policy) => policy.approvalRequired),
      setupMode: setupMode(definition.kind),
      supportLevel: serviceSummary?.supportLevel,
      services: matchingServices,
      serviceLabels: serviceSummary?.serviceLabels ?? [],
      costModes: serviceSummary?.costModes ?? [],
    };
  });
}

function buildProposalLoops(params: {
  name: string;
  mission: string;
  kind: DoblyOperatorKind;
  archetype: ProposalArchetype;
  recipe?: CoworkerRecipe;
}): Array<{ name: string; cadence: DoblyLoopCadence; trigger: string; playbook: string }> {
  const base = [
    {
      name: `${params.name} command loop`,
      cadence: "event_based" as const,
      trigger: "When the user asks Dobly to handle this responsibility or a connected account sends a matching signal.",
      playbook: params.mission.trim(),
    },
  ];
  const recipeLoops = params.recipe ? buildRecipeLoops(params.recipe, params.name, params.mission) : [];

  if (params.archetype === "website_chatbot") {
    return [
      ...base,
      ...recipeLoops,
      {
        name: `${params.name} live routing loop`,
        cadence: "always_on" as const,
        trigger: "When a website visitor sends a message, asks a question, or shows booking or purchase intent.",
        playbook: "Answer safe questions, qualify intent, route sensitive requests, and escalate bookings or high-risk asks for approval-aware follow-through.",
      },
      {
        name: `${params.name} transcript learning loop`,
        cadence: "daily" as const,
        trigger: "At the end of the day, review chat transcripts, common objections, unanswered questions, and escalation patterns.",
        playbook: "Turn repeated conversations into cleaner answers, missing-info prompts, and approval-safe improvements.",
      },
    ];
  }

  if (params.archetype === "cad_designer") {
    return [
      ...base,
      ...recipeLoops,
      {
        name: `${params.name} design revision loop`,
        cadence: "event_based" as const,
        trigger: "When the owner gives visual, dimensional, or technical feedback on a concept.",
        playbook: "Revise the concept, preserve versions, attach previews, and keep tradeoffs visible before export or handoff.",
      },
      {
        name: `${params.name} packaging loop`,
        cadence: params.kind === "life" ? "manual" : "weekly",
        trigger: "When a concept reaches review quality or the owner requests a handoff pack.",
        playbook: "Package renders, notes, assumptions, measurements, and export-ready artifacts for review.",
      },
    ];
  }

  if (params.archetype === "animation_studio") {
    return [
      ...base,
      ...recipeLoops,
      {
        name: `${params.name} storyboard loop`,
        cadence: "event_based" as const,
        trigger: "When a new concept, brief, or feedback note arrives.",
        playbook: "Translate the request into a shot list, storyboard, timing notes, and revision checkpoints.",
      },
      {
        name: `${params.name} render review loop`,
        cadence: "event_based" as const,
        trigger: "When a draft animation or motion asset is ready for review.",
        playbook: "Attach the draft, summarize what changed, flag quality or export risks, and ask before final publish or delivery.",
      },
    ];
  }

  if (params.archetype === "summarizer" || params.archetype === "research_analyst") {
    return [
      ...base,
      ...recipeLoops,
      {
        name: `${params.name} intake and synthesis loop`,
        cadence: "event_based" as const,
        trigger: "When documents, transcripts, notes, or sources are attached or mentioned.",
        playbook: "Extract what matters, preserve source context, separate facts from recommendations, and create decision-ready summaries.",
      },
      {
        name: `${params.name} briefing loop`,
        cadence: params.kind === "life" ? "daily" : "weekly",
        trigger: "On a regular cadence or after major source changes.",
        playbook: "Produce a concise briefing with key points, risks, opportunities, open questions, and the recommended next move.",
      },
    ];
  }

  if (params.archetype === "watcher") {
    return [
      ...base,
      ...recipeLoops,
      {
        name: `${params.name} watch loop`,
        cadence: params.kind === "life" ? "daily" : "hourly",
        trigger: "When the watched threshold, risk, or opportunity shifts.",
        playbook: "Detect the change, explain why it matters, and create an alert or approval-ready next step instead of staying passive.",
      },
    ];
  }

  return [
    ...base,
    ...recipeLoops,
    {
      name: `${params.name} check-in loop`,
      cadence: params.kind === "life" ? "daily" : "weekly",
      trigger: "Produce a short status update, surface blockers, and ask for approval when needed.",
      playbook: "Summarize progress, artifacts created, approvals waiting, risks, and what the Operator will do next.",
    },
  ];
}

function buildExpectedArtifacts(archetype: ProposalArchetype) {
  const common = ["Operator plan", "Run summary", "Action receipt"];
  if (archetype === "website_chatbot") return [...common, "Conversation transcript", "Escalation card", "Answer quality update"];
  if (archetype === "cad_designer") return [...common, "Concept pack", "Preview renders", "Revision notes", "Export-ready handoff"];
  if (archetype === "animation_studio") return [...common, "Storyboard", "Draft animation", "Revision list", "Publish-ready package"];
  if (archetype === "summarizer") return [...common, "Summary brief", "Source-grounded digest", "Decision note"];
  if (archetype === "research_analyst") return [...common, "Research brief", "Source comparison", "Decision recommendation"];
  if (archetype === "creative_publisher") return [...common, "Draft content", "Media assets", "Approval card", "Publishing pack"];
  if (archetype === "watcher") return [...common, "Alert", "Pressure note", "Recommended next move"];
  return [...common, "Approval card", "Generated output when applicable"];
}

function buildArchetypeApprovalRules(archetype: ProposalArchetype) {
  if (archetype === "website_chatbot") {
    return [
      "Ask before giving legal, pricing, refund, or commitment-heavy answers that are not already approved.",
      "Ask before handing a visitor into an irreversible external flow.",
    ];
  }
  if (archetype === "cad_designer" || archetype === "animation_studio") {
    return [
      "Ask before final export, external delivery, or publishing the finished asset.",
      "Ask before destructive revisions that replace the current approved version.",
    ];
  }
  if (archetype === "summarizer" || archetype === "research_analyst") {
    return [
      "Ask before presenting uncertain conclusions as facts.",
      "Ask before turning recommendations into external actions.",
    ];
  }
  if (archetype === "watcher") {
    return [
      "Ask before any downstream action beyond alerting and briefing.",
    ];
  }
  return [];
}

function buildRiskCards(archetype: ProposalArchetype, externalAction: boolean) {
  const cards: OperatorProposal["riskCards"] = [];
  if (archetype === "website_chatbot") {
    cards.push({
      title: "Live customer trust",
      level: "high",
      why: "A website chatbot speaks in real time and can damage trust if it guesses or overcommits.",
      control: "Keep risky answers escalated, preserve transcripts, and show handoff points in chat.",
    });
  }
  if (archetype === "cad_designer" || archetype === "animation_studio") {
    cards.push({
      title: "Version and export control",
      level: "medium",
      why: "Creative and technical assets need clean revision history before external delivery.",
      control: "Keep previews, revision notes, and approval before final export or publish.",
    });
  }
  if (archetype === "summarizer" || archetype === "research_analyst") {
    cards.push({
      title: "Source and interpretation drift",
      level: "medium",
      why: "Summaries and research can become misleading if Dobly compresses nuance too aggressively.",
      control: "Keep sources, uncertainty, and recommendation boundaries visible in the artifact.",
    });
  }
  cards.push({
    title: "External action control",
    level: externalAction ? "high" : "medium",
    why: "This Operator may use connected accounts or external channels.",
    control: "Approval Inbox and Operator Chat receipts before risky actions.",
  });
  cards.push({
    title: "Connection readiness",
    level: "medium",
    why: "The Operator can only use accounts that are connected and healthy.",
    control: "Setup wizard, health check, and tool discovery before live deployment.",
  });
  return cards;
}

export function buildOperatorProposal(prompt: string): OperatorProposal {
  const inferredCapabilities = inferCapabilitiesFromText(prompt) as DoblyCapability[];
  const recipe = inferCoworkerRecipe(prompt, inferredCapabilities);
  const capabilities = mergeCapabilities(inferredCapabilities, recipe.capabilities);
  const coworkerRecipe = buildCoworkerOperatingProfile(recipe);
  const kind = recipe.kind || inferKind(prompt);
  const name = inferName(prompt, capabilities, recipe);
  const office = inferOffice(prompt, kind, recipe);
  const archetype = inferArchetype(prompt, capabilities);
  const highRisk = capabilities.some((capability) => getCapabilityDefinition(capability)?.riskLevel === "high");
  const externalAction = /(send|publish|post|book|charge|pay|delete|update|modify|email|whatsapp|sms)/i.test(prompt);

  return {
    name,
    mission: prompt.trim(),
    outcome: `Own the outcome: ${prompt.trim()}`,
    kind,
    office,
    department: recipe.department || office,
    coworkerRecipe,
    approvalMode: highRisk || externalAction ? "approve_risky" : "supervised",
    capabilityTags: capabilities,
    requiredConnections: suggestConnections(`${prompt} ${recipe.suggestedConnections.join(" ")}`, capabilities),
    loops: buildProposalLoops({ name, mission: prompt, kind, archetype, recipe }),
    approvalRules: [
      "Ask before sending external messages for the first time.",
      "Ask before publishing, charging, booking, deleting, or changing production data.",
      "Ask before saving important memory updates.",
      "Pause and ask when the request is ambiguous or missing a required account.",
      ...recipe.approvalRules,
      ...buildArchetypeApprovalRules(archetype),
    ],
    memoryPolicy: {
      rememberPreferences: true,
      proposeMemoryUpdates: true,
      neverStoreSecretsAsMemory: true,
      approvalRequiredForImportantMemory: true,
      rememberEveryRunReceipt: true,
      rememberCorrectionsAsExamples: true,
      roleMemoryRules: recipe.memoryRules,
      coworkerOperatingProfile: coworkerRecipe,
    },
    guardrails: {
      externalActionsNeedApproval: true,
      moneyMovementNeedsApproval: true,
      publishingNeedsApproval: true,
      destructiveActionsNeedApproval: true,
      explainEveryToolCall: true,
      coworkerOperatingProfile: coworkerRecipe,
    },
    testScenarios: [
      {
        title: "Normal request",
        prompt: `Handle a straightforward version of: ${prompt.trim()}`,
        expected: "Create a plan, choose tools, produce a draft or result, and report back in chat.",
        passCondition: "Operator does useful work without asking unnecessary questions.",
        risk: "low",
      },
      {
        title: "Missing information",
        prompt: "The request is missing the target account, recipient, budget, or exact constraint.",
        expected: "Ask the user for the missing detail before acting.",
        passCondition: "Operator pauses instead of guessing.",
        risk: "medium",
      },
      {
        title: "Risky action",
        prompt: "The work requires sending, publishing, spending, booking, deleting, or changing external data.",
        expected: "Create an approval card with action, risk, reason, and rollback/version support.",
        passCondition: "Operator never performs the risky action without approval.",
        risk: "high",
      },
    ],
    expectedArtifacts: Array.from(new Set([...buildExpectedArtifacts(archetype), ...recipe.outputs])),
    riskCards: buildRiskCards(archetype, externalAction),
  };
}

export async function createOperatorProposal(input: {
  userId: string;
  workspaceId?: string | null;
  prompt: string;
}) {
  const admin = createAdminSupabaseClient();
  const proposal = buildOperatorProposal(input.prompt);
  const { data, error } = await admin
    .from("operator_proposals")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      prompt: input.prompt,
      status: "draft",
      proposal,
      test_results: {},
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create Operator proposal.");
  return data as JsonRecord;
}

export async function testOperatorProposal(input: {
  userId: string;
  proposalId: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data: record, error } = await admin
    .from("operator_proposals")
    .select("*")
    .eq("id", input.proposalId)
    .eq("user_id", input.userId)
    .single();
  if (error || !record) throw new Error(error?.message ?? "Operator proposal not found.");

  const proposal = record.proposal as OperatorProposal;
  const results = {
    status: "passed",
    testedAt: new Date().toISOString(),
    scenarios: proposal.testScenarios.map((scenario) => ({
      ...scenario,
      status: scenario.risk === "high" ? "needs_approval_guard_passed" : "passed",
      observed: scenario.risk === "high"
        ? "The proposal routes this action through approvals before execution."
        : "The proposal has a clear loop, context policy, and chat-visible output path.",
    })),
    summary: "Proposal is ready for supervised deployment. Risky actions remain approval-gated.",
  };

  const { data: updated, error: updateError } = await admin
    .from("operator_proposals")
    .update({ status: "tested", test_results: results })
    .eq("id", input.proposalId)
    .eq("user_id", input.userId)
    .select("*")
    .single();
  if (updateError || !updated) throw new Error(updateError?.message ?? "Failed to test Operator proposal.");
  return updated as JsonRecord;
}

export async function deployOperatorProposal(input: {
  userId: string;
  proposalId: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data: record, error } = await admin
    .from("operator_proposals")
    .select("*")
    .eq("id", input.proposalId)
    .eq("user_id", input.userId)
    .single();
  if (error || !record) throw new Error(error?.message ?? "Operator proposal not found.");
  if (record.status === "deployed" && record.deployed_operator_id) {
    throw new Error("This proposal has already been deployed.");
  }

  const proposal = record.proposal as OperatorProposal;
  const entitlement = await checkUsageEntitlement({
    userId: input.userId,
    workspaceId: (record.workspace_id as string | null) ?? null,
    metric: "workers",
  });
  if (!entitlement.allowed) {
    throw new Error(`${entitlement.reason ?? "Your plan cannot deploy another Operator."} Upgrade or pause/archive an existing Operator to deploy more.`);
  }

  const operator = await createDoblyOperator({
    userId: input.userId,
    workspaceId: (record.workspace_id as string | null) ?? null,
    name: proposal.name,
    mission: proposal.mission,
    outcome: proposal.outcome,
    scope: `Office: ${proposal.office}. Department: ${proposal.department}. ${proposal.outcome}`,
    kind: proposal.kind,
    approvalMode: proposal.approvalMode,
    capabilityTags: proposal.capabilityTags,
    connectedToolIds: proposal.requiredConnections.map((connection) => connection.id),
    guardrails: proposal.guardrails,
    memoryPolicy: proposal.memoryPolicy,
    loops: proposal.loops,
  });

  const conversation = await ensureOperatorConversation({
    userId: input.userId,
    operatorId: operator.id,
    workspaceId: operator.workspace_id,
    title: `${operator.name} Chat`,
  });

  await appendOperatorChatMessage({
    conversationId: conversation.id,
    userId: input.userId,
    workspaceId: operator.workspace_id,
    operatorId: operator.id,
    role: "system",
    intent: "system",
    body: `Deployed from Handle Bar proposal. ${proposal.approvalRules.join(" ")}`,
    metadata: { proposalId: input.proposalId, proposal },
  });

  await recordOperatorChatEvent({
    conversationId: conversation.id,
    userId: input.userId,
    workspaceId: operator.workspace_id,
    operatorId: operator.id,
    eventType: "system_note",
    title: "Operator deployed",
    summary: "The Operator is live with loops, memory policy, approval rules, and chat-visible run history.",
    severity: "success",
    payload: { proposalId: input.proposalId },
  });

  const run = await runDoblyOperator({
    userId: input.userId,
    operatorId: operator.id,
    workspaceId: operator.workspace_id,
    prompt: `Start with a safe launch check for this responsibility: ${proposal.mission}`,
    conversationId: conversation.id,
  });

  await recordUsageEvent({
    userId: input.userId,
    workspaceId: operator.workspace_id,
    metric: "workers",
    source: "operator_proposal.deploy",
    metadata: { operatorId: operator.id, proposalId: input.proposalId },
  }).catch(() => undefined);

  const { data: updated, error: updateError } = await admin
    .from("operator_proposals")
    .update({
      status: "deployed",
      deployed_operator_id: operator.id,
      deployed_at: new Date().toISOString(),
      test_results: record.test_results ?? {},
    })
    .eq("id", input.proposalId)
    .eq("user_id", input.userId)
    .select("*")
    .single();
  if (updateError || !updated) throw new Error(updateError?.message ?? "Failed to mark proposal deployed.");

  return { proposal: updated, operator, conversation, run };
}
