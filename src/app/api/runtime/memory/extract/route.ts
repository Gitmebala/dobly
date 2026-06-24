import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { proposeMemoryUpdates } from "@/lib/runtime/memory-intelligence";

const schema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  sourceRunId: z.string().uuid().nullable().optional(),
  text: z.string().trim().min(20).max(30000),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid memory extraction request." }, { status: 400 });
  const proposals = await proposeMemoryUpdates({ userId: user.id, ...parsed.data });
  return NextResponse.json({ proposals }, { status: 201 });
}
