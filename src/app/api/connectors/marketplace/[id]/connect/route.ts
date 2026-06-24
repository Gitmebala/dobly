import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { connectUniversalConnector } from "@/lib/connectors/universal-flow";

const connectSchema = z.object({
  serverUrl: z.string().url().optional(),
  authToken: z.string().optional().nullable(),
  baseUrl: z.string().url().optional(),
  authType: z.enum(["none", "bearer", "api_key_header", "api_key_query", "basic"]).optional(),
  authSecret: z.string().optional().nullable(),
  allowPrivateNetwork: z.boolean().optional(),
  workspaceId: z.string().uuid().nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = connectSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid connector setup." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const result = await connectUniversalConnector({
      userId: user.id,
      connectorId: id,
      workspaceId: parsed.data.workspaceId ?? null,
      serverUrl: parsed.data.serverUrl,
      authToken: parsed.data.authToken,
      baseUrl: parsed.data.baseUrl,
      authType: parsed.data.authType,
      authSecret: parsed.data.authSecret,
      allowPrivateNetwork: parsed.data.allowPrivateNetwork,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not connect this tool.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
