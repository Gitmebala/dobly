import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { upsertConnection, storeConnectionSecrets } from "@/lib/connections";
import { exchangeSlackCode, readSlackState } from "@/lib/oauth/slack";

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
    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&error=slack_oauth", req.url));
  }

  try {
    const parsed = readSlackState(state);
    if (parsed.userId !== user.id) {
      throw new Error("Slack OAuth user mismatch.");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
    const token = await exchangeSlackCode({ code, appUrl });

    const connection = await upsertConnection({
      userId: user.id,
      provider: "slack",
      label: token.team?.name ?? token.authed_user?.id ?? "Slack workspace",
      status: "active",
      accountIdentifier: token.team?.id ?? null,
      scopes: typeof token.scope === "string" ? token.scope.split(",") : [],
      metadata: {
        teamId: token.team?.id ?? null,
        teamName: token.team?.name ?? null,
        botUserId: token.bot_user_id ?? null,
      },
    });

    await storeConnectionSecrets({
      connectionId: connection.id,
      accessToken: token.access_token ?? null,
      refreshToken: token.refresh_token ?? null,
    });

    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&success=slack_connected", req.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&error=slack_oauth", req.url));
  }
}
