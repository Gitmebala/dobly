import { NextResponse } from "next/server";
import { CONNECTION_CAPABILITY_PROFILES } from "@/lib/connection-capabilities";
import { getConnectionReadiness } from "@/lib/connection-readiness";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError, Connection } from "@/types";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("connections")
    .select("*")
    .eq("user_id", user.id)
    .limit(200);

  if (error) {
    return NextResponse.json<ApiError>({ error: "Failed to load connection capabilities." }, { status: 500 });
  }

  const connections = (data ?? []) as Connection[];

  return NextResponse.json(
    {
      profiles: CONNECTION_CAPABILITY_PROFILES,
      connections: connections.map((connection) => ({
        id: connection.id,
        provider: connection.provider,
        label: connection.label,
        status: connection.status,
        readiness: getConnectionReadiness(connection),
      })),
    },
    { headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } },
  );
}
