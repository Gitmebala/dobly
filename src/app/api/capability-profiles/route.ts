import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createCapabilityProfile,
  installMarketplaceWorker,
  listCapabilityProfiles,
  publishCapabilityProfile,
  searchMarketplaceWorkers,
} from "@/lib/capability-profiles";
import { BUSINESS_MEMORY_SCOPES, type BusinessMemoryScope } from "@/lib/business-memory";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

const createSchema = z.object({
  title: z.string().min(2).max(160),
  instructions: z.string().min(2).max(12000),
  summary: z.string().max(500).optional(),
  scope: z.enum(BUSINESS_MEMORY_SCOPES as [string, ...string[]]).optional(),
  tags: z.array(z.string().max(40)).optional(),
  provider: z.string().max(80).optional().nullable(),
  preferredModel: z.string().max(120).optional().nullable(),
  tools: z.array(z.string().max(80)).optional(),
  examples: z.array(z.string().max(400)).optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get("mode");
  if (mode === "marketplace") {
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const profiles = await searchMarketplaceWorkers({ query: q, limit: 40 });
    return NextResponse.json({ profiles });
  }

  const profiles = await listCapabilityProfiles({
    userId: user.id,
    marketplaceOnly: mode === "published",
    limit: 40,
  });
  return NextResponse.json({ profiles });
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
  const action = typeof body?.action === "string" ? body.action : "create";

  if (action === "publish") {
    if (!body?.profileId) {
      return NextResponse.json<ApiError>({ error: "Missing profileId." }, { status: 400 });
    }
    const profile = await publishCapabilityProfile({
      profileId: String(body.profileId),
      userId: user.id,
      monthlyPriceUsd: body.monthlyPriceUsd ?? null,
    });
    return NextResponse.json({ profile });
  }

  if (action === "install") {
    if (!body?.profileId) {
      return NextResponse.json<ApiError>({ error: "Missing profileId." }, { status: 400 });
    }
    const profile = await installMarketplaceWorker({
      profileId: String(body.profileId),
      installerUserId: user.id,
    });
    return NextResponse.json({ profile });
  }

  const validation = createSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>({ error: validation.error.errors[0]?.message ?? "Invalid capability profile." }, { status: 400 });
  }

  const profile = await createCapabilityProfile({
    userId: user.id,
    ...validation.data,
    scope: validation.data.scope as BusinessMemoryScope | undefined,
  });

  return NextResponse.json({ profile }, { status: 201 });
}
