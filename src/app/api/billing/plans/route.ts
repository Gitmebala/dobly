import { NextResponse } from "next/server";
import { DOBLY_PLANS } from "@/lib/billing/plans";
import { getUsageSummary, getUserPlanId } from "@/lib/billing/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBillingEconomySummary } from "@/lib/billing/economy";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentPlanId = user ? await getUserPlanId(user.id) : "free";
  const usage = user ? await getUsageSummary({ userId: user.id }).catch(() => null) : null;
  const economy = user ? await getBillingEconomySummary({ userId: user.id }).catch(() => null) : null;

  return NextResponse.json({
    plans: DOBLY_PLANS,
    currentPlanId,
    usage,
    economy,
  });
}
