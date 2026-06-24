import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { doblyIntentSchema } from "@/lib/validations";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { createSoftwareExecutionRun } from "@/lib/software-execution-runs";

const softwareExecutionRunSchema = z.object({
  toolId: z.string().min(1).max(120),
  task: z.string().trim().min(10).max(6000),
  workspaceId: z.string().uuid().nullable().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  outputSchema: z.record(z.string(), z.unknown()).nullable().optional(),
  approved: z.boolean().optional(),
  allowedTools: z.array(z.string().min(1).max(160)).max(50).nullable().optional(),
  intent: doblyIntentSchema.optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = softwareExecutionRunSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid software execution request." },
      { status: 400 },
    );
  }

  if (parsed.data.workspaceId) {
    await requireWorkspacePermission({
      userId: user.id,
      workspaceId: parsed.data.workspaceId,
      permission: "office:write",
    });
  }

  try {
    const envelope = await createSoftwareExecutionRun({
      userId: user.id,
      workspaceId: parsed.data.workspaceId ?? null,
      toolId: parsed.data.toolId,
      task: parsed.data.task,
      context: parsed.data.context ?? {},
      outputSchema: parsed.data.outputSchema ?? null,
      approved: parsed.data.approved ?? false,
      allowedTools: parsed.data.allowedTools ?? null,
      intent: parsed.data.intent ?? null,
    });

    const status =
      envelope.run.status === "completed"
        ? 200
        : envelope.run.status === "needs_approval"
          ? 202
          : envelope.run.status === "not_configured"
            ? 424
            : envelope.run.status === "failed"
              ? 400
              : 200;

    return NextResponse.json(envelope, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create software execution run.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
