import { NextRequest, NextResponse } from "next/server";
import { processQueue } from "@/lib/queue";

/**
 * Durable backstop for the job queue. enqueueRuntimeJob (src/lib/runtime/
 * job-queue.ts) triggers an immediate processing attempt via after() when a
 * job is created, but that only fires on new enqueues - a retry scheduled
 * for later, or any period with no new activity, would never get picked up
 * without something calling this on a schedule. There was previously no
 * scheduler at all: no vercel.json, and the provisioned Trigger.dev
 * credentials are unused anywhere in this codebase, so every queued job
 * planned correctly and then sat forever.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically for
 * jobs defined in vercel.json.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await processQueue(10, "vercel-cron");
  return NextResponse.json({
    processed: summary.results.length,
    claimed: summary.claimed,
    recovered: summary.recovered,
  });
}
