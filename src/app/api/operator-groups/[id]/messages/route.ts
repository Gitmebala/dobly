import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { postGroupMessage } from "@/lib/operator-groups";
import { rateLimits } from "@/lib/rate-limit";

const messageSchema = z.object({
  body: z.string().trim().min(1, "Say something to the group.").max(4000),
});

// Posting a message runs one real Anthropic call per active member
// operator (sequentially, so each can react to the others - see
// operator-groups.ts) before responding, so this request is genuinely
// slower than a normal write - that's expected, not a bug, for a group of
// the intended size (2-8 members).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimits.write(user.id);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  const parsed = messageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid message." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const result = await postGroupMessage({ userId: user.id, groupId: id, body: parsed.data.body });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send this message." },
      { status: 500 },
    );
  }
}
