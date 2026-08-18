import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { runDoblyOperator } from "@/lib/dobly-operators";
import { ensureOperatorConversation, recordOperatorChatEvent } from "@/lib/operator-chat";
import { getLoopGithubSecret, type LoopTriggerMetadata } from "@/lib/loop-triggers";
import { verifyGithubSignatureValue } from "@/lib/webhooks/github-signature-core";

const MAX_WEBHOOK_BYTES = 256 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A dedicated GitHub trigger, distinct from the generic webhook trigger at
// api/loops/[loopId]/trigger/[token] - GitHub signs the raw body with a
// secret the repo owner chooses in their own webhook settings
// (X-Hub-Signature-256), not a bearer token in the URL, so this needed its
// own verification path (see webhooks/github-signature-core.ts, tested
// against GitHub's own published example). No founder setup step needed -
// unlike Slack, there's no platform-wide app credential to wait on here.
export async function POST(req: NextRequest, { params }: { params: Promise<{ loopId: string }> }) {
  const { loopId } = await params;
  if (!UUID_RE.test(loopId)) {
    return NextResponse.json({ error: "Trigger not found." }, { status: 404 });
  }

  const rl = rateLimits.webhook(`loop-github:${loopId}:${getRequestIp(req)}`);
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

  const secret = getLoopGithubSecret(loop);
  const signature = req.headers.get("x-hub-signature-256");
  if (!secret || !signature || !verifyGithubSignatureValue(signature, rawBody, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const githubEvent = req.headers.get("x-github-event") ?? "unknown";

  // GitHub sends a real "ping" event once, right when the webhook is first
  // saved, with no meaningful payload - acknowledge it without running the
  // coworker, so setup doesn't fire a confusing first run.
  if (githubEvent === "ping") {
    return NextResponse.json({ ok: true, ping: true });
  }

  const metadata = (loop.metadata ?? {}) as LoopTriggerMetadata;
  if (metadata.github_events?.length && !metadata.github_events.includes(githubEvent)) {
    return NextResponse.json({ ok: true, skipped: true, reason: `Not subscribed to "${githubEvent}" events.` });
  }

  let payload: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) payload = parsed as Record<string, unknown>;
  } catch {
    // GitHub always sends valid JSON for real events; an unparsable body
    // here would be unusual, but shouldn't hard-fail the trigger.
  }

  const repoName = typeof (payload.repository as any)?.full_name === "string" ? (payload.repository as any).full_name : null;
  const action = typeof payload.action === "string" ? payload.action : null;
  const senderLogin = typeof (payload.sender as any)?.login === "string" ? (payload.sender as any).login : null;
  const eventSummary = [githubEvent, action, repoName ? `on ${repoName}` : null, senderLogin ? `by ${senderLogin}` : null]
    .filter(Boolean)
    .join(" ");

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
      title: "Triggered by GitHub",
      summary: `${loop.name} fired from a GitHub ${githubEvent} event.`,
      payload: { loopId: loop.id, githubEvent, action, repoName },
    }).catch(() => undefined);

    const result = await runDoblyOperator({
      userId: loop.user_id,
      operatorId: loop.operator_id,
      workspaceId: loop.workspace_id,
      loopId: loop.id,
      conversationId: conversation.id,
      prompt: [
        `GitHub-triggered loop: ${loop.name}`,
        `Trigger: ${loop.trigger}`,
        `Instructions: ${loop.playbook}`,
        `GitHub event: ${eventSummary || githubEvent}`,
        `Relevant payload: ${JSON.stringify(payload).slice(0, 3000)}`,
        "Run safely, create chat-visible events, and ask for approval before risky external action.",
      ].join("\n"),
    });

    await admin.from("dobly_operator_loops").update({ last_run_at: new Date().toISOString() }).eq("id", loop.id);

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
