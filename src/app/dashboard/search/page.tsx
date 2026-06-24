import { redirect } from "next/navigation";
import WorkspaceSearchClient from "@/components/dashboard/WorkspaceSearchClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SearchPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const [{ data: tasks }, { data: projects }, { data: documents }, { data: workflows }, { data: coworkers }] = await Promise.all([
    supabase.from("workspace_tasks").select("*").eq("user_id", user.id),
    supabase.from("workspace_projects").select("*").eq("user_id", user.id),
    supabase.from("workspace_documents").select("*").eq("user_id", user.id),
    supabase.from("workflows").select("*").eq("user_id", user.id),
    supabase.from("coworkers").select("*").eq("user_id", user.id),
  ]);
  const records = [
    ...(tasks ?? []).map((item: any) => ({ id: item.id, title: item.title, subtitle: item.description || item.status, type: "Task", href: "/dashboard/tasks" })),
    ...(projects ?? []).map((item: any) => ({ id: item.id, title: item.name, subtitle: item.description || item.status, type: "Project", href: "/dashboard/projects" })),
    ...(documents ?? []).map((item: any) => ({ id: item.id, title: item.title, subtitle: item.type, type: "Document", href: "/dashboard/documents" })),
    ...(workflows ?? []).map((item: any) => ({ id: item.id, title: item.title, subtitle: item.description || item.status, type: "Workflow", href: `/dashboard/workflows/${item.id}` })),
    ...(coworkers ?? []).map((item: any) => ({ id: item.id, title: item.name, subtitle: item.mission || item.role, type: "Coworker", href: `/dashboard/coworkers/${item.id}` })),
  ];
  return <WorkspaceSearchClient records={records} />;
}
