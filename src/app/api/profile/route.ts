import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
  }
  return NextResponse.json({
    profile: {
      ...(data ?? {}),
      id: user.id,
      email: data?.email || user.email || "",
      full_name: data?.full_name || user.user_metadata?.full_name || "",
      plan: data?.plan || "free",
    },
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const fullName = typeof body.full_name === "string" ? body.full_name.trim().slice(0, 120) : "";
  const notificationPreference = ["app", "email", "whatsapp"].includes(body.notification_preference)
    ? body.notification_preference
    : "app";
  if (!fullName) return NextResponse.json({ error: "Full name is required." }, { status: 400 });

  const profile = {
    id: user.id,
    email: user.email || "",
    full_name: fullName,
    notification_preference: notificationPreference,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Could not save profile." }, { status: 500 });
  return NextResponse.json({ profile: data });
}
