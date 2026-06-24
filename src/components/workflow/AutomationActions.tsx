"use client";

import { useMemo } from "react";
import { CONNECTION_PROVIDERS } from "@/lib/connection-catalog";

type ConnectorAction = {
  id: string;
  label: string;
  executor: string;
};

type ProviderDefinition = (typeof CONNECTION_PROVIDERS)[number];

/**
 * Get available automation actions for a provider
 * Used by workflow builder to display available actions
 */
export function getConnectorActionsForProvider(providerId: string) {
  const provider = CONNECTION_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return [];

  // Map provider to connector definitions
  const actionMap: Record<string, ConnectorAction[]> = {
    mailchimp: [
      { id: "add_subscriber", label: "Add Subscriber", executor: "native.mailchimp.add-subscriber" },
      { id: "send_campaign", label: "Send Campaign", executor: "native.mailchimp.send-campaign" },
    ],
    zendesk: [
      { id: "create_ticket", label: "Create Ticket", executor: "native.zendesk.create-ticket" },
      { id: "update_ticket", label: "Update Ticket", executor: "native.zendesk.update-ticket" },
    ],
    klaviyo: [
      { id: "subscribe", label: "Subscribe Contact", executor: "native.klaviyo.subscribe" },
      { id: "track_event", label: "Track Event", executor: "native.klaviyo.track-event" },
      { id: "send_campaign", label: "Send Campaign", executor: "native.klaviyo.send-campaign" },
    ],
    docusign: [
      { id: "create_envelope", label: "Create Envelope", executor: "native.docusign.create-envelope" },
      { id: "get_status", label: "Get Envelope Status", executor: "native.docusign.get-envelope-status" },
    ],
    paystack: [
      { id: "payment_link", label: "Create Payment Link", executor: "native.paystack.payment-link" },
    ],
    stripe: [
      { id: "create_customer", label: "Create Customer", executor: "native.stripe.create-customer" },
      { id: "create_invoice", label: "Create Invoice", executor: "native.stripe.create-invoice" },
      { id: "refund_charge", label: "Refund Charge", executor: "native.stripe.refund-charge" },
    ],
    hubspot: [
      { id: "create_contact", label: "Create Contact", executor: "native.hubspot.create-contact" },
      { id: "update_deal", label: "Update Deal", executor: "native.hubspot.update-deal" },
      { id: "create_task", label: "Create Task", executor: "native.hubspot.create-task" },
    ],
    shopify: [
      { id: "create_customer", label: "Create Customer", executor: "native.shopify.create-customer" },
      { id: "create_order", label: "Create Order", executor: "native.shopify.create-order" },
      { id: "update_fulfillment", label: "Update Fulfillment", executor: "native.shopify.update-fulfillment" },
    ],
    pipedrive: [
      { id: "create_lead", label: "Create Lead", executor: "native.pipedrive.create-lead" },
      { id: "create_deal", label: "Create Deal", executor: "native.pipedrive.create-deal" },
    ],
    notion: [
      { id: "create_page", label: "Create Page", executor: "native.notion.create-page" },
      { id: "append_database", label: "Append to Database", executor: "native.notion.append-database" },
    ],
    airtable: [
      { id: "create_record", label: "Create Record", executor: "native.airtable.create-record" },
      { id: "update_record", label: "Update Record", executor: "native.airtable.update-record" },
    ],
    linkedin: [
      { id: "share_post", label: "Share Post", executor: "native.linkedin.share-post" },
    ],
    zoom: [
      { id: "create_meeting", label: "Create Meeting", executor: "native.zoom.create-meeting" },
    ],
    freshdesk: [
      { id: "create_ticket", label: "Create Ticket", executor: "native.freshdesk.create-ticket" },
    ],
    intercom: [
      { id: "create_contact", label: "Create Contact", executor: "native.intercom.create-contact" },
    ],
    square: [
      { id: "create_customer", label: "Create Customer", executor: "native.square.create-customer" },
    ],
    meta: [
      { id: "post", label: "Create Post", executor: "native.meta.post" },
    ],
    salesforce: [
      { id: "create_lead", label: "Create Lead", executor: "native.salesforce.create-lead" },
      { id: "create_opportunity", label: "Create Opportunity", executor: "native.salesforce.create-opportunity" },
    ],
    typeform: [
      { id: "get_responses", label: "Get Responses", executor: "native.typeform.get-responses" },
    ],
    calendly: [
      { id: "get_events", label: "Get Events", executor: "native.calendly.get-events" },
    ],
    trello: [
      { id: "create_card", label: "Create Card", executor: "native.trello.create-card" },
    ],
    asana: [
      { id: "create_task", label: "Create Task", executor: "native.asana.create-task" },
    ],
    monday: [
      { id: "create_item", label: "Create Item", executor: "native.monday.create-item" },
    ],
    clickup: [
      { id: "create_task", label: "Create Task", executor: "native.clickup.create-task" },
    ],
    xero: [
      { id: "create_invoice", label: "Create Invoice", executor: "native.xero.create-invoice" },
    ],
    "zoho-crm": [
      { id: "create_lead", label: "Create Lead", executor: "native.zoho-crm.create-lead" },
    ],
    google: [
      { id: "send_email", label: "Send Email", executor: "native.google.gmail.send" },
      { id: "append_sheet", label: "Append to Sheet", executor: "native.google.sheets.append" },
      { id: "read_range", label: "Read Range", executor: "native.google.sheets.read" },
    ],
    slack: [
      { id: "send_message", label: "Send Message", executor: "native.slack.send" },
    ],
    twilio: [
      { id: "send_sms", label: "Send SMS", executor: "native.twilio.send-sms" },
    ],
  };

  return actionMap[providerId] || [];
}

/**
 * Component: All available automation actions
 * Used in workflow builder to show what users can automate
 */
export function AutomationActionsGrid() {
  const allActions = useMemo(() => {
    const actions: Array<ConnectorAction & { provider: ProviderDefinition }> = [];
    for (const provider of CONNECTION_PROVIDERS) {
      const providerActions = getConnectorActionsForProvider(provider.id);
      for (const action of providerActions) {
        actions.push({
          provider,
          ...action,
        });
      }
    }
    return actions;
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {allActions.map((action) => (
        <button
          key={`${action.provider.id}:${action.id}`}
          className="p-4 border border-[rgba(245,237,228,0.08)] rounded-lg hover:border-[var(--dobly-accent)] hover:bg-[rgba(196,80,26,0.08)] cursor-pointer transition"
          title={action.provider.description}
        >
          <div className="text-sm font-medium text-[var(--dobly-text)]">{action.label}</div>
          <div className="text-xs text-[var(--dobly-text-muted)] mt-1">{action.provider.label}</div>
        </button>
      ))}
    </div>
  );
}

/**
 * Get action configuration for workflow builder UI
 */
export function getActionConfig(providerId: string, actionId: string) {
  const actions = getConnectorActionsForProvider(providerId);
  return actions.find((a) => a.id === actionId);
}
