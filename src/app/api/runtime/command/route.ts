import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { doblyIntentSchema } from "@/lib/validations";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { executeDoblyCommand, planDoblyCommand } from "@/lib/runtime/plain-english-command";
import { enqueueRuntimeCommand } from "@/lib/runtime/job-queue";

const commandSchema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  prompt: z.string().trim().min(5).max(6000),
  context: z.record(z.unknown()).optional(),
  approved: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  runNow: z.boolean().optional(),
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

  const parsed = commandSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid Dobly command." }, { status: 400 });
  }

  if (parsed.data.workspaceId) {
    await requireWorkspacePermission({
      userId: user.id,
      workspaceId: parsed.data.workspaceId,
      permission: parsed.data.dryRun ? "office:view" : "office:write",
    });
  }

  if (parsed.data.dryRun) {
    return NextResponse.json({
      plan: planDoblyCommand({ prompt: parsed.data.prompt, intent: parsed.data.intent ?? null }),
    });
  }

  try {
    if (!parsed.data.runNow) {
      const job = await enqueueRuntimeCommand({
        userId: user.id,
        workspaceId: parsed.data.workspaceId ?? null,
        prompt: parsed.data.prompt,
        context: parsed.data.context ?? {},
        approved: parsed.data.approved ?? false,
        intent: parsed.data.intent ?? null,
      });

      return NextResponse.json(
        {
          queued: true,
          job,
          plan: planDoblyCommand({ prompt: parsed.data.prompt, intent: parsed.data.intent ?? null }),
          message: "Dobly queued this command for background execution.",
        },
        { status: 202 },
      );
    }

    const output = await executeDoblyCommand({
      userId: user.id,
      workspaceId: parsed.data.workspaceId ?? null,
      prompt: parsed.data.prompt,
      context: parsed.data.context ?? {},
      approved: parsed.data.approved ?? false,
      intent: parsed.data.intent ?? null,
    });

    return NextResponse.json(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dobly command failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
