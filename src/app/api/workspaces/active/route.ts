import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ACTIVE_WORKSPACE_COOKIE, resolveActiveWorkspace } from "@/lib/active-workspace";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { rateLimits } from "@/lib/rate-limit";

const selectionSchema = z.object({ workspaceId: z.string().uuid() });

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const context = await resolveActiveWorkspace(user.id);
  return NextResponse.json(context, { headers: { "cache-control": "private, no-store" } });
}

export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.write(user.id).allowed) return NextResponse.json({ error: "Too many workspace changes." }, { status: 429 });

  const parsed = selectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid workspace." }, { status: 400 });
  try {
    await requireWorkspacePermission({ userId: user.id, workspaceId: parsed.data.workspaceId, permission: "workspace:view" });
  } catch {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const response = NextResponse.json({ activeWorkspaceId: parsed.data.workspaceId });
  response.cookies.set(ACTIVE_WORKSPACE_COOKIE, parsed.data.workspaceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
