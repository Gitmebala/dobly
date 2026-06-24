import { NextRequest, NextResponse } from "next/server";
import { normalizePhoneIdentifier, resolveUserByChannelIdentifier } from "@/lib/communications/channel-resolver";
import { isWebhookSecurityDisabledForDev, verifySharedSecret, verifyTwilioSignature } from "@/lib/webhooks/security";
import { getDeepgramConfig } from "@/lib/voice/deepgram";
import { getElevenLabsConfig } from "@/lib/voice/elevenlabs";

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
}

function twiml(body: string) {
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const allowed =
    isWebhookSecurityDisabledForDev() ||
    verifySharedSecret(req, "x-dobly-webhook-secret", process.env.TWILIO_WEBHOOK_SECRET) ||
    verifyTwilioSignature({ req, formData: form });

  if (!allowed) return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });

  const to = normalizePhoneIdentifier(String(form.get("To") ?? ""));
  const from = normalizePhoneIdentifier(String(form.get("From") ?? ""));
  const callSid = String(form.get("CallSid") ?? "");
  const origin = req.nextUrl.origin;

  const owner = await resolveUserByChannelIdentifier({
    channelId: "business_phone",
    identifier: to,
  });

  if (!owner) {
    return twiml("<Say voice=\"alice\">Thanks for calling. This number is not connected to Dobly yet.</Say>");
  }

  // Check if voice runtime is configured
  const deepgramConfig = getDeepgramConfig();
  const elevenLabsConfig = getElevenLabsConfig();
  const mediaStreamUrl = process.env.TWILIO_MEDIA_STREAM_URL;
  const useVoiceRuntime = Boolean(mediaStreamUrl && deepgramConfig && elevenLabsConfig);

  if (useVoiceRuntime) {
    const streamBase = mediaStreamUrl || origin;
    const streamUrl = `${streamBase.replace(/\/$/, "")}/api/webhooks/twilio/voice/stream?to=${encodeURIComponent(to)}&from=${encodeURIComponent(from)}&callSid=${encodeURIComponent(callSid)}`;
    return twiml(`
      <Connect>
        <Stream url="${escapeXml(streamUrl)}" />
      </Connect>
    `);
  }

  const action = `${origin}/api/webhooks/twilio/voice/process?to=${encodeURIComponent(to)}&from=${encodeURIComponent(from)}&callSid=${encodeURIComponent(callSid)}`;
  return twiml(`
    <Gather input="speech" action="${escapeXml(action)}" method="POST" speechTimeout="auto" timeout="5">
      <Say voice="alice">Thanks for calling. Tell me how we can help, and I will route this to the right person.</Say>
    </Gather>
    <Say voice="alice">I did not catch that. Please send us a message and we will follow up shortly.</Say>
  `);
}

export async function GET(req: NextRequest) {
  return POST(req);
}
