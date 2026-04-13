import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { enqueueWorkflowRun, processQueue } from "@/lib/queue";
import { rateLimits } from "@/lib/rate-limit";
import { validateWorkflowBlueprintForActivation } from "@/lib/workflow-definition";
import type { Workflow } from "@/types";

function isDue(schedule: string | undefined, lastRunAt: string | null) {
  if (!schedule) return false;

  const now = new Date();
  const lastRun = lastRunAt ? new Date(lastRunAt) : null;

  // Minimal cron support for common daily / hourly schedules:
  // "0 * * * *" => hourly at minute 0
  // "0 8 * * *" => daily at 08:00
  const [minute, hour] = schedule.split(" ");
  if (!minute || !hour) return false;

  if (minute !== String(now.getUTCMinutes()) && minute !== String(now.getMinutes())) {
    return false;
  }

  if (hour !== "*" && hour !== String(now.getUTCHours()) && hour !== String(now.getHours())) {
    return false;
  }

  if (!lastRun) return true;

  const sameHour =
    lastRun.getUTCFullYear() === now.getUTCFullYear() &&
    lastRun.getUTCMonth() === now.getUTCMonth() &&
    lastRun.getUTCDate() === now.getUTCDate() &&
    lastRun.getUTCHours() === now.getUTCHours();

  if (hour === "*") {
    return !sameHour;
  }

  const sameDay =
    lastRun.getUTCFullYear() === now.getUTCFullYear() &&
    lastRun.getUTCMonth() === now.getUTCMonth() &&
    lastRun.getUTCDate() === now.getUTCDate();

  return !sameDay;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-dobly-scheduler");
  if (!process.env.SCHEDULER_SECRET || secret !== process.env.SCHEDULER_SECRET) {
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

  const results = [];

  for (const workflow of due) {
    try {
      const job = await enqueueWorkflowRun({
        workflow: workflow as Workflow,
        triggerPayload: {
        scheduled_at: new Date().toISOString(),
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
    results.map((result) => String(result.job_id ?? "")).filter(Boolean)
  );

  return NextResponse.json({
    scanned: workflows?.length ?? 0,
    due: due.length,
    results,
    processed,
  });
}
