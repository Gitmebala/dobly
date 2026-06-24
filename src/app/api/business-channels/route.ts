import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  BUSINESS_CHANNELS,
  createBusinessChannelSetupSnapshot,
  getBusinessChannelDefinition,
  type BusinessChannelConnectionRecord,
  type BusinessChannelId,
} from "@/lib/business-channels";
import { checkChannelEntitlement, checkUsageEntitlement } from "@/lib/billing/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireWorkspacePermission } from "@/lib/workspaces";
import type { ApiError } from "@/types";

const startChannelSchema = z.object({
  channelId: z.enum([
    "business_phone",
    "business_sms",
    "whatsapp_business",
    "business_email",
    "website_chat",
    "calendar",
    "crm",
    "content_tools",
  ]),
  workspaceId: z.string().uuid().optional().nullable(),
  displayName: z.string().min(1).max(120).optional(),
  externalIdentifier: z.string().max(180).optional().nullable(),
  setupMode: z.string().max(80).optional().nullable(),
});

async function getUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("business_channel_connections")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return NextResponse.json({
    channels: BUSINESS_CHANNELS,
    connections: (data ?? []) as BusinessChannelConnectionRecord[],
    setupReady: !error,
    setupWarning: error
      ? "Business channel tracking table is not ready yet. Apply the Dobly operating schema migration."
      : null,
  });
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const validation = startChannelSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>(
      { error: validation.error.errors[0]?.message ?? "Invalid channel setup request." },
      { status: 400 },
    );
  }

  const channelId = validation.data.channelId as BusinessChannelId;
  const definition = getBusinessChannelDefinition(channelId);
  if (!definition) {
    return NextResponse.json<ApiError>({ error: "Unknown business channel." }, { status: 400 });
  }

  const channelAllowed = await checkChannelEntitlement({
    userId: user.id,
    channelId,
  });
  if (!channelAllowed.allowed) {
    return NextResponse.json<ApiError>(
      { error: channelAllowed.reason ?? "Upgrade required for this channel." },
      { status: 402 },
    );
  }

  const usageAllowed = await checkUsageEntitlement({
    userId: user.id,
    workspaceId: validation.data.workspaceId ?? null,
    metric: "business_channels",
  });
  if (!usageAllowed.allowed) {
    return NextResponse.json<ApiError>(
      { error: usageAllowed.reason ?? "Business channel limit reached for this plan." },
      { status: 402 },
    );
  }

  if (validation.data.workspaceId) {
    try {
      await requireWorkspacePermission({
        userId: user.id,
        workspaceId: validation.data.workspaceId,
        permission: "channels:manage",
      });
    } catch (error) {
      return NextResponse.json<ApiError>(
        { error: error instanceof Error ? error.message : "You do not have access to this workspace." },
        { status: 403 },
      );
    }
  }

  const setup = createBusinessChannelSetupSnapshot({
    channelId,
    displayName: validation.data.displayName,
    externalIdentifier: validation.data.externalIdentifier,
    setupMode: validation.data.setupMode,
  });

  const payload = {
    user_id: user.id,
    workspace_id: validation.data.workspaceId ?? null,
    ...setup,
    updated_at: new Date().toISOString(),
  };

  let existingQuery = supabase
    .from("business_channel_connections")
    .select("id")
    .eq("user_id", user.id)
    .eq("channel_id", channelId)
    .limit(1);

  existingQuery = validation.data.workspaceId
    ? existingQuery.eq("workspace_id", validation.data.workspaceId)
    : existingQuery.is("workspace_id", null);

  existingQuery = setup.external_identifier
    ? existingQuery.eq("external_identifier", setup.external_identifier)
    : existingQuery.is("external_identifier", null);

  const { data: existingRows, error: existingError } = await existingQuery;

  if (existingError) {
    return NextResponse.json(
      {
        error: "Business channel setup could not be loaded.",
        setup,
        setupReady: false,
        setupWarning: "Apply the Dobly operating schema migration before saving channel setup state.",
      },
      { status: 503 },
    );
  }

  const existingId = existingRows?.[0]?.id as string | undefined;
  const saveQuery = existingId
    ? supabase.from("business_channel_connections").update(payload).eq("id", existingId).select("*").single()
    : supabase.from("business_channel_connections").insert(payload).select("*").single();

  const { data, error } = await saveQuery;

  if (error || !data) {
    return NextResponse.json(
      {
        error: "Business channel setup could not be saved.",
        setup,
        setupReady: false,
        setupWarning: "Apply the Dobly operating schema migration before saving channel setup state.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    channel: definition,
    connection: data as BusinessChannelConnectionRecord,
    nextStep: setup.user_steps[0] ?? "Verify and test this channel.",
  });
}
