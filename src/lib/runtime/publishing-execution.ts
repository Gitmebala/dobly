import "server-only";
import { estimateCapabilityCost } from "@/lib/billing/cost-catalog";
import { failedProviderCharge } from "@/lib/billing/economy-core";
import { reserveOperatingCapacity, settleOperatingCapacity } from "@/lib/billing/economy";
import { inferDoblyExecutionIntent } from "@/lib/dobly-inference";
import { createDurableArtifact, createDurableRuntimeRun, completeDurableRuntimeRun } from "@/lib/runtime/durable-runtime";
import { createRuntimeApproval } from "@/lib/runtime/approvals";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { assertEmergencyStopInactive } from "@/lib/feature-flags";
import { getActiveConnectionForProvider, getDecryptedConnectionSecrets } from "@/lib/connections";

type Provider = "instagram" | "facebook" | "linkedin" | "x" | "youtube" | "tiktok";
type JsonRecord = Record<string, unknown>;

function requireEnv(keys: string[]) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing publishing configuration: ${missing.join(", ")}`);
}

async function postJson(url: string, token: string, body: JsonRecord) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as JsonRecord;
  if (!response.ok) throw new Error(`Publishing request failed ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

/**
 * Every publish call used to run exclusively through Dobly's own shared
 * platform credentials (X_ACCESS_TOKEN, META_ACCESS_TOKEN, ...) - a user
 * had no way to post through their own connected account even after
 * connecting one, because nothing here ever looked. Prefer a live
 * per-user connection (see oauth-service.ts's resolveProviderPublishingIdentity
 * for how the extra identity fields below get populated at connect time);
 * fall back to the shared platform credential only when the user hasn't
 * connected their own account for this provider.
 */
async function resolveLinkedInCredential(userId: string): Promise<{ accessToken: string; personUrn: string; source: "user" | "platform" }> {
  try {
    const connection = await getActiveConnectionForProvider(userId, "linkedin");
    const personUrn = typeof connection.metadata?.personUrn === "string" ? connection.metadata.personUrn : null;
    if (personUrn) {
      const secrets = await getDecryptedConnectionSecrets(connection.id);
      if (secrets.accessToken) {
        return { accessToken: secrets.accessToken, personUrn, source: "user" };
      }
    }
  } catch {
    // No active per-user LinkedIn connection - fall back below.
  }
  requireEnv(["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN"]);
  return { accessToken: process.env.LINKEDIN_ACCESS_TOKEN!, personUrn: process.env.LINKEDIN_AUTHOR_URN!, source: "platform" };
}

async function resolveMetaCredential(userId: string): Promise<{
  pageAccessToken: string;
  pageId: string | null;
  instagramBusinessAccountId: string | null;
  source: "user" | "platform";
}> {
  try {
    const connection = await getActiveConnectionForProvider(userId, "meta");
    const pageId = typeof connection.metadata?.pageId === "string" ? connection.metadata.pageId : null;
    if (pageId) {
      const secrets = await getDecryptedConnectionSecrets(connection.id);
      // The Page access token was stored in the secret slot at connect time
      // (see oauth-service.ts) - the user access token in accessToken can't
      // publish on its own.
      if (secrets.secret) {
        const instagramBusinessAccountId =
          typeof connection.metadata?.instagramBusinessAccountId === "string"
            ? connection.metadata.instagramBusinessAccountId
            : null;
        return { pageAccessToken: secrets.secret, pageId, instagramBusinessAccountId, source: "user" };
      }
    }
  } catch {
    // No active per-user Meta connection - fall back below.
  }
  requireEnv(["META_ACCESS_TOKEN"]);
  return {
    pageAccessToken: process.env.META_ACCESS_TOKEN!,
    pageId: process.env.META_PAGE_ID ?? null,
    instagramBusinessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? null,
    source: "platform",
  };
}

async function publishToX(caption: string) {
  requireEnv(["X_ACCESS_TOKEN"]);
  return postJson("https://api.x.com/2/tweets", process.env.X_ACCESS_TOKEN!, { text: caption });
}

async function publishToLinkedIn(userId: string, caption: string, mediaUrls: string[]) {
  const credential = await resolveLinkedInCredential(userId);
  const result = await postJson("https://api.linkedin.com/v2/ugcPosts", credential.accessToken, {
    author: credential.personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: caption },
        shareMediaCategory: mediaUrls.length ? "ARTICLE" : "NONE",
        media: mediaUrls.map((url) => ({ status: "READY", originalUrl: url })),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  });
  return { ...result, publishedVia: credential.source };
}

async function publishToInstagram(userId: string, caption: string, mediaUrls: string[]) {
  if (!mediaUrls[0]) throw new Error("Instagram publishing requires at least one public media URL.");
  const credential = await resolveMetaCredential(userId);
  if (!credential.instagramBusinessAccountId) {
    throw new Error(
      credential.source === "user"
        ? "Your connected Meta Page has no linked Instagram Business Account."
        : "Instagram publishing requires INSTAGRAM_BUSINESS_ACCOUNT_ID to be configured.",
    );
  }
  const create = await postJson(`https://graph.facebook.com/v20.0/${credential.instagramBusinessAccountId}/media`, credential.pageAccessToken, {
    image_url: mediaUrls[0],
    caption,
  });
  const creationId = String(create.id ?? "");
  if (!creationId) throw new Error("Instagram media container did not return an id.");
  const result = await postJson(`https://graph.facebook.com/v20.0/${credential.instagramBusinessAccountId}/media_publish`, credential.pageAccessToken, {
    creation_id: creationId,
  });
  return { ...result, publishedVia: credential.source };
}

async function publishToFacebook(userId: string, caption: string, mediaUrls: string[]) {
  const credential = await resolveMetaCredential(userId);
  if (!credential.pageId) {
    throw new Error(
      credential.source === "user"
        ? "Your connected Meta account has no accessible Page to post to."
        : "Facebook publishing requires META_PAGE_ID to be configured.",
    );
  }
  const url = mediaUrls[0]
    ? `https://graph.facebook.com/v20.0/${credential.pageId}/photos`
    : `https://graph.facebook.com/v20.0/${credential.pageId}/feed`;
  const result = await postJson(url, credential.pageAccessToken, mediaUrls[0] ? { url: mediaUrls[0], caption } : { message: caption });
  return { ...result, publishedVia: credential.source };
}

async function publishToYoutube(caption: string, mediaUrls: string[]) {
  requireEnv(["YOUTUBE_ACCESS_TOKEN"]);
  if (!mediaUrls[0]) throw new Error("YouTube publishing requires a video URL for upload.");
  return {
    provider: "youtube",
    status: "prepared",
    note: "YouTube resumable upload token is configured; Dobly prepared metadata. Binary upload should be executed by the media upload worker.",
    metadata: { title: caption.slice(0, 90), sourceUrl: mediaUrls[0] },
  };
}

async function publishToTikTok(caption: string, mediaUrls: string[]) {
  requireEnv(["TIKTOK_ACCESS_TOKEN"]);
  if (!mediaUrls[0]) throw new Error("TikTok publishing requires a video URL.");
  return {
    provider: "tiktok",
    status: "prepared",
    note: "TikTok content posting requires approved app scopes. Dobly prepared the publish payload for the upload worker.",
    metadata: { caption, sourceUrl: mediaUrls[0] },
  };
}

async function executeProvider(userId: string, provider: Provider, caption: string, mediaUrls: string[]) {
  if (provider === "x") return publishToX(caption);
  if (provider === "linkedin") return publishToLinkedIn(userId, caption, mediaUrls);
  if (provider === "instagram") return publishToInstagram(userId, caption, mediaUrls);
  if (provider === "facebook") return publishToFacebook(userId, caption, mediaUrls);
  if (provider === "youtube") return publishToYoutube(caption, mediaUrls);
  return publishToTikTok(caption, mediaUrls);
}

export async function executePublishingRuntime(input: {
  userId: string;
  workspaceId?: string | null;
  providers: Provider[];
  caption: string;
  mediaUrls?: string[];
  scheduleAt?: string | null;
  dryRun?: boolean;
  approved?: boolean;
}) {
  assertEmergencyStopInactive("external_actions");
  const intent = inferDoblyExecutionIntent({
    prompt: input.caption,
    context: { providers: input.providers, scheduleAt: input.scheduleAt ?? null },
    explicit: {
      departmentId: "marketing",
      workTypeId: "communicate",
      outputTypeId: "message",
      trustLevelId: "approval_required",
    },
    availability: { runtimes: { publishing: true } },
  });
  const run = await createDurableRuntimeRun({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    toolId: "cross_platform_publishing",
    toolLabel: "Cross-Platform Publishing",
    toolFamily: "publishing",
    task: input.caption,
    riskLevel: "high",
    context: { providers: input.providers, scheduleAt: input.scheduleAt ?? null, dryRun: Boolean(input.dryRun) },
    intent,
  });

  const estimate = estimateCapabilityCost({
    capability: "software.write",
    quantity: input.providers.length,
    preferredProvider: "connected_customer",
  });
  let reservation: { id: string } | null = null;
  try {
    if (!input.approved && !input.dryRun) {
      const approval = await createRuntimeApproval({
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        runId: run.id,
        title: "Approve content publishing",
        message: "Dobly prepared the publish request, but live posting should stay approval-gated until you approve it.",
        actionLabel: "Approve publishing",
        riskLevel: "high",
        metadata: { doblyIntent: intent, providers: input.providers, mediaUrls: input.mediaUrls ?? [] },
      });
      const awaiting = await completeDurableRuntimeRun({
        runId: run.id,
        userId: input.userId,
        status: "needs_approval",
        summary: "Publishing request prepared and waiting for approval.",
        result: { approvalId: approval.id, providers: input.providers },
      });
      return { run: awaiting, artifacts: [], approval };
    }
    if (!input.dryRun) {
      reservation = await reserveOperatingCapacity({
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        capability: "software.write",
        provider: estimate.route.provider,
        estimatedMinor: estimate.estimatedMinor,
        idempotencyKey: `publishing:${run.id}`,
        runId: run.id,
        metadata: { providers: input.providers, approvedCost: Boolean(input.approved) },
      });
    }
    const results: Array<{ provider: Provider; result: JsonRecord }> = [];
    for (const provider of input.providers) {
      const result = input.dryRun
        ? { provider, status: "dry_run", caption: input.caption, mediaUrls: input.mediaUrls ?? [] }
        : await executeProvider(input.userId, provider, input.caption, input.mediaUrls ?? []);
      results.push({ provider, result });
    }

    const artifact = await createDurableArtifact({
      runId: run.id,
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      kind: "json",
      title: "Publishing execution result",
      content: { providers: input.providers, results },
      metadata: { scheduleAt: input.scheduleAt ?? null },
      intent,
    });

    const admin = createAdminSupabaseClient();
    await Promise.all(results.map((item) =>
      admin.from("runtime_rollback_records").insert({
        user_id: input.userId,
        workspace_id: input.workspaceId ?? null,
        run_id: run.id,
        provider: item.provider,
        external_id: String((item.result as JsonRecord).id ?? ""),
        action_taken: "publish",
        rollback_payload: item.result as JsonRecord,
        status: input.dryRun ? "not_supported" : "available",
      }).then(() => undefined)
    ));

    await logRuntimeAuditEvent({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      runId: run.id,
      eventType: "publishing.executed",
      riskLevel: "high",
      summary: `Publishing executed for ${input.providers.join(", ")}.`,
      metadata: { results },
    });

    const completed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: "completed",
      summary: `Publishing completed for ${input.providers.length} platform(s).`,
      result: { results, artifactId: artifact.id },
    });
    if (reservation?.id) {
      await settleOperatingCapacity({
        reservationId: reservation.id,
        actualMinor: estimate.estimatedMinor,
        status: "succeeded",
        metadata: { providers: input.providers, resultCount: results.length },
      });
    }
    return { run: completed, artifacts: [artifact], results };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publishing failed.";
    if (reservation?.id) {
      await settleOperatingCapacity({
        reservationId: reservation.id,
        actualMinor: failedProviderCharge({
          paidRail: estimate.route.paidRail,
          estimatedMinor: estimate.estimatedMinor,
          errorMessage: message,
        }),
        status: "failed",
        metadata: { error: message, providers: input.providers },
      }).catch(() => undefined);
    }
    const failed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: message.includes("Missing publishing configuration") ? "not_configured" : "failed",
      summary: message,
      errorMessage: message,
    });
    return { run: failed, artifacts: [], error: message };
  }
}
