import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { evaluatePersonalWatcher } from "@/lib/runtime/personal-watchers";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await evaluatePersonalWatcher({
      userId: user.id,
      watcherId: params.id,
    });
    return NextResponse.json(result, { status: result.run.status === "completed" ? 200 : result.run.status === "not_configured" ? 424 : 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to evaluate personal watcher.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
