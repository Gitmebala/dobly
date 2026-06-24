import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { enqueuePersonalWatcherEvaluation } from "@/lib/runtime/job-queue";
import type { PersonalWatcherRecord } from "@/lib/runtime/personal-watchers";
import { runDoblyOperator } from "@/lib/dobly-operators";
import { ensureOperatorConversation, recordOperatorChatEvent } from "@/lib/operator-chat";

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
