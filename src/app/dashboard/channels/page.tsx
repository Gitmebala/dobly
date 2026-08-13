import { redirect } from "next/navigation";
import BusinessChannelsClient from "@/components/dashboard/BusinessChannelsClient";
import { BUSINESS_CHANNELS } from "@/lib/business-channels";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function BusinessChannelsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="card">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--dobly-text-dim)]">Business Channels</div>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.06em] text-[var(--dobly-text)]">
          Connect where your business already talks.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
          Phone, texts, WhatsApp, email, calendar, CRM, content — connect the ones you use. No API keys to
          understand, no setup docs to read.
        </p>
      </section>

      <BusinessChannelsClient channels={BUSINESS_CHANNELS} />
    </div>
  );
}
