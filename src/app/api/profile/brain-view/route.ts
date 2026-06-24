import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const brainViewSchema = z.object({
  brainViewEnabled: z.boolean().optional(),
  brainTooltipSeen: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = brainViewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid brain view preference." }, { status: 400 });
  }

  const patch: Record<string, boolean> = {};
  if (typeof parsed.data.brainViewEnabled === "boolean") patch.brain_view_enabled = parsed.data.brainViewEnabled;
  if (typeof parsed.data.brainTooltipSeen === "boolean") patch.brain_tooltip_seen = parsed.data.brainTooltipSeen;

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "No preference update provided." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select("brain_view_enabled, brain_tooltip_seen")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
