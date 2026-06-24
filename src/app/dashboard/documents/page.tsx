import { redirect } from "next/navigation";
import WorkspaceDocumentsClient from "@/components/dashboard/WorkspaceDocumentsClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DocumentsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data } = await supabase.from("workspace_documents").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
  return <WorkspaceDocumentsClient initialDocuments={(data ?? []) as any} />;
}
