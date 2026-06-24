import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireDoblyAdmin } from "@/lib/admin/access";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const updateSchema = z.object({
  provider: z.string().trim().min(2).max(80),
  market: z.string().trim().min(2).max(20).default("GLOBAL"),
  status: z.enum(["inactive", "sandbox", "active", "degraded", "disabled"]).optional(),
  balanceMinor: z.number().int().min(0).nullable().optional(),
  lowBalanceThresholdMinor: z.number().int().min(0).nullable().optional(),
  maximumTopUpMinor: z.number().int().min(0).nullable().optional(),
});

export async function GET() {
  const { allowed } = await requireDoblyAdmin();
  if (!allowed) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { data, error } = await createAdminSupabaseClient()
    .from("billing_provider_accounts")
    .select("*")
    .order("market")
    .order("provider");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ providers: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const { allowed } = await requireDoblyAdmin();
  if (!allowed) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid provider funding update." }, { status: 400 });
  const value = parsed.data;
  const { data, error } = await createAdminSupabaseClient()
    .from("billing_provider_accounts")
    .upsert({
      provider: value.provider,
      market: value.market,
      ...(value.status === undefined ? {} : { status: value.status }),
      ...(value.balanceMinor === undefined ? {} : { balance_minor: value.balanceMinor }),
      ...(value.lowBalanceThresholdMinor === undefined ? {} : { low_balance_threshold_minor: value.lowBalanceThresholdMinor }),
      ...(value.maximumTopUpMinor === undefined ? {} : { maximum_top_up_minor: value.maximumTopUpMinor }),
      last_balance_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider,market" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ provider: data });
}
