import { redirect } from "next/navigation";
import BusinessMemoryClient from "@/components/dashboard/BusinessMemoryClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function BusinessMemoryPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="ref-page memory-page">
      <header className="ref-header">
        <div>
          <div className="ref-greeting">Business memory</div>
          <h1>Give every coworker the same brain.</h1>
          <p className="ref-subtitle">
            Policies, FAQs, offers, tone, customer notes, and decisions your coworkers draw on when they act for the business.
          </p>
        </div>
      </header>
      <BusinessMemoryClient />
    </div>
  );
}
