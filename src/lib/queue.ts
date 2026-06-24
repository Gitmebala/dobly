import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Connection, QueueJob, Workflow, WorkflowTrigger } from "@/types";
import { executeWorkflow } from "@/lib/execution";
import { describeProviderReadinessIssue, findOperationalConnection } from "@/lib/connection-readiness";
import { getRequiredProviderIdsForWorkflow } from "@/lib/connection-requirements";
import { logWorkflowRunEvent } from "@/lib/run-events";
import { validateWorkflowBlueprintForActivation } from "@/lib/workflow-definition";
import { isRuntimeQueueJob, processRuntimeQueueJob } from "@/lib/runtime/job-processor";
import { isEmergencyStopActive } from "@/lib/feature-flags";

const DEFAULT_WORKER_ID = "dobly-app-worker";
const DEFAULT_QUEUE_LOCK_TTL_MS = 15 * 60_000;
const MAX_QUEUE_RECOVERY_BATCH = 100;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;

  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    .join(",")}}`;
}

function buildQueueDedupeKey(params: {
  workflowId: string;
  triggerType: string | undefined;
  triggerPayload: Record<string, unknown>;
  dryRun: boolean;
}) {
  return `${params.workflowId}:${params.triggerType ?? "manual"}:${params.dryRun ? "dry" : "live"}:${stableStringify(
    params.triggerPayload,
  )}`;
}

export interface QueueHealthSnapshot {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  overduePending: number;
  staleProcessing: number;
  lockTtlSeconds: number;
  capturedAt: string;
}

export interface ProcessQueueJobResult {
  jobId: string;
  type: string;
  workflowId: string | null;
  runId?: string | null;
  attempts: number;
  status: "completed" | "failed";
  error?: string;
}

export interface ProcessQueueSummary {
  claimed: number;
  recovered: number;
  results: ProcessQueueJobResult[];
  health: QueueHealthSnapshot;
}

function nextRetryAt(attempts: number) {
  const delayMs = Math.min(60_000, Math.max(5_000, 2 ** attempts * 1000));
  return new Date(Date.now() + delayMs).toISOString();
}

function getQueueLockTtlMs() {
  const configured = Number(process.env.QUEUE_LOCK_TTL_SECONDS ?? NaN);
  if (Number.isFinite(configured)) {
    return Math.max(60, Math.min(86_400, Math.floor(configured))) * 1000;
  }
  return DEFAULT_QUEUE_LOCK_TTL_MS;
}

function getStaleLockThresholdIso() {
  return new Date(Date.now() - getQueueLockTtlMs()).toISOString();
}

async function attachRunIdToJob(jobId: string, runId: string | null | undefined) {
  if (!runId) return;
  const admin = createAdminSupabaseClient();
  await admin
    .from("job_queue")
    .update({ run_id: runId })
    .eq("id", jobId);
}

async function logQueueEvent(job: QueueJob, eventType: string, eventData: Record<string, unknown>) {
  if (!job.workflow_id || !job.run_id || !job.user_id) return;

  await logWorkflowRunEvent({
    workflowId: job.workflow_id,
    runId: job.run_id,
    userId: job.user_id,
    eventType,
    eventData,
  }).catch(() => undefined);
}

export async function recoverStaleQueueJobs() {
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const staleBefore = getStaleLockThresholdIso();
  const { data, error } = await admin
    .from("job_queue")
    .select("*")
    .eq("status", "processing")
    .not("locked_at", "is", null)
    .lte("locked_at", staleBefore)
    .order("locked_at", { ascending: true })
    .limit(MAX_QUEUE_RECOVERY_BATCH);

  if (error || !data) {
    throw new Error("Failed to inspect stale queued jobs.");
  }

  let recovered = 0;
  for (const job of data as QueueJob[]) {
    const { data: unlocked } = await admin
      .from("job_queue")
      .update({
        status: "pending",
        available_at: now,
        locked_by: null,
        locked_at: null,
        last_error: `Recovered stale processing lock at ${now}.`,
      })
      .eq("id", job.id)
      .eq("status", "processing")
      .select("id")
      .single();

    if (unlocked) {
      recovered += 1;
      await logQueueEvent(job, "queue.recovered", {
        recoveredAt: now,
        previousWorkerId: job.locked_by,
      });
    }
  }

  return recovered;
}

export async function getQueueHealthSnapshot(): Promise<QueueHealthSnapshot> {
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const staleBefore = getStaleLockThresholdIso();
  const lockTtlSeconds = Math.floor(getQueueLockTtlMs() / 1000);
  const statusQueries = ["pending", "processing", "completed", "failed", "dead_letter"].map((status) =>
    admin.from("job_queue").select("id", { head: true, count: "exact" }).eq("status", status)
  );

  const [
    pendingResult,
    processingResult,
    completedResult,
    failedResult,
    deadLetterResult,
    overduePendingResult,
    staleProcessingResult,
  ] = await Promise.all([
    ...statusQueries,
    admin.from("job_queue").select("id", { head: true, count: "exact" }).eq("status", "pending").lte("available_at", now),
    admin.from("job_queue").select("id", { head: true, count: "exact" }).eq("status", "processing").not("locked_at", "is", null).lte("locked_at", staleBefore),
  ]);

  return {
    pending: pendingResult.count ?? 0,
    processing: processingResult.count ?? 0,
    completed: completedResult.count ?? 0,
    failed: failedResult.count ?? 0,
    deadLetter: deadLetterResult.count ?? 0,
    overduePending: overduePendingResult.count ?? 0,
    staleProcessing: staleProcessingResult.count ?? 0,
    lockTtlSeconds,
    capturedAt: now,
  };
}

export async function enqueueWorkflowRun(params: {
  workflow: Workflow;
  triggerPayload: Record<string, unknown>;
  trigger?: WorkflowTrigger;
  priority?: number;
  dryRun?: boolean;
}) {
  const admin = createAdminSupabaseClient();
  const trigger = params.trigger ?? params.workflow.blueprint.definition?.trigger;
  const dedupeKey = buildQueueDedupeKey({
    workflowId: params.workflow.id,
    triggerType: trigger?.type,
    triggerPayload: params.triggerPayload,
    dryRun: Boolean(params.dryRun),
  });

  const { data: existingJob } = await admin
    .from("job_queue")
    .select("*")
    .eq("idempotency_key", dedupeKey)
    .in("status", ["pending", "processing"])
    .contains("payload", { dedupeKey })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingJob) {
    return existingJob as QueueJob;
  }

  const { data, error } = await admin
    .from("job_queue")
    .insert({
      type: "workflow.run",
      workflow_id: params.workflow.id,
      user_id: params.workflow.user_id,
      payload: {
        triggerPayload: params.triggerPayload,
        trigger,
        dryRun: Boolean(params.dryRun),
        dedupeKey,
      },
      idempotency_key: dedupeKey,
      priority: params.priority ?? 100,
    })
    .select("*")
    .single();

  if (error || !data) {
    if ((error as any)?.code === "23505") {
      const { data: racedJob } = await admin.from("job_queue").select("*").eq("idempotency_key", dedupeKey).in("status", ["pending", "processing"]).maybeSingle();
      if (racedJob) return racedJob as QueueJob;
    }
    throw new Error("Failed to enqueue workflow run.");
  }

  return data as QueueJob;
}

export async function enqueueApprovalResume(params: {
  approvalId: string;
  workflowId: string;
  userId: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("job_queue")
    .insert({
      type: "approval.resume",
      workflow_id: params.workflowId,
      user_id: params.userId,
      payload: {
        approvalId: params.approvalId,
      },
      priority: 40,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to enqueue approval resume.");
  }

  return data as QueueJob;
}

export async function claimQueueJobs(
  limit = 10,
  workerId = DEFAULT_WORKER_ID,
  jobIds?: string[]
) {
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  let query = admin
    .from("job_queue")
    .select("*")
    .eq("status", "pending")
    .lte("available_at", now)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(safeLimit);

  if (jobIds?.length) {
    query = query.in("id", jobIds);
  }

  const { data, error } = await query;

  if (error || !data) {
    throw new Error("Failed to load queued jobs.");
  }

  const claimed: QueueJob[] = [];
  for (const job of data as QueueJob[]) {
    const { data: locked } = await admin
      .from("job_queue")
      .update({
        status: "processing",
        locked_by: workerId,
        locked_at: now,
        attempts: (job.attempts ?? 0) + 1,
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("*")
      .single();

    if (locked) {
      claimed.push(locked as QueueJob);
    }
  }

  return claimed;
}

async function completeJob(jobId: string) {
  const admin = createAdminSupabaseClient();
  await admin
    .from("job_queue")
    .update({
      status: "completed",
      locked_by: null,
      locked_at: null,
      last_error: null,
    })
    .eq("id", jobId);
}

async function failJob(job: QueueJob, message: string) {
  const admin = createAdminSupabaseClient();
  const terminal = job.attempts >= job.max_attempts;

  await admin
    .from("job_queue")
    .update({
      status: terminal ? "dead_letter" : "pending",
      available_at: terminal ? new Date().toISOString() : nextRetryAt(job.attempts),
      locked_by: null,
      locked_at: null,
      last_error: message,
    })
    .eq("id", job.id);

  await logQueueEvent(job, terminal ? "queue.dead_lettered" : "queue.retry_scheduled", {
    attempts: job.attempts,
    maxAttempts: job.max_attempts,
    nextAvailableAt: terminal ? new Date().toISOString() : nextRetryAt(job.attempts),
    error: message,
  });
}

export async function processQueue(limit = 10, workerId = DEFAULT_WORKER_ID, jobIds?: string[]) {
  if (isEmergencyStopActive("execution")) {
    return {
      claimed: 0,
      recovered: 0,
      results: [],
      health: await getQueueHealthSnapshot(),
    } satisfies ProcessQueueSummary;
  }
  const admin = createAdminSupabaseClient();
  const recovered = await recoverStaleQueueJobs().catch(() => 0);
  const jobs = await claimQueueJobs(limit, workerId, jobIds);
  const results: ProcessQueueJobResult[] = [];

  for (const job of jobs) {
    try {
      if (isRuntimeQueueJob(job)) {
        const runtimeResult = await processRuntimeQueueJob(job, workerId);
        job.run_id = runtimeResult.runId ?? job.run_id;
        await attachRunIdToJob(job.id, job.run_id);
        await completeJob(job.id);
        results.push({
          jobId: job.id,
          type: job.type,
          workflowId: job.workflow_id,
          runId: job.run_id,
          attempts: job.attempts,
          status: "completed",
        });
        continue;
      }

      if (!job.workflow_id) {
        throw new Error(`Unsupported job type: ${job.type}`);
      }

      if (job.type !== "workflow.run" && job.type !== "approval.resume") {
        throw new Error(`Unsupported job type: ${job.type}`);
      }

      const { data: workflow, error } = await admin
        .from("workflows")
        .select("*")
        .eq("id", job.workflow_id)
        .single();

      if (error || !workflow) {
        throw new Error("Workflow not found for queued job.");
      }

      if ((workflow as Workflow).status !== "active") {
        throw new Error("Workflow is no longer active, so the queued run was skipped.");
      }

      const validation = validateWorkflowBlueprintForActivation(
        (workflow as Workflow).blueprint,
        (workflow as Workflow).prompt
      );
      if (validation.issues.length > 0) {
        throw new Error(validation.issues[0] ?? "Workflow is not valid anymore.");
      }

      const requiredProviders = getRequiredProviderIdsForWorkflow(
        validation.normalized,
        (workflow as Workflow).prompt
      );

      if (requiredProviders.length > 0) {
        const { data: activeConnections, error: connectionsError } = await admin
          .from("connections")
          .select("*")
          .eq("user_id", (workflow as Workflow).user_id)
          .in("status", ["pending", "active", "expired", "error"]);

        if (connectionsError) {
          throw new Error("Failed to verify connection health before running the queue.");
        }

        const connections = (activeConnections ?? []) as Connection[];
        const missingProviders = requiredProviders.filter(
          (provider) => !findOperationalConnection(connections, provider)
        );

        if (missingProviders.length > 0) {
          const details = missingProviders
            .map((provider) =>
              `${provider}: ${describeProviderReadinessIssue(connections, provider)}`
            )
            .join(" ");
          throw new Error(
            `Workflow is missing deploy-ready connections: ${missingProviders.join(", ")}. ${details}`
          );
        }
      }

      if (job.type === "workflow.run") {
        const payload = (job.payload ?? {}) as {
          triggerPayload?: Record<string, unknown>;
          trigger?: WorkflowTrigger;
          dryRun?: boolean;
        };

        const execution = await executeWorkflow(
          workflow as Workflow,
          payload.triggerPayload ?? {},
          payload.trigger,
          {
            dryRun: Boolean(payload.dryRun),
          }
        );
        job.run_id = execution.run.id;
        await attachRunIdToJob(job.id, execution.run.id);
      } else {
        const payload = (job.payload ?? {}) as { approvalId?: string };
        if (!payload.approvalId) {
          throw new Error("Approval resume job is missing its approval reference.");
        }

        const { data: approval, error: approvalError } = await admin
          .from("approvals")
          .select("*")
          .eq("id", payload.approvalId)
          .single();

        if (approvalError || !approval) {
          throw new Error("Approval not found for resume job.");
        }

        if (approval.status !== "approved") {
          throw new Error("Approval is not approved, so this operator cannot resume.");
        }

        const resume = (approval.metadata?.resume ?? {}) as {
          runId?: string;
          stepIndex?: number;
          triggerPayload?: Record<string, unknown>;
          trigger?: WorkflowTrigger;
          stepOutputs?: Record<string, Record<string, unknown>>;
        };

        const execution = await executeWorkflow(
          workflow as Workflow,
          resume.triggerPayload ?? {},
          resume.trigger,
          {
            runId: resume.runId,
            startStepIndex: resume.stepIndex,
            stepOutputs: resume.stepOutputs,
            resumedFromApprovalId: approval.id,
          }
        );
        job.run_id = execution.run.id;
        await attachRunIdToJob(job.id, execution.run.id);
      }

      await completeJob(job.id);
      await logQueueEvent(job, "queue.completed", {
        attempts: job.attempts,
        workerId,
      });
      results.push({
        jobId: job.id,
        type: job.type,
        workflowId: job.workflow_id,
        runId: job.run_id,
        attempts: job.attempts,
        status: "completed",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job execution failed.";
      await failJob(job, message);
      results.push({
        jobId: job.id,
        type: job.type,
        workflowId: job.workflow_id,
        runId: job.run_id,
        attempts: job.attempts,
        status: "failed",
        error: message,
      });
    }
  }

  return {
    claimed: jobs.length,
    recovered,
    results,
    health: await getQueueHealthSnapshot(),
  } satisfies ProcessQueueSummary;
}
