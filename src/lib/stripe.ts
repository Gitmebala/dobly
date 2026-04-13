import type Stripe from "stripe";
import { PLANS, type PlanId } from "@/types";

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
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  planId: PlanId;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = await getStripeClient();
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan?.stripe_price_id) {
    throw new Error(`Invalid plan: ${planId}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    client_reference_id: userId,
    customer_email: email,
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

// Map Stripe subscription status to plan
export function getPlanFromSubscription(
  subscription: Stripe.Subscription
): PlanId {
  const priceId = subscription.items.data[0]?.price.id;
  const plan = PLANS.find((p) => p.stripe_price_id === priceId);
  return (plan?.id as PlanId) ?? "free";
}
