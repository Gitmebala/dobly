import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

async function getDocuSignConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "docusign");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) {
    throw new Error("DocuSign connection is missing an access token.");
  }
  return { connection, accessToken: secrets.accessToken };
}

/**
 * Create and send a DocuSign envelope (document for signing)
 */
export const docusignCreateEnvelopeExecutor: ConnectorExecutor = {
  id: "native.docusign.create-envelope",
  async execute(context) {
    const { connection, accessToken } = await getDocuSignConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const recipientEmail = String(context.config.recipientEmail ?? "").trim();
    const recipientName = String(context.config.recipientName ?? "").trim();
    const documentBase64 = String(context.config.documentBase64 ?? "").trim();
    const subject = String(context.config.subject ?? "Document for Signature").trim();

    if (!recipientEmail || !recipientName || !documentBase64) {
      throw new Error("DocuSign create envelope requires recipientEmail, recipientName, and documentBase64.");
    }

    const accountId = String(connection.account_identifier ?? "").trim();
    if (!accountId) {
      throw new Error("DocuSign connection missing account ID.");
    }

    const envelopeDefinition = {
      emailSubject: subject,
      documents: [
        {
          documentBase64: documentBase64,
          name: context.config.documentName || "Document",
          fileExtension: context.config.fileExtension || "pdf",
          documentId: "1",
        },
      ],
      recipients: {
        signers: [
          {
            email: recipientEmail,
            name: recipientName,
            recipientId: "1",
            routingOrder: "1",
            tabs: {
              signHereTabs: [
                {
                  documentId: "1",
                  pageNumber: "1",
                  xPosition: context.config.xPosition || "100",
                  yPosition: context.config.yPosition || "100",
                },
              ],
            },
          },
        ],
      },
      status: "sent",
    };

    const response = await fetch(
      `https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/envelopes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(envelopeDefinition),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`DocuSign create envelope failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "docusign",
      service: "envelope",
      envelopeId: data.envelopeId ?? null,
      status: data.status ?? null,
      uri: data.uri ?? null,
    };
  },
};

/**
 * Get the status of a DocuSign envelope
 */
export const docusignGetEnvelopeStatusExecutor: ConnectorExecutor = {
  id: "native.docusign.get-envelope-status",
  async execute(context) {
    const { connection, accessToken } = await getDocuSignConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const envelopeId = String(context.config.envelopeId ?? "").trim();
    if (!envelopeId) {
      throw new Error("DocuSign get envelope status requires envelopeId.");
    }

    const accountId = String(connection.account_identifier ?? "").trim();
    if (!accountId) {
      throw new Error("DocuSign connection missing account ID.");
    }

    const response = await fetch(
      `https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`DocuSign get envelope status failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "docusign",
      service: "envelope",
      envelopeId: data.envelopeId ?? null,
      status: data.status ?? null,
      signingLocation: data.signingLocation ?? null,
      createdDateTime: data.createdDateTime ?? null,
      sentDateTime: data.sentDateTime ?? null,
      completedDateTime: data.completedDateTime ?? null,
    };
  },
};
