import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveCoworkerCapabilities } from "@/lib/coworker-capabilities";
import type { ApiError, Connection } from "@/types";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const prompt = req.nextUrl.searchParams.get("prompt") ?? "";
  const includeAll = req.nextUrl.searchParams.get("all") === "true";
  const { data, error } = await supabase
    .from("connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(100);

  if (error) {
    return NextResponse.json<ApiError>({ error: "Failed to load connections." }, { status: 500 });
  }

  const resolution = resolveCoworkerCapabilities({
    prompt,
    includeAll,
    connections: (data ?? []) as Connection[],
  });

  return NextResponse.json(resolution);
}
