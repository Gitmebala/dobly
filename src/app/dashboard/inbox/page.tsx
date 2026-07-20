import { redirect } from "next/navigation";
import WorkspaceInboxClient from "@/components/dashboard/WorkspaceInboxClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Inbox" };


export default async function InboxPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data } = await supabase.from("workspace_inbox").select("*").eq("user_id", user.id).eq("status", "unsorted").order("created_at", { ascending: false });
  return <WorkspaceInboxClient initialItems={(data ?? []) as any} />;
}
