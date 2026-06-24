import { NextRequest, NextResponse } from "next/server";
import { getDoblyInternalServices } from "@/lib/internal-services";
import { getQueueHealthSnapshot } from "@/lib/queue";
import { telemetryReadiness } from "@/lib/telemetry/server";
import { secureSecretMatches } from "@/lib/security/secrets";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-dobly-internal");
  if (!secureSecretMatches(process.env.WORKER_SECRET, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    services: getDoblyInternalServices(),
    queue: await getQueueHealthSnapshot().catch(() => null),
    telemetry: telemetryReadiness(),
  });
}
