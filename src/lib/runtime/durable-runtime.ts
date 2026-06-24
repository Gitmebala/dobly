import "server-only";
import type { DoblyExecutionIntent } from "@/lib/dobly-inference";
import { attachDoblyIntentMetadata } from "@/lib/dobly-inference";
import { createRuntimeApproval } from "@/lib/runtime/approvals";
import { reviewRuntimeArtifact } from "@/lib/runtime/artifact-quality";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type {
  SoftwareExecutionArtifactRecord,
  SoftwareExecutionRunRecord,
  SoftwareExecutionRunStatus,
} from "@/lib/software-execution-runs";

type JsonRecord = Record<string, unknown>;

export interface DoblyRuntimeRunInput {
  userId: string;
  workspaceId?: string | null;
  toolId: string;
  toolLabel: string;
  toolFamily: string;
  task: string;
  riskLevel?: "low" | "medium" | "high";
  context?: JsonRecord;
  outputSchema?: JsonRecord | null;
  intent?: DoblyExecutionIntent | null;
}

function isUnknownColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /column .* does not exist|Could not find the '.*' column/i.test(message);
}

export async function createDurableRuntimeRun(input: DoblyRuntimeRunInput) {
  const supabase = createAdminSupabaseClient();
  const insertPayload = {
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    tool_id: input.toolId,
    tool_label: input.toolLabel,
    tool_family: input.toolFamily,
    task: input.task,
    status: "running",
    risk_level: input.riskLevel ?? "medium",
    approval_required: false,
    context: input.intent ? attachDoblyIntentMetadata(input.context ?? {}, input.intent) : (input.context ?? {}),
    output_schema: input.outputSchema ?? null,
    started_at: new Date().toISOString(),
    department_id: input.intent?.departmentId ?? null,
    work_type_id: input.intent?.workTypeId ?? null,
    output_type_id: input.intent?.outputTypeId ?? null,
    trigger_type_id: input.intent?.triggerTypeId ?? null,
    trust_level_id: input.intent?.trustLevelId ?? null,
    memory_scope_id: input.intent?.memoryScopeId ?? null,
    capability_state: input.intent?.capabilityState ?? null,
  };

  let { data, error } = await supabase
    .from("software_execution_runs")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error && isUnknownColumnError(error)) {
    const {
      department_id: _departmentId,
      work_type_id: _workTypeId,
      output_type_id: _outputTypeId,
      trigger_type_id: _triggerTypeId,
      trust_level_id: _trustLevelId,
      memory_scope_id: _memoryScopeId,
      capability_state: _capabilityState,
      ...compatPayload
    } = insertPayload;

    const compatResult = await supabase
      .from("software_execution_runs")
      .insert(compatPayload)
      .select("*")
      .single();
    data = compatResult.data;
    error = compatResult.error;
  }

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create durable runtime run.");
  }

  return data as SoftwareExecutionRunRecord;
}

export async function completeDurableRuntimeRun(input: {
  runId: string;
  userId: string;
  status: Exclude<SoftwareExecutionRunStatus, "draft" | "running" | "cancelled">;
  summary: string;
  result?: JsonRecord | null;
  errorMessage?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("software_execution_runs")
    .update({
      status: input.status,
      summary: input.summary,
      execution_result: input.result ?? null,
      error_message: input.errorMessage ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.runId)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to complete durable runtime run.");
  }

  return data as SoftwareExecutionRunRecord;
}

export async function createDurableArtifact(input: {
  runId: string;
  userId: string;
  workspaceId?: string | null;
  kind?: SoftwareExecutionArtifactRecord["kind"];
  title: string;
  content: JsonRecord;
  metadata?: JsonRecord;
  externalUrl?: string | null;
  storagePath?: string | null;
  intent?: DoblyExecutionIntent | null;
  skipReview?: boolean;
}) {
  const supabase = createAdminSupabaseClient();
  const { data: owningRun } = await supabase
    .from("software_execution_runs")
    .select("id, user_id, workspace_id")
    .eq("id", input.runId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (!owningRun || (input.workspaceId && owningRun.workspace_id !== input.workspaceId)) {
    throw new Error("Runtime run not found or artifact access denied.");
  }
  const { data: latest } = await supabase
    .from("software_execution_artifacts")
    .select("version")
    .eq("run_id", input.runId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = Number(latest?.version ?? 0) + 1;
  const { data, error } = await supabase
    .from("software_execution_artifacts")
    .insert({
      run_id: input.runId,
      user_id: input.userId,
      workspace_id: owningRun.workspace_id ?? null,
      kind: input.kind ?? "json",
      title: input.title,
      version,
      content: input.content,
      metadata: input.intent ? attachDoblyIntentMetadata(input.metadata ?? {}, input.intent) : (input.metadata ?? {}),
      external_url: input.externalUrl ?? null,
      storage_path: input.storagePath ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create runtime artifact.");
  }

  await supabase
    .from("software_execution_runs")
    .update({ artifact_count: version })
    .eq("id", input.runId)
    .eq("user_id", input.userId);

  let artifact = data as SoftwareExecutionArtifactRecord;

  if (!input.skipReview) {
    try {
      const { data: runRow } = await supabase
        .from("software_execution_runs")
        .select("task, context")
        .eq("id", input.runId)
        .eq("user_id", input.userId)
        .maybeSingle();

      const context = ((runRow?.context ?? {}) as JsonRecord) ?? {};
      const inferredIntent = input.intent ?? ((context.doblyIntent as DoblyExecutionIntent | undefined) ?? null);
      const task = typeof runRow?.task === "string" ? runRow.task : input.title;
      const enrichedMetadata = {
        ...(input.metadata ?? {}),
        operatorId: typeof context.operatorId === "string" ? context.operatorId : undefined,
        operatorQualityProfileId:
          typeof context.operatorQualityProfileId === "string" ? context.operatorQualityProfileId : undefined,
        operatorQualityProfile:
          context.operatorQualityProfile && typeof context.operatorQualityProfile === "object"
            ? context.operatorQualityProfile
            : undefined,
        operatorQualityContract:
          context.operatorQualityContract && typeof context.operatorQualityContract === "object"
            ? context.operatorQualityContract
            : undefined,
      } satisfies JsonRecord;

      if (inferredIntent) {
        const review = await reviewRuntimeArtifact({
          userId: input.userId,
          workspaceId: input.workspaceId ?? null,
          runId: input.runId,
          title: input.title,
          kind: input.kind ?? "json",
          content: input.content,
          metadata: enrichedMetadata,
          intent: inferredIntent,
          task,
        });

        const mergedMetadata = {
          ...(artifact.metadata ?? {}),
          ...enrichedMetadata,
          artifactQuality: review,
        } satisfies JsonRecord;

        const { data: reviewedArtifact } = await supabase
          .from("software_execution_artifacts")
          .update({ metadata: mergedMetadata })
          .eq("id", artifact.id)
          .eq("user_id", input.userId)
          .select("*")
          .maybeSingle();

        if (reviewedArtifact) {
          artifact = reviewedArtifact as SoftwareExecutionArtifactRecord;
        } else {
          artifact = { ...artifact, metadata: mergedMetadata };
        }

        if (review.status === "needs_revision") {
          await createDurableArtifact({
            runId: input.runId,
            userId: input.userId,
            workspaceId: input.workspaceId ?? null,
            kind: "summary",
            title: `${input.title} revision brief`,
            content: {
              artifactId: artifact.id,
              artifactTitle: input.title,
              review,
            },
            metadata: {
              parentArtifactId: artifact.id,
              artifactQualityRevision: true,
            },
            intent: inferredIntent,
            skipReview: true,
          });
        }

        if (review.releaseGate && review.releaseGate.decision !== "release") {
          await createRuntimeApproval({
            userId: input.userId,
            workspaceId: input.workspaceId ?? null,
            runId: input.runId,
            title:
              review.releaseGate.decision === "block"
                ? `Quality blocked: ${input.title}`
                : `Review required: ${input.title}`,
            message: review.releaseGate.reason,
            actionLabel: review.releaseGate.decision === "approval_required" ? "Review artifact" : "Review quality packet",
            riskLevel: review.releaseGate.decision === "block" ? "high" : "medium",
            metadata: {
              artifactId: artifact.id,
              artifactTitle: input.title,
              artifactKind: input.kind ?? "json",
              releaseGate: review.releaseGate,
              artifactQuality: review,
              resume: {
                type: "quality_review",
                runId: input.runId,
                artifactId: artifact.id,
              },
            },
          }).catch(() => undefined);
        }
      }
    } catch {
      // Quality review should improve artifacts when possible, but it should
      // never block the underlying runtime from delivering its output.
    }
  }

  return artifact;
}
