import { redirect } from "next/navigation";
import WorkspaceSearchClient from "@/components/dashboard/WorkspaceSearchClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";

export default async function SearchPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  // `coworkers` is a separate, parallel table from `dobly_operators` - hiring
  // a coworker writes to dobly_operators (see createDoblyOperator), so
  // querying `coworkers` here always returned nothing and coworkers were
  // permanently unfindable through search.
  const [{ data: tasks }, { data: projects }, { data: documents }, { data: workflows }, operators] = await Promise.all([
    supabase.from("workspace_tasks").select("*").eq("user_id", user.id),
    supabase.from("workspace_projects").select("*").eq("user_id", user.id),
    supabase.from("workspace_documents").select("*").eq("user_id", user.id),
    supabase.from("workflows").select("*").eq("user_id", user.id),
    listDoblyOperators({ userId: user.id }).catch((): OperatorWithLoops[] => []),
  ]);
  const records = [
    ...(tasks ?? []).map((item: any) => ({ id: item.id, title: item.title, subtitle: item.description || item.status, type: "Task", href: "/dashboard/tasks" })),
    ...(projects ?? []).map((item: any) => ({ id: item.id, title: item.name, subtitle: item.description || item.status, type: "Project", href: "/dashboard/projects" })),
    ...(documents ?? []).map((item: any) => ({ id: item.id, title: item.title, subtitle: item.type, type: "Document", href: "/dashboard/documents" })),
    ...(workflows ?? []).map((item: any) => ({ id: item.id, title: item.title, subtitle: item.description || item.status, type: "Workflow", href: `/dashboard/workflows/${item.id}` })),
    ...operators.map((operator) => ({ id: operator.id, title: operator.name, subtitle: operator.mission, type: "Coworker", href: `/dashboard/coworkers?operatorId=${operator.id}` })),
  ];
  return <WorkspaceSearchClient records={records} />;
}
