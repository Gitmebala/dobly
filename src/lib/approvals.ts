import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Approval } from "@/types";

export async function createApproval(input: {
  workflowId: string;
  userId: string;
  runId?: string | null;
  title: string;
  message: string;
  actionLabel?: string | null;
  riskLevel?: "low" | "medium" | "high";
  channel?: "app" | "email" | "whatsapp";
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("approvals")
    .insert({
      workflow_id: input.workflowId,
      user_id: input.userId,
      run_id: input.runId ?? null,
      title: input.title,
      message: input.message,
      action_label: input.actionLabel ?? null,
      risk_level: input.riskLevel ?? "medium",
      channel: input.channel ?? "app",
      status: "pending",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to create approval.");
  }

  return data as Approval;
}

export async function getApprovalById(approvalId: string, userId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("approvals")
    .select("*")
    .eq("id", approvalId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Approval not found.");
  }

  return data as Approval;
}

export async function decideApproval(input: {
  approvalId: string;
  userId: string;
  decision: "approved" | "rejected";
  note?: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("dobly_decide_workflow_approval", {
    p_approval_id: input.approvalId,
    p_user_id: input.userId,
    p_decision: input.decision,
    p_note: input.note ?? null,
  }).single();

  if (error || !data) {
    throw new Error("Failed to update approval.");
  }

  const approval = data as Approval;
  return approval;
}
