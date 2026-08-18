import { NextRequest, NextResponse } from "next/server";
import { processQueue } from "@/lib/queue";
import { rateLimits } from "@/lib/rate-limit";
import { secureSecretMatches } from "@/lib/security/secrets";

// No maxDuration was ever set here (confirmed by grep - zero API routes in
// the whole app configure one), so this ran on Vercel's unconfigured
// default. That was fine while every queued job was an LLM call or a fast
// API request, but the new native.browser.operate executor (real headless
// Chromium, multiple sequenced actions) genuinely needs more room - its own
// internal budget is ~40s. Setting this explicitly rather than relying on
// a platform default that could differ by plan tier.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Worker service is not configured." }, { status: 503 });
  }

  const secret = req.headers.get("x-dobly-worker");
  if (!secureSecretMatches(process.env.WORKER_SECRET, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.agent(secret ?? "worker");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many worker requests." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const payload = body && typeof body === "object" ? body : {};
  const limit =
    typeof payload.limit === "number" ? Math.max(1, Math.min(50, payload.limit)) : 10;
  const workerId =
    typeof payload.workerId === "string" && payload.workerId.trim()
      ? payload.workerId.trim().slice(0, 120)
      : "dobly-http-worker";

  const summary = await processQueue(limit, workerId);
  return NextResponse.json({
    processed: summary.results.length,
    claimed: summary.claimed,
    recovered: summary.recovered,
    results: summary.results,
    health: summary.health,
  });
}
