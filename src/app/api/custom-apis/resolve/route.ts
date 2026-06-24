import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveCustomApiExecutionPaths } from "@/lib/runtime/custom-api";
import { DOBLY_CAPABILITIES, type DoblyCapability } from "@/lib/runtime/capabilities";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { rateLimits } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/api-security";

const capabilityIds = DOBLY_CAPABILITIES.map((capability) => capability.id) as [string, ...string[]];

const schema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  prompt: z.string().trim().min(2).max(6000),
  requiredCapabilities: z.array(z.enum(capabilityIds)).max(20).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.generate(user.id || getRequestIp(req)).allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid custom API resolution request." }, { status: 400 });
  if (parsed.data.workspaceId) {
    await requireWorkspacePermission({ userId: user.id, workspaceId: parsed.data.workspaceId, permission: "office:view" });
  }
  const result = await resolveCustomApiExecutionPaths({
    userId: user.id,
    workspaceId: parsed.data.workspaceId ?? null,
    prompt: parsed.data.prompt,
    requiredCapabilities: parsed.data.requiredCapabilities as DoblyCapability[] | undefined,
  });
  return NextResponse.json(result);
}
