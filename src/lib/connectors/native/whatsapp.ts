import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

export const whatsappSendMessageExecutor: ConnectorExecutor = {
  id: "native.whatsapp.send",
  async execute(context) {
    const connection =
      typeof context.config.connectionId === "string"
        ? await getConnectionById(context.config.connectionId, context.workflow.user_id)
        : await getActiveConnectionForProvider(context.workflow.user_id, "whatsapp");
    const secrets = await getDecryptedConnectionSecrets(connection.id);
    const phoneNumberId =
      String(connection.metadata?.phoneNumberId ?? context.config.phoneNumberId ?? "").trim();
    const to = String(context.config.to ?? "").trim();
    const text = String(context.config.message ?? context.config.text ?? context.step.description).trim();

    if (!secrets.accessToken || !phoneNumberId || !to || !text) {
      throw new Error("WhatsApp send requires token, phoneNumberId, recipient, and text.");
    }

    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secrets.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`WhatsApp send failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "whatsapp",
      messageId: data.messages?.[0]?.id ?? null,
      to,
    };
  },
};
