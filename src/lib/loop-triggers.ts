import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { secureSecretMatches } from "@/lib/security/secrets";
import type { DoblyLoopCadence, DoblyLoopRecord } from "@/lib/dobly-operators";

// Event-based loops have existed in the data model since the coworker-hire
// flow was built (every coworker gets a default `cadence: "event_based"`
// loop) but the scheduler has always explicitly skipped them
// (runtime/scheduler.ts's isOperatorLoopDue: `cadence === "event_based"` ->
// never due). That was correct for the *default* command loop (it really
// does just mean "runs when you talk to this coworker directly"), but there
// was never a real mechanism for the literal case the vocabulary promises -
// "when a connected-tool event appears." This file is that mechanism: a
// per-loop signed webhook URL that, when POSTed to, runs the loop's
// coworker immediately via the same runDoblyOperator() path the scheduler
// already uses for cadence loops - not a parallel fake system.

export type LoopTriggerKind = "webhook" | "schedule" | "slack_channel" | "github_repo";

export interface LoopTriggerMetadata {
  // Optional, not required: every loop created before this feature (plus
  // the default "command loop" every coworker gets at hire time) has
  // metadata: {} with no trigger_kind at all - that's a real, valid state
  // ("no configured push trigger"), not a malformed one.
  trigger_kind?: LoopTriggerKind;
  webhook_token?: string;
  webhook_created_at?: string;
  event_source_label?: string;
  slack_channel_id?: string;
  slack_channel_name?: string;
  slack_team_id?: string;
  // github_repo reuses webhook_token as the SAME value the user pastes into
  // their GitHub repo's own webhook "Secret" field - GitHub webhooks are
  // per-repo and user-configured with their own chosen secret (unlike
  // Slack, there's no platform-wide app credential to wait on), so this
  // trigger kind is real and usable immediately, no founder setup step.
  github_repo_label?: string;
  github_events?: string[];
}

function generateWebhookToken() {
  return randomBytes(24).toString("base64url");
}

export function buildLoopWebhookUrl(loopId: string, token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://dobly-dev.vercel.app";
  return `${base}/api/loops/${loopId}/trigger/${token}`;
}

// A separate URL/endpoint from the generic webhook trigger above, because
// GitHub's verification scheme is genuinely different: GitHub signs the
// body with a secret YOU choose and paste into your own repo's webhook
// settings (X-Hub-Signature-256), rather than a bearer token in a custom
// header. Reuses the same generated token AS that secret rather than a
// second one, so there is only ever one value to copy.
export function buildLoopGithubWebhookUrl(loopId: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://dobly-dev.vercel.app";
  return `${base}/api/loops/${loopId}/github`;
}

export function maskToken(token: string) {
  if (token.length <= 6) return "••••";
  return `••••${token.slice(-4)}`;
}

/**
 * Creates a new loop for an operator. Two real shapes:
 *  - scheduled: reuses the existing cadence engine (hourly/daily/weekly/etc)
 *  - webhook: cadence stays "event_based" (correctly never polled), but gets
 *    a real signed URL stored in metadata that a separate push endpoint
 *    validates and executes against immediately.
 */
export async function createOperatorLoop(input: {
  userId: string;
  operatorId: string;
  workspaceId: string | null;
  name: string;
  playbook: string;
  kind: LoopTriggerKind;
  cadence?: DoblyLoopCadence;
  eventSourceLabel?: string;
  slackChannelId?: string;
  slackChannelName?: string;
  slackTeamId?: string;
  githubRepoLabel?: string;
  githubEvents?: string[];
}) {
  const admin = createAdminSupabaseClient();

  const cadence: DoblyLoopCadence = input.kind === "schedule" ? (input.cadence ?? "daily") : "event_based";
  const metadata: LoopTriggerMetadata =
    input.kind === "webhook"
      ? {
          trigger_kind: "webhook",
          webhook_token: generateWebhookToken(),
          webhook_created_at: new Date().toISOString(),
          event_source_label: input.eventSourceLabel ?? "Incoming webhook",
        }
      : input.kind === "slack_channel"
        ? {
            trigger_kind: "slack_channel",
            slack_channel_id: input.slackChannelId,
            slack_channel_name: input.slackChannelName,
            slack_team_id: input.slackTeamId,
          }
        : input.kind === "github_repo"
          ? {
              trigger_kind: "github_repo",
              webhook_token: generateWebhookToken(),
              webhook_created_at: new Date().toISOString(),
              github_repo_label: input.githubRepoLabel,
              github_events: input.githubEvents?.length ? input.githubEvents : undefined,
            }
          : { trigger_kind: "schedule" };

  const triggerDescription =
    input.kind === "webhook"
      ? `When ${input.eventSourceLabel ?? "an incoming webhook"} arrives.`
      : input.kind === "slack_channel"
        ? `When a message arrives in #${input.slackChannelName ?? input.slackChannelId ?? "the connected channel"}.`
        : input.kind === "github_repo"
          ? `When something happens in ${input.githubRepoLabel ?? "the connected GitHub repo"}.`
          : `On a ${cadence.replace("_", " ")} schedule.`;

  const { data, error } = await admin
    .from("dobly_operator_loops")
    .insert({
      operator_id: input.operatorId,
      user_id: input.userId,
      workspace_id: input.workspaceId,
      name: input.name,
      cadence,
      trigger: triggerDescription,
      playbook: input.playbook,
      status: "active",
      metadata,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const loop = data as DoblyLoopRecord;

  const webhookUrl =
    input.kind === "webhook" && metadata.webhook_token
      ? buildLoopWebhookUrl(loop.id, metadata.webhook_token)
      : null;
  // GitHub needs two separate values shown to the user: the fixed Payload
  // URL (no token in the URL - GitHub doesn't sign the URL, it signs the
  // body) and the Secret (the same generated token, pasted into GitHub's
  // own "Secret" field).
  const githubWebhookUrl = input.kind === "github_repo" ? buildLoopGithubWebhookUrl(loop.id) : null;
  const githubSecret = input.kind === "github_repo" ? metadata.webhook_token ?? null : null;

  // The full token/secret is only ever returned here, at creation time -
  // same reveal-once pattern as an API key. Reading the loop back later
  // only ever exposes the masked form via maskToken().
  return { loop, webhookUrl, githubWebhookUrl, githubSecret };
}

/** Regenerates a webhook or GitHub loop's token/secret, invalidating the old one. */
export async function regenerateLoopWebhookToken(input: {
  userId: string;
  loopId: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data: existing, error: fetchError } = await admin
    .from("dobly_operator_loops")
    .select("*")
    .eq("id", input.loopId)
    .eq("user_id", input.userId)
    .single();
  if (fetchError || !existing) throw new Error("Trigger not found.");

  const metadata = (existing.metadata ?? {}) as LoopTriggerMetadata;
  if (metadata.trigger_kind !== "webhook" && metadata.trigger_kind !== "github_repo") {
    throw new Error("This loop doesn't have a regenerable trigger secret.");
  }

  const nextMetadata: LoopTriggerMetadata = {
    ...metadata,
    webhook_token: generateWebhookToken(),
    webhook_created_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("dobly_operator_loops")
    .update({ metadata: nextMetadata, updated_at: new Date().toISOString() })
    .eq("id", input.loopId)
    .eq("user_id", input.userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const loop = data as DoblyLoopRecord;
  if (metadata.trigger_kind === "github_repo") {
    return { loop, webhookUrl: buildLoopGithubWebhookUrl(loop.id), githubSecret: nextMetadata.webhook_token! };
  }
  return { loop, webhookUrl: buildLoopWebhookUrl(loop.id, nextMetadata.webhook_token!), githubSecret: null };
}

export function validateLoopWebhookToken(loop: { metadata: Record<string, unknown> }, providedToken: string) {
  const metadata = loop.metadata as LoopTriggerMetadata;
  if (metadata.trigger_kind !== "webhook" || !metadata.webhook_token) return false;
  return secureSecretMatches(metadata.webhook_token, providedToken);
}

/** The secret a GitHub-triggered loop's webhook signature must be verified against. */
export function getLoopGithubSecret(loop: { metadata: Record<string, unknown> }) {
  const metadata = loop.metadata as LoopTriggerMetadata;
  if (metadata.trigger_kind !== "github_repo" || !metadata.webhook_token) return null;
  return metadata.webhook_token;
}

/**
 * Finds every active loop wired to a specific Slack channel, scoped to the
 * Dobly user whose Slack workspace the event came from - looked up via the
 * real connections.metadata.teamId already stored at OAuth time
 * (api/oauth/slack/callback/route.ts), not a new mapping table.
 */
export async function findLoopsForSlackEvent(input: { slackTeamId: string; slackChannelId: string }) {
  const admin = createAdminSupabaseClient();

  const { data: connections, error: connectionsError } = await admin
    .from("connections")
    .select("user_id, metadata")
    .eq("provider", "slack")
    .eq("status", "active");
  if (connectionsError) return [];

  const userIds = (connections ?? [])
    .filter((connection: any) => connection.metadata?.teamId === input.slackTeamId)
    .map((connection: any) => connection.user_id as string);
  if (!userIds.length) return [];

  const { data: loops, error } = await admin
    .from("dobly_operator_loops")
    .select("*, dobly_operators(id, name, status)")
    .in("user_id", userIds)
    .eq("status", "active")
    .eq("cadence", "event_based");
  if (error) return [];

  return (loops ?? []).filter((loop: any) => {
    const metadata = (loop.metadata ?? {}) as LoopTriggerMetadata;
    return metadata.trigger_kind === "slack_channel" && metadata.slack_channel_id === input.slackChannelId;
  });
}
