import { NextRequest, NextResponse } from "next/server";
import { generateOAuthUrl, completeOAuthFlow } from "@/lib/oauth-service";
import crypto from "crypto";

/**
 * POST /api/oauth/[provider]/start
 * Initialize OAuth flow
 */
export async function POST(request: NextRequest, { params }: { params: { provider: string } }) {
  try {
    const { provider } = params;
    const { label, redirectUrl } = await request.json();

    // Generate state token
    const state = crypto.randomBytes(32).toString("hex");

    // Store state in session (in production, use Redis or secure session store)
    // For now, return state to client to send back in callback
    const oauthUrl = generateOAuthUrl(provider, state);

    return NextResponse.json({
      oauth_url: oauthUrl,
      state,
      redirect_to: oauthUrl,
    });
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

    // In production, verify state matches stored state
    // Get user ID from session
    const userId = request.headers.get("x-user-id") || "user_placeholder";

    // Complete OAuth flow
    const result = await completeOAuthFlow({
      userId,
      provider,
      code,
      label: `${provider} Connection`,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "",
    });

    // Redirect to success page
    const redirectUrl = new URL("/dashboard/connections", process.env.NEXT_PUBLIC_APP_URL);
    redirectUrl.searchParams.set("connected", provider);
    redirectUrl.searchParams.set("connectionId", result.connectionId);

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error(`OAuth callback error for ${params.provider}:`, error);

    const errorUrl = new URL(
      "/dashboard/connections",
      process.env.NEXT_PUBLIC_APP_URL
    );
    errorUrl.searchParams.set("error", error instanceof Error ? error.message : "Authentication failed");
    errorUrl.searchParams.set("provider", params.provider);

    return NextResponse.redirect(errorUrl.toString());
  }
}
