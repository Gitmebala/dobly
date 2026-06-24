import { NextRequest, NextResponse } from "next/server";
import { normalizePhoneIdentifier, resolveUserByChannelIdentifier } from "@/lib/communications/channel-resolver";
import { ingestInboundCommunication } from "@/lib/communications/runtime";
import { isWebhookSecurityDisabledForDev, verifySharedSecret, verifyTwilioSignature } from "@/lib/webhooks/security";

function twiml(body: string) {
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const form = await req.formData();
  const allowed =
    isWebhookSecurityDisabledForDev() ||
    verifySharedSecret(req, "x-dobly-webhook-secret", process.env.TWILIO_WEBHOOK_SECRET) ||
    verifyTwilioSignature({ req, formData: form });

  if (!allowed) return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });

  const to = normalizePhoneIdentifier(url.searchParams.get("to") || String(form.get("To") ?? ""));
  const from = normalizePhoneIdentifier(url.searchParams.get("from") || String(form.get("From") ?? ""));
  const callSid = url.searchParams.get("callSid") || String(form.get("CallSid") ?? "");
  const speech = String(form.get("SpeechResult") ?? "").trim();

  if (!speech || !to || !from) {
    return twiml("<Say voice=\"alice\">Thanks. We will follow up shortly.</Say>");
  }

  const owner = await resolveUserByChannelIdentifier({
    channelId: "business_phone",
    identifier: to,
  });

  if (!owner) {
    return twiml("<Say voice=\"alice\">Thanks. We will follow up shortly.</Say>");
  }

  const result = await ingestInboundCommunication({
    userId: owner.userId,
    workspaceId: owner.workspaceId,
    channel: "voice",
    from,
    to,
    body: `Phone call transcript: ${speech}`,
    providerMessageId: callSid,
    metadata: {
      provider: "twilio_voice",
      connectionId: owner.connectionId,
      callSid,
      speech,
    },
  });

  const reply = result.draft.requiresApproval
    ? "Thanks. I have sent this to the team so they can respond carefully."
    : result.draft.suggestedReply;

  return twiml(`<Say voice="alice">${reply.replace(/[<>&]/g, "")}</Say>`);
}
