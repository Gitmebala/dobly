import { NextRequest, NextResponse } from "next/server";
import { getDoblyInternalServices } from "@/lib/internal-services";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-dobly-internal");
  if (!process.env.WORKER_SECRET || secret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    services: getDoblyInternalServices(),
  });
}
