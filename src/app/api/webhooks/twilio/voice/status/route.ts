import { NextRequest, NextResponse } from "next/server";
import { normalizePhoneIdentifier, resolveUserByChannelIdentifier } from "@/lib/communications/channel-resolver";
import { recordOfficeEvent } from "@/lib/office/events";
import { upsertVoiceCallRecord } from "@/lib/runtime/voice-production";
import { isWebhookSecurityDisabledForDev, verifySharedSecret } from "@/lib/webhooks/security";

const TERMINAL_STATUSES = new Set(["completed", "failed", "busy", "no-answer", "canceled"]);

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

  // Inbound calls: the business number is `to`. Outbound calls: the business
  // number is `from`. This only ever checked `to`, so status updates for
  // outbound calls (the ones this session added) silently found no owner.
  const owner =
    (await resolveUserByChannelIdentifier({ channelId: "business_phone", identifier: to })) ??
    (await resolveUserByChannelIdentifier({ channelId: "business_phone", identifier: from }));

  if (owner) {
    await upsertVoiceCallRecord({
      userId: owner.userId,
      workspaceId: owner.workspaceId,
      providerCallId: callSid || null,
      status: TERMINAL_STATUSES.has(status) ? (status === "completed" ? "completed" : "failed") : "active",
      telemetry: { twilioStatus: status, duration: duration || null },
    }).catch(() => undefined);

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
