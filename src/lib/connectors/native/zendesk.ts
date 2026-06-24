import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

function zendeskHost(subdomain: string) {
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/i.test(subdomain)) throw new Error("Zendesk subdomain is invalid.");
  return `${subdomain.toLowerCase()}.zendesk.com`;
}

async function getZendeskConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "zendesk");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) {
    throw new Error("Zendesk connection is missing an access token.");
  }
  return { connection, accessToken: secrets.accessToken };
}

/**
 * Create a support ticket in Zendesk
 */
export const zendeskCreateTicketExecutor: ConnectorExecutor = {
  id: "native.zendesk.create-ticket",
  async execute(context) {
    const { connection, accessToken } = await getZendeskConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const subdomain = String(context.config.subdomain ?? "").trim();
    const subject = String(context.config.subject ?? "").trim();
    const description = String(context.config.description ?? "").trim();
    const email = String(context.config.email ?? "").trim();

    if (!subdomain || !subject || !description) {
      throw new Error("Zendesk create ticket requires subdomain, subject, and description.");
    }

    const response = await fetch(`https://${zendeskHost(subdomain)}/api/v2/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticket: {
          subject,
          description,
          requester_email: email || "noreply@dobly.app",
          priority: context.config.priority || "normal",
          tags: Array.isArray(context.config.tags) ? context.config.tags : [],
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Zendesk create ticket failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "zendesk",
      service: "ticket",
      ticketId: data.ticket?.id ?? null,
      ticketUrl: data.ticket?.url ?? null,
    };
  },
};

/**
 * Update a Zendesk ticket
 */
export const zendeskUpdateTicketExecutor: ConnectorExecutor = {
  id: "native.zendesk.update-ticket",
  async execute(context) {
    const { connection, accessToken } = await getZendeskConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const subdomain = String(context.config.subdomain ?? "").trim();
    const ticketId = String(context.config.ticketId ?? "").trim();
    const status = String(context.config.status ?? "").trim();

    if (!subdomain || !ticketId) {
      throw new Error("Zendesk update ticket requires subdomain and ticketId.");
    }

    const updatePayload: Record<string, any> = {};
    if (status) updatePayload.status = status;
    if (context.config.comment) updatePayload.comment = { body: context.config.comment };
    if (context.config.assigneeId) updatePayload.assignee_id = context.config.assigneeId;

    const response = await fetch(`https://${zendeskHost(subdomain)}/api/v2/tickets/${encodeURIComponent(ticketId)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ticket: updatePayload }),
      signal: AbortSignal.timeout(20_000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Zendesk update ticket failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "zendesk",
      service: "ticket",
      ticketId: data.ticket?.id ?? null,
      status: data.ticket?.status ?? null,
    };
  },
};
