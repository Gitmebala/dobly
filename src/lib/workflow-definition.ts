import type {
  WorkflowActionStep,
  WorkflowActionType,
  WorkflowBlueprint,
  WorkflowDefinition,
  WorkflowOperator,
  WorkflowRuntimeConfig,
  WorkflowTrigger,
} from "@/types";
import { buildOperatorDefaults, createDefaultAgentConfig } from "@/lib/agent-config";
import { getExecutorForStep } from "@/lib/connectors/registry";
import { getClaudeMcpTool } from "@/lib/mcp-registry";
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
  ["paystack", "Paystack"],
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

interface NativeStepMetadata {
  app: string;
  lane: "native";
  connectorId: string;
  connectorActionId: string;
}

function inferClaudeMcpToolId(step: {
  tool?: string | null;
  action?: string | null;
  description?: string | null;
}) {
  const lower = `${step.tool ?? ""} ${step.action ?? ""} ${step.description ?? ""}`.toLowerCase();
  if (/(figma|design file|ui design|wireframe)/.test(lower)) return "figma_design";
  if (/(github|repository|commit|pull request|codebase)/.test(lower)) return "github_repo_ops";
  if (/(fusion|autodesk|cad|engineering model|mechanical design)/.test(lower)) return "fusion_modeling";
  if (/(notion|workspace page|knowledge base|docs workspace)/.test(lower)) return "notion_workspace_ops";
  return null;
}

function inferNativeStepMetadata(step: {
  tool?: string | null;
  action?: string | null;
  description?: string | null;
}): NativeStepMetadata | null {
  const lower = `${step.tool ?? ""} ${step.action ?? ""} ${step.description ?? ""}`.toLowerCase();

  if (/(gmail|google mail)/.test(lower)) {
    return { app: "Google", lane: "native", connectorId: "google-gmail", connectorActionId: "send_email" };
  }
  if (/(google docs|google doc|google document|docs\.google|create.*doc|document.*google)/.test(lower)) {
    return { app: "google_docs", lane: "native", connectorId: "google-docs", connectorActionId: "create_document" };
  }
  if (/(google sheets|sheet)/.test(lower)) {
    if (/(analy|summary|report|trend)/.test(lower)) {
      return { app: "Google", lane: "native", connectorId: "google-sheets", connectorActionId: "analyze_data" };
    }
    if (/(read|fetch|pull|lookup)/.test(lower)) {
      return { app: "Google", lane: "native", connectorId: "google-sheets", connectorActionId: "read_range" };
    }
    return { app: "Google", lane: "native", connectorId: "google-sheets", connectorActionId: "append_row" };
  }
  if (/(calendar|booking|schedule|appointment)/.test(lower) && /google/.test(lower)) {
    return { app: "Google", lane: "native", connectorId: "google-calendar", connectorActionId: "create_event" };
  }
  if (/slack/.test(lower)) {
    return { app: "Slack", lane: "native", connectorId: "slack", connectorActionId: "send_message" };
  }
  if (/whatsapp/.test(lower)) {
    return { app: "WhatsApp", lane: "native", connectorId: "whatsapp", connectorActionId: "send_message" };
  }
  if (/shopify/.test(lower)) {
    if (/(draft order|invoice|quote|checkout)/.test(lower)) {
      return { app: "Shopify", lane: "native", connectorId: "shopify", connectorActionId: "create_draft_order" };
    }
    return { app: "Shopify", lane: "native", connectorId: "shopify", connectorActionId: "tag_customer" };
  }
  if (/mailchimp/.test(lower)) {
    if (/(campaign|newsletter|broadcast|send)/.test(lower)) {
      return { app: "Mailchimp", lane: "native", connectorId: "mailchimp", connectorActionId: "send_campaign" };
    }
    return { app: "Mailchimp", lane: "native", connectorId: "mailchimp", connectorActionId: "add_subscriber" };
  }
  if (/zendesk/.test(lower)) {
    return {
      app: "Zendesk",
      lane: "native",
      connectorId: "zendesk",
      connectorActionId: /(update|status|resolve|close)/.test(lower) ? "update_ticket" : "create_ticket",
    };
  }
  if (/freshdesk/.test(lower)) {
    return { app: "Freshdesk", lane: "native", connectorId: "freshdesk", connectorActionId: "create_ticket" };
  }
  if (/klaviyo/.test(lower)) {
    if (/(campaign|send|newsletter)/.test(lower)) {
      return { app: "Klaviyo", lane: "native", connectorId: "klaviyo", connectorActionId: "send_campaign" };
    }
    if (/(event|track)/.test(lower)) {
      return { app: "Klaviyo", lane: "native", connectorId: "klaviyo", connectorActionId: "track_event" };
    }
    return { app: "Klaviyo", lane: "native", connectorId: "klaviyo", connectorActionId: "subscribe" };
  }
  if (/docusign/.test(lower)) {
    return {
      app: "DocuSign",
      lane: "native",
      connectorId: "docusign",
      connectorActionId: /(status|check|track)/.test(lower) ? "get_envelope_status" : "create_envelope",
    };
  }
  if (/paystack/.test(lower)) {
    return { app: "Paystack", lane: "native", connectorId: "paystack", connectorActionId: "payment_link" };
  }
  if (/stripe/.test(lower)) {
    if (/(refund|reverse)/.test(lower)) {
      return { app: "Stripe", lane: "native", connectorId: "stripe", connectorActionId: "refund_charge" };
    }
    if (/(invoice|bill)/.test(lower)) {
      return { app: "Stripe", lane: "native", connectorId: "stripe", connectorActionId: "create_invoice" };
    }
    return { app: "Stripe", lane: "native", connectorId: "stripe", connectorActionId: "create_customer" };
  }
  if (/hubspot/.test(lower)) {
    if (/(deal|pipeline|opportunity)/.test(lower)) {
      return { app: "HubSpot", lane: "native", connectorId: "hubspot", connectorActionId: "update_deal" };
    }
    if (/note/.test(lower)) {
      return { app: "HubSpot", lane: "native", connectorId: "hubspot", connectorActionId: "create_note" };
    }
    if (/(task|follow-up|follow up)/.test(lower)) {
      return { app: "HubSpot", lane: "native", connectorId: "hubspot", connectorActionId: "create_task" };
    }
    return { app: "HubSpot", lane: "native", connectorId: "hubspot", connectorActionId: "create_contact" };
  }
  if (/salesforce/.test(lower)) {
    return {
      app: "Salesforce",
      lane: "native",
      connectorId: "salesforce",
      connectorActionId: /(opportunity|deal|pipeline)/.test(lower) ? "create_opportunity" : "create_lead",
    };
  }
  if (/pipedrive/.test(lower)) {
    return {
      app: "Pipedrive",
      lane: "native",
      connectorId: "pipedrive",
      connectorActionId: /(deal|pipeline|opportunity)/.test(lower) ? "create_deal" : "create_lead",
    };
  }
  if (/zoho/.test(lower)) {
    return { app: "Zoho CRM", lane: "native", connectorId: "zoho-crm", connectorActionId: "create_lead" };
  }
  if (/notion/.test(lower)) {
    return {
      app: "Notion",
      lane: "native",
      connectorId: "notion",
      connectorActionId: /(database|table|record)/.test(lower) ? "append_database" : "create_page",
    };
  }
  if (/airtable/.test(lower)) {
    return {
      app: "Airtable",
      lane: "native",
      connectorId: "airtable",
      connectorActionId: /(update|edit)/.test(lower) ? "update_record" : "create_record",
    };
  }
  if (/linkedin/.test(lower)) {
    return { app: "LinkedIn", lane: "native", connectorId: "linkedin", connectorActionId: "share_post" };
  }
  if (/zoom/.test(lower)) {
    return { app: "Zoom", lane: "native", connectorId: "zoom", connectorActionId: "create_meeting" };
  }
  if (/intercom/.test(lower)) {
    return { app: "Intercom", lane: "native", connectorId: "intercom", connectorActionId: "create_contact" };
  }
  if (/square/.test(lower)) {
    return { app: "Square", lane: "native", connectorId: "square", connectorActionId: "create_customer" };
  }
  if (/(facebook|instagram|meta)/.test(lower)) {
    return { app: "Meta", lane: "native", connectorId: "meta", connectorActionId: "post" };
  }
  if (/typeform/.test(lower)) {
    return { app: "Typeform", lane: "native", connectorId: "typeform", connectorActionId: "get_responses" };
  }
  if (/calendly/.test(lower)) {
    return { app: "Calendly", lane: "native", connectorId: "calendly", connectorActionId: "get_events" };
  }
  if (/trello/.test(lower)) {
    return { app: "Trello", lane: "native", connectorId: "trello", connectorActionId: "create_card" };
  }
  if (/asana/.test(lower)) {
    return { app: "Asana", lane: "native", connectorId: "asana", connectorActionId: "create_task" };
  }
  if (/monday/.test(lower)) {
    return { app: "monday.com", lane: "native", connectorId: "monday", connectorActionId: "create_item" };
  }
  if (/clickup/.test(lower)) {
    return { app: "ClickUp", lane: "native", connectorId: "clickup", connectorActionId: "create_task" };
  }
  if (/xero/.test(lower)) {
    return { app: "Xero", lane: "native", connectorId: "xero", connectorActionId: "create_invoice" };
  }
  if (/(mpesa|m-pesa|daraja)/.test(lower)) {
    return { app: "M-PESA", lane: "native", connectorId: "mpesa-daraja", connectorActionId: "stk_push" };
  }

  return null;
}

function randomWebhookToken(length = 18) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const source =
    typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
      ? crypto.getRandomValues(new Uint32Array(length))
      : Array.from({ length }, () => Math.floor(Math.random() * 0xffffffff));

  return Array.from(source, (value) => alphabet[value % alphabet.length]).join("");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
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

  const agentConfig = createDefaultAgentConfig(blueprint);
  return buildOperatorDefaults(blueprint, {
    ...agentConfig,
    conversationTone: /support|care|success|concierge|patient/.test(corpus)
      ? "empathetic"
      : agentConfig.conversationTone,
  });
}

function inferRuntime(blueprint: WorkflowBlueprint): WorkflowRuntimeConfig {
  const corpus = `${blueprint.name} ${blueprint.description} ${blueprint.trigger} ${(blueprint.setup_steps ?? []).join(" ")}`.toLowerCase();
  const hasOperatorSignal =
    /agent|assistant|reception|operator|support|triage|follow-up|follow up|research|chief-of-staff|manager/.test(
      corpus
    );
  const hasAutomationSignal =
    /daily|weekly|every|when|if|schedule|trigger|monitor|watch|alert|sync|workflow|automation|report/.test(
      corpus
    );
  const hasPipelineSignal =
    /pipeline|multi-step|research.*design|research.*document|figma|autodesk|fusion|github|mcp|then .* then|artifact|deliver/.test(
      corpus
    );

  let mode: WorkflowRuntimeConfig["mode"] = "automation";
  if (hasPipelineSignal) mode = "pipeline";
  else if (hasOperatorSignal && hasAutomationSignal) mode = "hybrid";
  else if (hasOperatorSignal) mode = "agent";

  const dedupeKeys = Array.from(
    new Set(
      [
        "trigger.email",
        "trigger.phone",
        "trigger.id",
        "trigger.reference",
        "trigger.ticket_id",
        "trigger.order_id",
      ].filter((item) =>
        /email|phone|lead|ticket|order|booking|payment|contact|customer|watch|alert|monitor/.test(corpus)
          ? true
          : item === "trigger.id"
      )
    )
  );

  return {
    mode,
    planner: mode === "automation" ? "static" : "adaptive",
    memoryEnabled: true,
    memoryKeys: ["recent_summary", "preferred_tone", "watch_context", "last_decision"],
    reportStyle: /founder|owner|executive|briefing/.test(corpus) ? "executive" : "standard",
    notifyOn: ["failure", "approval", "changes_only"],
    dedupeWindowMinutes: /watch|monitor|alert|signal|price|portfolio|competitor|brief/.test(corpus)
      ? 180
      : 30,
    dedupeKeys,
    observationGoal: blueprint.description,
  };
}

function guessActionType(step: WorkflowBlueprint["steps"][number]): WorkflowActionType {
  const lower = `${step.tool} ${step.action} ${step.description}`.toLowerCase();
  const nativeStep = inferNativeStepMetadata(step);
  const claudeMcpToolId = inferClaudeMcpToolId(step);

  if (claudeMcpToolId && /(claude|mcp|figma|github|fusion|autodesk|notion)/.test(lower)) {
    return "claude_mcp";
  }

  if (nativeStep) {
    return nativeStep.connectorActionId === "send_email" ? "send_email" : "webhook_request";
  }

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

function stepConfig(
  actionType: WorkflowActionType,
  step: WorkflowBlueprint["steps"][number],
  nativeStep?: NativeStepMetadata | null,
) {
  if (actionType === "claude_mcp") {
    const toolId = inferClaudeMcpToolId(step);
    return {
      toolId,
      task: step.description,
      outputSchema: {
        summary: "string",
        artifacts: ["optional artifact references"],
        notes: ["optional implementation notes"],
      },
      timeoutMs: 90000,
      retryPolicy: {
        attempts: 1,
        backoffSeconds: 5,
      },
    };
  }

  if (nativeStep) {
    switch (nativeStep.connectorActionId) {
      case "add_subscriber":
        return { email: "{{trigger.email}}", listId: "{{workflow.list_id}}" };
      case "send_campaign":
        return { campaignId: "{{workflow.campaign_id}}", segmentId: "{{trigger.segment_id}}" };
      case "create_ticket":
        return { subject: step.name, description: step.description, email: "{{trigger.email}}" };
      case "update_ticket":
        return { ticketId: "{{trigger.ticket_id}}", status: "open", note: step.description };
      case "create_contact":
      case "create_customer":
      case "create_lead":
        return { email: "{{trigger.email}}", name: "{{trigger.name}}", source: "{{workflow.title}}" };
      case "create_invoice":
        return { customer: "{{trigger.customer_id}}", amount: "{{trigger.amount}}", description: step.description };
      case "refund_charge":
        return { chargeId: "{{trigger.charge_id}}", amount: "{{trigger.amount}}" };
      case "update_deal":
      case "create_opportunity":
      case "create_deal":
        return { recordId: "{{trigger.record_id}}", title: step.name, notes: step.description };
      case "create_task":
      case "create_card":
      case "create_item":
        return { title: step.name, description: step.description, assignee: "{{trigger.assignee}}" };
      case "create_page":
      case "append_database":
        return { title: step.name, content: step.description, source: "{{workflow.title}}" };
      case "create_record":
      case "update_record":
        return { recordId: "{{trigger.record_id}}", fields: { title: step.name, notes: step.description } };
      case "share_post":
      case "post":
        return { content: step.description, title: step.name };
      case "create_meeting":
      case "create_event":
        return { title: step.name, start: "{{trigger.start}}", end: "{{trigger.end}}", attendeeEmail: "{{trigger.email}}" };
      case "send_message":
        return { to: "{{trigger.phone}}", message: step.description };
      case "get_responses":
      case "get_events":
      case "read_range":
      case "analyze_data":
        return { sourceId: "{{trigger.source_id}}", query: step.description };
      case "append_row":
        return { row: { title: step.name, detail: step.description, trigger: "{{trigger.id}}" } };
      case "create_document":
        return {
          title: step.name,
          content: step.description,
        };
      case "create_envelope":
        return { recipientEmail: "{{trigger.email}}", title: step.name, documentUrl: "{{trigger.document_url}}" };
      case "get_envelope_status":
        return { envelopeId: "{{trigger.envelope_id}}" };
      case "track_event":
        return { event: step.name, email: "{{trigger.email}}", properties: { source: "{{workflow.title}}" } };
      case "stk_push":
        return { phoneNumber: "{{trigger.phone}}", amount: "{{trigger.amount}}", reference: "{{workflow.title}}" };
      default:
        return { payload: { title: step.name, description: step.description, trigger: "{{trigger}}" } };
    }
  }

  switch (actionType) {
    case "send_email":
      return {
        to: "{{trigger.email}}",
        subject: step.name,
        text: step.description,
        retryPolicy: {
          attempts: 2,
          backoffSeconds: 3,
        },
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
        retryPolicy: {
          attempts: 2,
          backoffSeconds: 5,
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
  if (actionType === "compose_text" || actionType === "send_email" || actionType === "webhook_request" || actionType === "claude_mcp" || actionType === "delay" || actionType === "branch" || actionType === "skill" || actionType === "file_write" || actionType === "orchestrate_document") {
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

  const inferredNativeStep = inferNativeStepMetadata({
    tool: step.app,
    action: step.connectorActionId ?? step.actionType,
    description: step.description,
  });
  const inferredClaudeMcpToolId =
    normalizedActionType === "claude_mcp"
      ? (String((config as Record<string, unknown>).toolId ?? "") || inferClaudeMcpToolId({
          tool: step.app,
          action: step.connectorActionId ?? step.actionType,
          description: step.description,
        }))
      : null;

  const normalizedApp = (() => {
    if (getExecutorForStep({ ...step, actionType: normalizedActionType, config })) {
      return step.app;
    }
    if (normalizedActionType === "claude_mcp") return "Claude MCP";
    if (inferredNativeStep) return inferredNativeStep.app;
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
    lane: step.lane === "native" || inferredNativeStep ? "native" : "generic",
    onFailure: step.onFailure ?? (normalizedActionType === "skill" ? "continue" : "stop"),
    saveOutputAs: step.saveOutputAs ?? null,
    saveToMemory: step.saveToMemory ?? [],
    connectorId:
      rawActionType === "browser_agent" || rawActionType === "local_agent"
        ? "generic-http"
        : step.connectorId ?? inferredNativeStep?.connectorId,
    connectorActionId:
      rawActionType === "browser_agent" || rawActionType === "local_agent"
        ? "request"
        : step.connectorActionId ?? inferredNativeStep?.connectorActionId,
    config: {
      ...config,
      ...(normalizedActionType === "claude_mcp"
        ? {
            toolId: inferredClaudeMcpToolId,
            task: String((config as Record<string, unknown>).task ?? step.description),
            timeoutMs: Number((config as Record<string, unknown>).timeoutMs ?? 90_000),
            retryPolicy: {
              attempts: Number(((config as Record<string, unknown>).retryPolicy as Record<string, unknown> | undefined)?.attempts ?? 1),
              backoffSeconds: Number(((config as Record<string, unknown>).retryPolicy as Record<string, unknown> | undefined)?.backoffSeconds ?? 5),
            },
          }
        : {}),
      ...(normalizedActionType === "send_email" || normalizedActionType === "webhook_request" || normalizedActionType === "file_write"
        ? {
            retryPolicy: {
              attempts: Number(((config as Record<string, unknown>).retryPolicy as Record<string, unknown> | undefined)?.attempts ?? 2),
              backoffSeconds: Number(((config as Record<string, unknown>).retryPolicy as Record<string, unknown> | undefined)?.backoffSeconds ?? 3),
            },
          }
        : {}),
    },
  };
}

function normalizeOperator(operator: WorkflowDefinition["operator"]): WorkflowDefinition["operator"] {
  if (!operator) return undefined;

  return {
    ...operator,
    mode: operator.mode === "workflow" || operator.mode === "bounded_operator" ? operator.mode : "bounded_operator",
    autonomy:
      operator.autonomy === "supervised" || operator.autonomy === "guarded" || operator.autonomy === "delegated"
        ? operator.autonomy
        : "supervised",
    approvalRiskThreshold:
      operator.approvalRiskThreshold === "medium" || operator.approvalRiskThreshold === "high"
        ? operator.approvalRiskThreshold
        : "medium",
    allowedDomains: Array.isArray(operator.allowedDomains) && operator.allowedDomains.length > 0
      ? operator.allowedDomains
      : ["Dobly workspace"],
  };
}

function normalizeRuntime(runtime: WorkflowRuntimeConfig | undefined, blueprint: WorkflowBlueprint): WorkflowRuntimeConfig {
  const inferred = inferRuntime(blueprint);
  if (!runtime) return inferred;
  const validMode = runtime.mode === "agent" || runtime.mode === "automation" || runtime.mode === "pipeline" || runtime.mode === "hybrid";
  const validPlanner = runtime.planner === "static" || runtime.planner === "adaptive";

  return {
    ...inferred,
    ...runtime,
    mode: validMode ? runtime.mode : inferred.mode,
    planner: validPlanner ? runtime.planner : inferred.planner,
    memoryEnabled: typeof runtime.memoryEnabled === "boolean" ? runtime.memoryEnabled : inferred.memoryEnabled,
    memoryKeys: Array.isArray(runtime.memoryKeys) && runtime.memoryKeys.length > 0 ? runtime.memoryKeys : inferred.memoryKeys,
    reportStyle:
      runtime.reportStyle === "brief" || runtime.reportStyle === "standard" || runtime.reportStyle === "executive"
        ? runtime.reportStyle
        : inferred.reportStyle,
    notifyOn: Array.isArray(runtime.notifyOn) && runtime.notifyOn.length > 0 ? runtime.notifyOn : inferred.notifyOn,
  };
}

export function blueprintToDefinition(blueprint: WorkflowBlueprint): WorkflowDefinition {
  return {
    version: 1,
    trigger: inferTrigger(blueprint),
    operator: inferOperator(blueprint),
    steps: blueprint.steps.map((step) => {
      const skillKey = selectSkillKeyForBlueprintStep(blueprint, step);
      const nativeStep = skillKey ? null : inferNativeStepMetadata(step);
      const actionType = skillKey ? "skill" : guessActionType(step);
      const id = `step_${step.id}`;

      return {
        id,
        name: step.name,
        description: step.description,
        app: actionType === "claude_mcp" ? "Claude MCP" : nativeStep?.app ?? step.tool,
        actionType,
        executionType: skillKey
          ? /classify|anomaly|summary|report|draft|explain|extract|route/i.test(skillKey)
            ? "intelligence"
            : "standard"
          : "standard",
        skillKey,
        lane: nativeStep?.lane,
        connectorId: nativeStep?.connectorId,
        connectorActionId: nativeStep?.connectorActionId,
        onFailure:
          skillKey
            ? "continue"
            : actionType === "send_email" || actionType === "webhook_request" || actionType === "claude_mcp"
              ? "escalate"
              : "stop",
        saveOutputAs: null,
        saveToMemory: [],
        enabled: true,
        config: stepConfig(actionType, step, nativeStep),
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
    const runtime = normalizeRuntime(blueprint.definition.runtime, blueprint);
    return {
      ...blueprint,
      integrations: normalizedIntegrations,
      definition: {
        ...blueprint.definition,
        operator: normalizeOperator(blueprint.definition.operator) ?? inferOperator(blueprint),
        runtime,
        steps: blueprint.definition.steps.map((step) => normalizeWorkflowStep(step)),
      },
    };
  }
  return {
    ...blueprint,
    integrations: normalizedIntegrations,
    definition: {
      ...blueprintToDefinition(blueprint),
      runtime: inferRuntime(blueprint),
    },
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

  if (definition.runtime) {
    if (!definition.runtime.memoryKeys.length) {
      issues.push("Runtime memory needs at least one memory key.");
    }
    if (definition.runtime.notifyOn.length === 0) {
      issues.push("Runtime reporting needs at least one notification policy.");
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

    if (step.lane === "native" && step.connectorActionId && !getExecutorForStep(step)) {
      issues.push(`Step "${step.name}" is mapped to ${step.connectorId ?? step.app}, but no live executor is registered for that action.`);
    }

    if (step.actionType === "claude_mcp") {
      const toolId = String(step.config.toolId ?? "").trim();
      if (!toolId) issues.push(`Step "${step.name}" needs a Claude MCP tool id.`);
      if (toolId && !getClaudeMcpTool(toolId)) issues.push(`Step "${step.name}" references an unknown Claude MCP tool.`);
      if (!String(step.config.task ?? step.description ?? "").trim()) {
        issues.push(`Step "${step.name}" needs a Claude MCP task description.`);
      }
    }

    if (step.actionType === "skill" && !step.skillKey) {
      issues.push(`Step "${step.name}" is missing its Dobly skill reference.`);
    }

    if (step.actionType === "file_write" && !String(step.config.path ?? "").trim()) {
      issues.push(`Step "${step.name}" needs an output path.`);
    }

    if (step.condition && !String(step.condition.path ?? "").trim()) {
      issues.push(`Step "${step.name}" has an empty runtime condition.`);
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
