import { randomBytes } from "crypto";

import type {
  AgentConfig,
  AgentDepartment,
  WorkflowBlueprint,
  WorkflowOperator,
} from "@/types";

type DepartmentPreset = {
  profile: AgentConfig["profile"];
  systemPrompt: string;
  conversationTone: AgentConfig["conversationTone"];
  behaviorRules: string[];
  knowledgeBase: string;
  conversationFlow: AgentConfig["conversationFlow"];
  callActions: AgentConfig["callActions"];
  escalation: AgentConfig["escalation"];
  monitoring: AgentConfig["monitoring"];
};

const DEFAULT_BUSINESS_HOURS = {
  monday: { start: "09:00", end: "17:00" },
  tuesday: { start: "09:00", end: "17:00" },
  wednesday: { start: "09:00", end: "17:00" },
  thursday: { start: "09:00", end: "17:00" },
  friday: { start: "09:00", end: "17:00" },
  saturday: null,
  sunday: null,
} as const;

function randomWebhookToken(length = 24) {
  return randomBytes(length).toString("base64url");
}

export function inferAgentDepartment(blueprint?: WorkflowBlueprint): AgentDepartment {
  const corpus = `${blueprint?.name ?? ""} ${blueprint?.description ?? ""} ${blueprint?.trigger ?? ""}`.toLowerCase();

  if (/invoice|payment|collections|billing|accounts receivable|cash/.test(corpus)) {
    return "finance_desk";
  }

  if (/lead|sales|pipeline|qualif|demo|booking|appointment/.test(corpus)) {
    return "sales_desk";
  }

  if (/support|ticket|helpdesk|issue|refund|complaint|triage|customer service/.test(corpus)) {
    return "support_desk";
  }

  if (/reception|front desk|frontdesk|call|phone|switchboard|inquiry|inbound/.test(corpus)) {
    return "front_desk";
  }

  return "custom";
}

function buildPreset(
  department: AgentDepartment,
  blueprint?: WorkflowBlueprint
): DepartmentPreset {
  const businessName = blueprint?.name ?? "your business";
  const role = {
    front_desk: "Front Desk Coordinator",
    support_desk: "Support Desk Coordinator",
    sales_desk: "Lead Intake Coordinator",
    finance_desk: "Accounts Follow-Up Coordinator",
    custom: blueprint?.name ?? "Dobly Desk",
  }[department];

  const description = {
    front_desk:
      "Answer inbound calls, understand the reason for the call, route or book the next step, and leave every caller feeling looked after.",
    support_desk:
      "Triage support conversations, solve common issues, collect missing details, and escalate complex or urgent cases cleanly.",
    sales_desk:
      "Qualify new inquiries, capture intent, book qualified follow-ups, and keep promising leads from slipping away.",
    finance_desk:
      "Handle payment-status conversations, explain balances clearly, collect context, and route exceptions without sounding aggressive.",
    custom:
      blueprint?.description ??
      "Handle the assigned role clearly, safely, and with enough context to keep the work moving.",
  }[department];

  const firstMessage = {
    front_desk:
      "Thanks for calling. You’ve reached the front desk. How can I help you today?",
    support_desk:
      "Thanks for calling support. Tell me what’s going wrong and I’ll help you sort it out.",
    sales_desk:
      "Thanks for reaching out. I can help you find the right next step. What are you hoping to get done?",
    finance_desk:
      "Thanks for calling. I can help with invoice and payment questions. What would you like me to look into?",
    custom:
      "Thanks for reaching out. Tell me what you need and I’ll take it from there.",
  }[department];

  const successSignal = {
    front_desk: "The caller was greeted well, routed correctly, and the next step was captured.",
    support_desk:
      "The issue was clarified, handled if possible, and escalated with context if not.",
    sales_desk:
      "The lead was qualified, the right follow-up happened, and strong opportunities were not lost.",
    finance_desk:
      "The caller understood the payment situation, the record stayed accurate, and risky cases were escalated.",
    custom: "The work moved forward safely and the next step was clear.",
  }[department];

  const sharedFlow: AgentConfig["conversationFlow"] = [
    {
      id: "greeting",
      type: "greeting",
      text: firstMessage,
      nextNode: "qualify",
    },
    {
      id: "qualify",
      type: "question",
      text: "Ask the shortest next question needed to understand the request and move it forward.",
      nextNode: "decide",
    },
    {
      id: "decide",
      type: "decision",
      text: "If the request is clear and in scope, continue. If not, escalate with context.",
      branches: [
        { condition: "in_scope_and_clear", targetNodeId: "action" },
        { condition: "needs_human_or_more_context", targetNodeId: "handoff" },
      ],
    },
    {
      id: "action",
      type: "action",
      text: "Complete the allowed next step, then confirm what will happen next.",
      nextNode: "end",
    },
    {
      id: "handoff",
      type: "handoff",
      text: "Create a structured handoff with caller intent, urgency, and relevant details.",
      nextNode: "end",
    },
    {
      id: "end",
      type: "end",
      text: "Close the conversation clearly and politely.",
    },
  ];

  const knowledgeBase = [
    blueprint?.description ?? "",
    ...(blueprint?.setup_steps ?? []),
  ]
    .filter(Boolean)
    .join("\n");

  const presetMap: Record<AgentDepartment, DepartmentPreset> = {
    front_desk: {
      profile: {
        department,
        role,
        industry: "",
        businessName,
        description,
        firstMessage,
        successSignal,
      },
      systemPrompt: `You are the front desk for ${businessName}. Welcome callers, understand why they are calling, collect missing details, book or route the next step, and escalate when needed. Never guess policies or availability.`,
      conversationTone: "friendly",
      behaviorRules: [
        "Lead the call calmly and keep the caller oriented.",
        "Repeat back important details before booking, transferring, or promising a next step.",
        "Escalate immediately for emergencies, legal issues, angry callers, or unclear edge cases.",
      ],
      knowledgeBase,
      conversationFlow: sharedFlow,
      callActions: {
        beforeCall: {
          fetchContext: "Load business profile, opening hours, FAQs, and recent caller notes if available.",
          announceCallerName: true,
          playHoldingMessage: false,
        },
        duringCall: {
          allowTransfers: true,
          pauseForConfirmation: ["appointment booking", "handoff", "callback request"],
        },
        afterCall: {
          recordTranscript: true,
          sendEmail: [],
          webhookUrl: "",
          scheduleFollowup: true,
          followupDelayMinutes: 30,
        },
      },
      escalation: {
        triggers: [
          { type: "confidence_below", threshold: 0.65 },
          { type: "keyword_match", keywords: ["manager", "urgent", "complaint", "emergency"] },
        ],
        handoffMessage: "I’m going to connect you with the right person and pass along the details.",
        maxWaitTime: 10,
      },
      monitoring: {
        recordCalls: true,
        transcriptSentiment: true,
        keywords: ["urgent", "manager", "complaint", "booking"],
        reportingEmail: [],
      },
    },
    support_desk: {
      profile: {
        department,
        role,
        industry: "",
        businessName,
        description,
        firstMessage,
        successSignal,
      },
      systemPrompt: `You are the support desk for ${businessName}. Clarify the issue, gather the exact facts, solve what is in policy, and escalate technical or high-risk cases with clean notes.`,
      conversationTone: "empathetic",
      behaviorRules: [
        "Start by confirming what is broken before offering next steps.",
        "Do not invent fixes, refunds, or policy exceptions.",
        "Summarize the issue clearly before ending or escalating.",
      ],
      knowledgeBase,
      conversationFlow: sharedFlow,
      callActions: {
        beforeCall: {
          fetchContext: "Load customer history, recent tickets, and known incidents if available.",
          announceCallerName: true,
          playHoldingMessage: false,
        },
        duringCall: {
          allowTransfers: true,
          pauseForConfirmation: ["refund", "replacement", "ticket escalation"],
        },
        afterCall: {
          recordTranscript: true,
          sendEmail: [],
          webhookUrl: "",
          scheduleFollowup: true,
          followupDelayMinutes: 60,
        },
      },
      escalation: {
        triggers: [
          { type: "confidence_below", threshold: 0.7 },
          { type: "repeated_misunderstanding", count: 2 },
          { type: "keyword_match", keywords: ["refund", "legal", "complaint", "cancel"] },
        ],
        handoffMessage:
          "I’m escalating this to a specialist and sending along everything you’ve already told me.",
        maxWaitTime: 15,
      },
      monitoring: {
        recordCalls: true,
        transcriptSentiment: true,
        keywords: ["refund", "cancel", "bug", "outage"],
        reportingEmail: [],
      },
    },
    sales_desk: {
      profile: {
        department,
        role,
        industry: "",
        businessName,
        description,
        firstMessage,
        successSignal,
      },
      systemPrompt: `You are the lead intake desk for ${businessName}. Understand the prospect, qualify fit, capture urgency, and guide strong opportunities toward the next step without sounding pushy.`,
      conversationTone: "professional",
      behaviorRules: [
        "Qualify before pitching.",
        "Capture budget, timing, and intent when the caller is willing to share them.",
        "Never promise pricing, availability, or outcomes that are not approved.",
      ],
      knowledgeBase,
      conversationFlow: sharedFlow,
      callActions: {
        beforeCall: {
          fetchContext: "Load business services, ideal customer profile, and recent lead notes if available.",
          announceCallerName: true,
          playHoldingMessage: false,
        },
        duringCall: {
          allowTransfers: true,
          pauseForConfirmation: ["meeting booking", "demo request", "quote follow-up"],
        },
        afterCall: {
          recordTranscript: true,
          sendEmail: [],
          webhookUrl: "",
          scheduleFollowup: true,
          followupDelayMinutes: 20,
        },
      },
      escalation: {
        triggers: [
          { type: "confidence_below", threshold: 0.65 },
          { type: "keyword_match", keywords: ["decision maker", "pricing", "contract", "demo"] },
        ],
        handoffMessage:
          "I’m getting a human teammate involved so they can continue with the right context.",
        maxWaitTime: 10,
      },
      monitoring: {
        recordCalls: true,
        transcriptSentiment: true,
        keywords: ["pricing", "demo", "book", "proposal"],
        reportingEmail: [],
      },
    },
    finance_desk: {
      profile: {
        department,
        role,
        industry: "",
        businessName,
        description,
        firstMessage,
        successSignal,
      },
      systemPrompt: `You are the finance follow-up desk for ${businessName}. Help callers understand balances, payment status, and next steps while staying calm, accurate, and policy-safe.`,
      conversationTone: "professional",
      behaviorRules: [
        "State payment facts clearly and avoid sounding threatening.",
        "Confirm invoice, account, or customer identifiers before discussing balances.",
        "Escalate disputed charges, fraud concerns, or policy exceptions immediately.",
      ],
      knowledgeBase,
      conversationFlow: sharedFlow,
      callActions: {
        beforeCall: {
          fetchContext: "Load invoice status, reminder history, and payment notes if available.",
          announceCallerName: true,
          playHoldingMessage: false,
        },
        duringCall: {
          allowTransfers: true,
          pauseForConfirmation: ["payment plan", "write-off request", "manual exception"],
        },
        afterCall: {
          recordTranscript: true,
          sendEmail: [],
          webhookUrl: "",
          scheduleFollowup: true,
          followupDelayMinutes: 120,
        },
      },
      escalation: {
        triggers: [
          { type: "confidence_below", threshold: 0.75 },
          { type: "keyword_match", keywords: ["fraud", "dispute", "chargeback", "lawyer"] },
        ],
        handoffMessage: "I’m passing this to a finance specialist with the full call context.",
        maxWaitTime: 20,
      },
      monitoring: {
        recordCalls: true,
        transcriptSentiment: true,
        keywords: ["dispute", "chargeback", "overdue", "invoice"],
        reportingEmail: [],
      },
    },
    custom: {
      profile: {
        department,
        role,
        industry: "",
        businessName,
        description,
        firstMessage,
        successSignal,
      },
      systemPrompt: `You are ${role} for ${businessName}. Stay within the approved role, collect missing context, move the work forward, and escalate when a human is needed.`,
      conversationTone: "professional",
      behaviorRules: [
        "Be clear about what you can and cannot do.",
        "Collect enough context before taking the next step.",
        "Escalate instead of guessing.",
      ],
      knowledgeBase,
      conversationFlow: sharedFlow,
      callActions: {
        beforeCall: {
          fetchContext: "Load the relevant business context before speaking when possible.",
          announceCallerName: true,
          playHoldingMessage: false,
        },
        duringCall: {
          allowTransfers: true,
          pauseForConfirmation: ["booking", "handoff", "account change"],
        },
        afterCall: {
          recordTranscript: true,
          sendEmail: [],
          webhookUrl: "",
          scheduleFollowup: false,
          followupDelayMinutes: 30,
        },
      },
      escalation: {
        triggers: [{ type: "confidence_below", threshold: 0.65 }],
        handoffMessage: "I’m passing this to a human teammate with the important context.",
        maxWaitTime: 15,
      },
      monitoring: {
        recordCalls: true,
        transcriptSentiment: true,
        keywords: ["urgent", "manager", "human"],
        reportingEmail: [],
      },
    },
  };

  return presetMap[department];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined) return base;
  if (Array.isArray(base) || Array.isArray(patch)) {
    return (patch ?? base) as T;
  }
  if (isPlainObject(base) && isPlainObject(patch)) {
    const merged: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(patch)) {
      const current = merged[key];
      merged[key] =
        value === undefined
          ? current
          : current !== undefined
            ? deepMerge(current, value)
            : value;
    }
    return merged as T;
  }
  return patch as T;
}

export function buildVoiceWebhookPaths(workflowId: string, token: string) {
  return {
    inboundWebhookPath: `/api/voice/reception/${workflowId}?token=${token}`,
    statusWebhookPath: `/api/voice/reception/${workflowId}/status?token=${token}`,
  };
}

export function createDefaultAgentConfig(
  blueprint?: WorkflowBlueprint,
  existing?: Partial<AgentConfig>,
  workflowId?: string
): AgentConfig {
  const department = existing?.profile?.department ?? inferAgentDepartment(blueprint);
  const preset = buildPreset(department, blueprint);
  const apiSecret = existing?.deployment?.apiConfig?.webhookSecret || randomWebhookToken();
  const voiceProvider = existing?.voiceProvider ?? "google";
  const voiceId =
    existing?.voiceId ??
    (voiceProvider === "piper" ? "en_US-amy-medium" : "en-US-Neural2-F");

  const base: AgentConfig = {
    profile: preset.profile,
    systemPrompt: preset.systemPrompt,
    conversationTone: preset.conversationTone,
    behaviorRules: preset.behaviorRules,
    maxResponseLength: 480,
    knowledgeBase: preset.knowledgeBase,
    voiceProvider,
    voiceId,
    language: existing?.language ?? "en-US",
    accent: existing?.accent ?? "standard",
    speechRate: existing?.speechRate ?? 1,
    pitch: existing?.pitch ?? 0,
    conversationFlow: preset.conversationFlow,
    maxTurnCount: 12,
    silenceTimeoutSeconds: 18,
    callActions: preset.callActions,
    calendarIntegration: {
      provider: "google",
      enabled: false,
      checkAvailability: true,
      autoBook: false,
      calendarIds: [],
      bufferMinutes: 15,
      timezone: "Africa/Nairobi",
      businessHours: {
        ...DEFAULT_BUSINESS_HOURS,
      },
    },
    escalation: preset.escalation,
    integrations: {
      dataConnections: [],
    },
    deployment: {
      channels: department === "front_desk" ? ["voice", "api"] : ["web", "api"],
      voiceChannelConfig: {
        numberStrategy: "dobly_managed",
        provider: "kenya_local",
        callRecordingEnabled: true,
        transcriptionEnabled: true,
      },
      apiConfig: {
        webhookSecret: apiSecret,
        rateLimit: 60,
      },
    },
    monitoring: preset.monitoring,
  };

  const merged = deepMerge(base, existing ?? {});
  const secret = merged.deployment.apiConfig?.webhookSecret || apiSecret;
  const paths = buildVoiceWebhookPaths(workflowId || "workflow", secret);

  if (merged.deployment.voiceChannelConfig) {
    merged.deployment.voiceChannelConfig = {
      ...merged.deployment.voiceChannelConfig,
      ...paths,
    };
  }

  return merged;
}

export function mergeAgentConfig(base: AgentConfig, patch?: unknown): AgentConfig {
  return deepMerge(base, patch ?? {});
}

export function buildOperatorDefaults(
  blueprint: WorkflowBlueprint,
  agentConfig: AgentConfig
): WorkflowOperator {
  return {
    enabled: true,
    mode: "bounded_operator",
    role: agentConfig.profile.role || blueprint.name,
    objective: blueprint.description,
    channel: blueprint.integrations?.[0] ?? "web",
    autonomy: "guarded",
    approvalRiskThreshold: "high",
    allowedDomains: (blueprint.integrations ?? []).slice(0, 6),
    escalationMessage:
      "Escalate to the owner when the request is risky, unclear, or outside the approved role.",
    agentConfig,
  };
}
