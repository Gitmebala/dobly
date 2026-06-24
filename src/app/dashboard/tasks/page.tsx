import { redirect } from "next/navigation";
import WorkspaceTasksClient from "@/components/dashboard/WorkspaceTasksClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function TasksPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data } = await supabase.from("workspace_tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return <WorkspaceTasksClient initialTasks={(data ?? []) as any} />;
}
