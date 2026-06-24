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
          Connect the real channels your departments will use.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
          Dobly is not asking users to understand APIs. They connect their business phone, texts, WhatsApp, email,
          calendar, CRM, and content stack. Dobly turns those channels into department workers with memory,
          approvals, and reporting.
        </p>
      </section>

      <BusinessChannelsClient channels={BUSINESS_CHANNELS} />
    </div>
  );
}
