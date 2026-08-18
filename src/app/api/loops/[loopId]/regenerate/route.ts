import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { regenerateLoopWebhookToken } from "@/lib/loop-triggers";
import { rateLimits } from "@/lib/rate-limit";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ loopId: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimits.write(user.id);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  try {
    const { loopId } = await params;
    const { loop, webhookUrl } = await regenerateLoopWebhookToken({ userId: user.id, loopId });
    // Old URL stops working the moment this returns - same guarantee as
    // rotating an API key. Intentional: this is the "I pasted it somewhere
    // I shouldn't have" recovery path.
    return NextResponse.json({ loop, webhookUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not regenerate this trigger." },
      { status: 500 },
    );
  }
}
