import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requestConnectionLinkSchema } from "@/lib/validations";
import { requestEmailVerificationLink } from "@/lib/verifications";

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
  const parsed = requestConnectionLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address first." }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;

  try {
    const result = await requestEmailVerificationLink({
      userId: user.id,
      provider: parsed.data.provider,
      label: parsed.data.label,
      destination: parsed.data.accountIdentifier,
      metadata: parsed.data.metadata,
      appUrl,
    });

    return NextResponse.json({
      message: "Verification link sent successfully",
      verificationId: result.verification.id,
      connectionId: result.connection.id,
      destination: result.verification.destination,
      developmentVerifyUrl: result.developmentVerifyUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send verification link." },
      { status: 500 },
    );
  }
}
