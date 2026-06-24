import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateCoworkerHealth, getHealthSnapshots, getLatestHealthSnapshot } from "@/lib/health/service";

// GET /api/coworkers/[id]/health - Get health data for a coworker
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const calculate = searchParams.get("calculate") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    if (calculate) {
      // Calculate new health snapshot
      const now = new Date();
      const periodEnd = now.toISOString();
      const periodStart = new Date(now.setDate(now.getDate() - 7)).toISOString();

      const result = await calculateCoworkerHealth({
        coworkerId: params.id,
        userId: user.id,
        periodStart,
        periodEnd,
      });

      return NextResponse.json(result);
    }

    // Get existing health snapshots
    const snapshots = await getHealthSnapshots(params.id, user.id, { limit });
    const latest = await getLatestHealthSnapshot(params.id, user.id);

    return NextResponse.json({ snapshots, latest });
  } catch (error) {
    console.error("Error fetching coworker health:", error);
    return NextResponse.json(
      { error: "Failed to fetch coworker health" },
      { status: 500 }
    );
  }
}
