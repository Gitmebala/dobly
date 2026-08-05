import { redirect } from "next/navigation";
import WorkspaceProjectsClient from "@/components/dashboard/WorkspaceProjectsClient";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { computeProjectProgress } from "@/lib/workspace-tasks";

export default async function ProjectsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("workspace_projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  const projects = data ?? [];
  const progressByProject = await computeProjectProgress(user.id, projects.map((project) => project.id));
  const withProgress = projects.map((project) => ({
    ...project,
    progress: progressByProject[project.id]?.percent ?? 0,
    taskCount: progressByProject[project.id]?.total ?? 0,
  }));

  return <WorkspaceProjectsClient initialProjects={withProgress as any} />;
}
