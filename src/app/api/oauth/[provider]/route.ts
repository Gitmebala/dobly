import { NextRequest, NextResponse } from "next/server";
import { generateOAuthUrl, completeOAuthFlow } from "@/lib/oauth-service";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import crypto from "crypto";

const OAUTH_COOKIE_PREFIX = "dobly_oauth_";
const OAUTH_COOKIE_TTL_SECONDS = 10 * 60;

type OAuthStatePayload = {
  state: string;
  userId: string;
  label: string;
  codeVerifier?: string;
};

function getCookieName(provider: string) {
  return `${OAUTH_COOKIE_PREFIX}${provider}`;
}

function parseOauthCookie(raw: string | undefined): OAuthStatePayload | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OAuthStatePayload;
  } catch {
    return null;
  }
}

function base64Url(buffer: Buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createPkcePair() {
  const codeVerifier = base64Url(crypto.randomBytes(48));
  const codeChallenge = base64Url(crypto.createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

/**
 * POST /api/oauth/[provider]/start
 * Initialize OAuth flow
 */
export async function POST(request: NextRequest, { params }: { params: { provider: string } }) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimits.oauth(user.id || getRequestIp(request));
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many OAuth attempts." }, { status: 429 });
    }

    const { provider } = params;
    const body = await request.json().catch(() => ({}));
    const requestedLabel =
      typeof body?.label === "string" && body.label.trim().length > 0
        ? body.label.trim().slice(0, 120)
        : `${provider} Connection`;

    // Generate state token
    const state = crypto.randomBytes(32).toString("hex");

    const pkce = provider === "canva" ? createPkcePair() : null;
    const oauthUrl = generateOAuthUrl(
      provider,
      state,
      pkce
        ? {
            code_challenge: pkce.codeChallenge,
            code_challenge_method: "S256",
          }
        : undefined,
    );
    const response = NextResponse.json({
      oauth_url: oauthUrl,
      state,
      redirect_to: oauthUrl,
    });

    response.cookies.set({
      name: getCookieName(provider),
      value: JSON.stringify({ state, userId: user.id, label: requestedLabel, codeVerifier: pkce?.codeVerifier }),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: OAUTH_COOKIE_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OAuth start failed" },
      { status: 400 }
    );
  }
}

/**
 * GET /api/oauth/[provider]/callback
 * Handle OAuth callback
 */
export async function GET(request: NextRequest, { params }: { params: { provider: string } }) {
  try {
    const { provider } = params;
    const { searchParams } = new URL(request.url);

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing authorization code or state" },
        { status: 400 }
      );
    }

    const cookieName = getCookieName(provider);
    const oauthState = parseOauthCookie(request.cookies.get(cookieName)?.value);
    if (!oauthState || oauthState.state !== state || !oauthState.userId) {
      const errorUrl = new URL(
        "/dashboard/connections",
        process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
      );
      errorUrl.searchParams.set("error", "OAuth session expired or invalid. Please try again.");
      errorUrl.searchParams.set("provider", provider);
      const response = NextResponse.redirect(errorUrl.toString());
      response.cookies.delete(cookieName);
      return response;
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== oauthState.userId) {
      const errorUrl = new URL(
        "/dashboard/connections",
        process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
      );
      errorUrl.searchParams.set("error", "Sign in with the account that started this connection, then try again.");
      errorUrl.searchParams.set("provider", provider);
      const response = NextResponse.redirect(errorUrl.toString());
      response.cookies.delete(cookieName);
      return response;
    }

    // Complete OAuth flow
    const result = await completeOAuthFlow({
      userId: oauthState.userId,
      provider,
      code,
      label: oauthState.label,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "",
      additionalParams: oauthState.codeVerifier ? { code_verifier: oauthState.codeVerifier } : undefined,
    });

    // Redirect to success page
    const redirectUrl = new URL(
      "/dashboard/connections",
      process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
    );
    redirectUrl.searchParams.set("connected", provider);
    redirectUrl.searchParams.set("connectionId", result.connectionId);

    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete(cookieName);
    return response;
  } catch (error) {
    console.error(`OAuth callback error for ${params.provider}:`, error);

    const errorUrl = new URL(
      "/dashboard/connections",
      process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
    );
    errorUrl.searchParams.set("error", error instanceof Error ? error.message : "Authentication failed");
    errorUrl.searchParams.set("provider", params.provider);

    const response = NextResponse.redirect(errorUrl.toString());
    response.cookies.delete(getCookieName(params.provider));
    return response;
  }
}
