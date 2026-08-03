import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";
import { appendOperatorChatMessage, recordOperatorChatEvent } from "@/lib/operator-chat";
import { enqueueRuntimeApprovalResume } from "@/lib/runtime/job-queue";

export interface RuntimeApprovalRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  run_id: string | null;
  title: string;
  message: string;
  action_label: string | null;
  risk_level: "low" | "medium" | "high";
  channel: "app" | "email" | "whatsapp";
  status: "pending" | "approved" | "rejected" | "expired";
  metadata: Record<string, unknown>;
  requested_at: string;
  decided_at: string | null;
  decision_note: string | null;
}

export async function createRuntimeApproval(input: {
  userId: string;
  workspaceId?: string | null;
  runId?: string | null;
  title: string;
  message: string;
  actionLabel?: string | null;
  riskLevel?: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("runtime_approvals")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      run_id: input.runId ?? null,
      title: input.title,
      message: input.message,
      action_label: input.actionLabel ?? null,
      risk_level: input.riskLevel ?? "medium",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create runtime approval.");
  const approval = data as RuntimeApprovalRecord;
  await logRuntimeAuditEvent({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    runId: input.runId ?? null,
    approvalId: approval.id,
    eventType: "approval.requested",
    riskLevel: approval.risk_level,
    summary: approval.title,
    metadata: approval.metadata,
  }).catch(() => undefined);
  return approval;
}

export async function listRuntimeApprovals(input: {
  userId: string;
  status?: RuntimeApprovalRecord["status"] | null;
}) {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("runtime_approvals")
    .select("*")
    .eq("user_id", input.userId)
    .order("requested_at", { ascending: false })
    .limit(100);

  if (input.status) query = query.eq("status", input.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as RuntimeApprovalRecord[];
}

export async function decideRuntimeApproval(input: {
  approvalId: string;
  userId: string;
  decision: "approved" | "rejected";
  note?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  // Not the dobly_decide_runtime_approval RPC: it does this same update, but
  // inside the same transaction also inserts into job_queue with this
  // approval's run_id - which is a durable_runtime_runs id, not a
  // workflow_runs id, and job_queue.run_id is a foreign key to workflow_runs
  // specifically. That insert has been throwing on every single runtime
  // approval, silently rolling back the whole transaction including the
  // status change - so no runtime approval has ever actually recorded a
  // decision. Replicate the RPC's safe pending->decided transition directly
  // (the .eq("status","pending") still guards against a double-decide race)
  // and enqueue the resume job separately below, without the bad run_id.
  const { data, error } = await admin
    .from("runtime_approvals")
    .update({
      status: input.decision,
      decided_at: new Date().toISOString(),
      decision_note: input.note?.slice(0, 2000) ?? null,
    })
    .eq("id", input.approvalId)
    .eq("user_id", input.userId)
    .eq("status", "pending")
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Approval not found or already decided.");
  const approval = data as RuntimeApprovalRecord;
  await logRuntimeAuditEvent({
    userId: input.userId,
    workspaceId: approval.workspace_id,
    runId: approval.run_id,
    approvalId: approval.id,
    eventType: `approval.${input.decision}`,
    riskLevel: approval.risk_level,
    actorType: "user",
    actorId: input.userId,
    summary: `${approval.title}: ${input.decision}`,
    metadata: { note: input.note ?? null },
  }).catch(() => undefined);

  const metadata = (approval.metadata ?? {}) as Record<string, any>;
  const resume = (metadata.resume ?? {}) as Record<string, any>;
  const context = (resume.context ?? {}) as Record<string, any>;
  if (typeof context.conversationId === "string" && typeof context.operatorId === "string") {
    await Promise.all([
      appendOperatorChatMessage({
        conversationId: context.conversationId,
        userId: input.userId,
        workspaceId: approval.workspace_id,
        operatorId: context.operatorId,
        role: "approval",
        intent: "approval",
        body: input.decision === "approved"
          ? `Approved: ${approval.title}. I will resume the queued work and keep the action receipt here.`
          : `Rejected: ${approval.title}. I will not continue this action unless you give a different instruction.`,
        runId: approval.run_id,
        approvalId: approval.id,
        metadata: { source: "approval_inbox", decision: input.decision, note: input.note ?? null },
      }).catch(() => undefined),
      recordOperatorChatEvent({
        conversationId: context.conversationId,
        userId: input.userId,
        workspaceId: approval.workspace_id,
        operatorId: context.operatorId,
        runId: approval.run_id,
        eventType: "approval_decided",
        title: input.decision === "approved" ? "Approval granted" : "Approval rejected",
        summary: approval.title,
        severity: input.decision === "approved" ? "success" : "warning",
        payload: { approvalId: approval.id, decision: input.decision, note: input.note ?? null },
      }).catch(() => undefined),
    ]);
  }

  // The chat message above has always promised "I will resume the queued
  // work" on approval, but nothing ever actually did - enqueueRuntimeApprovalResume
  // existed with zero callers anywhere in the codebase. Approving a runtime
  // command (send/publish/pay, a connected-software step, a custom API
  // action) recorded the decision and said the right thing in chat, but the
  // pending action itself never ran. Resume types the worker doesn't
  // recognise (e.g. a memory-proposal approval, which is handled elsewhere)
  // fail harmlessly in the background instead of blocking this response.
  if (input.decision === "approved" && resume && typeof resume.type === "string") {
    // job_queue.run_id is a foreign key to workflow_runs specifically, not
    // to whatever table this approval's run actually lives in (a runtime
    // command's parentRun is a durable_runtime_runs row) - passing it here
    // throws a foreign key violation. It isn't needed for correctness: the
    // resume handler below re-fetches the approval by id and reads its own
    // run reference out of that row's metadata.
    await enqueueRuntimeApprovalResume({
      approvalId: approval.id,
      userId: input.userId,
    }).catch((enqueueError) => {
      console.error(`Failed to enqueue resume for approval ${approval.id}:`, enqueueError);
    });
  }

  return approval;
}
