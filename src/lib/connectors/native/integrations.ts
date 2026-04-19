import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

// ==================== PIPEDRIVE ====================
async function getPipedriveConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "pipedrive");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Pipedrive token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const pipedriveCreateLeadExecutor: ConnectorExecutor = {
  id: "native.pipedrive.create-lead",
  async execute(context) {
    const { accessToken } = await getPipedriveConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const title = String(context.config.title ?? "").trim();
    const email = String(context.config.email ?? "").trim();
    if (!title) throw new Error("Pipedrive create lead requires title");

    const response = await fetch("https://api.pipedrive.com/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        email,
        person_id: context.config.personId,
        organization_id: context.config.organizationId,
      }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(`Pipedrive failed: ${data.error}`);
    return { provider: "pipedrive", leadId: data.data?.id ?? null };
  },
};

export const pipedriveCreateDealExecutor: ConnectorExecutor = {
  id: "native.pipedrive.create-deal",
  async execute(context) {
    const { accessToken } = await getPipedriveConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const title = String(context.config.title ?? "").trim();
    if (!title) throw new Error("Pipedrive create deal requires title");

    const response = await fetch("https://api.pipedrive.com/v1/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        value: context.config.value || 0,
        currency: context.config.currency || "USD",
        person_id: context.config.personId,
        org_id: context.config.orgId,
        stage_id: context.config.stageId,
      }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(`Pipedrive failed: ${data.error}`);
    return { provider: "pipedrive", dealId: data.data?.id ?? null, title };
  },
};

// ==================== NOTION ====================
async function getNotionConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "notion");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.secret) throw new Error("Notion token missing");
  return { connection, secret: secrets.secret };
}

export const notionCreatePageExecutor: ConnectorExecutor = {
  id: "native.notion.create-page",
  async execute(context) {
    const { secret } = await getNotionConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const parentPageId = String(context.config.parentPageId ?? "").trim();
    const title = String(context.config.title ?? "").trim();
    if (!parentPageId || !title) throw new Error("Notion create page requires parentPageId and title");

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secret}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { page_id: parentPageId },
        properties: { title: { title: [{ text: { content: title } }] } },
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Notion failed: ${JSON.stringify(data)}`);
    return { provider: "notion", pageId: data.id ?? null, title };
  },
};

export const notionAppendDatabaseExecutor: ConnectorExecutor = {
  id: "native.notion.append-database",
  async execute(context) {
    const { secret } = await getNotionConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const databaseId = String(context.config.databaseId ?? "").trim();
    const properties = context.config.properties || {};
    if (!databaseId) throw new Error("Notion append database requires databaseId");

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secret}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Notion failed: ${JSON.stringify(data)}`);
    return { provider: "notion", pageId: data.id ?? null };
  },
};

// ==================== AIRTABLE ====================
async function getAirtableConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "airtable");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Airtable token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const airtableCreateRecordExecutor: ConnectorExecutor = {
  id: "native.airtable.create-record",
  async execute(context) {
    const { accessToken } = await getAirtableConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const baseId = String(context.config.baseId ?? "").trim();
    const tableId = String(context.config.tableId ?? "").trim();
    const fields = context.config.fields || {};
    if (!baseId || !tableId) throw new Error("Airtable requires baseId and tableId");

    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields }] }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Airtable failed: ${JSON.stringify(data)}`);
    return { provider: "airtable", recordId: data.records?.[0]?.id ?? null };
  },
};

export const airtableUpdateRecordExecutor: ConnectorExecutor = {
  id: "native.airtable.update-record",
  async execute(context) {
    const { accessToken } = await getAirtableConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const baseId = String(context.config.baseId ?? "").trim();
    const tableId = String(context.config.tableId ?? "").trim();
    const recordId = String(context.config.recordId ?? "").trim();
    const fields = context.config.fields || {};
    if (!baseId || !tableId || !recordId) throw new Error("Airtable requires baseId, tableId, recordId");

    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Airtable failed: ${JSON.stringify(data)}`);
    return { provider: "airtable", recordId: data.id ?? null };
  },
};

// ==================== LINKEDIN ====================
async function getLinkedInConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "linkedin");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("LinkedIn token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const linkedinSharePostExecutor: ConnectorExecutor = {
  id: "native.linkedin.share-post",
  async execute(context) {
    const { accessToken } = await getLinkedInConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const text = String(context.config.text ?? "").trim();
    if (!text) throw new Error("LinkedIn share requires text");

    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        author: `urn:li:person:${context.config.personId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.UGCPost": {
            content: { "com.linkedin.ugc.Text": { text } },
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`LinkedIn failed: ${JSON.stringify(data)}`);
    return { provider: "linkedin", postId: data.id ?? null };
  },
};

// ==================== ZOOM ====================
async function getZoomConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "zoom");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Zoom token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const zoomCreateMeetingExecutor: ConnectorExecutor = {
  id: "native.zoom.create-meeting",
  async execute(context) {
    const { accessToken } = await getZoomConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const topic = String(context.config.topic ?? "").trim();
    const userId = String(context.config.userId ?? "me").trim();
    if (!topic) throw new Error("Zoom create meeting requires topic");

    const response = await fetch(`https://api.zoom.us/v2/users/${userId}/meetings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        type: 2,
        start_time: context.config.startTime,
        duration: context.config.duration || 60,
        timezone: context.config.timezone || "UTC",
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Zoom failed: ${JSON.stringify(data)}`);
    return { provider: "zoom", meetingId: data.id ?? null, joinUrl: data.join_url ?? null };
  },
};

// ==================== FRESHDESK ====================
async function getFreshdeskConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "freshdesk");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Freshdesk token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const freshdeskCreateTicketExecutor: ConnectorExecutor = {
  id: "native.freshdesk.create-ticket",
  async execute(context) {
    const { accessToken } = await getFreshdeskConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const email = String(context.config.email ?? "").trim();
    const subject = String(context.config.subject ?? "").trim();
    const description = String(context.config.description ?? "").trim();
    if (!email || !subject) throw new Error("Freshdesk requires email and subject");

    const response = await fetch("https://api.freshdesk.com/api/v2/tickets", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${accessToken}:X`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        subject,
        description,
        priority: context.config.priority || 1,
        status: context.config.status || 2,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Freshdesk failed: ${JSON.stringify(data)}`);
    return { provider: "freshdesk", ticketId: data.id ?? null, ticketUrl: data.display_id ?? null };
  },
};

// ==================== INTERCOM ====================
async function getIntercomConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "intercom");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Intercom token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const intercomCreateContactExecutor: ConnectorExecutor = {
  id: "native.intercom.create-contact",
  async execute(context) {
    const { accessToken } = await getIntercomConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const email = String(context.config.email ?? "").trim();
    const name = String(context.config.name ?? "").trim();
    if (!email) throw new Error("Intercom requires email");

    const response = await fetch("https://api.intercom.io/contacts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Intercom-Version": "2.9",
      },
      body: JSON.stringify({
        email,
        name,
        custom_attributes: context.config.customAttributes || {},
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Intercom failed: ${JSON.stringify(data)}`);
    return { provider: "intercom", contactId: data.id ?? null, email };
  },
};

// ==================== SQUARE ====================
async function getSquareConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "square");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Square token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const squareCreateCustomerExecutor: ConnectorExecutor = {
  id: "native.square.create-customer",
  async execute(context) {
    const { accessToken } = await getSquareConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const email = String(context.config.email ?? "").trim();
    const givenName = String(context.config.givenName ?? "").trim();
    if (!email) throw new Error("Square requires email");

    const response = await fetch("https://connect.squareup.com/v2/customers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        given_name: givenName,
        family_name: context.config.familyName || "",
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Square failed: ${JSON.stringify(data)}`);
    return { provider: "square", customerId: data.customer?.id ?? null, email };
  },
};
