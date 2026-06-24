import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { startManagedMpesaPlanPayment } from "@/lib/billing/mpesa";
import type { DoblyPlanId } from "@/lib/billing/plans";

export async function runBillingMaintenance() {
  const admin = createAdminSupabaseClient() as any;
  const { data: released } = await admin.rpc("dobly_release_expired_reservations", {}).catch(() => ({ data: 0 }));
  const now = new Date();
  const renewalHorizon = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const pendingSince = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const graceCutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: dueSubscriptions } = await admin
    .from("billing_subscriptions")
    .select("*")
    .in("status", ["active", "grace"])
    .lte("current_period_end", renewalHorizon)
    .limit(200);
  const renewalRequests: Array<Record<string, unknown>> = [];

  for (const subscription of dueSubscriptions ?? []) {
    const [{ data: policy }, { data: account }, { data: pending }] = await Promise.all([
      admin.from("billing_spending_policies").select("*").eq("user_id", subscription.user_id).maybeSingle(),
      admin.from("billing_accounts").select("*").eq("user_id", subscription.user_id).maybeSingle(),
      admin
        .from("billing_checkout_sessions")
        .select("id")
        .eq("user_id", subscription.user_id)
        .eq("provider", "mpesa")
        .eq("status", "pending")
        .gte("created_at", pendingSince)
        .limit(1),
    ]);
    if (!policy?.auto_top_up_enabled || !account?.phone_number || pending?.length) continue;
    const planId = String(subscription.plan_id) as DoblyPlanId;
    if (!(["starter", "operator", "command"] as string[]).includes(planId)) continue;
    try {
      const payment = await startManagedMpesaPlanPayment({
        userId: String(subscription.user_id),
        workspaceId: subscription.workspace_id ?? null,
        planId: planId as Exclude<DoblyPlanId, "free">,
        phoneNumber: String(account.phone_number),
      });
      renewalRequests.push({ userId: subscription.user_id, status: "requested", checkoutRequestId: payment.checkoutRequestId });
    } catch (error) {
      renewalRequests.push({ userId: subscription.user_id, status: "failed", error: error instanceof Error ? error.message : "Renewal request failed." });
    }
  }

  const { data: expiredSubscriptions } = await admin
    .from("billing_subscriptions")
    .select("id,user_id")
    .in("status", ["active", "grace", "past_due"])
    .lt("current_period_end", graceCutoff)
    .limit(500);
  for (const subscription of expiredSubscriptions ?? []) {
    await admin.from("billing_subscriptions").update({ status: "past_due", updated_at: now.toISOString() }).eq("id", subscription.id);
    await admin.from("profiles").update({ plan: "free", updated_at: now.toISOString() }).eq("id", subscription.user_id);
  }

  const { data: providerAccounts } = await admin.from("billing_provider_accounts").select("*").in("status", ["active", "degraded"]);
  const lowBalanceProviders = (providerAccounts ?? []).filter((provider: any) =>
    provider.balance_minor != null &&
    provider.low_balance_threshold_minor != null &&
    Number(provider.balance_minor) <= Number(provider.low_balance_threshold_minor),
  );
  return {
    releasedReservations: Number(released ?? 0),
    renewalRequests,
    expiredSubscriptions: expiredSubscriptions?.length ?? 0,
    lowBalanceProviders,
  };
}
