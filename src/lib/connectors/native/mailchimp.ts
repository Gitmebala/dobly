import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

async function getMailchimpConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "mailchimp");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) {
    throw new Error("Mailchimp connection is missing an access token.");
  }
  return { connection, accessToken: secrets.accessToken };
}

/**
 * Add or update subscriber in Mailchimp list
 */
export const mailchimpAddSubscriberExecutor: ConnectorExecutor = {
  id: "native.mailchimp.add-subscriber",
  async execute(context) {
    const { accessToken } = await getMailchimpConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const listId = String(context.config.listId ?? "").trim();
    const email = String(context.config.email ?? "").trim();
    const firstName = String(context.config.firstName ?? "").trim();
    const lastName = String(context.config.lastName ?? "").trim();

    if (!listId || !email) {
      throw new Error("Mailchimp add subscriber requires listId and email.");
    }

    // Extract datacenter from API key (format: xxxxx-us1)
    const datacenter = accessToken.split("-")[1];
    if (!datacenter) {
      throw new Error("Invalid Mailchimp API key format.");
    }

    const response = await fetch(
      `https://${datacenter}.api.mailchimp.com/3.0/lists/${listId}/members`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`anystring:${accessToken}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: email,
          status: "subscribed",
          merge_fields: {
            FNAME: firstName,
            LNAME: lastName,
          },
        }),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Mailchimp add subscriber failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "mailchimp",
      service: "subscriber",
      memberId: data.id ?? null,
      email: data.email_address ?? null,
      status: data.status ?? null,
    };
  },
};

/**
 * Send Mailchimp campaign
 */
export const mailchimpSendCampaignExecutor: ConnectorExecutor = {
  id: "native.mailchimp.send-campaign",
  async execute(context) {
    const { accessToken } = await getMailchimpConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const campaignId = String(context.config.campaignId ?? "").trim();
    if (!campaignId) {
      throw new Error("Mailchimp send campaign requires campaignId.");
    }

    const datacenter = accessToken.split("-")[1];
    if (!datacenter) {
      throw new Error("Invalid Mailchimp API key format.");
    }

    const response = await fetch(
      `https://${datacenter}.api.mailchimp.com/3.0/campaigns/${campaignId}/actions/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`anystring:${accessToken}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(`Mailchimp send campaign failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "mailchimp",
      service: "campaign",
      campaignId: campaignId,
      sent: true,
    };
  },
};
