import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createOperatorGroup, listOperatorGroups } from "@/lib/operator-groups";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";
import { rateLimits } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const groups = await listOperatorGroups({ userId: user.id });
    return NextResponse.json({ groups });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load groups." },
      { status: 500 },
    );
  }
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Give this group a name.").max(120),
  purpose: z.string().trim().max(500).optional().default(""),
  operatorIds: z.array(z.string().uuid()).min(2, "Pick at least 2 coworkers.").max(8, "Keep a group to 8 coworkers or fewer."),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimits.write(user.id);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid group." }, { status: 400 });
  }

  // Groups aren't workspace-scoped yet elsewhere in the app in a way this
  // route can read cheaply, and dobly_operator_groups.workspace_id is
  // nullable specifically so a solo account (no workspace) works exactly
  // like every other owner-only table in this codebase - see the RLS
  // comment in the migration.
  try {
    const { group, members } = await createOperatorGroup({
      userId: user.id,
      workspaceId: null,
      name: parsed.data.name,
      purpose: parsed.data.purpose,
      operatorIds: parsed.data.operatorIds,
    });

    await logRuntimeAuditEvent({
      userId: user.id,
      workspaceId: null,
      eventType: "group.created",
      riskLevel: "low",
      summary: `Group "${group.name}" created with ${members.length} coworkers.`,
      metadata: { groupId: group.id, operatorIds: parsed.data.operatorIds },
    }).catch(() => undefined);

    return NextResponse.json({ group, members }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create this group." },
      { status: 500 },
    );
  }
}
