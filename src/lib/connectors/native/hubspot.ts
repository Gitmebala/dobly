import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

async function getHubSpotConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "hubspot");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) {
    throw new Error("HubSpot connection is missing an access token.");
  }
  return { connection, accessToken: secrets.accessToken };
}

/**
 * Create a contact in HubSpot
 */
export const hubspotCreateContactExecutor: ConnectorExecutor = {
  id: "native.hubspot.create-contact",
  async execute(context) {
    const { accessToken } = await getHubSpotConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const email = String(context.config.email ?? "").trim();
    const firstName = String(context.config.firstName ?? "").trim();
    const lastName = String(context.config.lastName ?? "").trim();

    if (!email) {
      throw new Error("HubSpot create contact requires email.");
    }

    const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          email,
          firstname: firstName,
          lastname: lastName,
          lifecyclestage: context.config.lifecycleStage || "lead",
        },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`HubSpot create contact failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "hubspot",
      service: "contact",
      contactId: data.id ?? null,
      email: email,
    };
  },
};

/**
 * Update a HubSpot deal
 */
export const hubspotUpdateDealExecutor: ConnectorExecutor = {
  id: "native.hubspot.update-deal",
  async execute(context) {
    const { accessToken } = await getHubSpotConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const dealId = String(context.config.dealId ?? "").trim();
    const stage = String(context.config.stage ?? "").trim();

    if (!dealId) {
      throw new Error("HubSpot update deal requires dealId.");
    }

    const properties: Record<string, any> = {};
    if (stage) properties.dealstage = stage;
    if (context.config.dealValue) properties.amount = Number(context.config.dealValue);
    if (context.config.dealName) properties.dealname = context.config.dealName;

    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`HubSpot update deal failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "hubspot",
      service: "deal",
      dealId: data.id ?? null,
      stage: data.properties?.dealstage ?? null,
    };
  },
};

/**
 * Create a HubSpot task
 */
export const hubspotCreateTaskExecutor: ConnectorExecutor = {
  id: "native.hubspot.create-task",
  async execute(context) {
    const { accessToken } = await getHubSpotConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const subject = String(context.config.subject ?? "").trim();
    const contactId = String(context.config.contactId ?? "").trim();

    if (!subject) {
      throw new Error("HubSpot create task requires subject.");
    }

    const response = await fetch("https://api.hubapi.com/crm/v3/objects/tasks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          hs_task_subject: subject,
          hs_task_body: context.config.description || "",
          hs_task_priority: context.config.priority || "NONE",
          hs_task_status: context.config.status || "NOT_STARTED",
        },
        associations: contactId
          ? [
              {
                types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 456 }],
                id: contactId,
              },
            ]
          : undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`HubSpot create task failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "hubspot",
      service: "task",
      taskId: data.id ?? null,
      subject: subject,
    };
  },
};

export const hubspotCreateNoteExecutor: ConnectorExecutor = {
  id: "native.hubspot.create-note",
  async execute(context) {
    const { accessToken } = await getHubSpotConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const noteBody = String(context.config.body ?? context.config.note ?? context.step.description).trim();
    const contactId = String(context.config.contactId ?? "").trim();

    if (!noteBody) {
      throw new Error("HubSpot create note requires note body.");
    }

    const response = await fetch("https://api.hubapi.com/crm/v3/objects/notes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          hs_note_body: noteBody,
          hs_timestamp: new Date().toISOString(),
        },
        associations: contactId
          ? [
              {
                to: { id: contactId },
                types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }],
              },
            ]
          : undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`HubSpot create note failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "hubspot",
      service: "note",
      noteId: data.id ?? null,
      contactId: contactId || null,
    };
  },
};
