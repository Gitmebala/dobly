import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSoftwareExecutionRun } from "@/lib/software-execution-runs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const envelope = await getSoftwareExecutionRun({
      runId: params.id,
      userId: user.id,
    });

    return NextResponse.json(envelope);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Software execution run not found.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
