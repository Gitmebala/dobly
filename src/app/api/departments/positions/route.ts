import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { saveDepartmentPositions } from "@/lib/departments";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

const bodySchema = z.object({
  positions: z
    .array(
      z.object({
        id: z.string().uuid(),
        x: z.number().finite(),
        y: z.number().finite(),
      }),
    )
    .min(1)
    .max(200),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json<ApiError>({ error: "Invalid canvas positions." }, { status: 400 });
  }

  const { activeWorkspace } = await resolveActiveWorkspace(user.id);
  if (!activeWorkspace) {
    return NextResponse.json<ApiError>({ error: "No active workspace." }, { status: 400 });
  }

  // saveDepartmentPositions scopes every write to the workspace, so ids that
  // belong to another workspace update nothing.
  await saveDepartmentPositions({
    workspaceId: activeWorkspace.id,
    positions: parsed.data.positions,
  });

  return NextResponse.json({ ok: true });
}
