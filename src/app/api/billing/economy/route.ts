import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBillingEconomySummary } from "@/lib/billing/economy";

const policySchema = z.object({
  monthlyCapKes: z.number().min(0).max(1_000_000).nullable().optional(),
  confirmationKes: z.number().min(0).max(1_000_000).optional(),
  autoTopUpEnabled: z.boolean().optional(),
  autoTopUpAmountKes: z.number().min(0).max(1_000_000).optional(),
  autoTopUpTriggerKes: z.number().min(0).max(1_000_000).optional(),
  pauseNonessentialAtPercent: z.number().int().min(1).max(100).optional(),
  hardStop: z.boolean().optional(),
});

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getBillingEconomySummary({ userId: user.id }));
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = policySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid spending controls." }, { status: 400 });
  const value = parsed.data;
  const { data, error } = await supabase
    .from("billing_spending_policies")
    .upsert({
      user_id: user.id,
      workspace_id: null,
      monthly_cap_minor: value.monthlyCapKes == null ? null : Math.round(value.monthlyCapKes * 100),
      per_action_confirmation_minor: Math.round((value.confirmationKes ?? 500) * 100),
      auto_top_up_enabled: value.autoTopUpEnabled ?? false,
      auto_top_up_amount_minor: Math.round((value.autoTopUpAmountKes ?? 0) * 100),
      auto_top_up_trigger_minor: Math.round((value.autoTopUpTriggerKes ?? 0) * 100),
      pause_nonessential_at_percent: value.pauseNonessentialAtPercent ?? 95,
      hard_stop: value.hardStop ?? true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,workspace_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ policy: data });
}
