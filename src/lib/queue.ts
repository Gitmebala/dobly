import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Connection, QueueJob, Workflow, WorkflowTrigger } from "@/types";
import { executeWorkflow } from "@/lib/execution";
import { describeProviderReadinessIssue, findOperationalConnection } from "@/lib/connection-readiness";
import { getRequiredProviderIdsForWorkflow } from "@/lib/connection-requirements";
import { validateWorkflowBlueprintForActivation } from "@/lib/workflow-definition";

const DEFAULT_WORKER_ID = "dobly-app-worker";

function nextRetryAt(attempts: number) {
  const delayMs = Math.min(60_000, Math.max(5_000, 2 ** attempts * 1000));
  return new Date(Date.now() + delayMs).toISOString();
}

export async function enqueueWorkflowRun(params: {
  workflow: Workflow;
  triggerPayload: Record<string, unknown>;
  trigger?: WorkflowTrigger;
  priority?: number;
}) {
  const admin = createAdminSupabaseClient();
  const trigger = params.trigger ?? params.workflow.blueprint.definition?.trigger;

  const { data, error } = await admin
    .from("job_queue")
    .insert({
      type: "workflow.run",
      workflow_id: params.workflow.id,
      user_id: params.workflow.user_id,
      payload: {
        triggerPayload: params.triggerPayload,
        trigger,
      },
      priority: params.priority ?? 100,
    })
    .select("*")
    .single();

  if (error || !data) {
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
}

export async function processQueue(limit = 10, workerId = DEFAULT_WORKER_ID, jobIds?: string[]) {
  const admin = createAdminSupabaseClient();
  const jobs = await claimQueueJobs(limit, workerId, jobIds);
  const results: Array<{ jobId: string; status: string; error?: string }> = [];

  for (const job of jobs) {
    try {
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
        };

        await executeWorkflow(
          workflow as Workflow,
          payload.triggerPayload ?? {},
          payload.trigger
        );
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

        await executeWorkflow(
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
      }

      await completeJob(job.id);
      results.push({ jobId: job.id, status: "completed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job execution failed.";
      await failJob(job, message);
      results.push({ jobId: job.id, status: "failed", error: message });
    }
  }

  return results;
}
