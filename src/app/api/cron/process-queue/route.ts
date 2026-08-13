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
 * jobs defined in vercel.json. The GitHub Actions heartbeat
 * (.github/workflows/scheduler-heartbeat.yml) sends the same header shape
 * with DOBLY_CRON_SECRET, which must equal this deployment's CRON_SECRET.
 *
 * Real root cause of every 401 this route ever returned to that heartbeat:
 * NOT a secret mismatch (confirmed matching via fingerprint comparison) -
 * this route was never listed in middleware.ts's publicApiPrefixes, so the
 * global middleware tried to validate the CRON_SECRET bearer token as a
 * Supabase session JWT (which it will never be) and 401'd every request
 * before it ever reached this handler. Fixed by adding "/api/cron" to that
 * list - this route's own secret check below is the real auth for it.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET?.trim();
  // Trimmed on both sides: a trailing newline is the single most common way
  // a copy-pasted secret silently differs between two dashboards.
  const presentedSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
  if (!expectedSecret || !presentedSecret || presentedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runFullSchedulerPass({ generateBriefings: true });
  return NextResponse.json(summary);
}
