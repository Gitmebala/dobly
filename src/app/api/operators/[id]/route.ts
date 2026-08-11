import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { getDoblyOperator } from "@/lib/dobly-operators";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";

// Coworkers can arrive with an auto-suggested name (from the propose flow,
// or previously from the now-removed Boardroom feature's fake personas -
// see dobly-office-internal-tools memory). The owner should always be able
// to rename one to whatever they actually want to call it - including for
// the reason the founder raised directly: some auto-suggested names carry
// ethnic/tribal associations in a Kenyan context that a business owner may
// not want attached to their coworker regardless of intent.
const patchSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty.").max(80, "Keep the name under 80 characters."),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid update." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const existing = await getDoblyOperator({ userId: user.id, operatorId: id });
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("dobly_operators")
      .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select("id, name")
      .single();

    if (error) throw new Error(error.message);

    await logRuntimeAuditEvent({
      userId: user.id,
      workspaceId: existing.workspace_id,
      eventType: "operator.renamed",
      riskLevel: "low",
      summary: `${existing.name} renamed to ${parsed.data.name}.`,
      metadata: { operatorId: existing.id, previousName: existing.name, name: parsed.data.name },
    }).catch(() => undefined);

    return NextResponse.json({ operator: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not rename this coworker." },
      { status: 500 },
    );
  }
}
