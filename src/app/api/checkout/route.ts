import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe";
import { createPaystackCheckoutSession } from "@/lib/paystack";
import { getPrimaryBillingGateway } from "@/lib/billing/gateway";
import { createIntaSendCheckoutSession } from "@/lib/intasend";
import { captureServerEvent } from "@/lib/telemetry/server";
import { checkoutSchema } from "@/lib/validations";
import type { ApiError } from "@/types";
import { isEmergencyStopActive } from "@/lib/feature-flags";

export async function POST(req: NextRequest) {
  if (isEmergencyStopActive("billing")) {
    return NextResponse.json<ApiError>({ error: "Checkout is temporarily paused. Please try again shortly." }, { status: 503 });
  }
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.write(user.id || getRequestIp(req));
  if (!rl.allowed) {
    return NextResponse.json<ApiError>({ error: "Too many checkout attempts." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiError>({ error: "Invalid request" }, { status: 400 });
  }

  const validation = checkoutSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>(
      { error: "Invalid plan selected" },
      { status: 400 }
    );
  }

  const { plan_id } = validation.data;
  if (!user.email) {
    return NextResponse.json<ApiError>(
      { error: "This account is missing a billing email." },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
  const billingProvider = getPrimaryBillingGateway("KE");

  try {
    if (billingProvider === "intasend") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      const session = await createIntaSendCheckoutSession({
        userId: user.id,
        email: user.email,
        fullName: profile?.full_name ?? null,
        planId: plan_id,
        successUrl: `${appUrl}/dashboard/billing?upgraded=pending`,
      });
      await captureServerEvent({
        event: "checkout_started",
        distinctId: user.id,
        properties: { provider: "intasend", plan_id, reference: session.reference },
      }).catch(() => null);
      return NextResponse.json({ provider: "intasend", reference: session.reference, url: session.url });
    }

    if (billingProvider === "mpesa") {
      return NextResponse.json<ApiError>(
        { error: "Use the M-Pesa renewal option so Dobly can send the STK request to your phone." },
        { status: 400 },
      );
    }

    if (billingProvider === "paystack") {
      const session = await createPaystackCheckoutSession({
        userId: user.id,
        email: user.email,
        planId: plan_id,
        successUrl: `${appUrl}/dashboard?upgraded=pending`,
        cancelUrl: `${appUrl}/pricing?cancelled=true`,
      });

      await captureServerEvent({
        event: "checkout_started",
        distinctId: user.id,
        properties: {
          provider: "paystack",
          plan_id,
          reference: session.reference,
        },
      }).catch(() => null);

      return NextResponse.json({
        provider: session.provider,
        mode: session.mode,
        reference: session.reference,
        url: session.url,
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      planId: plan_id,
      customerId: profile?.stripe_customer_id ?? null,
      successUrl: `${appUrl}/dashboard?upgraded=true`,
      cancelUrl: `${appUrl}/pricing?cancelled=true`,
    });

    await captureServerEvent({
      event: "checkout_started",
      distinctId: user.id,
      properties: {
        provider: "stripe",
        plan_id,
      },
    }).catch(() => null);

    return NextResponse.json({ provider: "stripe", url: session.url });
  } catch (err) {
    console.error("Checkout session error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
