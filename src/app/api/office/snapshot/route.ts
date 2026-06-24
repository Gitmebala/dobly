import { NextRequest, NextResponse } from "next/server";
import { buildOfficeSnapshot } from "@/lib/office/snapshot";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const snapshot = await buildOfficeSnapshot({
    userId: user.id,
    workspaceId: workspaceId || null,
  });

  return NextResponse.json({ snapshot });
}
