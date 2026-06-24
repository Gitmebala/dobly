import { redirect } from "next/navigation";
import WorkspaceProjectsClient from "@/components/dashboard/WorkspaceProjectsClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data } = await supabase.from("workspace_projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return <WorkspaceProjectsClient initialProjects={(data ?? []) as any} />;
}
