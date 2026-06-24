import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCustomApiConnection, listCustomApiConnections } from "@/lib/runtime/custom-api";
import { DOBLY_CAPABILITIES, type DoblyCapability } from "@/lib/runtime/capabilities";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { rateLimits } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/api-security";

const capabilityIds = DOBLY_CAPABILITIES.map((capability) => capability.id) as [string, ...string[]];

const schema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  label: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  baseUrl: z.string().url(),
  authType: z.enum(["none", "bearer", "api_key_header", "api_key_query", "basic"]).optional(),
  authHeaderName: z.string().trim().max(120).nullable().optional(),
  authQueryName: z.string().trim().max(120).nullable().optional(),
  authSecret: z.string().max(5000).nullable().optional(),
  defaultHeaders: z.record(z.unknown()).optional(),
  capabilityTags: z.array(z.enum(capabilityIds)).max(20).optional(),
  riskProfile: z.enum(["low", "medium", "high"]).optional(),
  approvalRequired: z.boolean().optional(),
  allowPrivateNetwork: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");
  if (workspaceId) await requireWorkspacePermission({ userId: user.id, workspaceId, permission: "office:view" });
  const connections = await listCustomApiConnections({
    userId: user.id,
    workspaceId,
    includeActions: url.searchParams.get("includeActions") !== "false",
  });
  return NextResponse.json({ connections });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.write(user.id || getRequestIp(req)).allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid custom API connection." }, { status: 400 });
  try {
    if (parsed.data.workspaceId) {
      await requireWorkspacePermission({ userId: user.id, workspaceId: parsed.data.workspaceId, permission: "channels:manage" });
    }
    const connection = await createCustomApiConnection({
      userId: user.id,
      ...parsed.data,
      capabilityTags: parsed.data.capabilityTags as DoblyCapability[] | undefined,
    });
    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create custom API." }, { status: 400 });
  }
}
