import { NextRequest, NextResponse } from "next/server";
import { processQueue } from "@/lib/queue";
import { rateLimits } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Worker service is not configured." }, { status: 503 });
  }

  const secret = req.headers.get("x-dobly-worker");
  if (secret !== process.env.WORKER_SECRET) {
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

  const results = await processQueue(limit, workerId);
  return NextResponse.json({
    processed: results.length,
    results,
  });
}
