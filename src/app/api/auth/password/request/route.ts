import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createLocalPasswordReset } from "@/lib/local-runtime/auth";
import { isLocalModeActive } from "@/lib/local-runtime/guard";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (!rateLimits.auth(getRequestIp(request)).allowed) {
    return NextResponse.json({ error: "Too many reset attempts. Wait before trying again." }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  if (isLocalModeActive()) {
    const token = await createLocalPasswordReset(email);
    const resetUrl = token
      ? `${request.nextUrl.origin}/auth/reset-password?token=${encodeURIComponent(token)}`
      : null;
    return NextResponse.json({
      ok: true,
      resetUrl: process.env.NODE_ENV === "production" ? null : resetUrl,
      message: "If an account exists, a reset link is ready.",
    });
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { error } = await (supabase.auth as {
    resetPasswordForEmail: (
      address: string,
      options: { redirectTo: string },
    ) => Promise<{ error: { message: string } | null }>;
  }).resetPasswordForEmail(email, {
    redirectTo: `${request.nextUrl.origin}/auth/reset-password`,
  });
  if (error) return NextResponse.json({ error: "Could not send the reset email." }, { status: 503 });
  return NextResponse.json({ ok: true, resetUrl: null });
}
