import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";

type JsonRecord = Record<string, unknown>;

function detectAbuse(text: string) {
  const lower = text.toLowerCase();
  const flags: string[] = [];
  if (/\b(password|otp|pin|ssn|social security|card number)\b/.test(lower)) flags.push("sensitive_data_request");
  if (/\b(scam|fraud|threat|kill|harm)\b/.test(lower)) flags.push("safety_or_abuse");
  if (text.length > 4000) flags.push("unusually_long_turn");
  return flags;
}

export async function upsertVoiceCallRecord(input: {
  userId: string;
  workspaceId?: string | null;
  runId?: string | null;
  providerCallId?: string | null;
  direction?: "inbound" | "outbound";
  caller?: string | null;
  callee?: string | null;
  status?: "active" | "completed" | "failed" | "blocked" | "handed_off";
  turn?: { role: "user" | "agent" | "system"; text: string; timestamp?: string };
  recordingUrl?: string | null;
  telemetry?: JsonRecord;
  handoff?: JsonRecord | null;
}) {
  const admin = createAdminSupabaseClient();
  const existing = input.providerCallId
    ? await admin
        .from("voice_call_records")
        .select("*")
        .eq("user_id", input.userId)
        .eq("provider_call_id", input.providerCallId)
        .maybeSingle()
    : { data: null };

  const turn = input.turn
    ? { ...input.turn, timestamp: input.turn.timestamp ?? new Date().toISOString(), abuseFlags: detectAbuse(input.turn.text) }
    : null;
  const transcript = Array.isArray((existing.data as any)?.transcript) ? [...(existing.data as any).transcript] : [];
  if (turn) transcript.push(turn);
  const abuseFlags = Array.from(new Set(transcript.flatMap((item: any) => item.abuseFlags ?? [])));
  const status = abuseFlags.length > 0 && input.status === "active" ? "blocked" : input.status ?? "active";

  const payload = {
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    run_id: input.runId ?? null,
    provider_call_id: input.providerCallId ?? null,
    direction: input.direction ?? "inbound",
    caller: input.caller ?? null,
    callee: input.callee ?? null,
    status,
    transcript,
    recording_url: input.recordingUrl ?? (existing.data as any)?.recording_url ?? null,
    abuse_flags: abuseFlags,
    handoff: input.handoff ?? null,
    telemetry: {
      ...(((existing.data as any)?.telemetry ?? {}) as JsonRecord),
      ...(input.telemetry ?? {}),
    },
    ended_at: ["completed", "failed", "blocked", "handed_off"].includes(status) ? new Date().toISOString() : null,
  };

  const result = existing.data
    ? await admin.from("voice_call_records").update(payload).eq("id", (existing.data as any).id).select("*").single()
    : await admin.from("voice_call_records").insert(payload).select("*").single();

  if (result.error || !result.data) throw new Error(result.error?.message ?? "Failed to persist voice call record.");

  await logRuntimeAuditEvent({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    runId: input.runId ?? null,
    eventType: "voice.record.updated",
    riskLevel: abuseFlags.length ? "high" : "low",
    summary: abuseFlags.length ? `Voice call flagged: ${abuseFlags.join(", ")}` : "Voice call record updated.",
    metadata: { providerCallId: input.providerCallId ?? null, status, abuseFlags },
  }).catch(() => undefined);

  return result.data as JsonRecord;
}
