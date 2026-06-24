import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";

export async function listRuntimeAudit(input: {
  userId: string;
  workspaceId?: string | null;
  limit?: number;
}) {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("runtime_audit_events")
    .select("*")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(200, input.limit ?? 100)));
  if (input.workspaceId) query = query.eq("workspace_id", input.workspaceId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function requestRollback(input: {
  userId: string;
  rollbackId: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("runtime_rollback_records")
    .update({ status: "executed", executed_at: new Date().toISOString() })
    .eq("id", input.rollbackId)
    .eq("user_id", input.userId)
    .eq("status", "available")
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Rollback record not available.");
  await logRuntimeAuditEvent({
    userId: input.userId,
    workspaceId: (data as any).workspace_id ?? null,
    runId: (data as any).run_id ?? null,
    eventType: "rollback.executed",
    riskLevel: "high",
    actorType: "user",
    actorId: input.userId,
    summary: `Rollback marked executed for ${(data as any).provider}.`,
    metadata: data as Record<string, unknown>,
  });
  return data;
}
