import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Liveness + dependency check for uptime monitors and deploy gates.
export async function GET() {
  const startedAt = Date.now();
  let database = "ok";
  try {
    const admin = createAdminSupabaseClient();
    const { error } = await admin.from("profiles").select("id").limit(1);
    if (error) database = "error";
  } catch {
    database = "unreachable";
  }

  const healthy = database === "ok";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
