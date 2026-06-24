import { getConnectionExecutionAuth } from "@/lib/connections";

export interface MetaWhatsAppMessage {
  messaging_product: "whatsapp";
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string; message_status?: string }>;
}

function getMetaWhatsAppConfig(phoneNumberId?: string | null) {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const resolvedPhoneNumberId = phoneNumberId || process.env.META_WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !resolvedPhoneNumberId) {
    throw new Error("Meta WhatsApp is not configured. Set META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID.");
  }

  return { accessToken, phoneNumberId: resolvedPhoneNumberId };
}

export async function sendMetaWhatsAppText(params: {
  userId?: string;
  to: string;
  body: string;
  phoneNumberId?: string | null;
  connectionId?: string | null;
}) {
  let accessToken: string | null = null;
  let phoneNumberId = params.phoneNumberId ?? null;

  if (params.userId) {
    try {
      const auth = await getConnectionExecutionAuth({
        userId: params.userId,
        providerIds: ["whatsapp", "meta"],
        connectionId: params.connectionId ?? undefined,
      });
      accessToken = auth.secrets.accessToken ?? null;
      phoneNumberId =
        phoneNumberId ||
        String((auth.connection.metadata as Record<string, unknown>)?.phoneNumberId ?? "").trim() ||
        null;
    } catch {
      accessToken = null;
    }
  }

  if (!accessToken || !phoneNumberId) {
    const fallback = getMetaWhatsAppConfig(phoneNumberId);
    accessToken = fallback.accessToken;
    phoneNumberId = fallback.phoneNumberId;
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: params.to.replace(/[^\d]/g, ""),
      type: "text",
      text: {
        preview_url: false,
        body: params.body,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data?.error?.message === "string" ? data.error.message : "Meta WhatsApp send failed.");
  }

  return data as MetaWhatsAppMessage;
}
