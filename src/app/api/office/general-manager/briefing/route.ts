import { NextRequest, NextResponse } from "next/server";
import { createGeneralManagerBriefing } from "@/lib/office/intelligence";
import { isOfficeSchemaMissingError } from "@/lib/office/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  let briefing;
  try {
    briefing = await createGeneralManagerBriefing({
      userId: user.id,
      workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : null,
    });
  } catch (error) {
    if (!isOfficeSchemaMissingError(error)) throw error;
    return NextResponse.json(
      {
        error: "Homebase office schema is not installed.",
        setupSql: "supabase/dobly_operating_system_schema.sql",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ briefing });
}
