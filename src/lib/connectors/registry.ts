import type { ConnectorDefinition, ConnectorExecutor } from "@/lib/connectors/sdk";
import { emailConnectorExecutor } from "@/lib/connectors/generic/email";
import { fileConnectorExecutor } from "@/lib/connectors/generic/file";
import { httpConnectorExecutor } from "@/lib/connectors/generic/http";
import { googleGmailSendExecutor, googleDocsCreateExecutor, googleSheetsAppendExecutor, googleSheetsReadExecutor, googleSheetsAnalyzeExecutor, googleCalendarCreateEventExecutor } from "@/lib/connectors/native/google";
import { mpesaStkPushExecutor } from "@/lib/connectors/native/mpesa";
import { orchestratorDocumentExecutor } from "@/lib/connectors/native/orchestrator";
import { slackSendMessageExecutor } from "@/lib/connectors/native/slack";
import { shopifyTagCustomerExecutor, shopifyCreateDraftOrderExecutor } from "@/lib/connectors/native/shopify";
import { whatsappSendMessageExecutor } from "@/lib/connectors/native/whatsapp";
import { mailchimpAddSubscriberExecutor, mailchimpSendCampaignExecutor } from "@/lib/connectors/native/mailchimp";
import { zendeskCreateTicketExecutor, zendeskUpdateTicketExecutor } from "@/lib/connectors/native/zendesk";
import { klaviyoSubscribeExecutor, klaviyoTrackEventExecutor, klaviyoSendCampaignExecutor } from "@/lib/connectors/native/klaviyo";
import { docusignCreateEnvelopeExecutor, docusignGetEnvelopeStatusExecutor } from "@/lib/connectors/native/docusign";
import { paystackPaymentLinkExecutor } from "@/lib/connectors/native/paystack";
import { stripeCreateCustomerExecutor, stripeCreateInvoiceExecutor, stripeRefundChargeExecutor } from "@/lib/connectors/native/stripe";
import { hubspotCreateContactExecutor, hubspotUpdateDealExecutor, hubspotCreateTaskExecutor, hubspotCreateNoteExecutor } from "@/lib/connectors/native/hubspot";
import {
  pipedriveCreateLeadExecutor, pipedriveCreateDealExecutor,
  notionCreatePageExecutor, notionAppendDatabaseExecutor,
  airtableCreateRecordExecutor, airtableUpdateRecordExecutor,
  linkedinSharePostExecutor,
  zoomCreateMeetingExecutor,
  freshdeskCreateTicketExecutor,
  intercomCreateContactExecutor,
  squareCreateCustomerExecutor,
} from "@/lib/connectors/native/integrations";
import {
  metaPostExecutor,
  salesforceCreateLeadExecutor, salesforceCreateOpportunityExecutor,
  typeformGetResponsesExecutor,
  calendlyGetEventsExecutor,
  trelloCreateCardExecutor,
  asanaCreateTaskExecutor,
  mondayCreateItemExecutor,
  clickupCreateTaskExecutor,
  xeroCreateInvoiceExecutor,
  zohoCrmCreateLeadExecutor,
} from "@/lib/connectors/native/integrations2";
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
    id: "paystack",
    label: "Paystack",
    lane: "native",
    provider: "paystack",
    actions: [{ id: "payment_link", label: "Create payment link", lane: "native", executor: "native.paystack.payment-link" }],
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
  // Generic
  [httpConnectorExecutor.id, httpConnectorExecutor],
  [emailConnectorExecutor.id, emailConnectorExecutor],
  [fileConnectorExecutor.id, fileConnectorExecutor],
  // Google
  [googleGmailSendExecutor.id, googleGmailSendExecutor],
  [googleDocsCreateExecutor.id, googleDocsCreateExecutor],
  [googleSheetsAppendExecutor.id, googleSheetsAppendExecutor],
  [googleSheetsReadExecutor.id, googleSheetsReadExecutor],
  [googleSheetsAnalyzeExecutor.id, googleSheetsAnalyzeExecutor],
  [googleCalendarCreateEventExecutor.id, googleCalendarCreateEventExecutor],
  // M-PESA
  [mpesaStkPushExecutor.id, mpesaStkPushExecutor],
  // Orchestrator
  [orchestratorDocumentExecutor.id, orchestratorDocumentExecutor],
  // Slack
  [slackSendMessageExecutor.id, slackSendMessageExecutor],
  // Shopify
  [shopifyTagCustomerExecutor.id, shopifyTagCustomerExecutor],
  [shopifyCreateDraftOrderExecutor.id, shopifyCreateDraftOrderExecutor],
  // WhatsApp
  [whatsappSendMessageExecutor.id, whatsappSendMessageExecutor],
  // Mailchimp
  [mailchimpAddSubscriberExecutor.id, mailchimpAddSubscriberExecutor],
  [mailchimpSendCampaignExecutor.id, mailchimpSendCampaignExecutor],
  // Zendesk
  [zendeskCreateTicketExecutor.id, zendeskCreateTicketExecutor],
  [zendeskUpdateTicketExecutor.id, zendeskUpdateTicketExecutor],
  // Klaviyo
  [klaviyoSubscribeExecutor.id, klaviyoSubscribeExecutor],
  [klaviyoTrackEventExecutor.id, klaviyoTrackEventExecutor],
  [klaviyoSendCampaignExecutor.id, klaviyoSendCampaignExecutor],
  // DocuSign
  [docusignCreateEnvelopeExecutor.id, docusignCreateEnvelopeExecutor],
  [docusignGetEnvelopeStatusExecutor.id, docusignGetEnvelopeStatusExecutor],
  // Paystack
  [paystackPaymentLinkExecutor.id, paystackPaymentLinkExecutor],
  // Stripe
  [stripeCreateCustomerExecutor.id, stripeCreateCustomerExecutor],
  [stripeCreateInvoiceExecutor.id, stripeCreateInvoiceExecutor],
  [stripeRefundChargeExecutor.id, stripeRefundChargeExecutor],
  // HubSpot
  [hubspotCreateContactExecutor.id, hubspotCreateContactExecutor],
  [hubspotUpdateDealExecutor.id, hubspotUpdateDealExecutor],
  [hubspotCreateTaskExecutor.id, hubspotCreateTaskExecutor],
  [hubspotCreateNoteExecutor.id, hubspotCreateNoteExecutor],
  // Integrations
  [pipedriveCreateLeadExecutor.id, pipedriveCreateLeadExecutor],
  [pipedriveCreateDealExecutor.id, pipedriveCreateDealExecutor],
  [notionCreatePageExecutor.id, notionCreatePageExecutor],
  [notionAppendDatabaseExecutor.id, notionAppendDatabaseExecutor],
  [airtableCreateRecordExecutor.id, airtableCreateRecordExecutor],
  [airtableUpdateRecordExecutor.id, airtableUpdateRecordExecutor],
  [linkedinSharePostExecutor.id, linkedinSharePostExecutor],
  [zoomCreateMeetingExecutor.id, zoomCreateMeetingExecutor],
  [freshdeskCreateTicketExecutor.id, freshdeskCreateTicketExecutor],
  [intercomCreateContactExecutor.id, intercomCreateContactExecutor],
  [squareCreateCustomerExecutor.id, squareCreateCustomerExecutor],
  // Integrations 2
  [metaPostExecutor.id, metaPostExecutor],
  [salesforceCreateLeadExecutor.id, salesforceCreateLeadExecutor],
  [salesforceCreateOpportunityExecutor.id, salesforceCreateOpportunityExecutor],
  [typeformGetResponsesExecutor.id, typeformGetResponsesExecutor],
  [calendlyGetEventsExecutor.id, calendlyGetEventsExecutor],
  [trelloCreateCardExecutor.id, trelloCreateCardExecutor],
  [asanaCreateTaskExecutor.id, asanaCreateTaskExecutor],
  [mondayCreateItemExecutor.id, mondayCreateItemExecutor],
  [clickupCreateTaskExecutor.id, clickupCreateTaskExecutor],
  [xeroCreateInvoiceExecutor.id, xeroCreateInvoiceExecutor],
  [zohoCrmCreateLeadExecutor.id, zohoCrmCreateLeadExecutor],
]);

const STEP_EXECUTOR_MAP = new Map<string, string>([
  // Generic
  ["webhook:request", httpConnectorExecutor.id],
  ["generic-http:request", httpConnectorExecutor.id],
  ["email:send", emailConnectorExecutor.id],
  ["generic-email:send", emailConnectorExecutor.id],
  ["file:write_file", fileConnectorExecutor.id],
  ["generic-file:write_file", fileConnectorExecutor.id],
  // Google
  ["gmail:send_email", googleGmailSendExecutor.id],
  ["google:send_email", googleGmailSendExecutor.id],
  ["google-gmail:send_email", googleGmailSendExecutor.id],
  ["google_docs:create_document", googleDocsCreateExecutor.id],
  ["google-docs:create_document", googleDocsCreateExecutor.id],
  ["google_sheets:append_row", googleSheetsAppendExecutor.id],
  ["google-sheets:append_row", googleSheetsAppendExecutor.id],
  ["google_sheets:read_range", googleSheetsReadExecutor.id],
  ["google-sheets:read_range", googleSheetsReadExecutor.id],
  ["google_sheets:analyze_data", googleSheetsAnalyzeExecutor.id],
  ["google-sheets:analyze_data", googleSheetsAnalyzeExecutor.id],
  ["google_calendar:create_event", googleCalendarCreateEventExecutor.id],
  ["google-calendar:create_event", googleCalendarCreateEventExecutor.id],
  // M-PESA
  ["mpesa:stk_push", mpesaStkPushExecutor.id],
  ["m-pesa:stk_push", mpesaStkPushExecutor.id],
  ["mpesa-daraja:stk_push", mpesaStkPushExecutor.id],
  // Orchestrator
  ["orchestrator:assemble_report", orchestratorDocumentExecutor.id],
  // Slack
  ["slack:send_message", slackSendMessageExecutor.id],
  // Shopify
  ["shopify:tag_customer", shopifyTagCustomerExecutor.id],
  ["shopify:create_draft_order", shopifyCreateDraftOrderExecutor.id],
  // WhatsApp
  ["whatsapp:send_message", whatsappSendMessageExecutor.id],
  // Mailchimp
  ["mailchimp:add_subscriber", mailchimpAddSubscriberExecutor.id],
  ["mailchimp:send_campaign", mailchimpSendCampaignExecutor.id],
  // Zendesk
  ["zendesk:create_ticket", zendeskCreateTicketExecutor.id],
  ["zendesk:update_ticket", zendeskUpdateTicketExecutor.id],
  // Klaviyo
  ["klaviyo:subscribe", klaviyoSubscribeExecutor.id],
  ["klaviyo:track_event", klaviyoTrackEventExecutor.id],
  ["klaviyo:send_campaign", klaviyoSendCampaignExecutor.id],
  // DocuSign
  ["docusign:create_envelope", docusignCreateEnvelopeExecutor.id],
  ["docusign:get_envelope_status", docusignGetEnvelopeStatusExecutor.id],
  // Paystack
  ["paystack:payment_link", paystackPaymentLinkExecutor.id],
  // Stripe
  ["stripe:create_customer", stripeCreateCustomerExecutor.id],
  ["stripe:create_invoice", stripeCreateInvoiceExecutor.id],
  ["stripe:refund_charge", stripeRefundChargeExecutor.id],
  // HubSpot
  ["hubspot:create_contact", hubspotCreateContactExecutor.id],
  ["hubspot:update_deal", hubspotUpdateDealExecutor.id],
  ["hubspot:create_task", hubspotCreateTaskExecutor.id],
  ["hubspot:create_note", hubspotCreateNoteExecutor.id],
  // Integrations
  ["pipedrive:create_lead", pipedriveCreateLeadExecutor.id],
  ["pipedrive:create_deal", pipedriveCreateDealExecutor.id],
  ["notion:create_page", notionCreatePageExecutor.id],
  ["notion:append_database", notionAppendDatabaseExecutor.id],
  ["airtable:create_record", airtableCreateRecordExecutor.id],
  ["airtable:update_record", airtableUpdateRecordExecutor.id],
  ["linkedin:share_post", linkedinSharePostExecutor.id],
  ["zoom:create_meeting", zoomCreateMeetingExecutor.id],
  ["freshdesk:create_ticket", freshdeskCreateTicketExecutor.id],
  ["intercom:create_contact", intercomCreateContactExecutor.id],
  ["square:create_customer", squareCreateCustomerExecutor.id],
  // Integrations 2
  ["meta:post", metaPostExecutor.id],
  ["salesforce:create_lead", salesforceCreateLeadExecutor.id],
  ["salesforce:create_opportunity", salesforceCreateOpportunityExecutor.id],
  ["typeform:get_responses", typeformGetResponsesExecutor.id],
  ["calendly:get_events", calendlyGetEventsExecutor.id],
  ["trello:create_card", trelloCreateCardExecutor.id],
  ["asana:create_task", asanaCreateTaskExecutor.id],
  ["monday:create_item", mondayCreateItemExecutor.id],
  ["clickup:create_task", clickupCreateTaskExecutor.id],
  ["xero:create_invoice", xeroCreateInvoiceExecutor.id],
  ["zoho:create_lead", zohoCrmCreateLeadExecutor.id],
  ["zoho-crm:create_lead", zohoCrmCreateLeadExecutor.id],
]);

const APP_KEY_ALIASES = new Map<string, string>([
  ["email", "email"],
  ["google", "google"],
  ["gmail", "gmail"],
  ["google docs", "google_docs"],
  ["google document", "google_docs"],
  ["google sheets", "google_sheets"],
  ["google calendar", "google_calendar"],
  ["m-pesa", "mpesa"],
  ["mpesa", "mpesa"],
  ["dobly orchestrator", "orchestrator"],
  ["webhook", "webhook"],
  ["webhook / api", "webhook"],
  ["file", "file"],
  ["hubspot", "hubspot"],
  ["salesforce", "salesforce"],
  ["pipedrive", "pipedrive"],
  ["zoho crm", "zoho"],
  ["zendesk", "zendesk"],
  ["freshdesk", "freshdesk"],
  ["shopify", "shopify"],
  ["paystack", "paystack"],
  ["stripe", "stripe"],
  ["slack", "slack"],
  ["whatsapp", "whatsapp"],
  ["mailchimp", "mailchimp"],
  ["klaviyo", "klaviyo"],
  ["docusign", "docusign"],
  ["notion", "notion"],
  ["airtable", "airtable"],
  ["linkedin", "linkedin"],
  ["zoom", "zoom"],
  ["intercom", "intercom"],
  ["square", "square"],
  ["meta", "meta"],
  ["typeform", "typeform"],
  ["calendly", "calendly"],
  ["trello", "trello"],
  ["asana", "asana"],
  ["monday.com", "monday"],
  ["clickup", "clickup"],
  ["xero", "xero"],
]);

function normalizeKey(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  return APP_KEY_ALIASES.get(raw) ?? raw.replace(/\s+/g, "_");
}

export function getConnectorExecutor(executorId: string) {
  return EXECUTORS.get(executorId) ?? null;
}

export function getExecutorForStep(step: WorkflowActionStep) {
  const action = step.connectorActionId ?? "";
  const candidates = [
    `${step.connectorId ?? ""}:${action}`,
    `${normalizeKey(step.app)}:${action}`,
    `${String(step.app ?? "")}:${action}`,
  ].filter((key) => !key.startsWith(":") && !key.endsWith(":"));

  for (const key of candidates) {
    const mapped = STEP_EXECUTOR_MAP.get(key);
    if (mapped) {
      return getConnectorExecutor(mapped);
    }
  }
  return null;
}
