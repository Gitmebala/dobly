import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { checkUsageEntitlement, getUserPlanId } from "@/lib/billing/entitlements";
import { getDoblyPlan } from "@/lib/billing/plans";

export type WorkspaceRole = "owner" | "admin" | "operator" | "analyst" | "viewer";
export type WorkspacePermission =
  | "workspace:view"
  | "workspace:manage"
  | "members:view"
  | "members:manage"
  | "channels:manage"
  | "office:write"
  | "office:view"
  | "billing:view";

export interface WorkspaceRecord {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  region: string | null;
  timezone: string;
  status: "active" | "paused" | "archived";
  current_trust_stage: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMemberRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  status: "active" | "invited" | "suspended" | "removed";
  permissions: Record<string, unknown>;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

const ROLE_PERMISSIONS: Record<WorkspaceRole, WorkspacePermission[]> = {
  owner: ["workspace:view", "workspace:manage", "members:view", "members:manage", "channels:manage", "office:write", "office:view", "billing:view"],
  admin: ["workspace:view", "workspace:manage", "members:view", "members:manage", "channels:manage", "office:write", "office:view", "billing:view"],
  operator: ["workspace:view", "members:view", "channels:manage", "office:write", "office:view"],
  analyst: ["workspace:view", "members:view", "office:view", "billing:view"],
  viewer: ["workspace:view", "office:view"],
};

function normalizeRole(value: unknown): WorkspaceRole {
  return ["owner", "admin", "operator", "analyst", "viewer"].includes(String(value))
    ? (value as WorkspaceRole)
    : "viewer";
}

export async function getWorkspaceMembership(params: { userId: string; workspaceId: string }) {
  const admin = createAdminSupabaseClient();
  const { data: workspace } = await admin.from("workspaces").select("*").eq("id", params.workspaceId).maybeSingle();

  if (!workspace) return null;

  if (String((workspace as any).owner_user_id) === params.userId) {
    return {
      workspace: workspace as WorkspaceRecord,
      member: {
        id: `owner:${params.workspaceId}:${params.userId}`,
        workspace_id: params.workspaceId,
        user_id: params.userId,
        role: "owner" as WorkspaceRole,
        status: "active" as const,
        permissions: {},
        invited_by: null,
        created_at: String((workspace as any).created_at ?? new Date().toISOString()),
        updated_at: String((workspace as any).updated_at ?? new Date().toISOString()),
      } satisfies WorkspaceMemberRecord,
      permissions: ROLE_PERMISSIONS.owner,
      isOwner: true,
    };
  }

  const { data: member } = await admin
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", params.workspaceId)
    .eq("user_id", params.userId)
    .eq("status", "active")
    .maybeSingle();

  if (!member) return null;
  const role = normalizeRole((member as any).role);
  return {
    workspace: workspace as WorkspaceRecord,
    member: member as WorkspaceMemberRecord,
    permissions: ROLE_PERMISSIONS[role],
    isOwner: false,
  };
}

export async function requireWorkspacePermission(params: {
  userId: string;
  workspaceId: string | null | undefined;
  permission: WorkspacePermission;
}) {
  if (!params.workspaceId) {
    throw new Error("Workspace access is required.");
  }

  const membership = await getWorkspaceMembership({
    userId: params.userId,
    workspaceId: params.workspaceId,
  });

  if (!membership) {
    throw new Error("You do not have access to this workspace.");
  }

  if (!membership.permissions.includes(params.permission)) {
    throw new Error(`Your workspace role does not allow ${params.permission}.`);
  }

  return membership;
}

export async function listAccessibleWorkspaces(userId: string) {
  const admin = createAdminSupabaseClient();
  const [{ data: owned }, { data: memberRows }] = await Promise.all([
    admin.from("workspaces").select("*").eq("owner_user_id", userId).in("status", ["active", "paused"]).order("updated_at", { ascending: false }),
    admin.from("workspace_members").select("workspace_id").eq("user_id", userId).eq("status", "active"),
  ]);

  const memberWorkspaceIds = Array.from(new Set((memberRows ?? []).map((row: any) => String(row.workspace_id))));
  const { data: memberWorkspaces } = memberWorkspaceIds.length
    ? await admin.from("workspaces").select("*").in("id", memberWorkspaceIds).in("status", ["active", "paused"])
    : { data: [] as any[] };

  const combined = new Map<string, WorkspaceRecord>();
  for (const row of [...(owned ?? []), ...(memberWorkspaces ?? [])]) {
    combined.set(String((row as any).id), row as WorkspaceRecord);
  }
  return Array.from(combined.values());
}

export async function ensureWorkspaceSeatAvailable(params: {
  workspaceId: string;
  ownerUserId: string;
  excludeInvitationId?: string;
  excludeInvitationEmail?: string;
}) {
  const admin = createAdminSupabaseClient();
  const planId = await getUserPlanId(params.ownerUserId);
  const plan = getDoblyPlan(planId);
  let invitationQuery = admin.from("workspace_invitations").select("id", { head: true, count: "exact" })
    .eq("workspace_id", params.workspaceId).eq("status", "pending").gt("expires_at", new Date().toISOString());
  if (params.excludeInvitationId) invitationQuery = invitationQuery.neq("id", params.excludeInvitationId);
  if (params.excludeInvitationEmail) invitationQuery = invitationQuery.neq("email", params.excludeInvitationEmail.trim().toLowerCase());
  const [{ count }, { count: pendingInvites }] = await Promise.all([
    admin.from("workspace_members").select("id", { head: true, count: "exact" })
      .eq("workspace_id", params.workspaceId).in("status", ["active", "invited"]),
    invitationQuery,
  ]);

  const usedSeats = 1 + (count ?? 0) + (pendingInvites ?? 0);
  if (usedSeats >= plan.entitlements.teamSeats) {
    throw new Error(`${plan.name} includes ${plan.entitlements.teamSeats} team seats.`);
  }

  return {
    planId,
    planName: plan.name,
    usedSeats,
    seatLimit: plan.entitlements.teamSeats,
    usage: await checkUsageEntitlement({
      userId: params.ownerUserId,
      workspaceId: params.workspaceId,
      metric: "workers",
      quantity: 0,
    }).catch(() => null),
  };
}

export async function upsertWorkspaceMember(params: {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  invitedBy?: string | null;
  status?: WorkspaceMemberRecord["status"];
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("workspace_members")
    .upsert(
      {
        workspace_id: params.workspaceId,
        user_id: params.userId,
        role: params.role,
        status: params.status ?? "active",
        invited_by: params.invitedBy ?? null,
      },
      { onConflict: "workspace_id,user_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to save workspace member: ${error?.message ?? "unknown error"}`);
  }

  return data as WorkspaceMemberRecord;
}
