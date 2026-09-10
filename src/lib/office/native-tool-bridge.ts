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
  check_availability: "native.google.calendar.check-availability",
  calendar_check_availability: "native.google.calendar.check-availability",
  organize_documents: "native.google.drive.organize",
  file_document: "native.google.drive.organize",
  google_drive: "native.google.drive.organize",

  // Messaging
  slack: "native.slack.send",
  slack_send: "native.slack.send",
  whatsapp: "native.whatsapp.send",
  whatsapp_send: "native.whatsapp.send",

  // Voice - real outbound calls via ElevenLabs Conversational AI + Twilio.
  make_call: "native.voice.outbound-call",
  phone_call: "native.voice.outbound-call",
  call_customer: "native.voice.outbound-call",
  voice_call: "native.voice.outbound-call",

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

  // --- Verbs beyond "create" -------------------------------------------------
  // This table only ever mapped the create/first action of each app, so a whole
  // class of coworker silently could not finish its job: a support coworker
  // could open a Zendesk ticket but never update it, a marketing coworker could
  // add a Mailchimp subscriber but never send the campaign, and a social
  // coworker could not post anywhere at all. 25 registered executors were
  // unreachable from the coworker path while working fine from workflows.

  // Publishing / social
  meta: "native.meta.post",
  facebook: "native.meta.post",
  instagram: "native.meta.post",
  social_post: "native.meta.post",
  post_to_social: "native.meta.post",
  linkedin: "native.linkedin.share-post",
  linkedin_post: "native.linkedin.share-post",
  share_post: "native.linkedin.share-post",

  // Campaign sending (distinct from adding a subscriber)
  mailchimp_send_campaign: "native.mailchimp.send-campaign",
  send_campaign: "native.mailchimp.send-campaign",
  klaviyo_send_campaign: "native.klaviyo.send-campaign",
  klaviyo_track_event: "native.klaviyo.track-event",
  track_event: "native.klaviyo.track-event",

  // Updates on existing records
  zendesk_update_ticket: "native.zendesk.update-ticket",
  update_ticket: "native.zendesk.update-ticket",
  hubspot_update_deal: "native.hubspot.update-deal",
  update_deal: "native.hubspot.update-deal",
  hubspot_create_note: "native.hubspot.create-note",
  log_note: "native.hubspot.create-note",
  airtable_update_record: "native.airtable.update-record",
  update_record: "native.airtable.update-record",
  notion_append: "native.notion.append-database",
  append_database: "native.notion.append-database",
  pipedrive_create_deal: "native.pipedrive.create-deal",
  create_deal: "native.pipedrive.create-deal",
  salesforce_create_opportunity: "native.salesforce.create-opportunity",
  create_opportunity: "native.salesforce.create-opportunity",
  zoho: "native.zoho-crm.create-lead",
  zoho_crm: "native.zoho-crm.create-lead",
  shopify_tag_customer: "native.shopify.tag-customer",
  tag_customer: "native.shopify.tag-customer",

  // Money
  stripe_create_customer: "native.stripe.create-customer",
  stripe_refund: "native.stripe.refund-charge",
  refund_charge: "native.stripe.refund-charge",
  issue_refund: "native.stripe.refund-charge",
  xero: "native.xero.create-invoice",
  xero_create_invoice: "native.xero.create-invoice",
  square: "native.square.create-customer",

  // Reading data back - a coworker that can only write is half a coworker.
  typeform: "native.typeform.get-responses",
  get_responses: "native.typeform.get-responses",
  form_responses: "native.typeform.get-responses",
  calendly: "native.calendly.get-events",
  get_events: "native.calendly.get-events",
  docusign_status: "native.docusign.get-envelope-status",
  envelope_status: "native.docusign.get-envelope-status",

  // Report assembly
  orchestrator: "native.dobly.orchestrator.document",
  assemble_report: "native.dobly.orchestrator.document",
  build_document: "native.dobly.orchestrator.document",

  // Generic escape hatches. Without these a coworker had no way to call an
  // arbitrary API, write a file, or send plain email outside Gmail.
  http: "generic.http",
  http_request: "generic.http",
  api_call: "generic.http",
  webhook: "generic.http",
  call_api: "generic.http",
  write_file: "generic.file",
  save_file: "generic.file",
  smtp: "generic.email",
  send_plain_email: "generic.email",
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
