import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { markOfficeTaskDecision } from "@/lib/office/runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected", "cancelled"]),
  note: z.string().max(1000).optional().nullable(),
  modifiedSummary: z.string().trim().max(3000).optional().nullable(),
  modifiedPayload: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const validation = decisionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>(
      { error: validation.error.errors[0]?.message ?? "Invalid decision." },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const task = await markOfficeTaskDecision({
    userId: user.id,
    taskId: id,
    decision: validation.data.decision,
    note: validation.data.note,
    modifiedSummary: validation.data.modifiedSummary,
    modifiedPayload: validation.data.modifiedPayload,
  });

  return NextResponse.json({ task });
}
