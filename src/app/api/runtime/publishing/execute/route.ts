import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { executePublishingRuntime } from "@/lib/runtime/publishing-execution";

const schema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  providers: z.array(z.enum(["instagram", "facebook", "linkedin", "x", "youtube", "tiktok"])).min(1).max(6),
  caption: z.string().trim().min(1).max(5000),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  scheduleAt: z.string().nullable().optional(),
  dryRun: z.boolean().optional(),
  approved: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid publishing request." }, { status: 400 });
  const result = await executePublishingRuntime({ userId: user.id, ...parsed.data });
  return NextResponse.json(
    result,
    { status: result.run.status === "completed" ? 200 : result.run.status === "needs_approval" ? 202 : result.run.status === "not_configured" ? 424 : 500 },
  );
}
