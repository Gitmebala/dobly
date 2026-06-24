import { NextRequest, NextResponse } from "next/server";
import { processQueuedOfficeTasks } from "@/lib/office/runtime";
import { rateLimits } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { secureSecretMatches } from "@/lib/security/secrets";

function authorizeWorkerRequest(req: NextRequest) {
  if (!process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Worker service is not configured." }, { status: 503 });
  }

  const secret = req.headers.get("x-dobly-worker");
  if (!secureSecretMatches(process.env.WORKER_SECRET, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function POST(req: NextRequest) {
  const unauthorized = authorizeWorkerRequest(req);
  if (unauthorized) return unauthorized;

  const secret = req.headers.get("x-dobly-worker");
  const rl = rateLimits.agent(`office-${secret ?? "worker"}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many office worker requests." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const payload = body && typeof body === "object" ? body : {};
  const limit = typeof (payload as any).limit === "number" ? Math.max(1, Math.min(50, Math.floor((payload as any).limit))) : 10;
  const workerId =
    typeof (payload as any).workerId === "string" && (payload as any).workerId.trim()
      ? (payload as any).workerId.trim().slice(0, 120)
      : "dobly-office-http-worker";
  const userId =
    typeof (payload as any).userId === "string" && (payload as any).userId.trim()
      ? (payload as any).userId.trim()
      : null;

  const result = await processQueuedOfficeTasks({ limit, workerId, userId });
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  const unauthorized = authorizeWorkerRequest(req);
  if (unauthorized) return unauthorized;

  const admin = createAdminSupabaseClient();
  const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  const [{ count: queued }, { count: running }, { count: failed }, { count: stale }] = await Promise.all([
    admin.from("office_tasks").select("id", { count: "exact", head: true }).eq("status", "queued"),
    admin.from("office_tasks").select("id", { count: "exact", head: true }).eq("status", "running"),
    admin.from("office_tasks").select("id", { count: "exact", head: true }).eq("status", "failed"),
    admin.from("office_tasks").select("id", { count: "exact", head: true }).eq("status", "running").lt("locked_at", cutoff),
  ]);

  return NextResponse.json({
    worker: "dobly-office-worker",
    now: new Date().toISOString(),
    queue: {
      queued: queued ?? 0,
      running: running ?? 0,
      failed: failed ?? 0,
      staleRunning: stale ?? 0,
    },
  });
}
