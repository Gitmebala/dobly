import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDoblyOperator } from "@/lib/dobly-operators";
import { createOperatorLoop } from "@/lib/loop-triggers";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";
import { rateLimits } from "@/lib/rate-limit";
import { getActiveConnectionForProvider, getDecryptedConnectionSecrets } from "@/lib/connections";

const cadenceValues = ["hourly", "daily", "weekly", "market_open", "always_on"] as const;

const createLoopSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("schedule"),
    name: z.string().trim().min(1, "Give this loop a name.").max(120),
    playbook: z.string().trim().min(1, "Describe what should happen.").max(2000),
    cadence: z.enum(cadenceValues),
  }),
  z.object({
    kind: z.literal("webhook"),
    name: z.string().trim().min(1, "Give this loop a name.").max(120),
    playbook: z.string().trim().min(1, "Describe what should happen.").max(2000),
    eventSourceLabel: z.string().trim().min(1).max(120).optional(),
  }),
  z.object({
    kind: z.literal("slack_channel"),
    name: z.string().trim().min(1, "Give this loop a name.").max(120),
    playbook: z.string().trim().min(1, "Describe what should happen.").max(2000),
    channelName: z.string().trim().min(1, "Type the Slack channel name.").max(80),
  }),
  z.object({
    kind: z.literal("github_repo"),
    name: z.string().trim().min(1, "Give this loop a name.").max(120),
    playbook: z.string().trim().min(1, "Describe what should happen.").max(2000),
    repoLabel: z.string().trim().min(1, "Name the repo, e.g. yourname/yourrepo.").max(140),
  }),
]);

/** Resolves a plain channel name ("general", "#general") to a real Slack
 * channel ID via the user's own connected bot token - so a non-technical
 * user never has to go find a raw channel ID themselves. */
async function resolveSlackChannel(userId: string, channelName: string) {
  const connection = await getActiveConnectionForProvider(userId, "slack");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) throw new Error("Slack isn't fully connected yet.");

  const normalized = channelName.replace(/^#/, "").toLowerCase();
  const metadata = (connection.metadata ?? {}) as Record<string, unknown>;
  const teamId = typeof metadata.teamId === "string" ? metadata.teamId : null;

  let cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    const response = await fetch(
      `https://slack.com/api/conversations.list?limit=200&types=public_channel,private_channel${cursor ? `&cursor=${cursor}` : ""}`,
      { headers: { Authorization: `Bearer ${secrets.accessToken}` } },
    );
    const data = await response.json();
    if (!data.ok) throw new Error(`Could not read Slack channels: ${data.error ?? "unknown error"}`);

    const match = (data.channels ?? []).find((channel: any) => String(channel.name ?? "").toLowerCase() === normalized);
    if (match) return { channelId: String(match.id), channelName: String(match.name), teamId };

    cursor = data.response_metadata?.next_cursor;
    if (!cursor) break;
  }
  throw new Error(`Couldn't find a Slack channel called "${channelName}". Make sure Dobly's Slack app is added to it.`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimits.write(user.id);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  const parsed = createLoopSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid loop." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const operator = await getDoblyOperator({ userId: user.id, operatorId: id });

    let slackChannel: { channelId: string; channelName: string; teamId: string | null } | null = null;
    if (parsed.data.kind === "slack_channel") {
      // Creating this loop when nothing can ever deliver an event to it
      // would be a silent-success trap: it would look configured (real
      // channel resolved, real loop row, real UI confirmation) while
      // permanently never firing. Block it with the real reason instead -
      // same standard as every other "waiting on external credentials"
      // gate in this codebase.
      if (!process.env.SLACK_SIGNING_SECRET) {
        return NextResponse.json(
          { error: "Slack message triggers need one more setup step from Dobly's team before they can go live. Try an incoming webhook instead for now." },
          { status: 503 },
        );
      }
      slackChannel = await resolveSlackChannel(user.id, parsed.data.channelName);
    }

    const { loop, webhookUrl, githubWebhookUrl, githubSecret } = await createOperatorLoop({
      userId: user.id,
      operatorId: operator.id,
      workspaceId: operator.workspace_id,
      name: parsed.data.name,
      playbook: parsed.data.playbook,
      kind: parsed.data.kind,
      cadence: parsed.data.kind === "schedule" ? parsed.data.cadence : undefined,
      eventSourceLabel: parsed.data.kind === "webhook" ? parsed.data.eventSourceLabel : undefined,
      slackChannelId: slackChannel?.channelId,
      slackChannelName: slackChannel?.channelName,
      slackTeamId: slackChannel?.teamId ?? undefined,
      githubRepoLabel: parsed.data.kind === "github_repo" ? parsed.data.repoLabel : undefined,
    });

    await logRuntimeAuditEvent({
      userId: user.id,
      workspaceId: operator.workspace_id,
      eventType: "loop.created",
      riskLevel: "low",
      summary: `${operator.name} got a new loop: ${loop.name} (${parsed.data.kind}).`,
      metadata: { operatorId: operator.id, loopId: loop.id, kind: parsed.data.kind },
    }).catch(() => undefined);

    // webhookUrl/githubWebhookUrl+githubSecret are only ever present in
    // this one response - the create call. Fetching the loop afterward
    // (GET /workflows) never returns the raw token again, only the masked
    // form.
    return NextResponse.json({ loop, webhookUrl, githubWebhookUrl, githubSecret }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create this loop." },
      { status: 500 },
    );
  }
}
