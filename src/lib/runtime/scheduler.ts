import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { enqueuePersonalWatcherEvaluation } from "@/lib/runtime/job-queue";
import type { PersonalWatcherRecord } from "@/lib/runtime/personal-watchers";
import { runDoblyOperator } from "@/lib/dobly-operators";
import { ensureOperatorConversation, recordOperatorChatEvent } from "@/lib/operator-chat";
import { enqueueWorkflowRun, processQueue } from "@/lib/queue";
import { validateWorkflowBlueprintForActivation } from "@/lib/workflow-definition";
import { runBillingMaintenance } from "@/lib/billing/maintenance";
import { expireStaleRuntimeApprovals } from "@/lib/runtime/approvals";
import { generateBriefing } from "@/lib/briefings/service";
import type { Workflow } from "@/types";

function cadenceToMs(cadence: string) {
  const normalized = cadence.toLowerCase().trim();
  if (normalized.includes("hour")) return 60 * 60_000;
  if (normalized.includes("daily") || normalized.includes("day")) return 24 * 60 * 60_000;
  if (normalized.includes("week")) return 7 * 24 * 60 * 60_000;
  if (normalized.includes("month")) return 30 * 24 * 60 * 60_000;
  if (normalized.includes("market")) return 60 * 60_000;
  return null;
}

function isWatcherDue(watcher: PersonalWatcherRecord, now = Date.now()) {
  if (watcher.status !== "active") return false;
  const interval = cadenceToMs(watcher.cadence);
  if (!interval) return false;
  if (!watcher.last_checked_at) return true;
  return now - new Date(watcher.last_checked_at).getTime() >= interval;
}

type OperatorLoopRow = {
  id: string;
  operator_id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  cadence: string;
  trigger: string;
  playbook: string;
  status: "active" | "paused" | "archived";
  last_run_at: string | null;
  next_run_at: string | null;
  metadata: Record<string, unknown>;
  dobly_operators?: {
    id: string;
    name: string;
    status: string;
    mission: string;
    approval_mode: string;
  } | null;
};

function isOperatorLoopDue(loop: OperatorLoopRow, now = Date.now()) {
  if (loop.status !== "active") return false;
  if (loop.dobly_operators?.status !== "active") return false;
  if (loop.cadence === "manual" || loop.cadence === "event_based") return false;
  if (loop.next_run_at && new Date(loop.next_run_at).getTime() <= now) return true;
  const interval = cadenceToMs(loop.cadence === "always_on" ? "hourly" : loop.cadence);
  if (!interval) return false;
  if (!loop.last_run_at) return true;
  return now - new Date(loop.last_run_at).getTime() >= interval;
}

function nextLoopRunAt(cadence: string) {
  const interval = cadenceToMs(cadence === "always_on" ? "hourly" : cadence);
  if (!interval) return null;
  return new Date(Date.now() + interval).toISOString();
}

export async function enqueueDuePersonalWatchers(limit = 100) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("personal_watchers")
    .select("*")
    .eq("status", "active")
    .neq("cadence", "manual")
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(Math.max(1, Math.min(500, limit)));

  if (error) throw new Error(error.message);

  const due = ((data ?? []) as PersonalWatcherRecord[]).filter((watcher) => isWatcherDue(watcher));
  const queued: Array<{ watcher_id: string; job_id: string; status: "queued" | "failed"; error?: string }> = [];

  for (const watcher of due) {
    try {
      const job = await enqueuePersonalWatcherEvaluation({
        userId: watcher.user_id,
        watcherId: watcher.id,
      });
      queued.push({ watcher_id: watcher.id, job_id: job.id, status: "queued" });
    } catch (error) {
      queued.push({
        watcher_id: watcher.id,
        job_id: "",
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to enqueue watcher.",
      });
    }
  }

  return {
    scanned: data?.length ?? 0,
    due: due.length,
    queued,
  };
}

export async function enqueueDueOperatorLoops(limit = 100) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dobly_operator_loops")
    .select("*, dobly_operators(id, name, status, mission, approval_mode)")
    .eq("status", "active")
    .not("cadence", "in", "(manual,event_based)")
    .order("next_run_at", { ascending: true, nullsFirst: true })
    .order("last_run_at", { ascending: true, nullsFirst: true })
    .limit(Math.max(1, Math.min(500, limit)));

  if (error) throw new Error(error.message);

  const due = ((data ?? []) as OperatorLoopRow[]).filter((loop) => isOperatorLoopDue(loop));
  const queued: Array<{ loop_id: string; operator_id: string; job_id: string; status: "queued" | "failed"; error?: string }> = [];

  for (const loop of due) {
    try {
      const conversation = await ensureOperatorConversation({
        userId: loop.user_id,
        operatorId: loop.operator_id,
        workspaceId: loop.workspace_id,
        title: `${loop.dobly_operators?.name ?? "Operator"} Chat`,
      });
      await recordOperatorChatEvent({
        conversationId: conversation.id,
        userId: loop.user_id,
        workspaceId: loop.workspace_id,
        operatorId: loop.operator_id,
        eventType: "run_queued",
        title: "Loop queued",
        summary: `${loop.name} was picked up by the scheduler.`,
        payload: { loopId: loop.id, cadence: loop.cadence, trigger: loop.trigger },
      }).catch(() => undefined);

      const result = await runDoblyOperator({
        userId: loop.user_id,
        operatorId: loop.operator_id,
        workspaceId: loop.workspace_id,
        loopId: loop.id,
        conversationId: conversation.id,
        prompt: [
          `Scheduled loop: ${loop.name}`,
          `Trigger: ${loop.trigger}`,
          `Playbook: ${loop.playbook}`,
          "Run safely, create chat-visible events, and ask for approval before risky external action.",
        ].join("\n"),
      });

      await admin
        .from("dobly_operator_loops")
        .update({ next_run_at: nextLoopRunAt(loop.cadence) })
        .eq("id", loop.id)
        .eq("user_id", loop.user_id);

      queued.push({ loop_id: loop.id, operator_id: loop.operator_id, job_id: result.job.id, status: "queued" });
    } catch (error) {
      queued.push({
        loop_id: loop.id,
        operator_id: loop.operator_id,
        job_id: "",
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to enqueue Operator loop.",
      });
    }
  }

  return {
    scanned: data?.length ?? 0,
    due: due.length,
    queued,
  };
}

function parseCronField(field: string, currentValue: number, min: number, max: number) {
  if (field === "*") return true;

  return field.split(",").some((part) => {
    const trimmed = part.trim();
    if (!trimmed) return false;

    if (trimmed.includes("/")) {
      const [base, stepRaw] = trimmed.split("/");
      const step = Number(stepRaw);
      if (!Number.isFinite(step) || step <= 0) return false;

      if (base === "*") {
        return (currentValue - min) % step === 0;
      }

      if (base.includes("-")) {
        const [startRaw, endRaw] = base.split("-");
        const start = Number(startRaw);
        const end = Number(endRaw);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
        return currentValue >= start && currentValue <= end && (currentValue - start) % step === 0;
      }

      const baseValue = Number(base);
      return Number.isFinite(baseValue) && currentValue >= baseValue && (currentValue - baseValue) % step === 0;
    }

    if (trimmed.includes("-")) {
      const [startRaw, endRaw] = trimmed.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);
      return Number.isFinite(start) && Number.isFinite(end) && currentValue >= start && currentValue <= end;
    }

    const exact = Number(trimmed);
    return Number.isFinite(exact) && exact >= min && exact <= max && currentValue === exact;
  });
}

function isWorkflowScheduleDue(schedule: string | undefined, lastRunAt: string | null) {
  if (!schedule) return false;

  const now = new Date();
  const lastRun = lastRunAt ? new Date(lastRunAt) : null;
  const parts = schedule.trim().split(/\s+/);
  if (parts.length < 5) return false;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const minuteMatch = parseCronField(minute, now.getUTCMinutes(), 0, 59);
  const hourMatch = parseCronField(hour, now.getUTCHours(), 0, 23);
  const dayMatch = parseCronField(dayOfMonth, now.getUTCDate(), 1, 31);
  const monthMatch = parseCronField(month, now.getUTCMonth() + 1, 1, 12);
  const weekdayMatch = parseCronField(dayOfWeek, now.getUTCDay(), 0, 6);

  if (!minuteMatch || !hourMatch || !dayMatch || !monthMatch || !weekdayMatch) return false;
  if (!lastRun) return true;

  const sameSlot =
    lastRun.getUTCFullYear() === now.getUTCFullYear() &&
    lastRun.getUTCMonth() === now.getUTCMonth() &&
    lastRun.getUTCDate() === now.getUTCDate() &&
    lastRun.getUTCHours() === now.getUTCHours() &&
    lastRun.getUTCMinutes() === now.getUTCMinutes();

  return !sameSlot;
}

/**
 * One full scheduler pass: due scheduled workflows, the runtime job queue,
 * operator loops, personal watchers, and billing maintenance. This is the
 * logic /api/internal/scheduler already had, extracted so the Vercel Cron
 * route (/api/cron/process-queue) can run the exact same pass instead of
 * needing its own scheduler wired up separately - Vercel Hobby only allows
 * one daily cron job, so this is the one heartbeat everything rides on.
 * Operator loops in particular were fully built (auto-created per hired
 * coworker, correct cadence math) and had never once fired in production
 * because nothing called either scheduler route.
 */
export async function runFullSchedulerPass(options?: { generateBriefings?: boolean }) {
  const admin = createAdminSupabaseClient();

  const { data: workflows, error } = await admin
    .from("workflows")
    .select("*")
    .eq("status", "active")
    .eq("trigger_type", "schedule");
  if (error) throw new Error(`Failed to load scheduled workflows: ${error.message}`);

  const dueWorkflows = (workflows ?? []).filter((workflow: any) => {
    if (!isWorkflowScheduleDue(workflow.blueprint?.definition?.trigger?.schedule, workflow.last_run_at ?? null)) {
      return false;
    }
    const validation = validateWorkflowBlueprintForActivation(workflow.blueprint, workflow.prompt);
    return validation.issues.length === 0;
  });

  const workflowResults: Array<
    | { workflow_id: string; status: "queued"; job_id: string }
    | { workflow_id: string; status: "failed"; error: string }
  > = [];

  for (const workflow of dueWorkflows) {
    try {
      const now = new Date();
      now.setUTCSeconds(0, 0);
      const job = await enqueueWorkflowRun({
        workflow: workflow as Workflow,
        triggerPayload: { scheduled_at: now.toISOString() },
        priority: 75,
      });
      workflowResults.push({ workflow_id: workflow.id, status: "queued", job_id: job.id });
    } catch (jobError) {
      workflowResults.push({
        workflow_id: workflow.id,
        status: "failed",
        error: jobError instanceof Error ? jobError.message : "Execution failed",
      });
    }
  }

  const processed = await processQueue(
    Math.max(1, dueWorkflows.length),
    "dobly-scheduler-pass",
    workflowResults
      .filter((result): result is { workflow_id: string; status: "queued"; job_id: string } => "job_id" in result)
      .map((result) => result.job_id),
  );

  const watcherResults = await enqueueDuePersonalWatchers(
    Number(process.env.DOBLY_SCHEDULER_WATCHER_LIMIT ?? 100),
  ).catch((watcherError) => ({
    scanned: 0,
    due: 0,
    queued: [{ status: "failed" as const, error: watcherError instanceof Error ? watcherError.message : "Watcher scheduling failed." }],
  }));

  const operatorLoopResults = await enqueueDueOperatorLoops(
    Number(process.env.DOBLY_SCHEDULER_OPERATOR_LOOP_LIMIT ?? 100),
  ).catch((loopError) => ({
    scanned: 0,
    due: 0,
    queued: [{ status: "failed" as const, error: loopError instanceof Error ? loopError.message : "Operator loop scheduling failed." }],
  }));

  const billingMaintenance = await runBillingMaintenance().catch((billingError) => ({
    error: billingError instanceof Error ? billingError.message : "Billing maintenance failed.",
  }));

  let briefingResults: Array<{ user_id: string; status: "generated" | "failed"; briefing_id?: string; error?: string }> | undefined;
  if (options?.generateBriefings) {
    briefingResults = [];
    const { data: profiles } = await admin
      .from("profiles")
      .select("id")
      .limit(Number(process.env.DOBLY_SCHEDULER_BRIEFING_LIMIT ?? 100));

    for (const profile of profiles ?? []) {
      try {
        const briefing = await generateBriefing({ userId: String(profile.id), briefingType: "morning" });
        briefingResults.push({ user_id: String(profile.id), status: "generated", briefing_id: briefing.id });
      } catch (briefingError) {
        briefingResults.push({
          user_id: String(profile.id),
          status: "failed",
          error: briefingError instanceof Error ? briefingError.message : "Briefing failed",
        });
      }
    }
  }

  const expiredApprovals = await expireStaleRuntimeApprovals().catch(() => 0);

  return {
    scannedWorkflows: workflows?.length ?? 0,
    dueWorkflows: dueWorkflows.length,
    workflowResults,
    processed,
    operatorLoops: operatorLoopResults,
    watchers: watcherResults,
    billing: billingMaintenance,
    briefings: briefingResults,
    expiredApprovals,
  };
}
