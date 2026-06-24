import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { runVoiceHardeningCheck } from "@/lib/runtime/voice-hardening";

const schema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  agentId: z.string().max(160).nullable().optional(),
  expectedUseCase: z.enum(["reception", "sales", "support", "personal", "custom"]).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid voice hardening request." }, { status: 400 });
  }

  if (parsed.data.workspaceId) {
    await requireWorkspacePermission({ userId: user.id, workspaceId: parsed.data.workspaceId, permission: "office:view" });
  }

  const result = await runVoiceHardeningCheck({
    userId: user.id,
    workspaceId: parsed.data.workspaceId ?? null,
    agentId: parsed.data.agentId ?? null,
    expectedUseCase: parsed.data.expectedUseCase ?? "custom",
  });

  return NextResponse.json(result, { status: result.run.status === "completed" ? 200 : 424 });
}
