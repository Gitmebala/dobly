import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isConnectionProviderLaunchReady } from "@/lib/connection-catalog";
import { buildGenericOAuthUrl, type GenericOAuthProvider } from "@/lib/oauth/generic";

const SUPPORTED = new Set<GenericOAuthProvider>(["microsoft", "notion", "hubspot", "airtable", "stripe", "meta"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (!SUPPORTED.has(provider as GenericOAuthProvider) || !isConnectionProviderLaunchReady(provider)) {
    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&error=provider_not_supported", req.url));
  }

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
  return NextResponse.redirect(
    buildGenericOAuthUrl({
      provider: provider as GenericOAuthProvider,
      userId: user.id,
      appUrl,
    })
  );
}
