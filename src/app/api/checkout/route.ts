import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe";
import { checkoutSchema } from "@/lib/validations";
import type { ApiError } from "@/types";

export async function POST(req: NextRequest) {
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

  try {
    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      planId: plan_id,
      successUrl: `${appUrl}/dashboard?upgraded=true`,
      cancelUrl: `${appUrl}/pricing?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout session error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
