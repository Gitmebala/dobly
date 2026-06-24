import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyConnectionCodeSchema } from "@/lib/validations";
import { verifyPhoneOtp, verifyWhatsappOtp } from "@/lib/verifications";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.write(user.id || getRequestIp(req));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many verification attempts." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = verifyConnectionCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code Dobly sent." }, { status: 400 });
  }

  try {
    const { data: verification } = await supabase
      .from("connection_verifications")
      .select("channel")
      .eq("id", parsed.data.verificationId)
      .eq("user_id", user.id)
      .single();

    const verifier = verification?.channel === "sms" ? verifyPhoneOtp : verifyWhatsappOtp;
    const connection = await verifier({
      userId: user.id,
      verificationId: parsed.data.verificationId,
      code: parsed.data.code,
    });

    return NextResponse.json({ connection });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify code." },
      { status: 400 }
    );
  }
}
