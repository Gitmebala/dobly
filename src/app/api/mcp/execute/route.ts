import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { executeUniversalMcpPath } from "@/lib/runtime/universal-mcp-execution";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { rateLimits } from "@/lib/rate-limit";

const schema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  prompt: z.string().trim().min(5).max(6000),
  context: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.write(user.id).allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid MCP execution request." }, { status: 400 });
  try {
    if (parsed.data.workspaceId) await requireWorkspacePermission({ userId: user.id, workspaceId: parsed.data.workspaceId, permission: "office:write" });
    const result = await executeUniversalMcpPath({
      userId: user.id,
      workspaceId: parsed.data.workspaceId ?? null,
      prompt: parsed.data.prompt,
      context: parsed.data.context ?? {},
      approved: false,
    });
    return NextResponse.json(result, { status: result.run.status === "completed" ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "MCP execution failed." }, { status: 400 });
  }
}
