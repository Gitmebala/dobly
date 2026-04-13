import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getPlanFromSubscription, getStripeClient } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

// SECURITY: Raw body needed for Stripe signature verification
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  }

  const stripe = await getStripeClient();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    // SECURITY: Invalid signature means reject immediately.
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.userId;

        if (!userId) {
          console.error("No userId in checkout session:", session.id);
          break;
        }

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const plan = getPlanFromSubscription(subscription);

          const { error } = await supabase
            .from("profiles")
            .update({
              plan,
              stripe_customer_id:
                typeof session.customer === "string" ? session.customer : null,
              stripe_subscription_id: subscription.id,
            })
            .eq("id", userId);

          if (error) {
            console.error("Failed to update profile after checkout:", error);
          } else {
            console.log(`User ${userId} upgraded to ${plan}`);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const plan = getPlanFromSubscription(subscription);
        const customerId =
          typeof subscription.customer === "string" ? subscription.customer : null;

        if (!userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_subscription_id", subscription.id)
            .single();

          if (!profile) {
            console.error("No profile found for subscription:", subscription.id);
            break;
          }

          await supabase
            .from("profiles")
            .update({
              plan,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
            })
            .eq("id", profile.id);
        } else {
          await supabase
            .from("profiles")
            .update({
              plan,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
            })
            .eq("id", userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from("profiles")
          .update({
            plan: "free",
            stripe_customer_id:
              typeof subscription.customer === "string" ? subscription.customer : null,
            stripe_subscription_id: null,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Failed to downgrade after cancellation:", error);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn("Payment failed for customer:", invoice.customer);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ received: false, error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
