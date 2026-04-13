import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { upsertConnection, storeConnectionSecrets } from "@/lib/connections";
import { exchangeShopifyCode, readShopifyState, verifyShopifyHmac } from "@/lib/oauth/shopify";

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

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const shop = req.nextUrl.searchParams.get("shop");

  if (!code || !state || !shop || !verifyShopifyHmac(req.nextUrl.searchParams)) {
    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&error=shopify_oauth", req.url));
  }

  try {
    const parsed = readShopifyState(state);
    if (parsed.userId !== user.id || parsed.shop !== shop) {
      throw new Error("Shopify OAuth state mismatch.");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
    const token = await exchangeShopifyCode({ code, shop, appUrl });

    const connection = await upsertConnection({
      userId: user.id,
      provider: "shopify",
      label: shop,
      status: "active",
      accountIdentifier: shop,
      metadata: { shopDomain: shop, scope: token.scope ?? null },
      scopes: typeof token.scope === "string" ? token.scope.split(",") : [],
    });

    await storeConnectionSecrets({
      connectionId: connection.id,
      accessToken: token.access_token ?? null,
    });

    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&success=shopify_connected", req.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&error=shopify_oauth", req.url));
  }
}
