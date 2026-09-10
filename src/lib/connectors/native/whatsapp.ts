import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

/**
 * Send one WhatsApp text message.
 *
 * Extracted from the executor so callers that have no workflow can reply too.
 * The inbound Meta webhook is the important one: WhatsApp is asynchronous, so
 * unlike SMS or voice there is no reply channel in the HTTP response - the
 * only way to answer is a fresh Graph API call like this. Without it the
 * webhook ingested the message, drafted an answer, logged it to the coworker's
 * chat, and then said nothing back to the customer.
 */
export async function sendWhatsAppMessage(input: {
  userId: string;
  to: string;
  text: string;
  connectionId?: string | null;
  phoneNumberId?: string | null;
}) {
  const connection = input.connectionId
    ? await getConnectionById(input.connectionId, input.userId)
    : await getActiveConnectionForProvider(input.userId, "whatsapp");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  const phoneNumberId = String(connection.metadata?.phoneNumberId ?? input.phoneNumberId ?? "").trim();
  const to = input.to.trim();
  const text = input.text.trim();

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
    provider: "whatsapp" as const,
    messageId: data.messages?.[0]?.id ?? null,
    to,
  };
}

export const whatsappSendMessageExecutor: ConnectorExecutor = {
  id: "native.whatsapp.send",
  async execute(context) {
    return sendWhatsAppMessage({
      userId: context.workflow.user_id,
      connectionId:
        typeof context.config.connectionId === "string" ? context.config.connectionId : null,
      phoneNumberId:
        typeof context.config.phoneNumberId === "string" ? context.config.phoneNumberId : null,
      to: String(context.config.to ?? ""),
      text: String(context.config.message ?? context.config.text ?? context.step.description),
    });
  },
};
