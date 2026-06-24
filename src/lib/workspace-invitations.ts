import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { WorkspaceRole } from "@/lib/workspaces";
import { ensureWorkspaceSeatAvailable } from "@/lib/workspaces";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
}

export async function createWorkspaceInvitation(input: { workspaceId: string; workspaceName: string; email: string; role: Exclude<WorkspaceRole, "owner">; invitedBy: string }) {
  const email = input.email.trim().toLowerCase();
  const token = randomBytes(32).toString("base64url");
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("workspace_invitations").upsert({
    workspace_id: input.workspaceId,
    email,
    role: input.role,
    token_hash: hashToken(token),
    status: "pending",
    invited_by: input.invitedBy,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    accepted_by: null,
    accepted_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "workspace_id,email" }).select("id,email,role,status,expires_at").single();
  if (error || !data) throw new Error(error?.message ?? "Could not create the invitation.");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${encodeURIComponent(token)}`;
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Dobly <hello@dobly.io>",
      to: email,
      subject: `Join ${input.workspaceName} on Dobly`,
      html: `<p>You have been invited to <strong>${escapeHtml(input.workspaceName)}</strong> as ${escapeHtml(input.role)}.</p><p><a href="${inviteUrl}">Accept invitation</a></p><p>This invitation expires in 7 days.</p>`,
    });
    if (result.error) throw new Error("The invitation was saved, but the email could not be sent.");
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("Invitation email delivery is not configured.");
  }
  return { invitation: data, developmentInviteUrl: process.env.NODE_ENV === "production" ? undefined : inviteUrl };
}

export async function acceptWorkspaceInvitation(input: { token: string; userId: string; userEmail: string }) {
  const admin = createAdminSupabaseClient();
  const { data: invitation } = await admin.from("workspace_invitations").select("*")
    .eq("token_hash", hashToken(input.token)).eq("status", "pending").gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!invitation || String(invitation.email).toLowerCase() !== input.userEmail.trim().toLowerCase()) {
    throw new Error("This invitation is invalid, expired, or belongs to another email address.");
  }
  const { data: workspace } = await admin.from("workspaces").select("owner_user_id").eq("id", invitation.workspace_id).maybeSingle();
  if (!workspace) throw new Error("The invited workspace no longer exists.");
  await ensureWorkspaceSeatAvailable({
    workspaceId: invitation.workspace_id,
    ownerUserId: workspace.owner_user_id,
    excludeInvitationId: invitation.id,
  });
  const { error: memberError } = await admin.from("workspace_members").upsert({
    workspace_id: invitation.workspace_id,
    user_id: input.userId,
    role: invitation.role,
    status: "active",
    invited_by: invitation.invited_by,
  }, { onConflict: "workspace_id,user_id" });
  if (memberError) throw new Error(memberError.message);
  await admin.from("workspace_invitations").update({ status: "accepted", accepted_by: input.userId, accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", invitation.id).eq("status", "pending");
  return { workspaceId: String(invitation.workspace_id) };
}
