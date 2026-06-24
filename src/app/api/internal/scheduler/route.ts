import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { enqueueWorkflowRun, processQueue } from "@/lib/queue";
import { rateLimits } from "@/lib/rate-limit";
import { validateWorkflowBlueprintForActivation } from "@/lib/workflow-definition";
import { generateBriefing } from "@/lib/briefings/service";
import { enqueueDueOperatorLoops, enqueueDuePersonalWatchers } from "@/lib/runtime/scheduler";
import type { Workflow } from "@/types";
import { runBillingMaintenance } from "@/lib/billing/maintenance";
import { secureSecretMatches } from "@/lib/security/secrets";

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

function isDue(schedule: string | undefined, lastRunAt: string | null) {
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

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-dobly-scheduler");
  if (!secureSecretMatches(process.env.SCHEDULER_SECRET, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.agent(secret ?? "scheduler");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many scheduler requests." }, { status: 429 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: workflows, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("status", "active")
    .eq("trigger_type", "schedule");

  if (error) {
    return NextResponse.json({ error: "Failed to load scheduled workflows" }, { status: 500 });
  }

  const due = (workflows ?? []).filter((workflow: any) => {
    if (!isDue(workflow.blueprint?.definition?.trigger?.schedule, workflow.last_run_at ?? null)) {
      return false;
    }

    const validation = validateWorkflowBlueprintForActivation(workflow.blueprint, workflow.prompt);
    return validation.issues.length === 0;
  });

  const results: Array<
    | { workflow_id: string; status: "queued"; job_id: string }
    | { workflow_id: string; status: "failed"; error: string }
  > = [];

  for (const workflow of due) {
    try {
      const now = new Date();
      now.setUTCSeconds(0, 0);
      const job = await enqueueWorkflowRun({
        workflow: workflow as Workflow,
        triggerPayload: {
        scheduled_at: now.toISOString(),
        },
        priority: 75,
      });
      results.push({ workflow_id: workflow.id, status: "queued", job_id: job.id });
    } catch (error) {
      results.push({
        workflow_id: workflow.id,
        status: "failed",
        error: error instanceof Error ? error.message : "Execution failed",
      });
    }
  }

  const processed = await processQueue(
    Math.max(1, due.length),
    "dobly-scheduler-runner",
    results
      .filter((result): result is { workflow_id: string; status: "queued"; job_id: string } => "job_id" in result)
      .map((result) => result.job_id)
  );

  const shouldGenerateBriefings =
    req.nextUrl.searchParams.get("briefings") === "true" ||
    process.env.DOBLY_SCHEDULER_GENERATE_BRIEFINGS === "true";
  const briefingResults: Array<{ user_id: string; status: "generated" | "failed"; briefing_id?: string; error?: string }> = [];

  if (shouldGenerateBriefings) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .limit(Number(process.env.DOBLY_SCHEDULER_BRIEFING_LIMIT ?? 100));

    for (const profile of profiles ?? []) {
      try {
        const briefing = await generateBriefing({
          userId: String(profile.id),
          briefingType: "morning",
        });
        briefingResults.push({ user_id: String(profile.id), status: "generated", briefing_id: briefing.id });
      } catch (error) {
        briefingResults.push({
          user_id: String(profile.id),
          status: "failed",
          error: error instanceof Error ? error.message : "Briefing failed",
        });
      }
    }
  }

  const watcherResults = req.nextUrl.searchParams.get("watchers") === "false"
    ? { scanned: 0, due: 0, queued: [] as Array<unknown> }
    : await enqueueDuePersonalWatchers(
        Number(process.env.DOBLY_SCHEDULER_WATCHER_LIMIT ?? 100)
      ).catch((error) => ({
        scanned: 0,
        due: 0,
        queued: [{ status: "failed", error: error instanceof Error ? error.message : "Watcher scheduling failed." }],
      }));

  const operatorLoopResults = req.nextUrl.searchParams.get("operatorLoops") === "false"
    ? { scanned: 0, due: 0, queued: [] as Array<unknown> }
    : await enqueueDueOperatorLoops(
        Number(process.env.DOBLY_SCHEDULER_OPERATOR_LOOP_LIMIT ?? 100)
      ).catch((error) => ({
        scanned: 0,
        due: 0,
        queued: [{ status: "failed", error: error instanceof Error ? error.message : "Operator loop scheduling failed." }],
      }));

  const billingMaintenance = req.nextUrl.searchParams.get("billing") === "false"
    ? null
    : await runBillingMaintenance().catch((error) => ({
        error: error instanceof Error ? error.message : "Billing maintenance failed.",
      }));

  return NextResponse.json({
    scanned: workflows?.length ?? 0,
    due: due.length,
    results,
    processed,
    operatorLoops: operatorLoopResults,
    watchers: watcherResults,
    briefings: shouldGenerateBriefings ? briefingResults : undefined,
    billing: billingMaintenance,
  });
}
