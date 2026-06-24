import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, getPlanFromSubscription } from "@/lib/stripe";
import { activatePaidPlanPeriod, markSubscriptionEnded } from "@/lib/billing/economy";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { DoblyPlanId } from "@/lib/billing/plans";

export async function POST(req: NextRequest) {
  const stripe = await getStripeClient();
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Stripe signature." },
      { status: 400 },
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      if (session.payment_status !== "paid") return NextResponse.json({ received: true, pending: true });
      const userId = session.metadata?.userId || session.client_reference_id;
      const planId = session.metadata?.planId as DoblyPlanId | undefined;
      if (userId && planId && planId !== "free") {
        await activatePaidPlanPeriod({
          provider: "stripe",
          providerEventId: event.id,
          fundingPeriodKey: `invoice:${session.invoice ?? session.id}`,
          eventType: event.type,
          userId,
          planId,
          market: "GLOBAL",
          providerCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
          providerSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
          amountMinor: Number(session.amount_total ?? 0),
          currency: String(session.currency ?? "usd").toUpperCase(),
          payload: session,
        });
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as any;
      const subscriptionId = typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id ?? null;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.userId;
        const planId = getPlanFromSubscription(subscription);
        if (userId && planId !== "free") {
          await activatePaidPlanPeriod({
            provider: "stripe",
            providerEventId: event.id,
            fundingPeriodKey: `invoice:${invoice.id}`,
            eventType: event.type,
            userId,
            planId,
            market: "GLOBAL",
            providerCustomerId: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null,
            providerSubscriptionId: subscriptionId,
            amountMinor: Number(invoice.amount_paid ?? 0),
            currency: String(invoice.currency ?? "usd").toUpperCase(),
            periodStart: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
            periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
            payload: invoice,
          });
        }
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as any;
      const userId = subscription.metadata?.userId;
      const planId = getPlanFromSubscription(subscription);
      if (userId) {
        await createAdminSupabaseClient()
          .from("profiles")
          .update({ plan: planId, stripe_subscription_id: subscription.id, updated_at: new Date().toISOString() })
          .eq("id", userId);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as any;
      const userId = subscription.metadata?.userId;
      if (userId) {
        await markSubscriptionEnded({
          provider: "stripe",
          providerEventId: event.id,
          eventType: event.type,
          userId,
          providerSubscriptionId: subscription.id,
          payload: subscription,
        });
      }
    }
  } catch (error) {
    console.error("Stripe subscription webhook failed:", error);
    return NextResponse.json({ received: false, error: "Webhook processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
