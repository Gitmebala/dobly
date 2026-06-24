import { NextRequest, NextResponse } from "next/server";
import { normalizePhoneIdentifier, resolveUserByChannelIdentifier } from "@/lib/communications/channel-resolver";

/**
 * Twilio Media Stream endpoint.
 * This route is only valid when an external WebSocket-capable media stream
 * service is configured. The Next.js app itself does not terminate the stream.
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to");
  const from = searchParams.get("from");
  const callSid = searchParams.get("callSid");

  if (!to || !from || !callSid) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  const owner = await resolveUserByChannelIdentifier({
    channelId: "business_phone",
    identifier: normalizePhoneIdentifier(to),
  });

  if (!owner) {
    return NextResponse.json({ error: "Owner not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      error: "Media streams require an external WebSocket runtime. Configure TWILIO_MEDIA_STREAM_URL before enabling this path.",
      params: { to, from, callSid, userId: owner.userId },
    },
    { status: 501 }
  );
}

export async function POST(req: NextRequest) {
  void req;
  return NextResponse.json(
    { error: "Media stream POST is not handled by this Next.js runtime." },
    { status: 501 }
  );
}
