import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requestConnectionCodeSchema } from "@/lib/validations";
import { requestWhatsappOtp } from "@/lib/verifications";

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
    return NextResponse.json({ error: "Too many verification requests." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = requestConnectionCodeSchema.safeParse(body);
  if (!parsed.success || parsed.data.provider !== "whatsapp") {
    return NextResponse.json({ error: "Enter a valid WhatsApp number first." }, { status: 400 });
  }

  try {
    const result = await requestWhatsappOtp({
      userId: user.id,
      provider: parsed.data.provider,
      label: parsed.data.label,
      destination: parsed.data.accountIdentifier,
      metadata: parsed.data.metadata,
    });

    return NextResponse.json({
      message: "OTP sent successfully",
      verificationId: result.verification.id,
      connectionId: result.connection.id,
      destination: result.verification.destination,
      developmentCodePreview: result.developmentCodePreview,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send OTP." },
      { status: 500 },
    );
  }
}
