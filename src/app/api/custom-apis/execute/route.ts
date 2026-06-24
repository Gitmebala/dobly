import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { executeCustomApiAction } from "@/lib/runtime/custom-api";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { rateLimits } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/api-security";

const schema = z.object({
  actionId: z.string().uuid(),
  workspaceId: z.string().uuid().nullable().optional(),
  prompt: z.string().trim().max(6000).optional(),
  input: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.write(user.id || getRequestIp(req)).allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid custom API execution request." }, { status: 400 });
  try {
    if (parsed.data.workspaceId) {
      await requireWorkspacePermission({ userId: user.id, workspaceId: parsed.data.workspaceId, permission: "office:write" });
    }
    const result = await executeCustomApiAction({
      userId: user.id,
      actionId: parsed.data.actionId,
      workspaceId: parsed.data.workspaceId ?? null,
      prompt: parsed.data.prompt,
      input: parsed.data.input ?? {},
      // Approvals can only be resumed by the trusted approval service. A client
      // request must never be able to self-approve an external side effect.
      approved: false,
    });
    return NextResponse.json(result, { status: result.run.status === "failed" ? 400 : result.approval ? 202 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Custom API execution failed." }, { status: 400 });
  }
}
