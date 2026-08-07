import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_skipped_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json<ApiError>({ error: "Could not save that. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
