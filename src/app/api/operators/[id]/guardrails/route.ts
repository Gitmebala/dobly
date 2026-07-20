import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { getDoblyOperator } from "@/lib/dobly-operators";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";

const guardrailsSchema = z.object({
  rules: z.array(z.string().trim().min(2).max(80)).max(12),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = guardrailsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid guardrails." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const existing = await getDoblyOperator({ userId: user.id, operatorId: id });
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("dobly_operators")
      .update({
        guardrails: { ...(existing.guardrails ?? {}), rules: parsed.data.rules },
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select("id, guardrails")
      .single();

    if (error) throw new Error(error.message);

    await logRuntimeAuditEvent({
      userId: user.id,
      workspaceId: existing.workspace_id,
      eventType: "operator.guardrails_changed",
      riskLevel: "medium",
      summary: `${existing.name} guardrails updated (${parsed.data.rules.length} rules).`,
      metadata: { operatorId: existing.id, rules: parsed.data.rules },
    }).catch(() => undefined);

    return NextResponse.json({ operator: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update guardrails." },
      { status: 500 },
    );
  }
}
