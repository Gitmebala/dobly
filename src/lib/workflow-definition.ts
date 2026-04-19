import type {
  WorkflowActionStep,
  WorkflowActionType,
  WorkflowBlueprint,
  WorkflowDefinition,
  WorkflowOperator,
  WorkflowTrigger,
} from "@/types";
import { getExecutorForStep } from "@/lib/connectors/registry";
import { selectSkillKeyForBlueprintStep } from "@/lib/skills/select";
import { getRequiredProviderIdsForWorkflow } from "@/lib/connection-requirements";

const SUPPORTED_INTEGRATIONS = new Map<string, string>([
  // Communication & Email
  ["google", "Google"],
  ["gmail", "Google"],
  ["google sheets", "Google"],
  ["slack", "Slack"],
  ["whatsapp", "WhatsApp"],
  ["twilio", "Twilio"],
  ["email", "Email"],
  ["resend", "Resend"],
  ["intercom", "Intercom"],

  // E-Commerce
  ["shopify", "Shopify"],
  ["stripe", "Stripe"],
  ["square", "Square"],
  ["m-pesa", "M-PESA"],
  ["mpesa", "M-PESA"],

  // CRM & Sales
  ["hubspot", "HubSpot"],
  ["salesforce", "Salesforce"],
  ["pipedrive", "Pipedrive"],
  ["zoho", "Zoho CRM"],

  // Support & Ticketing
  ["zendesk", "Zendesk"],
  ["freshdesk", "Freshdesk"],

  // Documents & Productivity
  ["notion", "Notion"],
  ["airtable", "Airtable"],
  ["docusign", "DocuSign"],
  ["typeform", "Typeform"],

  // Operations & Collaboration
  ["calendly", "Calendly"],
  ["trello", "Trello"],
  ["asana", "Asana"],
  ["monday", "monday.com"],
  ["clickup", "ClickUp"],

  // Marketing
  ["mailchimp", "Mailchimp"],
  ["klaviyo", "Klaviyo"],
  ["linkedin", "LinkedIn"],

  // Finance
  ["quickbooks", "QuickBooks"],
  ["xero", "Xero"],
  ["wave", "Wave"],

  // Video & Communication
  ["zoom", "Zoom"],

  // Utilities
  ["webhook", "Webhook / API"],
  ["api", "Webhook / API"],
  ["http", "Webhook / API"],
  ["file", "File"],
  ["formatter", "Formatter"],
  ["dobly orchestrator", "Dobly Orchestrator"],
]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function randomWebhookToken(length = 18) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const source =
    typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
      ? crypto.getRandomValues(new Uint32Array(length))
      : Array.from({ length }, () => Math.floor(Math.random() * 0xffffffff));

  return Array.from(source, (value) => alphabet[value % alphabet.length]).join("");
}

function inferTrigger(blueprint: WorkflowBlueprint): WorkflowTrigger {
  const lower = `${blueprint.trigger} ${blueprint.description}`.toLowerCase();

  if (lower.includes("daily") || lower.includes("every morning") || lower.includes("every week")) {
    return {
      type: "schedule",
      label: blueprint.trigger,
      schedule: "0 8 * * *",
      config: { timezone: "Africa/Nairobi" },
    };
  }

  if (lower.includes("webhook") || lower.includes("form") || lower.includes("payment")) {
    const base = slugify(blueprint.name) || "dobly";
    const token = randomWebhookToken(12);
    return {
      type: "webhook",
      label: blueprint.trigger,
      webhook_path: `${base}-${token}`,
      config: {
        secret: randomWebhookToken(24),
      },
    };
  }

  return {
    type: "manual",
    label: blueprint.trigger,
    config: {},
  };
}

function inferOperator(blueprint: WorkflowBlueprint): WorkflowOperator | undefined {
  const corpus = `${blueprint.name} ${blueprint.description} ${blueprint.trigger}`.toLowerCase();
  const looksOperator =
    /agent|operator|assistant|reception|respon|reply|inbox|triage|order|support|lead/.test(corpus);

  if (!looksOperator) return undefined;

  const primaryChannel = blueprint.integrations?.[0] ?? "web";
  const defaultRules = [
    "Answer only within the approved business role.",
    "Escalate instead of guessing when confidence is low.",
    "Confirm important details before taking action.",
  ];

  return {
    enabled: true,
    mode: "bounded_operator",
    role: blueprint.name,
    objective: blueprint.description,
    channel: primaryChannel,
    autonomy: "guarded",
    approvalRiskThreshold: "high",
    allowedDomains: (blueprint.integrations ?? []).slice(0, 6),
    escalationMessage: "Escalate to the owner when the request is risky, unclear, or outside the approved role.",
    agentConfig: {
      systemPrompt: `${blueprint.name}. ${blueprint.description} Stay within policy, collect missing context, and escalate when needed.`,
      conversationTone: /support|care|success|concierge|patient/.test(corpus) ? "empathetic" : "professional",
      behaviorRules: defaultRules,
      maxResponseLength: 480,
      knowledgeBase: blueprint.setup_steps.join("\n"),
      voiceProvider: "google",
      voiceId: "en-US-Neural2-F",
      language: "en",
      speechRate: 1,
      pitch: 0,
      conversationFlow: [
        {
          id: "greeting",
          type: "greeting",
          text: `Introduce yourself as ${blueprint.name} and clarify the request.`,
          nextNode: "qualify",
        },
        {
          id: "qualify",
          type: "question",
          text: "Ask the next best question needed to complete the task safely.",
          nextNode: "decide",
        },
        {
          id: "decide",
          type: "decision",
          text: "If the request is clear and allowed, proceed. Otherwise escalate.",
          branches: [
            { condition: "clear_and_allowed", targetNodeId: "action" },
            { condition: "unclear_or_risky", targetNodeId: "handoff" },
          ],
        },
        {
          id: "action",
          type: "action",
          text: "Complete the approved action and confirm the result.",
          nextNode: "end",
        },
        {
          id: "handoff",
          type: "handoff",
          text: "Create a structured handoff for a human operator.",
          nextNode: "end",
        },
        {
          id: "end",
          type: "end",
          text: "Close clearly and politely.",
        },
      ],
      maxTurnCount: 12,
      silenceTimeoutSeconds: 18,
      callActions: {
        beforeCall: {
          fetchContext: "Load business context, recent activity, and known customer details.",
          announceCallerName: true,
          playHoldingMessage: false,
        },
        duringCall: {
          allowTransfers: true,
          pauseForConfirmation: ["booking", "payment", "handoff"],
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
        handoffMessage: "Handing this to a human teammate with full context.",
        maxWaitTime: 10,
      },
      integrations: {
        dataConnections: [],
      },
      deployment: {
        channels: primaryChannel === "whatsapp" ? ["whatsapp", "web"] : ["web", "api"],
        apiConfig: {
          webhookSecret: randomWebhookToken(24),
          rateLimit: 60,
        },
      },
      monitoring: {
        recordCalls: true,
        transcriptSentiment: true,
        keywords: ["urgent", "refund", "cancel", "speak to human"],
        reportingEmail: [],
      },
    },
  };
}

function guessActionType(step: WorkflowBlueprint["steps"][number]): WorkflowActionType {
  const lower = `${step.tool} ${step.action} ${step.description}`.toLowerCase();

  if (lower.includes("email") || lower.includes("gmail") || lower.includes("resend")) {
    return "send_email";
  }
  if (
    lower.includes("webhook") ||
    lower.includes("post") ||
    lower.includes("slack") ||
    lower.includes("discord") ||
    lower.includes("api") ||
    lower.includes("http")
  ) {
    return "webhook_request";
  }
  if (lower.includes("wait") || lower.includes("delay") || lower.includes("remind")) {
    return "delay";
  }
  if (lower.includes("if") || lower.includes("condition")) {
    return "branch";
  }
  return "compose_text";
}

function stepConfig(actionType: WorkflowActionType, step: WorkflowBlueprint["steps"][number]) {
  switch (actionType) {
    case "send_email":
      return {
        to: "{{trigger.email}}",
        subject: step.name,
        text: step.description,
      };
    case "webhook_request":
      return {
        url: "",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
          workflow: "{{workflow.title}}",
          step: step.name,
          trigger: "{{trigger}}",
        },
      };
    case "delay":
      return {
        amount: 5,
        unit: "minutes",
      };
    case "branch":
      return {
        left: "{{trigger.status}}",
        operator: "equals",
        right: "paid",
      };
    default:
      return {
        template: step.description,
      };
  }
}

function normalizeLegacyActionType(raw: unknown): WorkflowActionType {
  const actionType = String(raw ?? "");
  if (actionType === "browser_agent" || actionType === "local_agent") {
    return "webhook_request";
  }
  if (actionType === "compose_text" || actionType === "send_email" || actionType === "webhook_request" || actionType === "delay" || actionType === "branch" || actionType === "skill" || actionType === "file_write" || actionType === "orchestrate_document") {
    return actionType;
  }
  return "compose_text";
}

function normalizeWorkflowStep(step: WorkflowActionStep): WorkflowActionStep {
  const rawActionType = String(step.actionType ?? "");
  const normalizedActionType = normalizeLegacyActionType(step.actionType);
  const config =
    rawActionType === "browser_agent" || rawActionType === "local_agent"
      ? {
          url:
            typeof step.config.targetUrl === "string" && step.config.targetUrl.trim().length > 0
              ? step.config.targetUrl
              : "",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: {
            instruction:
              typeof step.config.instruction === "string" && step.config.instruction.trim().length > 0
                ? step.config.instruction
                : step.description,
            targetApp:
              typeof step.config.targetApp === "string" && step.config.targetApp.trim().length > 0
                ? step.config.targetApp
                : "",
          },
          migrationNote: "Converted from a legacy Dobly agent step. Point this to a supported API or replace it with a native connector or skill.",
          legacySource: rawActionType,
        }
      : step.config;

  const normalizedApp = (() => {
    if (getExecutorForStep({ ...step, actionType: normalizedActionType, config })) {
      return step.app;
    }
    if (normalizedActionType === "send_email") return "Email";
    if (normalizedActionType === "webhook_request") return "Webhook";
    if (normalizedActionType === "delay") return "Delay";
    if (normalizedActionType === "branch") return "Branch";
    if (normalizedActionType === "file_write") return "File";
    if (normalizedActionType === "orchestrate_document") return "Orchestrator";
    return "Formatter";
  })();

  return {
    ...step,
    app: normalizedApp,
    actionType: normalizedActionType,
    lane: step.lane === "native" ? "native" : "generic",
    connectorId:
      rawActionType === "browser_agent" || rawActionType === "local_agent"
        ? "generic-http"
        : step.connectorId,
    connectorActionId:
      rawActionType === "browser_agent" || rawActionType === "local_agent"
        ? "request"
        : step.connectorActionId,
    config,
  };
}

export function blueprintToDefinition(blueprint: WorkflowBlueprint): WorkflowDefinition {
  return {
    version: 1,
    trigger: inferTrigger(blueprint),
    operator: inferOperator(blueprint),
    steps: blueprint.steps.map((step) => {
      const skillKey = selectSkillKeyForBlueprintStep(blueprint, step);
      const actionType = skillKey ? "skill" : guessActionType(step);
      const id = `step_${step.id}`;

      return {
        id,
        name: step.name,
        description: step.description,
        app: step.tool,
        actionType,
        executionType: skillKey
          ? /classify|anomaly|summary|report|draft|explain|extract|route/i.test(skillKey)
            ? "intelligence"
            : "standard"
          : "standard",
        skillKey,
        enabled: true,
        config: stepConfig(actionType, step),
      } satisfies WorkflowActionStep;
    }),
  };
}

export function ensureWorkflowDefinition(blueprint: WorkflowBlueprint): WorkflowBlueprint {
  const normalizedIntegrations = Array.from(
    new Set(
      (blueprint.integrations ?? []).map((item) => {
        const match = SUPPORTED_INTEGRATIONS.get(String(item).toLowerCase().trim());
        return match ?? "Webhook / API";
      })
    )
  );

  if (blueprint.definition) {
    return {
      ...blueprint,
      integrations: normalizedIntegrations,
      definition: {
        ...blueprint.definition,
        steps: blueprint.definition.steps.map((step) => normalizeWorkflowStep(step)),
      },
    };
  }
  return {
    ...blueprint,
    integrations: normalizedIntegrations,
    definition: blueprintToDefinition(blueprint),
  };
}

export function validateWorkflowDefinition(definition: WorkflowDefinition) {
  const issues: string[] = [];

  if (!definition.steps.length) {
    issues.push("Add at least one enabled step before saving this workflow.");
  }

  if (definition.trigger.type === "schedule" && !definition.trigger.schedule?.trim()) {
    issues.push("Scheduled workflows need a schedule before they can run.");
  }

  if (definition.trigger.type === "webhook" && !definition.trigger.webhook_path?.trim()) {
    issues.push("Webhook workflows need a webhook path before they can run.");
  }

  if (definition.trigger.type === "webhook" && !String(definition.trigger.config?.secret ?? "").trim()) {
    issues.push("Webhook workflows need a webhook secret before they can run.");
  }

  if (definition.operator?.enabled) {
    if (definition.operator.mode !== "bounded_operator") {
      issues.push("Enabled operators must use bounded operator mode.");
    }
    if (!definition.operator.role.trim()) {
      issues.push("Bounded operators need a role.");
    }
    if (!definition.operator.objective.trim()) {
      issues.push("Bounded operators need a clear objective.");
    }
    if (!definition.operator.allowedDomains.length) {
      issues.push("Bounded operators need at least one allowed domain or tool area.");
    }
  }

  for (const step of definition.steps.filter((item) => item.enabled)) {
    if (step.actionType === "send_email") {
      if (!String(step.config.to ?? "").trim()) issues.push(`Step "${step.name}" needs an email recipient.`);
      if (!String(step.config.subject ?? "").trim()) issues.push(`Step "${step.name}" needs an email subject.`);
    }

    if (step.actionType === "webhook_request") {
      const hasNativeExecutor = step.lane === "native" && Boolean(getExecutorForStep(step));
      const url = String(step.config.url ?? "").trim();
      if (!hasNativeExecutor && !url) issues.push(`Step "${step.name}" needs a webhook or API URL.`);
    }

    if (step.actionType === "skill" && !step.skillKey) {
      issues.push(`Step "${step.name}" is missing its Dobly skill reference.`);
    }

    if (step.actionType === "file_write" && !String(step.config.path ?? "").trim()) {
      issues.push(`Step "${step.name}" needs an output path.`);
    }
  }

  return issues;
}

export function validateWorkflowBlueprintForActivation(blueprint: WorkflowBlueprint, prompt?: string) {
  const normalized = ensureWorkflowDefinition(blueprint);
  const definitionIssues = normalized.definition ? validateWorkflowDefinition(normalized.definition) : ["Workflow definition is missing."];
  const requiredProviders = getRequiredProviderIdsForWorkflow(normalized, prompt);

  return {
    normalized,
    issues: definitionIssues,
    requiredProviders,
  };
}
