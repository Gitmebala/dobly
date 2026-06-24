import "server-only";
import { inferDoblyExecutionIntent } from "@/lib/dobly-inference";
import { createRuntimeApproval } from "@/lib/runtime/approvals";
import {
  completeDurableRuntimeRun,
  createDurableArtifact,
  createDurableRuntimeRun,
} from "@/lib/runtime/durable-runtime";
import { requireRuntimeProvider } from "@/lib/runtime/provider-health";
import { estimateCapabilityCost } from "@/lib/billing/cost-catalog";
import { releaseOperatingCapacity, reserveOperatingCapacity, settleOperatingCapacity } from "@/lib/billing/economy";
import { failedProviderCharge } from "@/lib/billing/economy-core";

type JsonRecord = Record<string, unknown>;

export interface MediaRuntimeInput {
  userId: string;
  workspaceId?: string | null;
  brief: string;
  formats?: Array<"short_video" | "image" | "carousel" | "voiceover" | "social_post">;
  channels?: string[];
  brandKit?: JsonRecord;
  publish?: boolean;
  approved?: boolean;
}

async function generateOpenAiImage(prompt: string) {
  requireRuntimeProvider("openai");
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt,
      size: "1024x1024",
    }),
  });

  const data = (await response.json().catch(() => null)) as JsonRecord | null;
  if (!response.ok) {
    throw new Error(String((data?.error as JsonRecord | undefined)?.message ?? `OpenAI image generation failed with ${response.status}`));
  }

  return data ?? {};
}

function buildMediaPlan(input: MediaRuntimeInput) {
  const formats = input.formats?.length ? input.formats : ["short_video", "social_post"];
  return {
    brief: input.brief,
    formats,
    channels: input.channels ?? ["instagram", "tiktok", "linkedin", "x"],
    approvalsRequired: Boolean(input.publish),
    productionSteps: formats.map((format) => ({
      format,
      status: "planned",
      notes:
        format === "short_video"
          ? "Create hook, 5-scene storyboard, captions, voiceover, and platform crops."
          : format === "social_post"
            ? "Create platform-specific captions, hashtags, and posting schedule."
            : "Generate creative asset with brand-safe variants.",
    })),
  };
}

export async function runMediaRuntime(input: MediaRuntimeInput) {
  const primaryOutput = input.formats?.includes("short_video") ? "video" : "image_design";
  const intent = inferDoblyExecutionIntent({
    prompt: input.brief,
    context: { ...(input.brandKit ?? {}), channels: input.channels ?? [], publish: Boolean(input.publish) },
    explicit: {
      departmentId: "marketing",
      workTypeId: "create",
      outputTypeId: primaryOutput,
      trustLevelId: input.publish ? "approval_required" : "draft_propose",
    },
    availability: { runtimes: { media: true, publishing: Boolean(input.publish) } },
  });
  const run = await createDurableRuntimeRun({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    toolId: input.publish ? "social_media_publishing_runtime" : "media_generation_runtime",
    toolLabel: input.publish ? "Media Publishing Runtime" : "Media Generation Runtime",
    toolFamily: "media",
    task: input.brief,
    riskLevel: input.publish ? "high" : "medium",
    context: { channels: input.channels ?? [], brandKit: input.brandKit ?? {} },
    intent,
  });
  const generatedImageRequested = Boolean(input.formats?.includes("image"));
  const estimate = estimateCapabilityCost({
    capability: generatedImageRequested ? "media.generate" : "media.template",
    market: "KE",
    preferredProvider: generatedImageRequested ? "openai" : "dobly_templates",
  });
  let reservation: any = null;

  try {
    reservation = await reserveOperatingCapacity({
      userId: input.userId,
      workspaceId: input.workspaceId,
      capability: generatedImageRequested ? "media.generate" : "media.template",
      provider: estimate.route.provider,
      estimatedMinor: estimate.estimatedMinor,
      idempotencyKey: `media:${run.id}`,
      runId: run.id,
      metadata: { formats: input.formats ?? [], channels: input.channels ?? [] },
    });
    const plan = buildMediaPlan(input);
    if (input.publish && !input.approved) {
      const approval = await createRuntimeApproval({
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        runId: run.id,
        title: "Approve media publishing",
        message: "Dobly prepared the media package, but publishing or live distribution should stay approval-gated.",
        actionLabel: "Approve publishing",
        riskLevel: "high",
        metadata: { doblyIntent: intent, plan },
      });

      const awaiting = await completeDurableRuntimeRun({
        runId: run.id,
        userId: input.userId,
        status: "needs_approval",
        summary: "Media package prepared and waiting for approval before live publishing.",
        result: { plan, approvalId: approval.id },
      });
      await releaseOperatingCapacity(reservation.id, "waiting_for_approval");
      return { run: awaiting, artifacts: [], approval, result: { plan } };
    }
    const imageResult = generatedImageRequested
      ? await generateOpenAiImage(`${input.brief}\nBrand kit: ${JSON.stringify(input.brandKit ?? {})}`)
      : null;

    const result = {
      ...plan,
      generatedImage: imageResult,
      publishingStatus: input.publish
        ? "prepared_for_approval"
        : "draft_assets_ready",
    };

    const artifact = await createDurableArtifact({
      runId: run.id,
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      kind: "json",
      title: input.publish ? "Publishing package" : "Media generation package",
      content: result,
      metadata: { channels: result.channels, publish: Boolean(input.publish) },
      intent,
    });

    const completed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: "completed",
      summary: `${result.productionSteps.length} media production steps prepared for ${result.channels.join(", ")}.`,
      result,
    });

    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: estimate.estimatedMinor,
      status: "succeeded",
    });
    return { run: completed, artifacts: [artifact], result, billing: { reservationId: reservation.id, costMinor: estimate.estimatedMinor } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media runtime failed.";
    const failed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: message.includes("not configured") ? "not_configured" : "failed",
      summary: message,
      errorMessage: message,
    });
    if (reservation?.id) {
      await settleOperatingCapacity({
        reservationId: reservation.id,
        actualMinor: failedProviderCharge({ paidRail: estimate.route.paidRail, estimatedMinor: estimate.estimatedMinor, errorMessage: message }),
        status: "failed",
        metadata: { error: message },
      }).catch(() => undefined);
    }
    return { run: failed, artifacts: [], error: message };
  }
}
