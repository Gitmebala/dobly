import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { QueueJob } from "@/types";

type JsonRecord = Record<string, unknown>;

async function enqueueRuntimeJob(input: {
  type: "runtime.command" | "runtime.approval_resume" | "personal_watcher.evaluate" | "outcome_contract.generate";
  userId: string;
  runId?: string | null;
  payload: JsonRecord;
  priority?: number;
  availableAt?: string;
  maxAttempts?: number;
  idempotencyKey?: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("job_queue")
    .insert({
      type: input.type,
      workflow_id: null,
      run_id: input.runId ?? null,
      user_id: input.userId,
      payload: input.payload,
      priority: input.priority ?? 60,
      available_at: input.availableAt ?? new Date().toISOString(),
      max_attempts: input.maxAttempts ?? 3,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    if ((error as any)?.code === "23505" && input.idempotencyKey) {
      const { data: existing } = await admin.from("job_queue").select("*").eq("idempotency_key", input.idempotencyKey).in("status", ["pending", "processing"]).maybeSingle();
      if (existing) return existing as QueueJob;
    }
    throw new Error(error?.message ?? `Failed to enqueue ${input.type}.`);
  }

  return data as QueueJob;
}

export function enqueueRuntimeCommand(input: {
  userId: string;
  workspaceId?: string | null;
  prompt: string;
  context?: JsonRecord;
  approved?: boolean;
  intent?: JsonRecord | null;
  priority?: number;
}) {
  return enqueueRuntimeJob({
    type: "runtime.command",
    userId: input.userId,
    priority: input.priority ?? 55,
    payload: {
      workspaceId: input.workspaceId ?? null,
      prompt: input.prompt,
      context: input.context ?? {},
      approved: Boolean(input.approved),
      intent: input.intent ?? null,
    },
  });
}

export function enqueueRuntimeApprovalResume(input: {
  approvalId: string;
  userId: string;
  runId?: string | null;
  priority?: number;
}) {
  return enqueueRuntimeJob({
    type: "runtime.approval_resume",
    userId: input.userId,
    runId: input.runId ?? null,
    priority: input.priority ?? 35,
    payload: {
      approvalId: input.approvalId,
    },
    idempotencyKey: `approval:${input.approvalId}`,
  });
}

export function enqueuePersonalWatcherEvaluation(input: {
  userId: string;
  watcherId: string;
  runAt?: string;
  priority?: number;
}) {
  return enqueueRuntimeJob({
    type: "personal_watcher.evaluate",
    userId: input.userId,
    priority: input.priority ?? 70,
    availableAt: input.runAt,
    payload: {
      watcherId: input.watcherId,
    },
    idempotencyKey: `watcher:${input.watcherId}:${input.runAt ?? "due"}`,
  });
}

export function enqueueOutcomeContractGeneration(input: {
  userId: string;
  workspaceId?: string | null;
  entityType: "operator" | "coworker" | "runtime_command";
  entityId?: string | null;
  prompt?: string | null;
  mission?: string | null;
  outcome?: string | null;
  name?: string | null;
  targetOutcomes?: string[];
  capabilityTags?: string[];
  tools?: string[];
  guardrails?: JsonRecord;
  approvalMode?: string | null;
  standards?: JsonRecord;
  forceRegenerate?: boolean;
  minimumScore?: number;
  priority?: number;
}) {
  return enqueueRuntimeJob({
    type: "outcome_contract.generate",
    userId: input.userId,
    priority: input.priority ?? 30,
    payload: {
      workspaceId: input.workspaceId ?? null,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      prompt: input.prompt ?? null,
      mission: input.mission ?? null,
      outcome: input.outcome ?? null,
      name: input.name ?? null,
      targetOutcomes: input.targetOutcomes ?? [],
      capabilityTags: input.capabilityTags ?? [],
      tools: input.tools ?? [],
      guardrails: input.guardrails ?? {},
      approvalMode: input.approvalMode ?? null,
      standards: input.standards ?? {},
      forceRegenerate: Boolean(input.forceRegenerate),
      minimumScore: input.minimumScore ?? null,
    },
    idempotencyKey: input.forceRegenerate ? undefined : `outcome:${input.entityType}:${input.entityId ?? input.userId}`,
  });
}
