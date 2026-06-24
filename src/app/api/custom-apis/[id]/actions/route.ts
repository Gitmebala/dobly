import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCustomApiAction } from "@/lib/runtime/custom-api";
import { DOBLY_CAPABILITIES, type DoblyCapability } from "@/lib/runtime/capabilities";
import { rateLimits } from "@/lib/rate-limit";

const capabilityIds = DOBLY_CAPABILITIES.map((capability) => capability.id) as [string, ...string[]];

const schema = z.object({
  name: z.string().trim().min(2).max(120).regex(/^[a-zA-Z0-9_-]+$/),
  label: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  pathTemplate: z.string().max(1000).optional(),
  queryTemplate: z.record(z.unknown()).optional(),
  bodyTemplate: z.record(z.unknown()).optional(),
  headersTemplate: z.record(z.unknown()).optional(),
  inputSchema: z.record(z.unknown()).optional(),
  capabilityHints: z.array(z.enum(capabilityIds)).max(20).optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  approvalRequired: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.write(user.id).allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid custom API action." }, { status: 400 });
  try {
    const { id } = await params;
    const action = await createCustomApiAction({
      userId: user.id,
      connectionId: id,
      ...parsed.data,
      capabilityHints: parsed.data.capabilityHints as DoblyCapability[] | undefined,
    });
    return NextResponse.json({ action }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create custom API action." }, { status: 400 });
  }
}
