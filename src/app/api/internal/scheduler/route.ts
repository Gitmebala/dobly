import { NextRequest, NextResponse } from "next/server";
import { runFullSchedulerPass } from "@/lib/runtime/scheduler";
import { rateLimits } from "@/lib/rate-limit";
import { secureSecretMatches } from "@/lib/security/secrets";

/**
 * External-trigger variant of the same scheduler pass the Vercel Cron route
 * (/api/cron/process-queue) runs daily. Kept separate so anything with its
 * own trigger (a GitHub Action, an external monitor hitting more often than
 * once a day) can drive the pass on a tighter cadence using this route's own
 * secret, without needing Vercel Cron access.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-dobly-scheduler");
  if (!secureSecretMatches(process.env.SCHEDULER_SECRET, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.agent(secret ?? "scheduler");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many scheduler requests." }, { status: 429 });
  }

  const generateBriefings =
    req.nextUrl.searchParams.get("briefings") === "true" ||
    process.env.DOBLY_SCHEDULER_GENERATE_BRIEFINGS === "true";

  const summary = await runFullSchedulerPass({ generateBriefings });
  return NextResponse.json(summary);
}
