import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveUniversalExecutionPaths } from "@/lib/runtime/universal-mcp";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { rateLimits } from "@/lib/rate-limit";

const schema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  prompt: z.string().trim().min(3).max(6000),
  requiredCapabilities: z.array(z.string()).max(20).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.generate(user.id).allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid resolver request." }, { status: 400 });
  if (parsed.data.workspaceId) await requireWorkspacePermission({ userId: user.id, workspaceId: parsed.data.workspaceId, permission: "office:view" });
  const result = await resolveUniversalExecutionPaths({
    userId: user.id,
    workspaceId: parsed.data.workspaceId ?? null,
    prompt: parsed.data.prompt,
    requiredCapabilities: parsed.data.requiredCapabilities as any,
  });
  return NextResponse.json(result);
}
