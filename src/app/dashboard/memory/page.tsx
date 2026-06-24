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
    <div className="memory-page mx-auto max-w-7xl space-y-6">
      <section className="card">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--dobly-text-dim)]">Business Memory</div>
        <h1 className="mt-2 max-w-4xl font-display text-4xl tracking-[-0.06em] text-[var(--dobly-text)]">
          Give every worker the same business brain.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
          Memory is what makes Dobly more than a voice agent, chatbot, or automation builder. It stores the business
          profile, FAQs, offers, policies, tone, customer notes, approvals, and decisions that department workers use
          when they act for the business.
        </p>
      </section>

      <BusinessMemoryClient />
    </div>
  );
}
