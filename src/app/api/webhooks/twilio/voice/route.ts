import { NextRequest, NextResponse } from "next/server";
import { normalizePhoneIdentifier, resolveUserByChannelIdentifier } from "@/lib/communications/channel-resolver";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { isWebhookSecurityDisabledForDev, verifySharedSecret, verifyTwilioSignature } from "@/lib/webhooks/security";

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

  // The real-time media-stream path requires an external WebSocket-capable
  // worker to actually terminate the Twilio stream - this Next.js app can't
  // (see /api/webhooks/twilio/voice/stream, which unconditionally returns
  // 501). DEEPGRAM_API_KEY, the ElevenLabs config, and TWILIO_MEDIA_STREAM_URL
  // were all set in production, so this branch looked "configured" and was
  // being selected for every real inbound call - which then hit the 501 and
  // broke. Force the Gather/Say fallback below, which is fully self-contained
  // and genuinely works, until a real external streaming worker exists.
  const useVoiceRuntime = false;

  if (useVoiceRuntime) {
    const mediaStreamUrl = process.env.TWILIO_MEDIA_STREAM_URL;
    const streamBase = mediaStreamUrl || origin;
    const streamUrl = `${streamBase.replace(/\/$/, "")}/api/webhooks/twilio/voice/stream?to=${encodeURIComponent(to)}&from=${encodeURIComponent(from)}&callSid=${encodeURIComponent(callSid)}`;
    return twiml(`
      <Connect>
        <Stream url="${escapeXml(streamUrl)}" />
      </Connect>
    `);
  }

  // If this number belongs to a specific hired coworker, greet as that
  // coworker - otherwise the call reaches a generic account inbox with no
  // connection to who the owner actually hired to answer it.
  let greeting = "Thanks for calling. Tell me how we can help, and I will route this to the right person.";
  if (owner.operatorId) {
    const admin = createAdminSupabaseClient();
    const { data: operator } = await admin
      .from("dobly_operators")
      .select("name, mission")
      .eq("id", owner.operatorId)
      .maybeSingle();
    if (operator?.name) {
      greeting = `Thanks for calling. This is ${operator.name}. Tell me how I can help.`;
    }
  }

  const action = `${origin}/api/webhooks/twilio/voice/process?to=${encodeURIComponent(to)}&from=${encodeURIComponent(from)}&callSid=${encodeURIComponent(callSid)}`;
  return twiml(`
    <Gather input="speech" action="${escapeXml(action)}" method="POST" speechTimeout="auto" timeout="5">
      <Say voice="alice">${escapeXml(greeting)}</Say>
    </Gather>
    <Say voice="alice">I did not catch that. Please send us a message and we will follow up shortly.</Say>
  `);
}

export async function GET(req: NextRequest) {
  return POST(req);
}
