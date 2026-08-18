import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { replayBrowserSkill } from "@/lib/learned-skills";
import { rateLimits } from "@/lib/rate-limit";

// Real replay - actually re-runs the captured browser action sequence via
// the same executor a live coworker uses, not a simulation. This shares
// the same 25s internal budget as a live browser action (see
// connectors/native/browser.ts) and the same maxDuration=60 concern -
// invoked directly from a request here rather than through the queue, so
// this route needs its own maxDuration for the same reason.
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimits.write(user.id);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  try {
    const { id } = await params;
    const result = await replayBrowserSkill({ userId: user.id, skillId: id });
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not replay this skill." }, { status: 500 });
  }
}
