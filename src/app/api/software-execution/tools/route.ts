import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listSoftwareExecutionTools } from "@/lib/software-execution";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tools = listSoftwareExecutionTools();
  return NextResponse.json({
    tools,
    configuredCount: tools.filter((tool) => tool.configured).length,
    totalCount: tools.length,
  });
}
