import { NextRequest, NextResponse } from "next/server";
import { normalizePhoneIdentifier, resolveUserByChannelIdentifier } from "@/lib/communications/channel-resolver";
import { ingestInboundCommunication } from "@/lib/communications/runtime";
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

  await ingestInboundCommunication({
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

  return twiml("Thanks. We received your message and will follow up shortly.");
}
