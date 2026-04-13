import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { WorkflowBlueprint, WorkflowVersion } from "@/types";

export async function createWorkflowVersion(params: {
  workflowId: string;
  userId: string;
  title: string;
  description: string;
  blueprint: WorkflowBlueprint;
  status?: WorkflowVersion["status"];
}) {
  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin
    .from("workflow_versions")
    .select("*")
    .eq("workflow_id", params.workflowId)
    .order("version_number", { ascending: false })
    .limit(1);

  const latestVersion = existing?.[0] as WorkflowVersion | undefined;
  if (
    latestVersion &&
    latestVersion.title === params.title &&
    latestVersion.description === params.description &&
    JSON.stringify(latestVersion.blueprint) === JSON.stringify(params.blueprint) &&
    latestVersion.status === (params.status ?? "published")
  ) {
    return latestVersion;
  }

  const nextVersion = (latestVersion?.version_number ?? 0) + 1;

  const { data, error } = await admin
    .from("workflow_versions")
    .insert({
      workflow_id: params.workflowId,
      user_id: params.userId,
      version_number: nextVersion,
      title: params.title,
      description: params.description,
      blueprint: params.blueprint,
      status: params.status ?? "published",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to create workflow version.");
  }

  return data as WorkflowVersion;
}
