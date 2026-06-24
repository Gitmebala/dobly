import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createUniversalMcpConnection, listUniversalMcpConnections } from "@/lib/runtime/universal-mcp";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { rateLimits } from "@/lib/rate-limit";

const schema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  label: z.string().trim().min(2).max(160),
  serverUrl: z.string().url(),
  authToken: z.string().max(4000).nullable().optional(),
  capabilityTags: z.array(z.string().min(1).max(80)).max(30).optional(),
  riskProfile: z.enum(["low", "medium", "high"]).optional(),
  approvalRequired: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");
  if (workspaceId) await requireWorkspacePermission({ userId: user.id, workspaceId, permission: "office:view" });
  const connections = await listUniversalMcpConnections({
    userId: user.id,
    workspaceId,
    includeTools: url.searchParams.get("includeTools") !== "false",
  });
  return NextResponse.json({ connections });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.write(user.id).allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid MCP connection." }, { status: 400 });
  if (parsed.data.workspaceId) await requireWorkspacePermission({ userId: user.id, workspaceId: parsed.data.workspaceId, permission: "channels:manage" });
  const connection = await createUniversalMcpConnection({ userId: user.id, ...parsed.data });
  return NextResponse.json({ connection }, { status: 201 });
}
