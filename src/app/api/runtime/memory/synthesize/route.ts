import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { BUSINESS_MEMORY_SCOPES } from "@/lib/business-memory";
import { runMemorySynthesis } from "@/lib/runtime/memory-synthesis";

const schema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  scope: z.union([z.enum(BUSINESS_MEMORY_SCOPES as [string, ...string[]]), z.literal("all")]).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  writeBack: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid memory synthesis request." }, { status: 400 });
  }

  if (parsed.data.workspaceId) {
    await requireWorkspacePermission({ userId: user.id, workspaceId: parsed.data.workspaceId, permission: "office:view" });
  }

  const result = await runMemorySynthesis({
    userId: user.id,
    workspaceId: parsed.data.workspaceId ?? null,
    scope: parsed.data.scope as any,
    limit: parsed.data.limit,
    writeBack: parsed.data.writeBack ?? false,
  });

  return NextResponse.json(result, { status: result.run.status === "completed" ? 200 : 500 });
}
