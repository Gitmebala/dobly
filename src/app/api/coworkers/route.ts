import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { captureServerEvent } from "@/lib/telemetry/server";
import {
  createCoworker,
  getCoworkers,
  updateCoworker,
  deleteCoworker,
  packageCoworker,
  deployCoworker,
} from "@/lib/coworkers/service";
import type { CoworkerRole, CoworkerDesk, CoworkerTone, CoworkerAutonomyLevel, CoworkerDeploymentState, CoworkerStatus } from "@/types";

// GET /api/coworkers - Get all coworkers for the authenticated user
export async function GET(req: NextRequest) {
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
    const role = searchParams.get("role") as CoworkerRole | null;
    const desk = searchParams.get("desk") as CoworkerDesk | null;
    const status = searchParams.get("status") as CoworkerStatus | null;
    const deploymentState = searchParams.get("deploymentState") as CoworkerDeploymentState | null;

    const coworkers = await getCoworkers(user.id, {
      role: role || undefined,
      desk: desk || undefined,
      status: status || undefined,
      deploymentState: deploymentState || undefined,
    });

    return NextResponse.json({ coworkers });
  } catch (error) {
    console.error("Error fetching coworkers:", error);
    return NextResponse.json(
      { error: "Failed to fetch coworkers" },
      { status: 500 }
    );
  }
}

// POST /api/coworkers - Create a new coworker
export async function POST(req: NextRequest) {
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
    const {
      businessProfileId,
      role,
      name,
      mission,
      description,
      desk,
      tone,
      autonomyLevel,
      tools,
      targetOutcomes,
    } = body;

    if (!role || !name || !mission || !desk) {
      return NextResponse.json(
        { error: "Missing required fields: role, name, mission, desk" },
        { status: 400 }
      );
    }

    const coworker = await createCoworker({
      userId: user.id,
      businessProfileId,
      role,
      name,
      mission,
      description,
      desk,
      tone,
      autonomyLevel,
      tools,
      targetOutcomes,
    });

    await captureServerEvent({
      event: "coworker_created",
      distinctId: user.id,
      properties: {
        role,
        desk,
        autonomy_level: autonomyLevel,
        tools_count: Array.isArray(tools) ? tools.length : 0,
        target_outcomes_count: Array.isArray(targetOutcomes) ? targetOutcomes.length : 0,
      },
    }).catch(() => null);

    return NextResponse.json({ coworker }, { status: 201 });
  } catch (error) {
    console.error("Error creating coworker:", error);
    return NextResponse.json(
      { error: "Failed to create coworker" },
      { status: 500 }
    );
  }
}
