import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseReachable } from "@/lib/supabase/availability";
import {
  authenticateLocalUser,
  createSessionToken,
  LOCAL_SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/local-runtime/auth";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";

function authMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed") || normalized.includes("not confirmed")) {
    return "Your email is not confirmed yet. Open the confirmation link we sent, then sign in again.";
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("credential")
  ) {
    return "Invalid email or password.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many sign-in attempts. Wait a moment, then try again.";
  }

  if (normalized.includes("email")) {
    return message;
  }

  return "Sign in failed. Please try again.";
}

export async function POST(request: NextRequest) {
  if (!rateLimits.auth(getRequestIp(request)).allowed) {
    return NextResponse.json({ error: "Too many sign-in attempts. Wait before trying again." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    if (process.env.DOBLY_LOCAL_MODE === "true") {
      const user = await authenticateLocalUser(email, password);
      if (!user) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }
      const response = NextResponse.json({ ok: true, user });
      response.cookies.set(LOCAL_SESSION_COOKIE, createSessionToken(user.id, user.session_version), sessionCookieOptions());
      return response;
    }

    if (!(await isSupabaseReachable())) {
      return NextResponse.json(
        { error: "Authentication is not configured correctly. Update the Supabase project URL, then try again." },
        { status: 503 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (/fetch failed|enotfound|network/i.test(error.message)) {
        return NextResponse.json(
          { error: "Authentication service unavailable. Check the Supabase project URL and try again." },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: authMessage(error.message) }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/auth/login] authentication service unavailable", error);
    return NextResponse.json(
      { error: "Authentication service unavailable. Check the Supabase project URL and try again." },
      { status: 503 },
    );
  }
}
