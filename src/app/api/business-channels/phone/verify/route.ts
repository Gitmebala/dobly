import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBusinessChannelSetupSnapshot } from "@/lib/business-channels";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requestPhoneOtp } from "@/lib/verifications";
import type { ApiError } from "@/types";

const verifyPhoneSchema = z.object({
  phoneNumber: z.string().min(7).max(32),
  workspaceId: z.string().uuid().optional().nullable(),
  friendlyName: z.string().min(1).max(120).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const validation = verifyPhoneSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>(
      { error: validation.error.errors[0]?.message ?? "Invalid phone verification request." },
      { status: 400 },
    );
  }

  let verification;
  try {
    verification = await requestPhoneOtp({
      userId: user.id,
      provider: "kenya_local_comms",
      label: validation.data.friendlyName ?? "Business Phone",
      destination: validation.data.phoneNumber,
      metadata: {
        workspace_id: validation.data.workspaceId ?? null,
        channel_id: "business_phone",
        setup_mode: "forwarding_plus_verified_caller_id",
      },
    });
  } catch (error) {
    return NextResponse.json<ApiError>(
      {
        error:
          error instanceof Error
            ? error.message
            : "Dobly could not start phone verification.",
      },
      { status: 503 },
    );
  }

  const setup = createBusinessChannelSetupSnapshot({
    channelId: "business_phone",
    displayName: validation.data.friendlyName ?? "Business Phone",
    externalIdentifier: validation.data.phoneNumber,
    setupMode: "forwarding_plus_verified_caller_id",
  });

  const { data: existingRows } = await supabase
    .from("business_channel_connections")
    .select("id")
    .eq("user_id", user.id)
    .eq("channel_id", "business_phone")
    .eq("external_identifier", validation.data.phoneNumber)
    .limit(1);

  const payload = {
    user_id: user.id,
    workspace_id: validation.data.workspaceId ?? null,
    ...setup,
    status: "verification_required",
    metadata: {
      ...setup.metadata,
      provider: verification.delivery.provider,
      verificationMethod: verification.delivery.method,
      providerReferenceId: verification.delivery.providerReferenceId,
      connectionVerificationId: verification.verification.id,
      connectionId: verification.connection.id,
      verificationStartedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };

  const existingId = existingRows?.[0]?.id as string | undefined;
  const saveQuery = existingId
    ? supabase.from("business_channel_connections").update(payload).eq("id", existingId).select("*").single()
    : supabase.from("business_channel_connections").insert(payload).select("*").single();

  const { data: connection, error: saveError } = await saveQuery;

  if (saveError) {
    return NextResponse.json(
      {
        error: "Phone verification started, but Dobly could not save the channel state.",
        verification: verification.verification,
        setupReady: false,
        setupWarning: "Apply the Dobly business channel schema before saving phone setup state.",
      },
      { status: 207 },
    );
  }

  return NextResponse.json({
    verification: verification.verification,
    delivery: verification.delivery,
    developmentCodePreview: verification.developmentCodePreview,
    connection,
    nextStep:
      verification.delivery.method === "twilio_caller_id"
        ? "Answer the verification call, then run a test call from the Reception department."
        : "Enter the verification code Dobly sent, then run a test call from the Reception department.",
  });
}
