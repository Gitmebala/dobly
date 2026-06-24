import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  LOCAL_SESSION_COOKIE,
  registerLocalUser,
  sessionCookieOptions,
} from "@/lib/local-runtime/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { captureServerEvent } from "@/lib/telemetry/server";

export async function POST(request: NextRequest) {
  if (!rateLimits.auth(getRequestIp(request)).allowed) {
    return NextResponse.json({ error: "Too many account creation attempts. Wait before trying again." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!fullName || fullName.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return NextResponse.json({ error: "Use a valid name and email, plus a 10+ character password with upper and lowercase letters, a number, and a symbol." }, { status: 400 });
  }

  try {
    if (process.env.DOBLY_LOCAL_MODE === "true") {
      const user = await registerLocalUser({ email, password, fullName });
      await captureServerEvent({ event: "signup_completed", distinctId: user.id, properties: { auth_mode: "local" } });
      const response = NextResponse.json({ ok: true, user });
      response.cookies.set(LOCAL_SESSION_COOKIE, createSessionToken(user.id, user.session_version), sessionCookieOptions());
      return response;
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await (supabase as any).auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (data?.user?.id) {
      await captureServerEvent({ event: "signup_completed", distinctId: data.user.id, properties: { auth_mode: "supabase" } });
    }
    return NextResponse.json({ ok: true, user: data?.user ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create the account." },
      { status: 400 },
    );
  }
}
