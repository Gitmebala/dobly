import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDoblyOperator } from "@/lib/dobly-operators";
import {
  buildOperatorQualityContract,
  ensureOperatorQualityProfile,
  listOperatorQualityPresetGroups,
  updateOperatorQualityProfile,
} from "@/lib/operator-quality";

const updateSchema = z.object({
  selectedPresets: z.record(z.string().trim().min(1).max(160)).optional(),
  customOverrides: z.record(z.string().trim().min(1).max(1000)).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const operator = await getDoblyOperator({ userId: user.id, operatorId: id });
  const profile = await ensureOperatorQualityProfile({
    userId: user.id,
    operatorId: operator.id,
    workspaceId: operator.workspace_id,
    operatorKind: operator.kind,
    mission: operator.mission,
    outcome: operator.outcome,
  });

  return NextResponse.json({
    operator: {
      id: operator.id,
      name: operator.name,
      kind: operator.kind,
      mission: operator.mission,
      outcome: operator.outcome,
    },
    presetGroups: listOperatorQualityPresetGroups(operator.kind),
    profile,
    qualityContract: buildOperatorQualityContract({
      profile: profile.profile,
      prompt: operator.mission,
    }),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid quality profile update." }, { status: 400 });
  }

  const { id } = await params;
  await getDoblyOperator({ userId: user.id, operatorId: id });

  const profile = await updateOperatorQualityProfile({
    userId: user.id,
    operatorId: id,
    selectedPresets: parsed.data.selectedPresets,
    customOverrides: parsed.data.customOverrides,
  });

  return NextResponse.json({
    profile,
    qualityContract: buildOperatorQualityContract({
      profile: profile.profile,
    }),
  });
}
