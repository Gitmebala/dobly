import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function logWorkflowRunEvent(params: {
  workflowId: string;
  runId: string;
  userId: string;
  eventType: string;
  eventData?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  await admin.from("workflow_run_events").insert({
    workflow_id: params.workflowId,
    run_id: params.runId,
    user_id: params.userId,
    event_type: params.eventType,
    event_data: params.eventData ?? {},
  });
}
