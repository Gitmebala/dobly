import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { rateLimits } from "@/lib/rate-limit";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";

// Loops had no management route at all before this - the workflows page
// could list them and (as of this session) create them, but a loop that
// turned out to be too noisy or simply wrong had no way to be paused or
// removed short of an admin DB query. Soft-delete via status: "archived"
// matches the filter the page already applies (`loop.status !== "archived"`),
// not a new convention.
const patchSchema = z.object({
  status: z.enum(["active", "paused", "archived"]),
});

async function loadOwnedLoop(userId: string, loopId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dobly_operator_loops")
    .select("id, user_id, workspace_id, operator_id, name, status")
    .eq("id", loopId)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("Loop not found.");
  return data;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ loopId: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimits.write(user.id);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid update." }, { status: 400 });
  }

  try {
    const { loopId } = await params;
    const existing = await loadOwnedLoop(user.id, loopId);
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("dobly_operator_loops")
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);

    await logRuntimeAuditEvent({
      userId: user.id,
      workspaceId: existing.workspace_id,
      eventType: "loop.status_changed",
      riskLevel: "low",
      summary: `${existing.name} was ${parsed.data.status === "archived" ? "removed" : parsed.data.status}.`,
      metadata: { loopId: existing.id, operatorId: existing.operator_id, from: existing.status, to: parsed.data.status },
    }).catch(() => undefined);

    return NextResponse.json({ loop: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update this loop." },
      { status: 500 },
    );
  }
}
