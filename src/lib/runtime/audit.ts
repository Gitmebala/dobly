import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function logRuntimeAuditEvent(input: {
  userId: string;
  workspaceId?: string | null;
  runId?: string | null;
  approvalId?: string | null;
  eventType: string;
  riskLevel?: "low" | "medium" | "high" | null;
  actorType?: "user" | "system" | "worker" | "provider";
  actorId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  await admin.from("runtime_audit_events").insert({
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    run_id: input.runId ?? null,
    approval_id: input.approvalId ?? null,
    event_type: input.eventType,
    risk_level: input.riskLevel ?? null,
    actor_type: input.actorType ?? "system",
    actor_id: input.actorId ?? null,
    summary: input.summary,
    metadata: input.metadata ?? {},
  });
}
