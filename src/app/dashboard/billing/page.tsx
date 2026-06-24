import { redirect } from "next/navigation";
import WorkspaceBillingClient from "@/components/dashboard/WorkspaceBillingClient";
import { DOBLY_PLANS } from "@/lib/billing/plans";
import { getUsageSummary, getUserPlanId } from "@/lib/billing/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBillingEconomySummary } from "@/lib/billing/economy";

export default async function BillingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const [currentPlanId, usage, economy] = await Promise.all([
    getUserPlanId(user.id),
    getUsageSummary({ userId: user.id }).catch(() => null),
    getBillingEconomySummary({ userId: user.id }).catch(() => null),
  ]);
  return <WorkspaceBillingClient plans={DOBLY_PLANS} currentPlanId={currentPlanId} usage={usage} economy={economy} />;
}
