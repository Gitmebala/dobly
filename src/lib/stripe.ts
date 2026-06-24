import type Stripe from "stripe";
import { DOBLY_PLANS, type DoblyPlanId } from "@/lib/billing/plans";

let stripeClientPromise: Promise<Stripe> | null = null;

export async function getStripeClient() {
  if (!stripeClientPromise) {
    stripeClientPromise = import("stripe").then(({ default: StripeSdk }) => {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        throw new Error("Missing STRIPE_SECRET_KEY");
      }

      return new StripeSdk(secretKey, {
        apiVersion: "2025-02-24.acacia",
        typescript: true,
      });
    });
  }

  return stripeClientPromise;
}

export async function createCheckoutSession({
  userId,
  email,
  planId,
  customerId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  planId: Exclude<DoblyPlanId, "free">;
  customerId?: string | null;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = await getStripeClient();
  const plan = DOBLY_PLANS.find((p) => p.id === planId);
  const priceId = getStripePriceId(planId);
  if (!plan || !priceId) {
    throw new Error(`Invalid plan: ${planId}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId,
    ...(customerId ? { customer: customerId } : { customer_email: email }),
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, planId },
    subscription_data: {
      metadata: { userId, planId },
    },
  });

  return session;
}

export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  const stripe = await getStripeClient();
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function cancelStripeSubscription(subscriptionId: string) {
  const stripe = await getStripeClient();
  return stripe.subscriptions.cancel(subscriptionId);
}

// Map Stripe subscription status to plan
export function getPlanFromSubscription(
  subscription: Stripe.Subscription
): DoblyPlanId {
  const priceId = subscription.items.data[0]?.price.id;
  const match = (["starter", "operator", "command"] as const).find((planId) => getStripePriceId(planId) === priceId);
  if (!match && priceId && process.env.STRIPE_PRICE_BUSINESS === priceId) {
    return "command";
  }
  return match ?? "free";
}

function getStripePriceId(planId: Exclude<DoblyPlanId, "free">) {
  if (planId === "business") {
    return process.env.STRIPE_PRICE_BUSINESS ?? process.env.STRIPE_PRICE_COMMAND ?? null;
  }
  if (planId === "starter") {
    return process.env.STRIPE_PRICE_SIGNAL_ROOM ?? process.env.STRIPE_PRICE_LAUNCHPAD ?? null;
  }
  if (planId === "operator") {
    return process.env.STRIPE_PRICE_MOMENTUM_DESK ?? process.env.STRIPE_PRICE_OPERATOR ?? null;
  }
  return process.env.STRIPE_PRICE_COMMAND_FLOOR ?? process.env.STRIPE_PRICE_COMMAND ?? null;
}
