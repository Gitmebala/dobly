import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimits } from "@/lib/rate-limit";

const updateSchema = z.object({ ids: z.array(z.string().uuid()).max(100).optional(), read: z.boolean().default(true) });

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.api(user.id).allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";
  let query = supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  if (unreadOnly) query = query.is("read_at", null);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load notifications." }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.write(user.id).allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification update." }, { status: 400 });
  let query = supabase.from("notifications").update({ read_at: parsed.data.read ? new Date().toISOString() : null }).eq("user_id", user.id);
  if (parsed.data.ids?.length) query = query.in("id", parsed.data.ids);
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Could not update notifications." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
