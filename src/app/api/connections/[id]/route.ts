import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { connectionUpdateSchema } from "@/lib/validations";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const parsed = connectionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("connections")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("connections")
    .update({
      label: parsed.data.label,
      status: parsed.data.status,
      metadata: parsed.data.metadata,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to update connection" }, { status: 500 });
  }

  return NextResponse.json({ connection: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.write(user.id || getRequestIp(_req));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many write requests." }, { status: 429 });
  }

  const { data: existing } = await supabase
    .from("connections")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("connections")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete connection" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
