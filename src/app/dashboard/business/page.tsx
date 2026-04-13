import { redirect } from "next/navigation";
import BusinessProfileEditor from "@/components/dashboard/BusinessProfileEditor";
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

  return <BusinessProfileEditor initialProfile={businessProfile ?? null} />;
}
