import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  completeDurableRuntimeRun,
  createDurableArtifact,
  createDurableRuntimeRun,
} from "@/lib/runtime/durable-runtime";
import { runResearchRuntime } from "@/lib/runtime/research";
import type { SoftwareExecutionRunStatus } from "@/lib/software-execution-runs";

type JsonRecord = Record<string, unknown>;

export type PersonalWatcherCategory =
  | "markets"
  | "travel"
  | "health"
  | "calendar"
  | "subscriptions"
  | "bills"
  | "news"
  | "custom";

export interface PersonalWatcherRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  category: PersonalWatcherCategory;
  strategy: string;
  cadence: string;
  data_sources: string[];
  trigger_rules: JsonRecord;
  notification_channels: string[];
  status: "active" | "paused" | "archived";
  last_run_id: string | null;
  last_checked_at: string | null;
  last_signal: JsonRecord | null;
  created_at: string;
  updated_at: string;
}

export async function createPersonalWatcher(input: {
  userId: string;
  workspaceId?: string | null;
  name: string;
  category: PersonalWatcherCategory;
  strategy: string;
  cadence?: string;
  dataSources?: string[];
  triggerRules?: JsonRecord;
  notificationChannels?: string[];
}) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("personal_watchers")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      name: input.name,
      category: input.category,
      strategy: input.strategy,
      cadence: input.cadence ?? "manual",
      data_sources: input.dataSources ?? [],
      trigger_rules: input.triggerRules ?? {},
      notification_channels: input.notificationChannels ?? [],
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create personal watcher.");
  }

  return data as PersonalWatcherRecord;
}

export async function listPersonalWatchers(input: {
  userId: string;
  workspaceId?: string | null;
  status?: PersonalWatcherRecord["status"] | null;
}) {
  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("personal_watchers")
    .select("*")
    .eq("user_id", input.userId)
    .order("updated_at", { ascending: false });

  if (input.workspaceId) query = query.eq("workspace_id", input.workspaceId);
  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as PersonalWatcherRecord[];
}

function watcherResearchPrompt(watcher: PersonalWatcherRecord) {
  return [
    `Watcher: ${watcher.name}`,
    `Category: ${watcher.category}`,
    `Strategy: ${watcher.strategy}`,
    `Trigger rules: ${JSON.stringify(watcher.trigger_rules)}`,
    "Check current public information and decide whether there is a meaningful signal.",
    "Return a concise recommendation, evidence, and whether Dobly should notify the user.",
  ].join("\n");
}

function toTerminalStatus(status: SoftwareExecutionRunStatus): "completed" | "failed" | "not_configured" {
  if (status === "completed" || status === "not_configured") return status;
  return "failed";
}

export async function evaluatePersonalWatcher(input: {
  userId: string;
  watcherId: string;
}) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("personal_watchers")
    .select("*")
    .eq("id", input.watcherId)
    .eq("user_id", input.userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Personal watcher not found.");
  }

  const watcher = data as PersonalWatcherRecord;
  const run = await createDurableRuntimeRun({
    userId: input.userId,
    workspaceId: watcher.workspace_id,
    toolId: "personal_watcher_runtime",
    toolLabel: "Personal Watcher Runtime",
    toolFamily: "personal",
    task: watcherResearchPrompt(watcher),
    riskLevel: "medium",
    context: {
      watcherId: watcher.id,
      category: watcher.category,
      dataSources: watcher.data_sources,
    },
  });

  try {
    const research = await runResearchRuntime({
      userId: input.userId,
      workspaceId: watcher.workspace_id,
      query: watcherResearchPrompt(watcher),
      mode: "answer",
      context: { watcher },
    });

    const signal = {
      watcherId: watcher.id,
      watcherName: watcher.name,
      checkedAt: new Date().toISOString(),
      recommendation: research.result?.answer ?? research.error ?? "Watcher checked.",
      shouldNotify: Boolean(research.result?.answer && String(research.result.answer).length > 0),
      researchRunId: research.run.id,
    };

    const artifact = await createDurableArtifact({
      runId: run.id,
      userId: input.userId,
      workspaceId: watcher.workspace_id,
      kind: "json",
      title: `${watcher.name} watcher signal`,
      content: signal,
      metadata: { watcherId: watcher.id, category: watcher.category },
    });

    await supabase
      .from("personal_watchers")
      .update({
        last_run_id: run.id,
        last_checked_at: signal.checkedAt,
        last_signal: signal,
      })
      .eq("id", watcher.id)
      .eq("user_id", input.userId);

    const completed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: toTerminalStatus(research.run.status),
      summary: signal.recommendation.slice(0, 500),
      result: signal,
      errorMessage: research.error ?? null,
    });

    return { run: completed, artifacts: [artifact], watcher: { ...watcher, last_signal: signal }, signal };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Personal watcher evaluation failed.";
    const failed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: message.includes("not configured") ? "not_configured" : "failed",
      summary: message,
      errorMessage: message,
    });
    return { run: failed, artifacts: [], watcher, error: message };
  }
}
