import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { runDoblyOperator } from "@/lib/dobly-operators";
import { appendOperatorChatMessage, ensureOperatorConversation, recordOperatorChatEvent } from "@/lib/operator-chat";

export interface WorkspaceTaskRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  project_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string;
  status: "open" | "in_progress" | "blocked" | "completed";
  priority: "low" | "medium" | "high";
  due_at: string | null;
  completed_at: string | null;
  assignee_user_id: string | null;
  assignee_operator_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

/**
 * Handing a task to a coworker instead of a person is the actual point -
 * this is what makes "assign" mean "gets done" instead of "gets tracked".
 * Mirrors /api/operators/[id]/run's flow (chat message -> event -> queued
 * run) so the work shows up in the operator's own chat exactly the way a
 * manually-typed instruction would, not as a side channel the owner has to
 * separately learn to check.
 */
export async function dispatchTaskToOperator(input: {
  userId: string;
  workspaceId?: string | null;
  operatorId: string;
  task: Pick<WorkspaceTaskRecord, "id" | "title" | "description" | "due_at" | "priority">;
}) {
  const prompt = [
    `New task assigned to you: "${input.task.title}"`,
    input.task.description ? `Details: ${input.task.description}` : null,
    input.task.due_at ? `Due: ${new Date(input.task.due_at).toLocaleString()}` : null,
    `Priority: ${input.task.priority}.`,
  ].filter(Boolean).join("\n");

  const conversation = await ensureOperatorConversation({
    userId: input.userId,
    operatorId: input.operatorId,
    workspaceId: input.workspaceId ?? null,
  });
  const sourceMessage = await appendOperatorChatMessage({
    conversationId: conversation.id,
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    operatorId: input.operatorId,
    role: "user",
    intent: "task_assignment",
    body: prompt,
    metadata: { source: "workspace_task", taskId: input.task.id },
  });
  await recordOperatorChatEvent({
    conversationId: conversation.id,
    messageId: sourceMessage.id,
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    operatorId: input.operatorId,
    eventType: "task_assigned",
    title: "Task assigned",
    summary: input.task.title,
    payload: { taskId: input.task.id },
  });

  const result = await runDoblyOperator({
    userId: input.userId,
    operatorId: input.operatorId,
    prompt,
    workspaceId: input.workspaceId ?? null,
    conversationId: conversation.id,
    sourceMessageId: sourceMessage.id,
  });

  await appendOperatorChatMessage({
    conversationId: conversation.id,
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    operatorId: input.operatorId,
    role: "operator",
    intent: "run_update",
    body: `Picked up "${input.task.title}". I'll write progress, approvals, and outputs back into this chat as I go.`,
    metadata: { source: "workspace_task", taskId: input.task.id, jobId: result.job.id },
  }).catch(() => undefined);

  return result;
}

/** Real progress from actual task completion, not a manually-set number. */
export async function computeProjectProgress(userId: string, projectIds: string[]) {
  if (projectIds.length === 0) return {} as Record<string, { total: number; completed: number; percent: number }>;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("workspace_tasks")
    .select("project_id, status")
    .eq("user_id", userId)
    .in("project_id", projectIds)
    .is("parent_task_id", null);

  const byProject: Record<string, { total: number; completed: number; percent: number }> = {};
  for (const id of projectIds) byProject[id] = { total: 0, completed: 0, percent: 0 };
  for (const row of data ?? []) {
    const pid = row.project_id as string;
    if (!byProject[pid]) byProject[pid] = { total: 0, completed: 0, percent: 0 };
    byProject[pid].total += 1;
    if (row.status === "completed") byProject[pid].completed += 1;
  }
  for (const pid of Object.keys(byProject)) {
    const entry = byProject[pid];
    entry.percent = entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0;
  }
  return byProject;
}
