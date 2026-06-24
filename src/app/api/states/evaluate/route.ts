import { NextRequest, NextResponse } from "next/server";
import { evaluateOperatingState, evaluateWorkspaceStates } from "@/lib/state-engine";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    if (body?.state_id) {
      const result = await evaluateOperatingState({
        userId: user.id,
        stateId: String(body.state_id),
      });
      return NextResponse.json(result);
    }

    const results = await evaluateWorkspaceStates({
      userId: user.id,
      workspaceId: body?.workspace_id ?? null,
    });
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to evaluate states" },
      { status: 500 },
    );
  }
}
