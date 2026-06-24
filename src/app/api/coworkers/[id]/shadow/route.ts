import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { processShadowEvent, getShadowRuns, updateShadowRun } from "@/lib/shadow-mode/service";

// POST /api/coworkers/[id]/shadow - Process an event in shadow mode
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
    const { eventType, eventData } = body;

    if (!eventType || !eventData) {
      return NextResponse.json(
        { error: "Missing required fields: eventType, eventData" },
        { status: 400 }
      );
    }

    const result = await processShadowEvent({
      coworkerId: params.id,
      eventType,
      eventData,
      userId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing shadow event:", error);
    return NextResponse.json(
      { error: "Failed to process shadow event" },
      { status: 500 }
    );
  }
}

// GET /api/coworkers/[id]/shadow - Get shadow runs for a coworker
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
    const ownerApproved = searchParams.get("ownerApproved") === "true" ? true : searchParams.get("ownerApproved") === "false" ? false : undefined;
    const wasCorrect = searchParams.get("wasCorrect") === "true" ? true : searchParams.get("wasCorrect") === "false" ? false : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    const shadowRuns = await getShadowRuns(params.id, user.id, {
      ownerApproved,
      wasCorrect,
      limit,
    });

    return NextResponse.json({ shadowRuns });
  } catch (error) {
    console.error("Error fetching shadow runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch shadow runs" },
      { status: 500 }
    );
  }
}

// PUT /api/coworkers/[id]/shadow/[shadowRunId] - Update a shadow run with owner feedback
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; shadowRunId: string } }
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
    const { ownerAction, ownerApproved, ownerFeedback, wasCorrect } = body;

    const shadowRun = await updateShadowRun({
      shadowRunId: params.shadowRunId,
      userId: user.id,
      updates: {
        ownerAction,
        ownerApproved,
        ownerFeedback,
        wasCorrect,
      },
    });

    return NextResponse.json({ shadowRun });
  } catch (error) {
    console.error("Error updating shadow run:", error);
    return NextResponse.json(
      { error: "Failed to update shadow run" },
      { status: 500 }
    );
  }
}
