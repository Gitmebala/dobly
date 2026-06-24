import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

function salesforceOrigin(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password ||
    !(/\.salesforce\.com$/.test(host) || /\.my\.salesforce\.com$/.test(host) || /\.force\.com$/.test(host))) {
    throw new Error("Salesforce instance URL is not valid.");
  }
  return url.origin;
}

// ==================== META/INSTAGRAM ====================
async function getMetaConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "meta");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Meta token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const metaPostExecutor: ConnectorExecutor = {
  id: "native.meta.post",
  async execute(context) {
    const { accessToken } = await getMetaConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const pageId = String(context.config.pageId ?? "").trim();
    const message = String(context.config.message ?? "").trim();
    if (!pageId || !message) throw new Error("Meta post requires pageId and message");

    const response = await fetch(`https://graph.instagram.com/v18.0/${pageId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: message,
        media_type: "CAROUSEL",
        access_token: accessToken,
      }),
    });

    const data = await response.json();
    if (!data.id) throw new Error(`Meta failed: ${JSON.stringify(data)}`);
    return { provider: "meta", mediaId: data.id ?? null };
  },
};

// ==================== SALESFORCE ====================
async function getSalesforceConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "salesforce");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Salesforce token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const salesforceCreateLeadExecutor: ConnectorExecutor = {
  id: "native.salesforce.create-lead",
  async execute(context) {
    const { connection, accessToken } = await getSalesforceConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const instanceUrl = String(connection.metadata?.instanceUrl ?? "").trim();
    const lastName = String(context.config.lastName ?? "").trim();
    const company = String(context.config.company ?? "").trim();
    if (!instanceUrl || !lastName || !company) throw new Error("Salesforce requires instance URL, last name, and company");

    const response = await fetch(`${salesforceOrigin(instanceUrl)}/services/data/v57.0/sobjects/Lead`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        LastName: lastName,
        FirstName: context.config.firstName || "",
        Company: company,
        Email: context.config.email || "",
        Phone: context.config.phone || "",
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Salesforce failed: ${JSON.stringify(data)}`);
    return { provider: "salesforce", leadId: data.id ?? null };
  },
};

export const salesforceCreateOpportunityExecutor: ConnectorExecutor = {
  id: "native.salesforce.create-opportunity",
  async execute(context) {
    const { connection, accessToken } = await getSalesforceConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const instanceUrl = String(connection.metadata?.instanceUrl ?? "").trim();
    const name = String(context.config.name ?? "").trim();
    const closeDate = String(context.config.closeDate ?? "").trim();
    if (!instanceUrl || !name || !closeDate) throw new Error("Salesforce requires instance URL, name, and closeDate");

    const response = await fetch(`${salesforceOrigin(instanceUrl)}/services/data/v57.0/sobjects/Opportunity`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Name: name,
        CloseDate: closeDate,
        StageName: context.config.stageName || "Prospecting",
        Amount: context.config.amount,
        AccountId: context.config.accountId,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Salesforce failed: ${JSON.stringify(data)}`);
    return { provider: "salesforce", opportunityId: data.id ?? null };
  },
};

// ==================== TYPEFORM ====================
async function getTypeformConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "typeform");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Typeform token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const typeformGetResponsesExecutor: ConnectorExecutor = {
  id: "native.typeform.get-responses",
  async execute(context) {
    const { accessToken } = await getTypeformConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const formId = String(context.config.formId ?? "").trim();
    if (!formId) throw new Error("Typeform requires formId");

    const response = await fetch(`https://api.typeform.com/forms/${formId}/responses`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Typeform failed: ${JSON.stringify(data)}`);
    return { provider: "typeform", formId, responses: data.items ?? [] };
  },
};

// ==================== CALENDLY ====================
async function getCalendlyConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "calendly");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Calendly token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const calendlyGetEventsExecutor: ConnectorExecutor = {
  id: "native.calendly.get-events",
  async execute(context) {
    const { accessToken } = await getCalendlyConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const userUri = String(context.config.userUri ?? "").trim();
    if (!userUri) throw new Error("Calendly requires userUri");

    const response = await fetch(`https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Calendly failed: ${JSON.stringify(data)}`);
    return { provider: "calendly", events: data.collection ?? [] };
  },
};

// ==================== TRELLO ====================
async function getTrelloConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "trello");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Trello token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const trelloCreateCardExecutor: ConnectorExecutor = {
  id: "native.trello.create-card",
  async execute(context) {
    const { accessToken } = await getTrelloConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const listId = String(context.config.listId ?? "").trim();
    const name = String(context.config.name ?? "").trim();
    if (!listId || !name) throw new Error("Trello requires listId and name");

    const response = await fetch("https://api.trello.com/1/cards", {
      method: "POST",
      body: new URLSearchParams({
        idList: listId,
        name,
        desc: String(context.config.description ?? ""),
        key: String(context.config.apiKey ?? ""),
        token: accessToken,
      }).toString(),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Trello failed: ${JSON.stringify(data)}`);
    return { provider: "trello", cardId: data.id ?? null };
  },
};

// ==================== ASANA ====================
async function getAsanaConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "asana");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Asana token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const asanaCreateTaskExecutor: ConnectorExecutor = {
  id: "native.asana.create-task",
  async execute(context) {
    const { accessToken } = await getAsanaConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const projectId = String(context.config.projectId ?? "").trim();
    const name = String(context.config.name ?? "").trim();
    if (!projectId || !name) throw new Error("Asana requires projectId and name");

    const response = await fetch("https://app.asana.com/api/1.0/tasks", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          name,
          projects: [projectId],
          notes: context.config.notes || "",
          assignee: context.config.assigneeId,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Asana failed: ${JSON.stringify(data)}`);
    return { provider: "asana", taskId: data.data?.gid ?? null };
  },
};

// ==================== MONDAY.COM ====================
async function getMondayConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "monday");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Monday token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const mondayCreateItemExecutor: ConnectorExecutor = {
  id: "native.monday.create-item",
  async execute(context) {
    const { accessToken } = await getMondayConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const boardId = String(context.config.boardId ?? "").trim();
    const itemName = String(context.config.itemName ?? "").trim();
    if (!boardId || !itemName) throw new Error("Monday requires boardId and itemName");

    const response = await fetch("https://api.monday.com/graphql", {
      method: "POST",
      headers: {
        "Authorization": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `mutation { create_item (board_id: ${boardId}, item_name: "${itemName}") { id } }`,
      }),
    });

    const data = await response.json();
    if (data.errors) throw new Error(`Monday failed: ${JSON.stringify(data.errors)}`);
    return { provider: "monday", itemId: data.data?.create_item?.id ?? null };
  },
};

// ==================== CLICKUP ====================
async function getClickUpConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "clickup");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("ClickUp token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const clickupCreateTaskExecutor: ConnectorExecutor = {
  id: "native.clickup.create-task",
  async execute(context) {
    const { accessToken } = await getClickUpConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const listId = String(context.config.listId ?? "").trim();
    const name = String(context.config.name ?? "").trim();
    if (!listId || !name) throw new Error("ClickUp requires listId and name");

    const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
      method: "POST",
      headers: {
        "Authorization": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description: context.config.description || "",
        assignees: context.config.assignees,
        priority: context.config.priority,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`ClickUp failed: ${JSON.stringify(data)}`);
    return { provider: "clickup", taskId: data.id ?? null };
  },
};

// ==================== XERO ====================
async function getXeroConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "xero");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Xero token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const xeroCreateInvoiceExecutor: ConnectorExecutor = {
  id: "native.xero.create-invoice",
  async execute(context) {
    const { accessToken } = await getXeroConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const tenantId = String(context.config.tenantId ?? "").trim();
    if (!tenantId) throw new Error("Xero requires tenantId");

    const response = await fetch("https://api.xero.com/api.xro/2.0/Invoices", {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Xero-tenant-id": tenantId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Invoices: [
          {
            Type: context.config.type || "ACCREC",
            Contact: { Name: context.config.contactName },
            DueDate: context.config.dueDate,
            LineItems: context.config.lineItems || [],
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Xero failed: ${JSON.stringify(data)}`);
    return { provider: "xero", invoiceId: data.Invoices?.[0]?.InvoiceID ?? null };
  },
};

// ==================== ZOHO CRM ====================
async function getZohoCrmConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "zoho-crm");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Zoho CRM token missing");
  return { connection, accessToken: secrets.accessToken };
}

export const zohoCrmCreateLeadExecutor: ConnectorExecutor = {
  id: "native.zoho-crm.create-lead",
  async execute(context) {
    const { accessToken } = await getZohoCrmConnection(context.workflow.user_id, typeof context.config.connectionId === "string" ? context.config.connectionId : undefined);
    const lastName = String(context.config.lastName ?? "").trim();
    if (!lastName) throw new Error("Zoho CRM requires lastName");

    const response = await fetch("https://www.zohoapis.com/crm/v5/Leads", {
      method: "POST",
      headers: {
        "Authorization": `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [
          {
            Last_Name: lastName,
            First_Name: context.config.firstName || "",
            Email: context.config.email || "",
            Phone: context.config.phone || "",
            Company: context.config.company || "",
          },
        ],
      }),
    });

    const data = await response.json();
    if (!data.data?.[0]?.id) throw new Error(`Zoho CRM failed: ${JSON.stringify(data)}`);
    return { provider: "zoho-crm", leadId: data.data[0].id };
  },
};
