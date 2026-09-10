import { sendWhatsAppMessage } from "@/lib/connectors/native/whatsapp";
import { NextRequest, NextResponse } from "next/server";
import { normalizePhoneIdentifier, resolveUserByChannelIdentifier } from "@/lib/communications/channel-resolver";
import { markCommunicationMessagesByProvider } from "@/lib/communications/ledger";
import { ingestInboundCommunication } from "@/lib/communications/runtime";
import { appendOperatorChatMessage, ensureOperatorConversation, recordOperatorChatEvent } from "@/lib/operator-chat";
import { isWebhookSecurityDisabledForDev, verifyHmacSignature } from "@/lib/webhooks/security";
import { secureSecretMatches } from "@/lib/security/secrets";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && secureSecretMatches(process.env.META_WHATSAPP_VERIFY_TOKEN, token)) {
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

        const inbound = await ingestInboundCommunication({
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

        // Actually answer the customer. WhatsApp is asynchronous: unlike SMS
        // (TwiML) or voice, nothing in this HTTP response reaches the sender,
        // so a reply has to be an outbound Graph API call. This route used to
        // ingest the message, draft an answer and file it in the coworker's
        // chat while the customer sat in silence - the coworker looked live
        // and connected but never once replied on the channel that matters
        // most here. A draft flagged for approval still waits for a human.
        const draftedReply = inbound?.draft?.requiresApproval
          ? null
          : inbound?.draft?.suggestedReply?.trim();

        if (draftedReply) {
          try {
            await sendWhatsAppMessage({
              userId: owner.userId,
              connectionId: owner.connectionId ?? null,
              phoneNumberId,
              to: from,
              text: draftedReply,
            });
          } catch (sendError) {
            // Never fail the webhook over a send: Meta retries on non-200 and
            // would re-ingest the same message, duplicating the conversation.
            console.error("[meta whatsapp] failed to send reply", sendError);
          }
        }

        if (owner.operatorId) {
          try {
            const conversation = await ensureOperatorConversation({
              userId: owner.userId,
              operatorId: owner.operatorId,
              workspaceId: owner.workspaceId,
            });
            const sourceMessage = await appendOperatorChatMessage({
              conversationId: conversation.id,
              userId: owner.userId,
              workspaceId: owner.workspaceId,
              operatorId: owner.operatorId,
              role: "user",
              intent: "instruction",
              body: `Incoming WhatsApp from ${from}: "${body}"`,
              metadata: { source: "meta_whatsapp", messageId: message.id, from },
            });
            await recordOperatorChatEvent({
              conversationId: conversation.id,
              messageId: sourceMessage.id,
              userId: owner.userId,
              workspaceId: owner.workspaceId,
              operatorId: owner.operatorId,
              eventType: "user_input",
              title: "WhatsApp message received",
              summary: body.slice(0, 200),
              payload: { messageId: message.id, from },
            });
          } catch (chatError) {
            console.error("[whatsapp] failed to post message into operator chat", chatError);
          }
        }

        ingested.push({ messageId: String(message.id ?? ""), owner: owner.userId });
      }
    }
  }

  return NextResponse.json({ received: true, ingested });
}
