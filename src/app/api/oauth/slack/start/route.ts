import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildSlackAuthUrl } from "@/lib/oauth/slack";

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
  return NextResponse.redirect(buildSlackAuthUrl({ userId: user.id, appUrl }));
}
