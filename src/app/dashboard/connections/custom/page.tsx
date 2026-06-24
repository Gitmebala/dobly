import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import CustomToolAccessClient from "@/components/dashboard/CustomToolAccessClient";

export default async function CustomConnectionsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return (
    <div className="mx-auto max-w-6xl">
      <CustomToolAccessClient />
    </div>
  );
}
