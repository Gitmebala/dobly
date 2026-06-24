import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchMemoryIntelligence } from "@/lib/runtime/memory-intelligence";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ error: "q is required." }, { status: 400 });
  const result = await searchMemoryIntelligence({
    userId: user.id,
    workspaceId: url.searchParams.get("workspaceId"),
    query: q,
    limit: Number(url.searchParams.get("limit") ?? 10),
  });
  return NextResponse.json(result);
}
