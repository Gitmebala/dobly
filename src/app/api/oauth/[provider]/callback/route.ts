import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isConnectionProviderLaunchReady } from "@/lib/connection-catalog";
import { upsertConnection, storeConnectionSecrets } from "@/lib/connections";
import {
  exchangeGenericOAuthCode,
  fetchGenericOAuthProfile,
  readGenericOAuthState,
  type GenericOAuthProvider,
} from "@/lib/oauth/generic";

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

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL(`/dashboard/settings?tab=connections&error=${provider}_oauth`, req.url));
  }

  try {
    const parsed = readGenericOAuthState(state);
    if (parsed.userId !== user.id || parsed.provider !== provider) {
      throw new Error("OAuth user mismatch.");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
    const token = await exchangeGenericOAuthCode({
      provider: provider as GenericOAuthProvider,
      code,
      appUrl,
    });
    const profile = await fetchGenericOAuthProfile(provider as GenericOAuthProvider, token.access_token);

    const connection = await upsertConnection({
      userId: user.id,
      provider,
      label: profile.label,
      status: "active",
      accountIdentifier: profile.accountIdentifier,
      scopes: token.scope ? token.scope.split(/[ ,]+/).filter(Boolean) : [],
      metadata: profile.metadata ?? {},
    });

    const expiresAt = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;

    await storeConnectionSecrets({
      connectionId: connection.id,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt,
    });

    return NextResponse.redirect(new URL(`/dashboard/settings?tab=connections&success=${provider}_connected`, req.url));
  } catch {
    return NextResponse.redirect(new URL(`/dashboard/settings?tab=connections&error=${provider}_oauth`, req.url));
  }
}
