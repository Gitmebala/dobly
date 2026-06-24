import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { executePaymentsCommerceRuntime } from "@/lib/runtime/payments-commerce";

const schema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  provider: z.enum(["paystack", "mpesa", "stripe", "shopify", "quickbooks", "xero"]),
  action: z.string().trim().min(2).max(120),
  payload: z.record(z.unknown()).default({}),
  dryRun: z.boolean().optional(),
  approved: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid commerce request." }, { status: 400 });
  const result = await executePaymentsCommerceRuntime({ userId: user.id, ...parsed.data });
  return NextResponse.json(
    result,
    { status: result.run.status === "completed" ? 200 : result.run.status === "needs_approval" ? 202 : result.run.status === "not_configured" ? 424 : 500 },
  );
}
