import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { startManagedMpesaPlanPayment } from "@/lib/billing/mpesa";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";

const requestSchema = z.object({
  planId: z.enum(["starter", "operator", "command"]),
  phoneNumber: z.string().trim().min(9).max(20),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.write(user.id || getRequestIp(req)).allowed) {
    return NextResponse.json({ error: "Too many payment attempts." }, { status: 429 });
  }
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid plan and Kenyan phone number." }, { status: 400 });
  try {
    const result = await startManagedMpesaPlanPayment({ userId: user.id, ...parsed.data });
    return NextResponse.json({ provider: "mpesa", status: "pending", ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "M-Pesa payment could not start." }, { status: 500 });
  }
}
