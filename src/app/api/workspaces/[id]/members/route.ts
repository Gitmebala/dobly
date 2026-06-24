import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  ensureWorkspaceSeatAvailable,
  requireWorkspacePermission,
  upsertWorkspaceMember,
  type WorkspaceRole,
} from "@/lib/workspaces";
import { createWorkspaceInvitation } from "@/lib/workspace-invitations";
import { rateLimits } from "@/lib/rate-limit";

const memberSchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().email().max(320).optional(),
  role: z.enum(["admin", "operator", "analyst", "viewer"]),
  status: z.enum(["active", "invited", "suspended"]).optional(),
}).refine((value) => Boolean(value.userId || value.email), "A user or email address is required.");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimits.write(user.id).allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  await requireWorkspacePermission({
    userId: user.id,
    workspaceId: id,
    permission: "members:view",
  });

  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load workspace members." }, { status: 500 });
  }

  return NextResponse.json({ members: data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await requireWorkspacePermission({
    userId: user.id,
    workspaceId: id,
    permission: "members:manage",
  });

  const body = await req.json().catch(() => null);
  const validation = memberSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0]?.message ?? "Invalid workspace member." }, { status: 400 });
  }

  await ensureWorkspaceSeatAvailable({
    workspaceId: id,
    ownerUserId: membership.workspace.owner_user_id,
    excludeInvitationEmail: validation.data.email,
  });

  if (validation.data.email) {
    const result = await createWorkspaceInvitation({
      workspaceId: id,
      workspaceName: membership.workspace.name,
      email: validation.data.email,
      role: validation.data.role,
      invitedBy: user.id,
    });
    return NextResponse.json(result, { status: 201 });
  }

  const member = await upsertWorkspaceMember({
    workspaceId: id,
    userId: validation.data.userId!,
    role: validation.data.role as WorkspaceRole,
    invitedBy: user.id,
    status: validation.data.status ?? "active",
  });

  return NextResponse.json({ member }, { status: 201 });
}
