import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { runMediaRuntime } from "@/lib/runtime/media";

const schema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  brief: z.string().trim().min(5).max(6000),
  formats: z.array(z.enum(["short_video", "image", "carousel", "voiceover", "social_post"])).max(8).optional(),
  channels: z.array(z.string().min(1).max(80)).max(12).optional(),
  brandKit: z.record(z.unknown()).optional(),
  publish: z.boolean().optional(),
  approved: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid media request." }, { status: 400 });
  }

  if (parsed.data.workspaceId) {
    await requireWorkspacePermission({ userId: user.id, workspaceId: parsed.data.workspaceId, permission: "office:write" });
  }

  const result = await runMediaRuntime({
    userId: user.id,
    workspaceId: parsed.data.workspaceId ?? null,
    brief: parsed.data.brief,
    formats: parsed.data.formats,
    channels: parsed.data.channels,
    brandKit: parsed.data.brandKit,
    publish: parsed.data.publish ?? false,
    approved: parsed.data.approved ?? false,
  });

  return NextResponse.json(
    result,
    { status: result.run.status === "completed" ? 200 : result.run.status === "needs_approval" ? 202 : result.run.status === "not_configured" ? 424 : 500 },
  );
}
