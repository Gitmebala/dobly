import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createResearchDossier } from "@/lib/runtime/research-dossier";

const schema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  query: z.string().trim().min(5).max(6000),
  urls: z.array(z.string().url()).max(12).optional(),
  context: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid research dossier request." }, { status: 400 });
  const result = await createResearchDossier({ userId: user.id, ...parsed.data });
  return NextResponse.json(result);
}
