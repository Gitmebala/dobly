import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDoblyOperator, runDoblyOperator } from "@/lib/dobly-operators";
import { appendOperatorChatMessage, ensureOperatorConversation, recordOperatorChatEvent } from "@/lib/operator-chat";

const runSchema = z.object({
  prompt: z.string().trim().min(5).max(6000),
  workspaceId: z.string().uuid().nullable().optional(),
  loopId: z.string().uuid().nullable().optional(),
  approved: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = runSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid Operator run." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const operator = await getDoblyOperator({ userId: user.id, operatorId: id });
    const conversation = await ensureOperatorConversation({
      userId: user.id,
      operatorId: id,
      workspaceId: parsed.data.workspaceId ?? operator.workspace_id,
      title: `${operator.name} Chat`,
    });
    const sourceMessage = await appendOperatorChatMessage({
      conversationId: conversation.id,
      userId: user.id,
      workspaceId: parsed.data.workspaceId ?? operator.workspace_id,
      operatorId: id,
      role: "user",
      intent: "manual_run",
      body: parsed.data.prompt,
      metadata: {
        source: "operator_run_api",
        loopId: parsed.data.loopId ?? null,
        approved: parsed.data.approved ?? false,
      },
    });
    await recordOperatorChatEvent({
      conversationId: conversation.id,
      messageId: sourceMessage.id,
      userId: user.id,
      workspaceId: parsed.data.workspaceId ?? operator.workspace_id,
      operatorId: id,
      eventType: "manual_run_requested",
      title: "Manual run requested",
      summary: parsed.data.prompt.slice(0, 240),
      payload: {
        loopId: parsed.data.loopId ?? null,
        approved: parsed.data.approved ?? false,
      },
    });

    const result = await runDoblyOperator({
      userId: user.id,
      operatorId: id,
      prompt: parsed.data.prompt,
      workspaceId: parsed.data.workspaceId ?? null,
      loopId: parsed.data.loopId ?? null,
      approved: parsed.data.approved ?? false,
      conversationId: conversation.id,
      sourceMessageId: sourceMessage.id,
    });
    await Promise.all([
      recordOperatorChatEvent({
        conversationId: conversation.id,
        messageId: sourceMessage.id,
        userId: user.id,
        workspaceId: parsed.data.workspaceId ?? operator.workspace_id,
        operatorId: id,
        eventType: "plan_created",
        title: "Plan created",
        summary: `${result.brain.plan.length} planned steps created for this manual run.`,
        payload: { plan: result.brain.plan },
      }),
      recordOperatorChatEvent({
        conversationId: conversation.id,
        messageId: sourceMessage.id,
        userId: user.id,
        workspaceId: parsed.data.workspaceId ?? operator.workspace_id,
        operatorId: id,
        eventType: "run_queued",
        title: "Run queued",
        summary: "The coworker placed this work on the durable background queue.",
        severity: "success",
        payload: { jobId: result.job.id, jobStatus: result.job.status, autonomy: result.brain.autonomy },
      }),
      appendOperatorChatMessage({
        conversationId: conversation.id,
        userId: user.id,
        workspaceId: parsed.data.workspaceId ?? operator.workspace_id,
        operatorId: id,
        role: "operator",
        intent: "run_update",
        body: [
          `I queued this run for ${operator.name}.`,
          "I created the plan, checked risk, chose the safest execution path, and will write approvals, artifacts, failures, and completion notes back into this chat.",
        ].join(" "),
        metadata: {
          source: "operator_run_api",
          queued: true,
          jobId: result.job.id,
          autonomy: result.brain.autonomy,
          plan: result.brain.plan,
          riskAssessment: result.brain.riskAssessment,
          missingInfo: result.brain.missingInfo,
        },
      }),
    ]);
    return NextResponse.json({ queued: true, ...result }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operator run failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
