import { redirect } from "next/navigation";
import { BusinessSetupClient } from "@/components/dashboard/BusinessSetupClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function BusinessPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: businessProfile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return <BusinessSetupClient initialProfile={businessProfile ?? null} />;
}
