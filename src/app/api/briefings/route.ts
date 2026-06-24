import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  generateBriefing,
  getBriefings,
  getLatestBriefing,
  markBriefingAsRead,
} from "@/lib/briefings/service";
import type { BriefingType } from "@/types";

// GET /api/briefings - Get briefings for the authenticated user
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
    const briefingType = searchParams.get("briefingType") as BriefingType | null;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const generate = searchParams.get("generate") === "true";

    if (generate) {
      // Generate a new briefing
      const type = (briefingType || "morning") as BriefingType;
      const briefing = await generateBriefing({
        userId: user.id,
        briefingType: type,
      });
      return NextResponse.json({ briefing });
    }

    const briefings = await getBriefings(user.id, {
      briefingType: briefingType || undefined,
      unreadOnly,
      limit,
    });

    return NextResponse.json({ briefings });
  } catch (error) {
    console.error("Error fetching briefings:", error);
    return NextResponse.json(
      { error: "Failed to fetch briefings" },
      { status: 500 }
    );
  }
}

// POST /api/briefings - Generate a new briefing
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
    const { briefingType } = body;

    const briefing = await generateBriefing({
      userId: user.id,
      briefingType: briefingType || "morning",
    });

    return NextResponse.json({ briefing }, { status: 201 });
  } catch (error) {
    console.error("Error generating briefing:", error);
    return NextResponse.json(
      { error: "Failed to generate briefing" },
      { status: 500 }
    );
  }
}
