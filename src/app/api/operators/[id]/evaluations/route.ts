import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { buildOperatorBrainTrace } from "@/lib/operator-brain";

const createSchema = z.object({
  title: z.string().trim().min(2).max(160),
  prompt: z.string().trim().min(5).max(6000),
  expected: z.string().trim().min(2).max(2000),
  passCondition: z.string().trim().min(2).max(2000),
  workspaceId: z.string().uuid().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("operator_evaluation_scenarios")
    .select("*")
    .eq("user_id", user.id)
    .eq("operator_id", id)
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scenarios: data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid evaluation scenario." }, { status: 400 });
  }

  const { id } = await params;
  const brain = await buildOperatorBrainTrace({
    userId: user.id,
    operatorId: id,
    prompt: parsed.data.prompt,
    workspaceId: parsed.data.workspaceId ?? null,
    persist: true,
  });
  const passed = brain.autonomy.decision !== "act" || brain.selfCheck.score >= brain.selfCheck.minimumScoreToAct;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("operator_evaluation_scenarios")
    .insert({
      user_id: user.id,
      workspace_id: parsed.data.workspaceId ?? brain.workspaceId,
      operator_id: id,
      title: parsed.data.title,
      prompt: parsed.data.prompt,
      expected: parsed.data.expected,
      pass_condition: parsed.data.passCondition,
      status: passed ? "passed" : "needs_review",
      last_brain_trace_id: brain.id ?? null,
      last_result: {
        autonomy: brain.autonomy,
        selfCheck: brain.selfCheck,
        toolJudgment: brain.toolJudgment,
      },
    })
    .select("*")
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to create evaluation." }, { status: 500 });

  return NextResponse.json({ scenario: data, brain }, { status: 201 });
}
