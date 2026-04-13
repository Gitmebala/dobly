import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildShopifyAuthUrl } from "@/lib/oauth/shopify";

export async function GET(req: NextRequest) {
  const rl = rateLimits.oauth(getRequestIp(req));
  if (!rl.allowed) {
    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&error=rate_limited", req.url));
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const shop = req.nextUrl.searchParams.get("shop");
  if (!shop) {
    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&error=shopify_shop_required", req.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
  return NextResponse.redirect(buildShopifyAuthUrl({ userId: user.id, shop, appUrl }));
}
