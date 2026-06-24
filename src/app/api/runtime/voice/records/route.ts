import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { upsertVoiceCallRecord } from "@/lib/runtime/voice-production";

const schema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  runId: z.string().uuid().nullable().optional(),
  providerCallId: z.string().max(200).nullable().optional(),
  direction: z.enum(["inbound", "outbound"]).optional(),
  caller: z.string().max(120).nullable().optional(),
  callee: z.string().max(120).nullable().optional(),
  status: z.enum(["active", "completed", "failed", "blocked", "handed_off"]).optional(),
  turn: z.object({ role: z.enum(["user", "agent", "system"]), text: z.string().max(8000), timestamp: z.string().optional() }).optional(),
  recordingUrl: z.string().url().nullable().optional(),
  telemetry: z.record(z.unknown()).optional(),
  handoff: z.record(z.unknown()).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid voice record." }, { status: 400 });
  const record = await upsertVoiceCallRecord({ userId: user.id, ...parsed.data });
  return NextResponse.json({ record });
}
