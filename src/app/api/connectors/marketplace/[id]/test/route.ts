import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { testUniversalConnector } from "@/lib/connectors/universal-flow";

const testSchema = z.object({
  connectionId: z.string().uuid(),
  workspaceId: z.string().uuid().nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = testSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "connectionId is required." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const result = await testUniversalConnector({
      userId: user.id,
      connectorId: id,
      connectionId: parsed.data.connectionId,
      workspaceId: parsed.data.workspaceId ?? null,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection test failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
