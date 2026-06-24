import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { businessProfileSchema } from "@/lib/validations";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.api(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: "Failed to load business profile." }, { status: 500 });
  }

  return NextResponse.json(
    { businessProfile: data ?? null },
    { headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } }
  );
}

export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.business(user.id || getRequestIp(req));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many business profile updates." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = businessProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid business profile." },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const { data, error } = await supabase
    .from("business_profiles")
    .upsert(
      {
        user_id: user.id,
        business_name: payload.business_name,
        business_type: payload.business_type ?? null,
        website_url: payload.website_url ?? null,
        description: payload.description ?? null,
        locations: payload.locations ?? [],
        opening_hours: payload.opening_hours ?? null,
        contact_details: payload.contact_details ?? {},
        brand_voice: payload.brand_voice ?? null,
        faq_entries: payload.faq_entries ?? [],
        policies: payload.policies ?? [],
        source_urls: payload.source_urls ?? [],
        context_summary: payload.context_summary ?? null,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to save business profile." }, { status: 500 });
  }

  return NextResponse.json(
    { businessProfile: data },
    { headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } }
  );
}
