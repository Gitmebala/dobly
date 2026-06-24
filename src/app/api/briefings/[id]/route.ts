import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { markBriefingAsRead } from "@/lib/briefings/service";

// PUT /api/briefings/[id] - Mark a briefing as read
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

    const briefing = await markBriefingAsRead(params.id, user.id);

    return NextResponse.json({ briefing });
  } catch (error) {
    console.error("Error marking briefing as read:", error);
    return NextResponse.json(
      { error: "Failed to mark briefing as read" },
      { status: 500 }
    );
  }
}
