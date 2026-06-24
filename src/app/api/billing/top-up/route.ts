import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createIntaSendTopUpSession } from "@/lib/intasend";
import { getUserPlanId } from "@/lib/billing/entitlements";
import { rateLimits } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/api-security";

const schema = z.object({ amountKes: z.number().int().min(500).max(100_000) });

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.write(user.id || getRequestIp(req)).allowed) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose an amount between KSh 500 and KSh 100,000." }, { status: 400 });
  const [{ data: profile }, planId] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    getUserPlanId(user.id),
  ]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
  try {
    const session = await createIntaSendTopUpSession({
      userId: user.id,
      email: user.email,
      fullName: profile?.full_name ?? null,
      planId,
      amountKes: parsed.data.amountKes,
      successUrl: `${appUrl}/dashboard/billing?topup=pending`,
    });
    return NextResponse.json({ provider: "intasend", url: session.url, reference: session.reference });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Top-up checkout could not start." }, { status: 500 });
  }
}
