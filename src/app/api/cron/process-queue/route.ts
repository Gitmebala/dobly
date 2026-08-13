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
  const expectedSecret = process.env.CRON_SECRET?.trim();
  // Trimmed on both sides deliberately: a trailing newline is the single
  // most common way a copy-pasted secret silently differs between two
  // dashboards (e.g. `openssl rand -hex 32 > file` leaves one, then the
  // GitHub Actions secret embeds it literally into the Authorization
  // header via string interpolation) - confirmed live 401s even after the
  // founder re-set both values to what looked like the same string.
  const presentedSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
  if (!expectedSecret || !presentedSecret || presentedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runFullSchedulerPass({ generateBriefings: true });
  return NextResponse.json(summary);
}
