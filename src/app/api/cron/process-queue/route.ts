import { NextRequest, NextResponse } from "next/server";
import { runFullSchedulerPass } from "@/lib/runtime/scheduler";

/**
 * The one daily heartbeat this deployment has (Vercel Hobby allows a single
 * daily cron job). Originally this route only drained the job queue -
 * enqueueRuntimeJob's after() hook covers near-instant execution for new
 * enqueues, but nothing was picking up scheduled workflows, operator loops,
 * or personal watchers, which by definition run without a fresh user
 * request to hang an after() off of. Operator loops in particular are fully
 * built and auto-created per hired coworker (see runFullSchedulerPass) but
 * had never once fired in production because nothing called either
 * scheduler route (this one, or /api/internal/scheduler) on a schedule.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically for
 * jobs defined in vercel.json.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runFullSchedulerPass({ generateBriefings: true });
  return NextResponse.json(summary);
}
