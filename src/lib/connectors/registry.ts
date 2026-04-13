import type { ConnectorDefinition, ConnectorExecutor } from "@/lib/connectors/sdk";
import { emailConnectorExecutor } from "@/lib/connectors/generic/email";
import { fileConnectorExecutor } from "@/lib/connectors/generic/file";
import { httpConnectorExecutor } from "@/lib/connectors/generic/http";
import { googleGmailSendExecutor, googleSheetsAppendExecutor } from "@/lib/connectors/native/google";
import { mpesaStkPushExecutor } from "@/lib/connectors/native/mpesa";
import { orchestratorDocumentExecutor } from "@/lib/connectors/native/orchestrator";
import { slackSendMessageExecutor } from "@/lib/connectors/native/slack";
import { shopifyTagCustomerExecutor } from "@/lib/connectors/native/shopify";
import { whatsappSendMessageExecutor } from "@/lib/connectors/native/whatsapp";
import type { WorkflowActionStep } from "@/types";

export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  {
    id: "generic-http",
    label: "HTTP / Webhook",
    lane: "generic",
    provider: "web",
    actions: [{ id: "request", label: "HTTP request", lane: "generic", executor: "generic.http" }],
  },
  {
    id: "generic-email",
    label: "Email",
    lane: "generic",
    provider: "email",
    actions: [{ id: "send", label: "Send email", lane: "generic", executor: "generic.email" }],
  },
  {
    id: "mpesa-daraja",
    label: "M-PESA Daraja",
    lane: "native",
    provider: "mpesa",
    actions: [{ id: "stk_push", label: "Send STK push", lane: "native", executor: "native.mpesa.stk-push" }],
  },
  {
    id: "generic-file",
    label: "File",
    lane: "generic",
    provider: "file",
    actions: [{ id: "write", label: "Write file", lane: "generic", executor: "generic.file" }],
  },
];

const EXECUTORS = new Map<string, ConnectorExecutor>([
  [httpConnectorExecutor.id, httpConnectorExecutor],
  [emailConnectorExecutor.id, emailConnectorExecutor],
  [fileConnectorExecutor.id, fileConnectorExecutor],
  [googleGmailSendExecutor.id, googleGmailSendExecutor],
  [googleSheetsAppendExecutor.id, googleSheetsAppendExecutor],
  [mpesaStkPushExecutor.id, mpesaStkPushExecutor],
  [orchestratorDocumentExecutor.id, orchestratorDocumentExecutor],
  [slackSendMessageExecutor.id, slackSendMessageExecutor],
  [shopifyTagCustomerExecutor.id, shopifyTagCustomerExecutor],
  [whatsappSendMessageExecutor.id, whatsappSendMessageExecutor],
]);

const STEP_EXECUTOR_MAP = new Map<string, string>([
  ["gmail:send_email", googleGmailSendExecutor.id],
  ["google_sheets:append_row", googleSheetsAppendExecutor.id],
  ["slack:send_message", slackSendMessageExecutor.id],
  ["shopify:tag_customer", shopifyTagCustomerExecutor.id],
  ["mpesa:stk_push", mpesaStkPushExecutor.id],
  ["whatsapp:send_message", whatsappSendMessageExecutor.id],
  ["orchestrator:assemble_report", orchestratorDocumentExecutor.id],
  ["webhook:request", httpConnectorExecutor.id],
  ["file:write_file", fileConnectorExecutor.id],
]);

export function getConnectorExecutor(executorId: string) {
  return EXECUTORS.get(executorId) ?? null;
}

export function getExecutorForStep(step: WorkflowActionStep) {
  const key = `${step.app}:${step.connectorActionId ?? ""}`;
  const mapped = STEP_EXECUTOR_MAP.get(key);
  if (mapped) {
    return getConnectorExecutor(mapped);
  }
  return null;
}
