import { notFound, redirect } from "next/navigation";
import WorkflowEditor from "@/components/dashboard/WorkflowEditor";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Workflow, WorkflowRun } from "@/types";

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: workflow }, { data: runs }] = await Promise.all([
    supabase.from("workflows").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase
      .from("workflow_runs")
      .select("*")
      .eq("workflow_id", id)
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(10),
  ]);

  if (!workflow) notFound();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  return (
    <WorkflowEditor
      workflow={workflow as Workflow}
      appUrl={appUrl}
      recentRuns={(runs ?? []) as WorkflowRun[]}
    />
  );
}
