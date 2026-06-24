import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { runSimulation, getSimulations, runScenarioSuite } from "@/lib/simulations/service";
import type { ScenarioType } from "@/types";

// POST /api/coworkers/[id]/simulate - Run a simulation for a coworker
export async function POST(
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

    const body = await req.json();
    const { scenarioInput, scenarioType, runSuite } = body;

    if (runSuite) {
      // Run predefined scenario suite
      const { results, summary } = await runScenarioSuite(params.id, user.id);
      return NextResponse.json({ results, summary });
    }

    if (!scenarioInput) {
      return NextResponse.json(
        { error: "Missing required field: scenarioInput" },
        { status: 400 }
      );
    }

    const simulation = await runSimulation({
      coworkerId: params.id,
      scenarioInput,
      scenarioType: scenarioType as ScenarioType,
      userId: user.id,
    });

    return NextResponse.json({ simulation });
  } catch (error) {
    console.error("Error running simulation:", error);
    return NextResponse.json(
      { error: "Failed to run simulation" },
      { status: 500 }
    );
  }
}

// GET /api/coworkers/[id]/simulate - Get simulations for a coworker
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
    const scenarioType = searchParams.get("scenarioType") as ScenarioType | null;
    const outcome = searchParams.get("outcome");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    const simulations = await getSimulations(params.id, user.id, {
      scenarioType: scenarioType || undefined,
      outcome: outcome as any,
      limit,
    });

    return NextResponse.json({ simulations });
  } catch (error) {
    console.error("Error fetching simulations:", error);
    return NextResponse.json(
      { error: "Failed to fetch simulations" },
      { status: 500 }
    );
  }
}
