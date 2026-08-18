import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature } from "@/lib/webhooks/security";
import { findLoopsForSlackEvent } from "@/lib/loop-triggers";
import { runDoblyOperator } from "@/lib/dobly-operators";
import { ensureOperatorConversation, recordOperatorChatEvent } from "@/lib/operator-chat";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { rateLimits } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/api-security";

// Slack Events API - the real event side of a "slack_channel" loop
// (loop-triggers.ts). Genuinely gated, not faked: SLACK_SIGNING_SECRET is
// confirmed (via .env.local key presence, lengths only) to not be set yet,
// even though Slack OAuth itself (SLACK_CLIENT_ID/SECRET) is real and
// configured - they're two different credentials from the same Slack app's
// dashboard. Until the founder adds the signing secret AND turns on Event
// Subscriptions with this route's URL in Slack's own app settings (a
// one-time manual step neither Claude nor app code can do), every request
// here correctly 503s rather than silently accepting unverified events -
// same honest-gate shape as the LinkedIn OAuth work in
// dobly-office-internal-tools's history.
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(req: NextRequest) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return NextResponse.json(
      { error: "Slack event subscriptions are not configured yet." },
      { status: 503 },
    );
  }

  const rl = rateLimits.webhook(`slack-events:${getRequestIp(req)}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }
  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  if (!verifySlackSignature({ req, rawBody, signingSecret })) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // The one-time handshake Slack requires before it will ever send a real
  // event: echo the challenge back verbatim.
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  if (body.type !== "event_callback") {
    return NextResponse.json({ ok: true });
  }

  const event = (body.event ?? {}) as Record<string, unknown>;
  const teamId = String(body.team_id ?? "");
  const channelId = String(event.channel ?? "");

  // Only real, human-authored channel messages trigger a loop - not bot
  // messages (Dobly's own replies would otherwise re-trigger itself in a
  // loop), not message_changed/deleted subtypes, not threads-only noise.
  const isRealUserMessage =
    event.type === "message" &&
    !event.bot_id &&
    !event.subtype &&
    typeof event.text === "string" &&
    !!teamId &&
    !!channelId;

  if (!isRealUserMessage) {
    return NextResponse.json({ ok: true });
  }

  const loops = await findLoopsForSlackEvent({ slackTeamId: teamId, slackChannelId: channelId });
  if (!loops.length) {
    return NextResponse.json({ ok: true, matched: 0 });
  }

  const admin = createAdminSupabaseClient();
  const results: Array<{ loopId: string; status: "queued" | "failed"; error?: string }> = [];

  for (const loop of loops as any[]) {
    const operator = loop.dobly_operators;
    if (!operator || operator.status !== "active") continue;

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
        title: "Triggered by a Slack message",
        summary: `${loop.name} fired from a new message in Slack.`,
        payload: { loopId: loop.id, channelId, text: String(event.text).slice(0, 500) },
      }).catch(() => undefined);

      const result = await runDoblyOperator({
        userId: loop.user_id,
        operatorId: loop.operator_id,
        workspaceId: loop.workspace_id,
        loopId: loop.id,
        conversationId: conversation.id,
        prompt: [
          `Slack-triggered loop: ${loop.name}`,
          `Trigger: ${loop.trigger}`,
          `Instructions: ${loop.playbook}`,
          `New Slack message in the connected channel: "${String(event.text).slice(0, 2000)}"`,
          "Run safely, create chat-visible events, and ask for approval before risky external action.",
        ].join("\n"),
      });

      await admin.from("dobly_operator_loops").update({ last_run_at: new Date().toISOString() }).eq("id", loop.id);
      results.push({ loopId: loop.id, status: "queued" });
    } catch (error) {
      results.push({ loopId: loop.id, status: "failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return NextResponse.json({ ok: true, matched: loops.length, results });
}
