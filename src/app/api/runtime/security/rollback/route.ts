import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requestRollback } from "@/lib/runtime/security-governance";

const schema = z.object({ rollbackId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid rollback request." }, { status: 400 });
  const rollback = await requestRollback({ userId: user.id, rollbackId: parsed.data.rollbackId });
  return NextResponse.json({ rollback });
}
