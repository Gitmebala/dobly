import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { getDoblyOperator } from "@/lib/dobly-operators";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";

const pauseSchema = z.object({
  paused: z.boolean(),
  reason: z.string().trim().max(600).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = pauseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid pause request." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const existing = await getDoblyOperator({ userId: user.id, operatorId: id });
    const admin = createAdminSupabaseClient();
    const nextStatus = parsed.data.paused ? "paused" : "active";
    const { data, error } = await admin
      .from("dobly_operators")
      .update({
        status: nextStatus,
        metrics: {
          ...(existing.metrics ?? {}),
          lastControlAction: nextStatus,
          lastControlReason: parsed.data.reason ?? "",
          lastControlAt: new Date().toISOString(),
        },
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Could not update Operator status.");

    await logRuntimeAuditEvent({
      userId: user.id,
      workspaceId: existing.workspace_id,
      eventType: parsed.data.paused ? "operator.paused" : "operator.resumed",
      riskLevel: "medium",
      summary: `${existing.name} was ${parsed.data.paused ? "paused" : "resumed"} by the user.`,
      metadata: { operatorId: id, reason: parsed.data.reason ?? "" },
    }).catch(() => undefined);

    return NextResponse.json({ operator: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update Operator status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
