import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildOperatorBrainTrace } from "@/lib/operator-brain";

const schema = z.object({
  prompt: z.string().trim().min(5).max(6000),
  workspaceId: z.string().uuid().nullable().optional(),
  persist: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid Brain request." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const brain = await buildOperatorBrainTrace({
      userId: user.id,
      operatorId: id,
      prompt: parsed.data.prompt,
      workspaceId: parsed.data.workspaceId ?? null,
      persist: parsed.data.persist ?? false,
    });
    return NextResponse.json({ brain });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operator Brain failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
