import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBusinessChannelSetupSnapshot } from "@/lib/business-channels";
import { getKenyaLaunchTelecomCosts, isKenyaPhoneNumber } from "@/lib/providers/dobly-comms";
import { buyTwilioPhoneNumber, searchTwilioLocalNumbers } from "@/lib/providers/twilio";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

const searchSchema = z.object({
  country: z.string().length(2).default("KE"),
  areaCode: z.string().optional(),
  contains: z.string().optional(),
});

const provisionSchema = z.object({
  phoneNumber: z.string().min(7).max(32).optional().nullable(),
  country: z.string().length(2).default("KE"),
  workspaceId: z.string().uuid().optional().nullable(),
  friendlyName: z.string().min(1).max(120).optional(),
});

function appOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const validation = searchSchema.safeParse(params);
  if (!validation.success) {
    return NextResponse.json<ApiError>({ error: "Invalid phone number search." }, { status: 400 });
  }

  const country = validation.data.country.toUpperCase();
  if (country === "KE") {
    return NextResponse.json({
      provider: "africas_talking",
      mode: "manual_request",
      numbers: [],
      costs: getKenyaLaunchTelecomCosts().voice,
      nextStep:
        "Dobly will request or attach a Kenya business number through the local voice provider, then connect Reception calls and SMS.",
    });
  }

  const numbers = await searchTwilioLocalNumbers({
    country,
    areaCode: validation.data.areaCode,
    contains: validation.data.contains,
    limit: 10,
  });

  return NextResponse.json({ provider: "twilio", mode: "self_serve", numbers });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const validation = provisionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>({ error: "Invalid phone provisioning request." }, { status: 400 });
  }

  const country = validation.data.country.toUpperCase();
  const phoneNumber = validation.data.phoneNumber?.trim() || null;
  const friendlyName = validation.data.friendlyName ?? "Dobly Business Number";
  const setup = createBusinessChannelSetupSnapshot({
    channelId: "business_phone",
    displayName: friendlyName,
    externalIdentifier: phoneNumber,
    setupMode: "new_dobly_number",
  });

  if (country === "KE" || (phoneNumber ? isKenyaPhoneNumber(phoneNumber) : false)) {
    const payload = {
      user_id: user.id,
      workspace_id: validation.data.workspaceId ?? null,
      ...setup,
      status: "approval_pending",
      metadata: {
        ...setup.metadata,
        provider: "africas_talking",
        requestedCountry: "KE",
        costs: getKenyaLaunchTelecomCosts().voice,
        requestedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };

    const { data: existingRows } = await supabase
      .from("business_channel_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("channel_id", "business_phone")
      .is("external_identifier", null)
      .limit(1);

    const existingId = existingRows?.[0]?.id as string | undefined;
    const saveQuery = existingId
      ? supabase.from("business_channel_connections").update(payload).eq("id", existingId).select("*").single()
      : supabase.from("business_channel_connections").insert(payload).select("*").single();

    const { data, error } = await saveQuery;

    if (error) {
      return NextResponse.json<ApiError>(
        { error: "Dobly could not save the Kenya phone setup request." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      provider: "africas_talking",
      mode: "local_provider_request",
      connection: data,
      nextStep:
        "Dobly will attach the Kenya number, point calls to Reception, and run a test call before activation.",
    });
  }

  const origin = appOrigin().replace(/\/$/, "");
  if (!phoneNumber) {
    return NextResponse.json<ApiError>({ error: "Choose a phone number before activating." }, { status: 400 });
  }

  const number = await buyTwilioPhoneNumber({
    phoneNumber,
    friendlyName,
    voiceUrl: `${origin}/api/webhooks/twilio/voice`,
    smsUrl: `${origin}/api/webhooks/twilio/sms`,
  });

  const payload = {
    user_id: user.id,
    workspace_id: validation.data.workspaceId ?? null,
    ...setup,
    status: "live",
    metadata: {
      ...setup.metadata,
      provider: "twilio",
      twilioIncomingPhoneNumberSid: number.sid,
      voiceUrl: `${origin}/api/webhooks/twilio/voice`,
      smsUrl: `${origin}/api/webhooks/twilio/sms`,
      provisionedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };

  const { data: existingRows } = await supabase
    .from("business_channel_connections")
    .select("id")
    .eq("user_id", user.id)
    .eq("channel_id", "business_phone")
    .eq("external_identifier", phoneNumber)
    .limit(1);

  const existingId = existingRows?.[0]?.id as string | undefined;
  const saveQuery = existingId
    ? supabase.from("business_channel_connections").update(payload).eq("id", existingId).select("*").single()
    : supabase.from("business_channel_connections").insert(payload).select("*").single();

  const { data, error } = await saveQuery;

  if (error) {
    return NextResponse.json<ApiError>(
      { error: "The number was provisioned, but Dobly could not save the channel state." },
      { status: 207 },
    );
  }

  return NextResponse.json({ provider: "twilio", mode: "self_serve", connection: data, number });
}
