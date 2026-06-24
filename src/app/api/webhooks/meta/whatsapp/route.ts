import { NextRequest, NextResponse } from "next/server";
import { normalizePhoneIdentifier, resolveUserByChannelIdentifier } from "@/lib/communications/channel-resolver";
import { markCommunicationMessagesByProvider } from "@/lib/communications/ledger";
import { ingestInboundCommunication } from "@/lib/communications/runtime";
import { isWebhookSecurityDisabledForDev, verifyHmacSignature } from "@/lib/webhooks/security";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.META_WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed." }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const allowed =
    isWebhookSecurityDisabledForDev() ||
    (await verifyHmacSignature({
      req,
      rawBody,
      secret: process.env.META_APP_SECRET,
      signatureHeader: "x-hub-signature-256",
    }));

  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody || "{}");
  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  const ingested: Array<{ messageId: string; owner: string }> = [];

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const phoneNumberId = String(value.metadata?.phone_number_id ?? "");
      const displayPhoneNumber = normalizePhoneIdentifier(value.metadata?.display_phone_number);
      const messages = Array.isArray(value.messages) ? value.messages : [];
      const statuses = Array.isArray(value.statuses) ? value.statuses : [];

      for (const status of statuses) {
        const providerMessageId = String(status.id ?? "").trim();
        if (!providerMessageId) continue;

        const statusValue = String(status.status ?? "").toLowerCase();
        const normalizedStatus =
          statusValue === "failed"
            ? "failed"
            : statusValue === "sent" || statusValue === "delivered" || statusValue === "read"
              ? "sent"
              : undefined;

        await markCommunicationMessagesByProvider({
          providerMessageId,
          status: normalizedStatus,
          summary:
            statusValue === "read"
              ? "WhatsApp message read by recipient."
              : statusValue === "delivered"
                ? "WhatsApp message delivered to recipient."
                : statusValue === "sent"
                  ? "WhatsApp message accepted by provider."
                  : statusValue === "failed"
                    ? `WhatsApp delivery failed${status.errors?.[0]?.title ? `: ${status.errors[0].title}` : "."}`
                    : null,
          metadata: {
            provider: "meta_whatsapp",
            delivery_status: statusValue || null,
            delivery_status_at: status.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString(),
            delivery_error: status.errors?.[0] ?? null,
            recipient: normalizePhoneIdentifier(status.recipient_id),
          },
        }).catch(() => undefined);
      }

      for (const message of messages) {
        const from = normalizePhoneIdentifier(message.from);
        const body =
          typeof message.text?.body === "string"
            ? message.text.body
            : typeof message.button?.text === "string"
            ? message.button.text
            : "";

        if (!from || !body) continue;

        const owner =
          (phoneNumberId
            ? await resolveUserByChannelIdentifier({
                channelId: "whatsapp_business",
                identifier: phoneNumberId,
              })
            : null) ||
          (displayPhoneNumber
            ? await resolveUserByChannelIdentifier({
                channelId: "whatsapp_business",
                identifier: displayPhoneNumber,
              })
            : null);

        if (!owner) continue;

        await ingestInboundCommunication({
          userId: owner.userId,
          workspaceId: owner.workspaceId,
          channel: "whatsapp",
          from,
          to: displayPhoneNumber || phoneNumberId,
          body,
          providerMessageId: String(message.id ?? ""),
          metadata: {
            provider: "meta_whatsapp",
            connectionId: owner.connectionId,
            phoneNumberId,
            messageType: message.type,
          },
        });

        ingested.push({ messageId: String(message.id ?? ""), owner: owner.userId });
      }
    }
  }

  return NextResponse.json({ received: true, ingested });
}
