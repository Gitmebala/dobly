import { NextRequest, NextResponse } from "next/server";
import {
  getPlanFromPaystackMetadata,
  getUserIdFromPaystackMetadata,
  verifyPaystackSignature,
} from "@/lib/paystack";
import { activatePaidPlanPeriod, markSubscriptionEnded } from "@/lib/billing/economy";

export const dynamic = "force-dynamic";

type PaystackWebhookEvent = {
  event?: string;
  data?: {
    id?: number;
    amount?: number;
    currency?: string;
    status?: string;
    reference?: string;
    metadata?: unknown;
    customer?: {
      id?: number;
      customer_code?: string;
      email?: string;
    };
    subscription?: {
      subscription_code?: string;
      email_token?: string;
    };
  };
};

export async function POST(req: NextRequest) {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json({ error: "Paystack webhook is not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    if (event.event === "charge.success" && event.data?.status === "success") {
      const userId = getUserIdFromPaystackMetadata(event.data.metadata);
      const plan = getPlanFromPaystackMetadata(event.data.metadata);

      if (!userId || plan === "free") {
        console.error("Paystack charge missing Dobly metadata:", event.data.reference);
        return NextResponse.json({ received: true, ignored: true });
      }

      await activatePaidPlanPeriod({
        provider: "paystack",
        providerEventId: String(event.data.id ?? event.data.reference ?? "unknown"),
        fundingPeriodKey: String(event.data.reference ?? event.data.id ?? "unknown"),
        eventType: event.event,
        userId,
        planId: plan as Exclude<typeof plan, "free">,
        market: "KE",
        providerCustomerId: event.data.customer?.customer_code ?? (String(event.data.customer?.id ?? "") || null),
        providerSubscriptionId: event.data.subscription?.subscription_code ?? null,
        amountMinor: Number(event.data.amount ?? 0),
        currency: event.data.currency ?? "KES",
        payload: event as unknown as Record<string, unknown>,
        subscriptionMetadata: event.data.subscription?.email_token
          ? { cancellationEmailToken: event.data.subscription.email_token }
          : undefined,
      });
    }

    if (event.event === "subscription.disable") {
      const userId = getUserIdFromPaystackMetadata(event.data?.metadata);
      if (userId) {
        await markSubscriptionEnded({
          provider: "paystack",
          providerEventId: String(event.data?.id ?? event.data?.reference ?? event.data?.subscription?.subscription_code ?? "unknown"),
          eventType: event.event,
          userId,
          providerSubscriptionId: event.data?.subscription?.subscription_code ?? null,
          payload: event as unknown as Record<string, unknown>,
        });
      }
    }
  } catch (error) {
    console.error("Paystack webhook handler error:", error);
    return NextResponse.json({ received: false, error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
