import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { doblyIntentSchema } from "@/lib/validations";
import { requireWorkspacePermission } from "@/lib/workspaces";
import {
  createSoftwareExecutionRun,
  listSoftwareExecutionRuns,
  type SoftwareExecutionRunStatus,
} from "@/lib/software-execution-runs";

const createRunSchema = z.object({
  toolId: z.string().min(1).max(120),
  task: z.string().trim().min(10).max(6000),
  workspaceId: z.string().uuid().nullable().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  outputSchema: z.record(z.string(), z.unknown()).nullable().optional(),
  approved: z.boolean().optional(),
  approvalNote: z.string().trim().max(2000).nullable().optional(),
  allowedTools: z.array(z.string().min(1).max(160)).max(50).nullable().optional(),
  intent: doblyIntentSchema.optional(),
});

const listStatusSchema = z
  .enum(["draft", "needs_approval", "running", "completed", "failed", "not_configured", "cancelled"])
  .optional();

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const status = listStatusSchema.safeParse(url.searchParams.get("status") ?? undefined);
  const limit = Number(url.searchParams.get("limit") ?? 30);

  if (!status.success) {
    return NextResponse.json({ error: "Invalid run status filter." }, { status: 400 });
  }

  if (workspaceId) {
    await requireWorkspacePermission({
      userId: user.id,
      workspaceId,
      permission: "office:view",
    });
  }

  try {
    const runs = await listSoftwareExecutionRuns({
      userId: user.id,
      workspaceId,
      status: status.data as SoftwareExecutionRunStatus | undefined,
      limit,
    });

    return NextResponse.json({ runs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list software execution runs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createRunSchema.safeParse(body);

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
      allowedTools: parsed.data.allowedTools ?? null,
      approved: parsed.data.approved ?? false,
      approvalNote: parsed.data.approvalNote ?? null,
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
