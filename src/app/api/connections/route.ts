import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { connectionCreateSchema } from "@/lib/validations";

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
    .from("connections")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load connections" }, { status: 500 });
  }

  return NextResponse.json({ connections: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.write(user.id || getRequestIp(req));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many write requests." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = connectionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Provider and label are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("connections")
    .insert({
      user_id: user.id,
      provider: parsed.data.provider,
      label: parsed.data.label,
      status: parsed.data.status ?? "pending",
      account_identifier: parsed.data.accountIdentifier ?? null,
      scopes: parsed.data.scopes ?? [],
      metadata: parsed.data.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
  }

  return NextResponse.json({ connection: data });
}
