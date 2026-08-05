import { redirect } from "next/navigation";
import WorkspaceTasksClient from "@/components/dashboard/WorkspaceTasksClient";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";
import { listAccessibleWorkspaces } from "@/lib/workspaces";

export default async function TasksPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminSupabaseClient();
  const [{ data: tasks }, { data: projects }, operators, workspaces] = await Promise.all([
    admin.from("workspace_tasks").select("*").eq("user_id", user.id).order("position", { ascending: true }).order("created_at", { ascending: false }),
    admin.from("workspace_projects").select("id, name").eq("user_id", user.id).order("name", { ascending: true }),
    listDoblyOperators({ userId: user.id }).catch((): OperatorWithLoops[] => []),
    listAccessibleWorkspaces(user.id).catch(() => []),
  ]);

  // Solo accounts (the common case today) have no workspace, so this is
  // empty and the assignee picker only offers coworkers - real, not a
  // placeholder "coming soon" list.
  let teammates: { id: string; name: string }[] = [];
  if (workspaces.length > 0) {
    const { data: members } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaces[0].id)
      .eq("status", "active");
    const memberIds = Array.from(new Set((members ?? []).map((row) => row.user_id as string))).filter((id) => id !== user.id);
    if (memberIds.length > 0) {
      const { data: profiles } = await admin.from("profiles").select("id, full_name").in("id", memberIds);
      teammates = (profiles ?? []).map((profile) => ({ id: profile.id, name: profile.full_name || "Teammate" }));
    }
  }

  return (
    <WorkspaceTasksClient
      initialTasks={(tasks ?? []) as any}
      projects={(projects ?? []) as { id: string; name: string }[]}
      operators={operators.map((operator) => ({ id: operator.id, name: operator.name }))}
      teammates={teammates}
    />
  );
}
