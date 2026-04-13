import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createPortalSession } from "@/lib/stripe";
import type { ApiError } from "@/types";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.write(user.id || getRequestIp(req));
  if (!rl.allowed) {
    return NextResponse.json<ApiError>({ error: "Too many requests." }, { status: 429 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json<ApiError>(
      { error: "No billing account found" },
      { status: 404 }
    );
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
    const session = await createPortalSession({
      customerId: profile.stripe_customer_id,
      returnUrl: `${appUrl}/dashboard/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json<ApiError>(
      { error: "Failed to open billing portal" },
      { status: 500 }
    );
  }
}
