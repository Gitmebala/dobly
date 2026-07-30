import type { ConnectorExecutor } from "@/lib/connectors/sdk";
import { placeOutboundCall } from "@/lib/voice/elevenlabs-convai";
import { upsertVoiceCallRecord } from "@/lib/runtime/voice-production";

export const voiceOutboundCallExecutor: ConnectorExecutor = {
  id: "native.voice.outbound-call",
  async execute(context) {
    const to = String(context.config.to ?? "").trim();
    if (!to) throw new Error("Outbound call requires a phone number.");

    const firstMessage = typeof context.config.firstMessage === "string" ? context.config.firstMessage : undefined;
    const objective =
      typeof context.config.objective === "string"
        ? context.config.objective
        : String(context.config.summary ?? context.step.description ?? "").trim() || undefined;

    const call = await placeOutboundCall({ to, firstMessage, objective });

    await upsertVoiceCallRecord({
      userId: context.workflow.user_id,
      runId: context.runId ?? null,
      providerCallId: call.callSid || call.conversationId || null,
      direction: "outbound",
      callee: to,
      status: "active",
      telemetry: { conversationId: call.conversationId, objective: objective ?? null },
    }).catch(() => undefined);

    return {
      provider: "voice",
      to,
      callSid: call.callSid,
      conversationId: call.conversationId,
    };
  },
};
