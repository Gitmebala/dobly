import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

export const slackSendMessageExecutor: ConnectorExecutor = {
  id: "native.slack.send",
  async execute(context) {
    const connection =
      typeof context.config.connectionId === "string"
        ? await getConnectionById(context.config.connectionId, context.workflow.user_id)
        : await getActiveConnectionForProvider(context.workflow.user_id, "slack");
    const secrets = await getDecryptedConnectionSecrets(connection.id);
    if (!secrets.accessToken) {
      throw new Error("Slack connection is missing an access token.");
    }

    const channel = String(context.config.channel ?? "").trim();
    const text = String(context.config.text ?? context.step.description).trim();
    if (!channel || !text) {
      throw new Error("Slack message requires channel and text.");
    }

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secrets.accessToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel, text }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(`Slack send failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "slack",
      channel,
      ts: data.ts ?? null,
    };
  },
};
