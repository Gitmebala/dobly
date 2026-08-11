import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listOperatorChat, sendOperatorChatMessage } from "@/lib/operator-chat";

const messageSchema = z.object({
  prompt: z.string().trim().min(2).max(8000),
  workspaceId: z.string().uuid().nullable().optional(),
  approved: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const chat = await listOperatorChat({ userId: user.id, operatorId: id });
    return NextResponse.json(chat);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load Operator chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = messageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid message." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const result = await sendOperatorChatMessage({
      userId: user.id,
      operatorId: id,
      prompt: parsed.data.prompt,
      workspaceId: parsed.data.workspaceId ?? null,
      // Deliberately NOT `?? false` — that forced every normal chat message
      // into "unapproved" regardless of what the risk brain actually
      // decided (false ?? X is always false, not X), so a coworker in
      // approve_risky mode still needed a manual approval for routine,
      // non-risky replies. Passing the real optional value through lets
      // sendOperatorChatMessage's own `input.approved ?? brain-decision`
      // fallback do its job.
      approved: parsed.data.approved,
    });
    return NextResponse.json({ queued: true, ...result }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send Operator message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
