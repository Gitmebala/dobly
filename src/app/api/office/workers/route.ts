import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hireOfficeWorkerFromTemplate } from "@/lib/office/runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireWorkspacePermission } from "@/lib/workspaces";
import type { ApiError } from "@/types";

const hireSchema = z.object({
  templateKey: z.string().min(1),
  workspaceId: z.string().uuid().optional().nullable(),
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
  const validation = hireSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>(
      { error: validation.error.errors[0]?.message ?? "Invalid worker template." },
      { status: 400 },
    );
  }

  try {
    if (validation.data.workspaceId) {
      await requireWorkspacePermission({
        userId: user.id,
        workspaceId: validation.data.workspaceId,
        permission: "office:write",
      });
    }

    const worker = await hireOfficeWorkerFromTemplate({
      userId: user.id,
      templateKey: validation.data.templateKey,
      workspaceId: validation.data.workspaceId ?? null,
    });

    return NextResponse.json({ worker }, { status: 201 });
  } catch (error) {
    return NextResponse.json<ApiError>(
      { error: error instanceof Error ? error.message : "Failed to hire worker." },
      { status: 400 },
    );
  }
}
