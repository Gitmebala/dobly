import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";

const globalPauseSchema = z.object({
  paused: z.boolean(),
  reason: z.string().trim().max(600).optional(),
});

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = globalPauseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid global pause request." }, { status: 400 });
  }

  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("dobly_operators")
      .update({ status: parsed.data.paused ? "paused" : "active" })
      .eq("user_id", user.id)
      .in("status", parsed.data.paused ? ["active"] : ["paused"])
      .select("id");
    if (error) throw new Error(error.message);

    await logRuntimeAuditEvent({
      userId: user.id,
      eventType: parsed.data.paused ? "operators.global_pause" : "operators.global_resume",
      riskLevel: "high",
      summary: `${parsed.data.paused ? "Paused" : "Resumed"} ${data?.length ?? 0} Operators.`,
      metadata: { reason: parsed.data.reason ?? "", count: data?.length ?? 0 },
    }).catch(() => undefined);

    return NextResponse.json({ updated: data?.length ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update Operators.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
