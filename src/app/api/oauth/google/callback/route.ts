import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { upsertConnection, storeConnectionSecrets } from "@/lib/connections";
import { exchangeGoogleCode, fetchGoogleProfile, readGoogleState } from "@/lib/oauth/google";

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

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&error=google_oauth", req.url));
  }

  try {
    const parsed = readGoogleState(state);
    if (parsed.userId !== user.id) {
      throw new Error("OAuth user mismatch.");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
    const token = await exchangeGoogleCode({ code, appUrl });
    const profile = await fetchGoogleProfile(token.access_token);

    const connection = await upsertConnection({
      userId: user.id,
      provider: "google",
      label: profile.email,
      status: "active",
      accountIdentifier: profile.email,
      scopes: token.scope?.split(" ") ?? [],
      metadata: { profileId: profile.id, email: profile.email, name: profile.name ?? null },
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

    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&success=google_connected", req.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&error=google_oauth", req.url));
  }
}
