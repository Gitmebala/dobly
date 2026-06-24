import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listRuntimeAudit } from "@/lib/runtime/security-governance";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const events = await listRuntimeAudit({
    userId: user.id,
    workspaceId: url.searchParams.get("workspaceId"),
    limit: Number(url.searchParams.get("limit") ?? 100),
  });
  return NextResponse.json({ events });
}
