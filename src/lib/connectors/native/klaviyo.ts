import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

async function getKlaviyoConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "klaviyo");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) {
    throw new Error("Klaviyo connection is missing an access token.");
  }
  return { connection, accessToken: secrets.accessToken };
}

/**
 * Subscribe someone to a Klaviyo list
 */
export const klaviyoSubscribeExecutor: ConnectorExecutor = {
  id: "native.klaviyo.subscribe",
  async execute(context) {
    const { accessToken } = await getKlaviyoConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const email = String(context.config.email ?? "").trim();
    const listId = String(context.config.listId ?? "").trim();

    if (!email || !listId) {
      throw new Error("Klaviyo subscribe requires email and listId.");
    }

    const response = await fetch("https://a.klaviyo.com/api/v2/list/subscribe", {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        list_id: listId,
        email: email,
        double_opt_in: context.config.doubleOptIn !== false,
        properties: context.config.properties || {},
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Klaviyo subscribe failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "klaviyo",
      service: "subscription",
      email: email,
      subscribed: true,
    };
  },
};

/**
 * Track an event for a Klaviyo customer
 */
export const klaviyoTrackEventExecutor: ConnectorExecutor = {
  id: "native.klaviyo.track-event",
  async execute(context) {
    const { accessToken } = await getKlaviyoConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const email = String(context.config.email ?? "").trim();
    const eventName = String(context.config.eventName ?? "").trim();

    if (!email || !eventName) {
      throw new Error("Klaviyo track event requires email and eventName.");
    }

    const response = await fetch("https://a.klaviyo.com/api/v2/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: accessToken,
        event: eventName,
        customer_properties: {
          email: email,
        },
        properties: context.config.properties || {},
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(`Klaviyo track event failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "klaviyo",
      service: "event",
      email: email,
      event: eventName,
      tracked: true,
    };
  },
};

/**
 * Send a Klaviyo campaign to a list
 */
export const klaviyoSendCampaignExecutor: ConnectorExecutor = {
  id: "native.klaviyo.send-campaign",
  async execute(context) {
    const { accessToken } = await getKlaviyoConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const campaignId = String(context.config.campaignId ?? "").trim();

    if (!campaignId) {
      throw new Error("Klaviyo send campaign requires campaignId.");
    }

    const response = await fetch(`https://a.klaviyo.com/api/v2/campaign/${campaignId}/send`, {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(`Klaviyo send campaign failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "klaviyo",
      service: "campaign",
      campaignId: campaignId,
      sent: true,
    };
  },
};
