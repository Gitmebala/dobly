import "server-only";
import { attachDoblyIntentMetadata, inferDoblyExecutionIntent, type DoblyExecutionIntent } from "@/lib/dobly-inference";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getSoftwareExecutionToolStatus,
  listSoftwareExecutionTools,
  runSoftwareExecution,
  type SoftwareExecutionResponse,
} from "@/lib/software-execution";
import { createRuntimeApproval } from "@/lib/runtime/approvals";
import { reviewRuntimeArtifact } from "@/lib/runtime/artifact-quality";
import { reserveOperatingCapacity, settleOperatingCapacity } from "@/lib/billing/economy";
import { failedProviderCharge } from "@/lib/billing/economy-core";

type JsonRecord = Record<string, unknown>;

export type SoftwareExecutionRunStatus =
  | "draft"
  | "needs_approval"
  | "running"
  | "completed"
  | "failed"
  | "not_configured"
  | "cancelled";

export interface CreateSoftwareExecutionRunInput {
  userId: string;
  workspaceId?: string | null;
  toolId: string;
  task: string;
  context?: JsonRecord;
  outputSchema?: JsonRecord | null;
  allowedTools?: string[] | null;
  approved?: boolean;
  approvalNote?: string | null;
  intent?: DoblyExecutionIntent | null;
}

export interface SoftwareExecutionRunRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  tool_id: string;
  tool_label: string;
  tool_family: string;
  task: string;
  status: SoftwareExecutionRunStatus;
  risk_level: "low" | "medium" | "high";
  approval_required: boolean;
  approved_at: string | null;
  approved_by: string | null;
  approval_note: string | null;
  context: JsonRecord;
  output_schema: JsonRecord | null;
  allowed_tools: string[] | null;
  execution_result: JsonRecord | null;
  summary: string | null;
  error_message: string | null;
  artifact_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  department_id?: string | null;
  work_type_id?: string | null;
  output_type_id?: string | null;
  trigger_type_id?: string | null;
  trust_level_id?: string | null;
  memory_scope_id?: string | null;
  capability_state?: string | null;
}

export interface SoftwareExecutionArtifactRecord {
  id: string;
  run_id: string;
  user_id: string;
  workspace_id: string | null;
  kind: "summary" | "text" | "json" | "file" | "external_link" | "mcp_result";
  title: string;
  version: number;
  content: JsonRecord;
  external_url: string | null;
  storage_path: string | null;
  metadata: JsonRecord;
  created_at: string;
}

export interface SoftwareExecutionRunEnvelope {
  run: SoftwareExecutionRunRecord;
  artifacts: SoftwareExecutionArtifactRecord[];
}

function nowIso() {
  return new Date().toISOString();
}

function toolAvailabilityMap() {
  return Object.fromEntries(listSoftwareExecutionTools().map((tool) => [tool.id, tool.configured])) as Record<string, boolean>;
}

function mapExecutionStatus(status: SoftwareExecutionResponse["status"]): SoftwareExecutionRunStatus {
  if (status === "completed") return "completed";
  if (status === "needs_approval") return "needs_approval";
  if (status === "not_configured") return "not_configured";
  return "failed";
}

function serializeExecutionResult(result: SoftwareExecutionResponse): JsonRecord {
  return {
    status: result.status,
    tool: result.tool,
    task: result.task,
    workspaceId: result.workspaceId,
    requiresApproval: result.requiresApproval,
    summary: result.summary,
    result: result.result ?? null,
    error: result.error ?? null,
  };
}

function explainMissingTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("software_execution_runs") || message.includes("software_execution_artifacts")) {
    return "Software execution persistence is not installed yet. Apply supabase/software_execution_schema.sql to enable durable runs and artifacts.";
  }
  return message;
}

function isUnknownColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /column .* does not exist|Could not find the '.*' column/i.test(message);
}

async function createExecutionArtifact(params: {
  run: SoftwareExecutionRunRecord;
  execution: SoftwareExecutionResponse;
  intent: DoblyExecutionIntent;
}) {
  if (params.execution.status !== "completed" || !params.execution.result) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const { data: latest } = await supabase
    .from("software_execution_artifacts")
    .select("version")
    .eq("run_id", params.run.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = Number(latest?.version ?? 0) + 1;
  const { data, error } = await supabase
    .from("software_execution_artifacts")
    .insert({
      run_id: params.run.id,
      user_id: params.run.user_id,
      workspace_id: params.run.workspace_id,
      kind: "mcp_result",
      title: `${params.run.tool_label} result`,
      version: nextVersion,
      content: {
        summary: params.execution.result.summary,
        text: params.execution.result.text,
        rawContent: params.execution.result.rawContent,
        usage: params.execution.result.usage ?? null,
      },
      metadata: {
        toolId: params.run.tool_id,
        toolFamily: params.run.tool_family,
        model: params.execution.result.model,
        serverUrl: params.execution.result.serverUrl,
        operatorId:
          params.run.context && typeof params.run.context.operatorId === "string"
            ? params.run.context.operatorId
            : undefined,
        doblyIntent: params.intent,
        capabilityState: params.intent.capabilityState,
        operatorQualityProfile:
          params.run.context?.operatorQualityProfile && typeof params.run.context.operatorQualityProfile === "object"
            ? params.run.context.operatorQualityProfile
            : undefined,
        operatorQualityContract:
          params.run.context?.operatorQualityContract && typeof params.run.context.operatorQualityContract === "object"
            ? params.run.context.operatorQualityContract
            : undefined,
      },
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("software_execution_runs")
    .update({ artifact_count: nextVersion })
    .eq("id", params.run.id)
    .eq("user_id", params.run.user_id);

  let artifact = data as SoftwareExecutionArtifactRecord;

  try {
    const review = await reviewRuntimeArtifact({
      userId: params.run.user_id,
      workspaceId: params.run.workspace_id,
      runId: params.run.id,
      title: artifact.title,
      kind: artifact.kind,
      content: artifact.content,
      metadata: artifact.metadata,
      intent: params.intent,
      task: params.run.task,
    });

    const mergedMetadata = {
      ...(artifact.metadata ?? {}),
      artifactQuality: review,
    } satisfies JsonRecord;

    const { data: reviewedArtifact } = await supabase
      .from("software_execution_artifacts")
      .update({ metadata: mergedMetadata })
      .eq("id", artifact.id)
      .eq("user_id", params.run.user_id)
      .select("*")
      .maybeSingle();

    if (reviewedArtifact) {
      artifact = reviewedArtifact as SoftwareExecutionArtifactRecord;
    } else {
      artifact = { ...artifact, metadata: mergedMetadata };
    }

    if (review.status === "needs_revision") {
      await supabase.from("software_execution_artifacts").insert({
        run_id: params.run.id,
        user_id: params.run.user_id,
        workspace_id: params.run.workspace_id,
        kind: "summary",
        title: `${artifact.title} revision brief`,
        version: nextVersion + 1,
        content: {
          artifactId: artifact.id,
          artifactTitle: artifact.title,
          review,
        },
        metadata: {
          parentArtifactId: artifact.id,
          artifactQualityRevision: true,
          doblyIntent: params.intent,
        },
      });

      await supabase
        .from("software_execution_runs")
        .update({ artifact_count: nextVersion + 1 })
        .eq("id", params.run.id)
        .eq("user_id", params.run.user_id);
    }

    if (review.releaseGate && review.releaseGate.decision !== "release") {
      await createRuntimeApproval({
        userId: params.run.user_id,
        workspaceId: params.run.workspace_id,
        runId: params.run.id,
        title:
          review.releaseGate.decision === "block"
            ? `Quality blocked: ${artifact.title}`
            : `Review required: ${artifact.title}`,
        message: review.releaseGate.reason,
        actionLabel: review.releaseGate.decision === "approval_required" ? "Review artifact" : "Review quality packet",
        riskLevel: review.releaseGate.decision === "block" ? "high" : "medium",
        metadata: {
          artifactId: artifact.id,
          artifactTitle: artifact.title,
          artifactKind: artifact.kind,
          releaseGate: review.releaseGate,
          artifactQuality: review,
          resume: {
            type: "quality_review",
            runId: params.run.id,
            artifactId: artifact.id,
          },
        },
      }).catch(() => undefined);
    }
  } catch {
    // Artifact scoring improves the execution path when possible but should
    // not block the base software result from being stored.
  }

  return artifact;
}

export async function executeSoftwareExecutionRun(input: {
  runId: string;
  userId: string;
  approved?: boolean;
  approvalNote?: string | null;
}): Promise<SoftwareExecutionRunEnvelope> {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error: loadError } = await supabase
    .from("software_execution_runs")
    .select("*")
    .eq("id", input.runId)
    .eq("user_id", input.userId)
    .single();

  if (loadError || !existing) {
    throw new Error(loadError?.message ?? "Software execution run not found.");
  }

  const run = existing as SoftwareExecutionRunRecord;
  const intent = ((run.context ?? {}) as JsonRecord).doblyIntent as DoblyExecutionIntent | undefined;
  if (run.status === "completed" || run.status === "failed" || run.status === "not_configured") {
    return getSoftwareExecutionRun({ runId: run.id, userId: input.userId });
  }

  if ((run.approval_required || intent?.trustLevelId === "approval_required" || intent?.trustLevelId === "human_only") && !run.approved_at && !input.approved) {
    return getSoftwareExecutionRun({ runId: run.id, userId: input.userId });
  }

  const startedAt = run.started_at ?? nowIso();
  const approvalPatch =
    input.approved && !run.approved_at
      ? {
          approved_at: nowIso(),
          approved_by: input.userId,
          approval_note: input.approvalNote ?? null,
        }
      : {};

  const { data: runningRun, error: runningError } = await supabase
    .from("software_execution_runs")
    .update({
      ...approvalPatch,
      status: "running",
      started_at: startedAt,
      error_message: null,
    })
    .eq("id", run.id)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (runningError || !runningRun) {
    throw new Error(runningError?.message ?? "Unable to mark software execution run as running.");
  }

  const estimatedMinor = 350;
  const reservation = await reserveOperatingCapacity({
    userId: input.userId,
    workspaceId: run.workspace_id,
    capability: "ai.reasoning",
    provider: "anthropic",
    estimatedMinor,
    idempotencyKey: `software-execution:${run.id}:${run.tool_id}`,
    runId: run.id,
    coworkerId: typeof run.context?.operatorId === "string" ? run.context.operatorId : null,
    metadata: { toolId: run.tool_id, approvedCost: true },
  });
  let execution: SoftwareExecutionResponse;
  try {
    execution = await runSoftwareExecution({
      userId: input.userId,
      workspaceId: run.workspace_id,
      toolId: run.tool_id,
      task: run.task,
      context: run.context ?? {},
      outputSchema: run.output_schema,
      allowedTools: run.allowed_tools,
      approved: true,
    });
    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: execution.status === "not_configured" ? 0 : estimatedMinor,
      status: execution.status === "completed" ? "succeeded" : "failed",
      metadata: { toolId: run.tool_id, usage: execution.result?.usage ?? null, executionStatus: execution.status },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Software execution failed.";
    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: failedProviderCharge({ paidRail: true, estimatedMinor, errorMessage: message }),
      status: "failed",
      metadata: { toolId: run.tool_id, error: message },
    }).catch(() => undefined);
    throw error;
  }

  const finalStatus = mapExecutionStatus(execution.status);
  const { data: finalRun, error: finalError } = await supabase
    .from("software_execution_runs")
    .update({
      status: finalStatus,
      summary: execution.summary,
      execution_result: serializeExecutionResult(execution),
      error_message: execution.error ?? null,
      completed_at: finalStatus === "completed" || finalStatus === "failed" || finalStatus === "not_configured" ? nowIso() : null,
    })
    .eq("id", run.id)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (finalError || !finalRun) {
    throw new Error(finalError?.message ?? "Unable to persist software execution result.");
  }

  await createExecutionArtifact({
    run: finalRun as SoftwareExecutionRunRecord,
    execution,
    intent:
      intent ??
      inferDoblyExecutionIntent({
        prompt: run.task,
        context: run.context ?? {},
        availability: { softwareTools: toolAvailabilityMap() },
      }),
  });

  return getSoftwareExecutionRun({ runId: run.id, userId: input.userId });
}

export async function createSoftwareExecutionRun(
  input: CreateSoftwareExecutionRunInput,
): Promise<SoftwareExecutionRunEnvelope> {
  const tool = getSoftwareExecutionToolStatus(input.toolId);
  if (!tool) {
    throw new Error(`Unknown software execution tool: ${input.toolId}`);
  }

  const inferredIntent =
    input.intent ??
    inferDoblyExecutionIntent({
      prompt: input.task,
      context: input.context ?? {},
      explicit: {
        outputTypeId:
          tool.outputType === "document" ? "document" :
          tool.outputType === "spreadsheet" ? "spreadsheet_report" :
          tool.outputType === "design_file" ? "image_design" :
          tool.outputType === "media_asset" ? "video" :
          tool.outputType === "code_change" ? "code_context_package" :
          undefined,
      },
      availability: { softwareTools: toolAvailabilityMap() },
    });
  const supabase = createAdminSupabaseClient();
  const needsApproval =
    (tool.approvalRequired || inferredIntent.trustLevelId === "approval_required" || inferredIntent.trustLevelId === "human_only") &&
    !input.approved;
  const initialStatus: SoftwareExecutionRunStatus = !tool.configured
    ? "not_configured"
    : needsApproval
      ? "needs_approval"
      : "draft";

  try {
    const insertPayload = {
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      tool_id: tool.id,
      tool_label: tool.label,
      tool_family: tool.family,
      task: input.task,
      status: initialStatus,
      risk_level: tool.riskLevel,
      approval_required: needsApproval || tool.approvalRequired,
      approved_at: input.approved ? nowIso() : null,
      approved_by: input.approved ? input.userId : null,
      approval_note: input.approvalNote ?? null,
      context: attachDoblyIntentMetadata(input.context ?? {}, inferredIntent),
      output_schema: input.outputSchema ?? null,
      allowed_tools: input.allowedTools ?? null,
      department_id: inferredIntent.departmentId,
      work_type_id: inferredIntent.workTypeId,
      output_type_id: inferredIntent.outputTypeId,
      trigger_type_id: inferredIntent.triggerTypeId,
      trust_level_id: inferredIntent.trustLevelId,
      memory_scope_id: inferredIntent.memoryScopeId,
      capability_state: inferredIntent.capabilityState,
      summary: !tool.configured
        ? `${tool.label} is registered but not configured. Set ${tool.serverUrlEnv} before Dobly can execute this software task.`
        : inferredIntent.capabilityState === "planned"
          ? `${tool.label} matches the request, but the runtime path is not live yet. Dobly stored the plan and kept the action assisted.`
          : needsApproval
            ? `${tool.label} is prepared and waiting for owner approval.`
            : null,
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
      throw new Error(error?.message ?? "Unable to create software execution run.");
    }

    const run = data as SoftwareExecutionRunRecord;
    if (initialStatus === "needs_approval") {
      await createRuntimeApproval({
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        runId: run.id,
        title: `Approve ${tool.label}`,
        message:
          inferredIntent.trustLevelId === "human_only"
            ? `${tool.label} matched the request, but this work stays human-controlled. Dobly prepared the path and is waiting for explicit approval before any external action.`
            : `${tool.label} is ready to act on: ${input.task}. Dobly needs approval before touching this external software.`,
        actionLabel: "Approve and run",
        riskLevel: tool.riskLevel,
        metadata: {
          resume: {
            type: "software_execution",
            runId: run.id,
            toolId: tool.id,
          },
          tool,
          doblyIntent: inferredIntent,
        },
      }).catch(() => undefined);
    }

    if (initialStatus === "draft") {
      return executeSoftwareExecutionRun({
        runId: run.id,
        userId: input.userId,
        approved: input.approved,
        approvalNote: input.approvalNote,
      });
    }

    return getSoftwareExecutionRun({ runId: run.id, userId: input.userId });
  } catch (error) {
    throw new Error(explainMissingTable(error));
  }
}

export async function getSoftwareExecutionRun(input: {
  runId: string;
  userId: string;
}): Promise<SoftwareExecutionRunEnvelope> {
  const supabase = createAdminSupabaseClient();
  const { data: run, error: runError } = await supabase
    .from("software_execution_runs")
    .select("*")
    .eq("id", input.runId)
    .eq("user_id", input.userId)
    .single();

  if (runError || !run) {
    throw new Error(runError?.message ?? "Software execution run not found.");
  }

  const { data: artifacts, error: artifactsError } = await supabase
    .from("software_execution_artifacts")
    .select("*")
    .eq("run_id", input.runId)
    .eq("user_id", input.userId)
    .order("version", { ascending: false });

  if (artifactsError) {
    throw new Error(artifactsError.message);
  }

  return {
    run: run as SoftwareExecutionRunRecord,
    artifacts: (artifacts ?? []) as SoftwareExecutionArtifactRecord[],
  };
}

export async function listSoftwareExecutionRuns(input: {
  userId: string;
  workspaceId?: string | null;
  status?: SoftwareExecutionRunStatus | null;
  limit?: number;
}) {
  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("software_execution_runs")
    .select("*")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(100, Number(input.limit ?? 30))));

  if (input.workspaceId) {
    query = query.eq("workspace_id", input.workspaceId);
  }

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(explainMissingTable(error));
  }

  return (data ?? []) as SoftwareExecutionRunRecord[];
}
