import { getConnectorExecutor } from "@/lib/connectors/registry";
import type { ConnectorExecutionContext } from "@/lib/connectors/sdk";
import type { Workflow, WorkflowActionStep, WorkflowDefinition, WorkflowTrigger } from "@/types";

/**
 * Coworkers and workflows had two entirely separate execution paths. The
 * workflow path (lib/execution.ts) goes through the connector registry and can
 * really send Gmail, write Sheets, post to Slack, and so on. The coworker path
 * (lib/office/tool-executor.ts) only knew about internal tools, a webhook_url,
 * or a base_url - so a real OAuth connection like Google fell through to
 * "prepared_not_sent" and the coworker silently never did the thing.
 *
 * This bridge lets the coworker path reuse those same native executors.
 */

// Coworker tool name -> native executor id. Keys are matched after
// lower-casing and normalising separators, so "send_email", "send-email" and
// "Send Email" all resolve the same way.
const TOOL_TO_EXECUTOR: Record<string, string> = {
  // Google
  gmail: "native.google.gmail.send",
  email: "native.google.gmail.send",
  send_email: "native.google.gmail.send",
  email_send: "native.google.gmail.send",
  google_docs: "native.google.docs.create",
  create_document: "native.google.docs.create",
  google_sheets: "native.google.sheets.append",
  sheets_append: "native.google.sheets.append",
  sheets_read: "native.google.sheets.read",
  sheets_analyze: "native.google.sheets.analyze",
  google_calendar: "native.google.calendar.create-event",
  calendar_create_event: "native.google.calendar.create-event",

  // Messaging
  slack: "native.slack.send",
  slack_send: "native.slack.send",
  whatsapp: "native.whatsapp.send",
  whatsapp_send: "native.whatsapp.send",

  // Payments
  mpesa: "native.mpesa.stk-push",
  mpesa_stk_push: "native.mpesa.stk-push",
  paystack: "native.paystack.payment-link",
  stripe_invoice: "native.stripe.create-invoice",

  // CRM / support
  hubspot: "native.hubspot.create-contact",
  hubspot_create_contact: "native.hubspot.create-contact",
  hubspot_create_task: "native.hubspot.create-task",
  salesforce: "native.salesforce.create-lead",
  pipedrive: "native.pipedrive.create-lead",
  zendesk: "native.zendesk.create-ticket",
  freshdesk: "native.freshdesk.create-ticket",
  intercom: "native.intercom.create-contact",

  // Work tracking
  notion: "native.notion.create-page",
  asana: "native.asana.create-task",
  trello: "native.trello.create-card",
  clickup: "native.clickup.create-task",
  monday: "native.monday.create-item",
  airtable: "native.airtable.create-record",

  // Commerce / other
  shopify: "native.shopify.create-draft-order",
  mailchimp: "native.mailchimp.add-subscriber",
  klaviyo: "native.klaviyo.subscribe",
  docusign: "native.docusign.create-envelope",
  zoom: "native.zoom.create-meeting",
};

function normalizeToolName(toolName: string) {
  return toolName.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function findNativeExecutorId(toolName: string | null | undefined) {
  if (!toolName) return null;
  const normalized = normalizeToolName(toolName);
  return TOOL_TO_EXECUTOR[normalized] ?? null;
}

/**
 * Native executors were written against a workflow run. A coworker action has
 * no workflow, so we synthesise the minimum context they actually read:
 * `workflow.user_id`, `config`, and `step.name` / `step.description` as
 * fallback copy. Everything else is inert but has to be shape-correct.
 */
function buildSyntheticContext(input: {
  userId: string;
  taskId: string;
  toolName: string;
  toolPayload: Record<string, unknown>;
}): ConnectorExecutionContext {
  const step = {
    id: `office-${input.taskId}`,
    type: "action",
    name: String(input.toolPayload.name ?? input.toolPayload.subject ?? input.toolName),
    description: String(input.toolPayload.description ?? input.toolPayload.text ?? ""),
    app: input.toolName,
    config: input.toolPayload,
  } as unknown as WorkflowActionStep;

  const definition = { version: 1, trigger: { type: "manual" }, steps: [step] } as unknown as WorkflowDefinition;

  return {
    workflow: { id: `office-${input.taskId}`, user_id: input.userId } as unknown as Workflow,
    runId: input.taskId,
    definition,
    trigger: { type: "manual" } as unknown as WorkflowTrigger,
    triggerPayload: {},
    step,
    config: input.toolPayload,
    stepOutputs: {},
  };
}

export async function executeNativeConnectorTool(input: {
  userId: string;
  taskId: string;
  toolName: string;
  toolPayload: Record<string, unknown>;
}): Promise<
  | { ok: true; provider: string; output: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const executorId = findNativeExecutorId(input.toolName);
  if (!executorId) return { ok: false, error: `No native executor for ${input.toolName}.` };

  const executor = getConnectorExecutor(executorId);
  if (!executor) return { ok: false, error: `Executor ${executorId} is not registered.` };

  try {
    const output = await executor.execute(buildSyntheticContext(input));
    return { ok: true, provider: executorId.split(".")[1] ?? input.toolName, output };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : `${executorId} failed.` };
  }
}
