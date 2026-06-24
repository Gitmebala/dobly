import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listUniversalConnectorMarketplace } from "@/lib/connectors/universal-flow";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const connectors = await listUniversalConnectorMarketplace({ userId: user.id });
    return NextResponse.json({ connectors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load connector marketplace.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
