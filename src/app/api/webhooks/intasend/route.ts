import { NextRequest, NextResponse } from "next/server";
import {
  extractIntaSendCallback,
  isIntaSendPaymentSuccessful,
  verifyIntaSendPayment,
} from "@/lib/intasend";
import { activatePaidPlanPeriod, fundPurchasedTopUp } from "@/lib/billing/economy";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { DoblyPlanId } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, service: "dobly-intasend-webhook" });
}

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as Record<string, any> | null;
  if (!payload) return NextResponse.json({ error: "Invalid callback payload" }, { status: 400 });

  const callback = extractIntaSendCallback(payload);
  const admin = createAdminSupabaseClient();
  let checkoutQuery = admin.from("billing_checkout_sessions").select("*").eq("provider", "intasend");
  if (callback.reference) checkoutQuery = checkoutQuery.eq("reference", callback.reference);
  else if (callback.invoiceId) checkoutQuery = checkoutQuery.eq("provider_invoice_id", callback.invoiceId);
  else return NextResponse.json({ received: true, ignored: true });
  const { data: checkout } = await checkoutQuery.maybeSingle();
  if (!checkout || !callback.invoiceId) return NextResponse.json({ received: true, ignored: true });

  let verified: Record<string, any>;
  try {
    verified = await verifyIntaSendPayment({
      invoiceId: callback.invoiceId,
      checkoutId: callback.checkoutId ?? checkout.provider_checkout_id,
      signature: callback.signature,
    });
  } catch (error) {
    console.error("IntaSend callback verification failed:", error);
    return NextResponse.json({ received: false, error: "Verification unavailable" }, { status: 503 });
  }

  if (!isIntaSendPaymentSuccessful(verified)) {
    return NextResponse.json({ received: true, pending: true });
  }
  const planId = String(checkout.plan_id) as DoblyPlanId;
  if (!(["starter", "operator", "command"] as string[]).includes(planId)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  if (checkout.metadata?.kind === "top_up") {
    await fundPurchasedTopUp({
      provider: "intasend",
      providerEventId: callback.providerEventId ?? `invoice:${callback.invoiceId}`,
      fundingReference: `invoice:${callback.invoiceId}`,
      userId: String(checkout.user_id),
      workspaceId: checkout.workspace_id ?? null,
      paidAmountMinor: Number(checkout.amount_minor ?? 0),
      currency: String(checkout.currency ?? "KES"),
      payload: { callback: payload, verified },
    });
  } else await activatePaidPlanPeriod({
    provider: "intasend",
    providerEventId: callback.providerEventId ?? `invoice:${callback.invoiceId}`,
    fundingPeriodKey: `invoice:${callback.invoiceId}`,
    eventType: "payment.completed",
    userId: String(checkout.user_id),
    workspaceId: checkout.workspace_id ?? null,
    planId: planId as Exclude<DoblyPlanId, "free">,
    market: "KE",
    providerCustomerId: String(verified.customer_id ?? verified.customer?.id ?? "") || null,
    amountMinor: Number(checkout.amount_minor ?? 0),
    currency: String(checkout.currency ?? "KES"),
    payload: { callback: payload, verified },
  });
  await admin
    .from("billing_checkout_sessions")
    .update({ status: "paid", provider_invoice_id: callback.invoiceId, updated_at: new Date().toISOString() })
    .eq("id", checkout.id);
  return NextResponse.json({ received: true, activated: true });
}
