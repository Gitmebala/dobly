import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { getDoblyOperator } from "@/lib/dobly-operators";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";

const leashSchema = z.object({
  approvalMode: z.enum(["supervised", "ask_first", "approve_risky", "trusted"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = leashSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid leash setting." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const existing = await getDoblyOperator({ userId: user.id, operatorId: id });
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("dobly_operators")
      .update({ approval_mode: parsed.data.approvalMode, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select("id, approval_mode")
      .single();

    if (error) throw new Error(error.message);

    await logRuntimeAuditEvent({
      userId: user.id,
      workspaceId: existing.workspace_id,
      eventType: "operator.leash_changed",
      riskLevel: "medium",
      summary: `${existing.name} autonomy set to ${parsed.data.approvalMode.replace("_", " ")}.`,
      metadata: { operatorId: existing.id, approvalMode: parsed.data.approvalMode },
    }).catch(() => undefined);

    return NextResponse.json({ operator: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update autonomy." },
      { status: 500 },
    );
  }
}
