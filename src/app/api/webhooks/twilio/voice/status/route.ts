import { NextRequest, NextResponse } from "next/server";
import { normalizePhoneIdentifier, resolveUserByChannelIdentifier } from "@/lib/communications/channel-resolver";
import { recordOfficeEvent } from "@/lib/office/events";
import { isWebhookSecurityDisabledForDev, verifySharedSecret } from "@/lib/webhooks/security";

export async function POST(req: NextRequest) {
  const allowed =
    isWebhookSecurityDisabledForDev() ||
    verifySharedSecret(req, "x-dobly-webhook-secret", process.env.TWILIO_WEBHOOK_SECRET);

  if (!allowed) return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });

  const form = await req.formData();
  const to = normalizePhoneIdentifier(String(form.get("To") ?? ""));
  const from = normalizePhoneIdentifier(String(form.get("From") ?? ""));
  const callSid = String(form.get("CallSid") ?? "");
  const status = String(form.get("CallStatus") ?? "unknown");
  const duration = String(form.get("CallDuration") ?? "");

  const owner = await resolveUserByChannelIdentifier({
    channelId: "business_phone",
    identifier: to,
  });

  if (owner) {
    await recordOfficeEvent({
      workspaceId: owner.workspaceId,
      userId: owner.userId,
      departmentId: "reception",
      workerKind: "automation",
      eventType: "worker.action_executed",
      source: "twilio.voice.status",
      entityType: "call",
      entityId: callSid || null,
      title: `Call ${status}`,
      summary: `Call from ${from} to ${to}${duration ? ` lasted ${duration} seconds` : ""}.`,
      payload: {
        provider: "twilio",
        callSid,
        status,
        duration,
        raw: Object.fromEntries(form.entries()),
      },
      riskLevel: "low",
    });
  }

  return NextResponse.json({ received: true });
}
