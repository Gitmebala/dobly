import { NextResponse } from "next/server";
import { LOCAL_SESSION_COOKIE, sessionCookieOptions } from "@/lib/local-runtime/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  if (process.env.DOBLY_LOCAL_MODE !== "true") {
    const supabase = await createServerSupabaseClient();
    await (supabase as any).auth.signOut();
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(LOCAL_SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
