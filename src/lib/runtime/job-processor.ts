import "server-only";
import type { DoblyExecutionIntent } from "@/lib/dobly-inference";
import { generateOutcomeContractForJob } from "@/lib/outcome-contracts";
import { executeRuntimeCommandPlan } from "@/lib/runtime/multi-step-command";
import { evaluatePersonalWatcher } from "@/lib/runtime/personal-watchers";
import { executeSoftwareExecutionRun } from "@/lib/software-execution-runs";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { recordOperatorOutcome } from "@/lib/operator-brain";
import { appendOperatorChatMessage, recordOperatorChatEvent } from "@/lib/operator-chat";
import { proposeMemoryUpdates } from "@/lib/runtime/memory-intelligence";
import { executeCustomApiAction } from "@/lib/runtime/custom-api";
import type { QueueJob } from "@/types";
import { decryptSecret } from "@/lib/crypto";

export function isRuntimeQueueJob(job: QueueJob) {
  return ["runtime.command", "runtime.approval_resume", "personal_watcher.evaluate", "outcome_contract.generate"].includes(job.type);
}

export async function processRuntimeQueueJob(job: QueueJob, workerId: string) {
  if (!job.user_id) throw new Error("Runtime job is missing user_id.");
  const payload = (job.payload ?? {}) as Record<string, unknown>;

  if (job.type === "runtime.command") {
    const context = typeof payload.context === "object" && payload.context ? (payload.context as Record<string, unknown>) : {};
    const operatorId = typeof context.operatorId === "string" ? context.operatorId : null;
    const conversationId = typeof context.conversationId === "string" ? context.conversationId : null;
    const sourceMessageId = typeof context.sourceMessageId === "string" ? context.sourceMessageId : null;
    const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId : null;
    const intent =
      typeof payload.intent === "object" && payload.intent
        ? (payload.intent as DoblyExecutionIntent)
        : null;
    const result = await executeRuntimeCommandPlan({
      userId: job.user_id,
      workspaceId,
      prompt: String(payload.prompt ?? ""),
      context,
      approved: Boolean(payload.approved),
      intent,
      workerId,
      onEvent: async (event) => {
        if (!operatorId || !conversationId) return;
        await recordOperatorChatEvent({
          conversationId,
          messageId: sourceMessageId,
          userId: job.user_id!,
          workspaceId,
          operatorId,
          runId: event.runId ?? null,
          eventType: event.eventType,
          title: event.title,
          summary: event.summary,
          severity: event.severity,
          payload: event.payload ?? {},
        }).catch(() => undefined);

        if (["approval_requested", "artifact_created", "run_completed", "run_failed"].includes(event.eventType)) {
          await appendOperatorChatMessage({
            conversationId,
            userId: job.user_id!,
            workspaceId,
            operatorId,
            role: event.eventType === "approval_requested" ? "approval" : event.eventType === "artifact_created" ? "artifact" : "run",
            intent: event.eventType === "approval_requested" ? "approval" : event.eventType === "artifact_created" ? "artifact" : "run_update",
            body: event.summary ? `${event.title}: ${event.summary}` : event.title,
            runId: event.runId ?? null,
            approvalId: event.approvalId ?? null,
            artifactId: event.artifactId ?? null,
            metadata: {
              source: "runtime_worker",
              eventType: event.eventType,
              payload: event.payload ?? {},
            },
          }).catch(() => undefined);
        }
      },
    });
    if (operatorId) {
      await recordOperatorOutcome({
        userId: job.user_id,
        workspaceId,
        operatorId,
        runId: result.run.id,
        brainTraceId: typeof context.operatorBrainTraceId === "string" ? context.operatorBrainTraceId : null,
        status: result.stepResults.some((item) => item.status === "needs_approval")
          ? "needs_approval"
          : result.run.status === "completed"
            ? "succeeded"
            : result.run.status === "failed"
              ? "failed"
              : "partial",
        summary: result.run.summary ?? "Operator runtime command completed.",
        signals: {
          stepCount: result.stepResults.length,
          runStatus: result.run.status,
          selfCheck: context.operatorSelfCheck ?? null,
          autonomy: context.operatorAutonomyDecision ?? null,
        },
        score: typeof (context.operatorSelfCheck as Record<string, unknown> | undefined)?.score === "number"
          ? (context.operatorSelfCheck as { score: number }).score
          : undefined,
      }).catch(() => undefined);
      const memoryReasoning = context.operatorMemoryReasoning as Record<string, unknown> | undefined;
      const shouldProposeMemory = Boolean(memoryReasoning?.shouldProposeMemory);
      const resultSummary = result.run.summary ?? "";
      if (shouldProposeMemory && resultSummary.length > 30) {
        await proposeMemoryUpdates({
          userId: job.user_id,
          workspaceId: typeof payload.workspaceId === "string" ? payload.workspaceId : null,
        sourceRunId: result.run.id,
          text: `${String(context.operatorName ?? "Operator")} learned from this run: ${resultSummary}`,
        }).catch(() => undefined);
      }
    }
    return { runId: result.run.id };
  }

  if (job.type === "personal_watcher.evaluate") {
    const watcherId = String(payload.watcherId ?? "");
    if (!watcherId) throw new Error("Watcher evaluation job is missing watcherId.");
    const result = await evaluatePersonalWatcher({ userId: job.user_id, watcherId });
    return { runId: result.run.id };
  }

  if (job.type === "outcome_contract.generate") {
    await generateOutcomeContractForJob({
      ...payload,
      userId: job.user_id,
    });
    return { runId: job.run_id ?? null };
  }

  if (job.type === "runtime.approval_resume") {
    const approvalId = String(payload.approvalId ?? "");
    if (!approvalId) throw new Error("Runtime approval resume job is missing approvalId.");

    const admin = createAdminSupabaseClient();
    const { data: approval, error } = await admin
      .from("runtime_approvals")
      .select("*")
      .eq("id", approvalId)
      .eq("user_id", job.user_id)
      .single();

    if (error || !approval) throw new Error(error?.message ?? "Runtime approval not found.");
    if (approval.status !== "approved") throw new Error("Runtime approval is not approved.");

    const metadata = (approval.metadata ?? {}) as Record<string, unknown>;
    const resume = (metadata.resume ?? {}) as Record<string, unknown>;
    if (resume.type === "software_execution" && approval.run_id) {
      const result = await executeSoftwareExecutionRun({
        runId: String(approval.run_id),
        userId: job.user_id,
        approved: true,
        approvalNote: String(approval.decision_note ?? ""),
      });
      return { runId: result.run.id };
    }

    if (resume.type === "runtime_command") {
      const result = await executeRuntimeCommandPlan({
        userId: job.user_id,
        workspaceId: typeof approval.workspace_id === "string" ? approval.workspace_id : null,
        prompt: String(resume.prompt ?? ""),
        context: typeof resume.context === "object" && resume.context ? (resume.context as Record<string, unknown>) : {},
        approved: true,
        intent: typeof resume.intent === "object" && resume.intent ? (resume.intent as DoblyExecutionIntent) : null,
        workerId,
      });
      return { runId: result.run.id };
    }

    if (resume.type === "custom_api_action") {
      let resumedInput: Record<string, unknown> = {};
      if (typeof resume.inputEncrypted === "string") {
        const decrypted = decryptSecret(resume.inputEncrypted);
        if (decrypted) resumedInput = JSON.parse(decrypted) as Record<string, unknown>;
      } else if (typeof resume.input === "object" && resume.input) {
        resumedInput = resume.input as Record<string, unknown>;
      }
      const result = await executeCustomApiAction({
        userId: job.user_id,
        workspaceId: typeof approval.workspace_id === "string" ? approval.workspace_id : null,
        actionId: String(resume.actionId ?? ""),
        prompt: String(resume.prompt ?? ""),
        input: resumedInput,
        approved: true,
      });
      return { runId: result.run.id };
    }

    throw new Error("Runtime approval has no supported resume target.");
  }

  throw new Error(`Unsupported runtime job type: ${job.type}`);
}
