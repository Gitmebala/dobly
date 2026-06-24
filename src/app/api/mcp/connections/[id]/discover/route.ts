import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { discoverUniversalMcpTools } from "@/lib/runtime/universal-mcp";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const tools = await discoverUniversalMcpTools({ userId: user.id, connectionId: id });
    return NextResponse.json({ tools });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "MCP discovery failed." }, { status: 500 });
  }
}
