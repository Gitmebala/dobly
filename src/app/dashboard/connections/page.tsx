import { redirect } from "next/navigation";
import ConnectionsTab from "@/components/dashboard/ConnectionsTab";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PlanId } from "@/types";

export default async function ConnectionsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  return (
    <div className="connections-page mx-auto max-w-6xl">
      <ConnectionsTab planId={(profile?.plan ?? "free") as PlanId} />
    </div>
  );
}
