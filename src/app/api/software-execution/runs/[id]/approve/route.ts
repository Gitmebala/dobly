import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { executeSoftwareExecutionRun } from "@/lib/software-execution-runs";

const approveSchema = z.object({
  note: z.string().trim().max(2000).nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = approveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid approval request." },
      { status: 400 },
    );
  }

  try {
    const envelope = await executeSoftwareExecutionRun({
      runId: params.id,
      userId: user.id,
      approved: true,
      approvalNote: parsed.data.note ?? null,
    });

    const status =
      envelope.run.status === "completed"
        ? 200
        : envelope.run.status === "not_configured"
          ? 424
          : envelope.run.status === "failed"
            ? 400
            : 202;

    return NextResponse.json(envelope, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to approve software execution run.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
