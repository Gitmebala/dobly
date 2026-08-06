import { NextRequest, NextResponse } from "next/server";
import { normalizePhoneIdentifier, resolveUserByChannelIdentifier } from "@/lib/communications/channel-resolver";
import { ingestInboundCommunication } from "@/lib/communications/runtime";
import { appendOperatorChatMessage, ensureOperatorConversation, recordOperatorChatEvent } from "@/lib/operator-chat";
import { isWebhookSecurityDisabledForDev, verifySharedSecret } from "@/lib/webhooks/security";

function twiml(message: string) {
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(req: NextRequest) {
  const allowed =
    isWebhookSecurityDisabledForDev() ||
    verifySharedSecret(req, "x-dobly-webhook-secret", process.env.TWILIO_WEBHOOK_SECRET);

  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  }

  const form = await req.formData();
  const from = normalizePhoneIdentifier(String(form.get("From") ?? ""));
  const to = normalizePhoneIdentifier(String(form.get("To") ?? ""));
  const body = String(form.get("Body") ?? "").trim();
  const messageSid = String(form.get("MessageSid") ?? "");

  if (!from || !to || !body) {
    return twiml("Thanks. We received your message.");
  }

  const owner = await resolveUserByChannelIdentifier({
    channelId: "business_sms",
    identifier: to,
  });

  if (!owner) {
    return twiml("Thanks. This number is not connected to Dobly yet.");
  }

  const result = await ingestInboundCommunication({
    userId: owner.userId,
    workspaceId: owner.workspaceId,
    channel: "sms",
    from,
    to,
    body,
    providerMessageId: messageSid || null,
    metadata: {
      provider: "twilio",
      connectionId: owner.connectionId,
      raw: Object.fromEntries(form.entries()),
    },
  });

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
        body: `Incoming SMS from ${from}: "${body}"`,
        metadata: { source: "twilio_sms", messageSid, from },
      });
      await recordOperatorChatEvent({
        conversationId: conversation.id,
        messageId: sourceMessage.id,
        userId: owner.userId,
        workspaceId: owner.workspaceId,
        operatorId: owner.operatorId,
        eventType: "user_input",
        title: "SMS received",
        summary: body.slice(0, 200),
        payload: { messageSid, from },
      });
    } catch (chatError) {
      console.error("[twilio sms] failed to post message into operator chat", chatError);
    }
  }

  return twiml("Thanks. We received your message and will follow up shortly.");
}
