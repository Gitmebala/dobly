import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOfficeTaskFromRecord } from "@/lib/record-actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

const actionSchema = z.object({
  kind: z.enum([
    "conversation",
    "lead",
    "support_case",
    "finance_record",
    "invoice",
    "operations_item",
    "content_item",
    "customer",
  ]),
  recordId: z.string().uuid(),
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
  const validation = actionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>(
      { error: validation.error.errors[0]?.message ?? "Invalid record action." },
      { status: 400 },
    );
  }

  const result = await createOfficeTaskFromRecord({
    userId: user.id,
    kind: validation.data.kind,
    recordId: validation.data.recordId,
  });

  return NextResponse.json(result, { status: 201 });
}
