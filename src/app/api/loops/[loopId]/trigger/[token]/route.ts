import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { runDoblyOperator } from "@/lib/dobly-operators";
import { ensureOperatorConversation, recordOperatorChatEvent } from "@/lib/operator-chat";
import { validateLoopWebhookToken } from "@/lib/loop-triggers";

const MAX_WEBHOOK_BYTES = 256 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The real execution path for event-based loops. This is deliberately a
// *push* endpoint, not something the poll-based scheduler ever touches -
// runtime/scheduler.ts's isOperatorLoopDue() is correct to always skip
// cadence === "event_based"; this route is the other half event_based was
// always missing. Paste this URL into Zapier, Make, GitHub webhook
// settings, Stripe, or anything else that can POST JSON, and the loop's
// coworker runs immediately using the exact same runDoblyOperator() call
// the scheduler uses for cadence loops - not a parallel, lighter-weight
// fake path.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ loopId: string; token: string }> },
) {
  const { loopId, token } = await params;
  if (!UUID_RE.test(loopId) || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) {
    return NextResponse.json({ error: "Trigger not found." }, { status: 404 });
  }

  const rl = rateLimits.webhook(`loop:${loopId}:${getRequestIp(req)}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests to this trigger." }, { status: 429 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Payload is too large." }, { status: 413 });
  }
  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Payload is too large." }, { status: 413 });
  }

  let payload: Record<string, unknown> = {};
  if (rawBody.trim()) {
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        payload = parsed as Record<string, unknown>;
      }
    } catch {
      // Non-JSON senders (some webhook providers send form-encoded bodies
      // on a first "test ping") shouldn't hard-fail the trigger - the
      // coworker still runs, just without a structured payload to read.
    }
  }

  const admin = createAdminSupabaseClient();
  const { data: loop, error } = await admin
    .from("dobly_operator_loops")
    .select("*, dobly_operators(id, name, status, workspace_id)")
    .eq("id", loopId)
    .single();

  if (error || !loop) {
    return NextResponse.json({ error: "Trigger not found." }, { status: 404 });
  }
  if (loop.status !== "active") {
    return NextResponse.json({ error: "This loop is paused." }, { status: 409 });
  }
  const operator = loop.dobly_operators as { id: string; name: string; status: string; workspace_id: string | null } | null;
  if (!operator || operator.status !== "active") {
    return NextResponse.json({ error: "This coworker is not active." }, { status: 409 });
  }
  if (!validateLoopWebhookToken(loop, token)) {
    return NextResponse.json({ error: "Invalid trigger token." }, { status: 401 });
  }

  try {
    const conversation = await ensureOperatorConversation({
      userId: loop.user_id,
      operatorId: loop.operator_id,
      workspaceId: loop.workspace_id,
      title: `${operator.name} Chat`,
    });

    await recordOperatorChatEvent({
      conversationId: conversation.id,
      userId: loop.user_id,
      workspaceId: loop.workspace_id,
      operatorId: loop.operator_id,
      eventType: "run_queued",
      title: "Triggered by webhook",
      summary: `${loop.name} fired from an external event.`,
      payload: { loopId: loop.id, payload },
    }).catch(() => undefined);

    const payloadSummary = Object.keys(payload).length
      ? JSON.stringify(payload).slice(0, 4000)
      : "(no payload body sent)";

    const result = await runDoblyOperator({
      userId: loop.user_id,
      operatorId: loop.operator_id,
      workspaceId: loop.workspace_id,
      loopId: loop.id,
      conversationId: conversation.id,
      prompt: [
        `Event-triggered loop: ${loop.name}`,
        `Trigger: ${loop.trigger}`,
        `Instructions: ${loop.playbook}`,
        `Event payload received: ${payloadSummary}`,
        "Run safely, create chat-visible events, and ask for approval before risky external action.",
      ].join("\n"),
    });

    await admin
      .from("dobly_operator_loops")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", loop.id);

    return NextResponse.json(
      { accepted: true, jobId: result.job.id },
      { status: 202, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Trigger execution failed." },
      { status: 500 },
    );
  }
}
