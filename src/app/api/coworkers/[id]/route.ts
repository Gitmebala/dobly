import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getCoworker,
  updateCoworker,
  deleteCoworker,
  packageCoworker,
  deployCoworker,
} from "@/lib/coworkers/service";
import type { CoworkerAutonomyLevel, CoworkerDeploymentState, CoworkerStatus } from "@/types";

// GET /api/coworkers/[id] - Get a specific coworker
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

    const coworker = await getCoworker(params.id, user.id);

    if (!coworker) {
      return NextResponse.json({ error: "Coworker not found" }, { status: 404 });
    }

    return NextResponse.json({ coworker });
  } catch (error) {
    console.error("Error fetching coworker:", error);
    return NextResponse.json(
      { error: "Failed to fetch coworker" },
      { status: 500 }
    );
  }
}

// PUT /api/coworkers/[id] - Update a coworker
export async function PUT(
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
    const {
      name,
      mission,
      description,
      desk,
      tone,
      autonomyLevel,
      deploymentState,
      status,
      tools,
      targetOutcomes,
      standards,
      permissions,
      approval_boundaries,
      escalation_rules,
    } = body;

    const coworker = await updateCoworker({
      coworkerId: params.id,
      userId: user.id,
      updates: {
        name,
        mission,
        description,
        desk,
        tone,
        autonomyLevel,
        deploymentState,
        status,
        tools,
        targetOutcomes,
        standards,
        permissions,
        approval_boundaries,
        escalation_rules,
      },
    });

    return NextResponse.json({ coworker });
  } catch (error) {
    console.error("Error updating coworker:", error);
    return NextResponse.json(
      { error: "Failed to update coworker" },
      { status: 500 }
    );
  }
}

// DELETE /api/coworkers/[id] - Delete a coworker
export async function DELETE(
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

    await deleteCoworker(params.id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting coworker:", error);
    return NextResponse.json(
      { error: "Failed to delete coworker" },
      { status: 500 }
    );
  }
}
