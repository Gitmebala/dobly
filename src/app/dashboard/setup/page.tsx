import { redirect } from "next/navigation";
import SetupWizardClient from "@/components/dashboard/SetupWizardClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SetupPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="card">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--dobly-text-dim)]">Guided Setup</div>
        <h1 className="mt-2 max-w-4xl font-display text-4xl tracking-[-0.06em] text-[var(--dobly-text)]">
          Set up your first Operator.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
          Start with one real job you want Dobly to handle well, shape the standard, skip anything unnecessary for now,
          and get to a realistic first test without turning setup into a project.
        </p>
      </section>

      <SetupWizardClient />
    </div>
  );
}
