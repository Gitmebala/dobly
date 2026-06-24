import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createOperatorProposal } from "@/lib/dobly-operator-proposals";
import { requireWorkspacePermission } from "@/lib/workspaces";

const proposalSchema = z.object({
  prompt: z.string().trim().min(8).max(6000),
  workspaceId: z.string().uuid().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = proposalSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid Operator request." }, { status: 400 });
  }

  if (parsed.data.workspaceId) {
    await requireWorkspacePermission({ userId: user.id, workspaceId: parsed.data.workspaceId, permission: "office:write" });
  }

  try {
    const proposal = await createOperatorProposal({
      userId: user.id,
      workspaceId: parsed.data.workspaceId ?? null,
      prompt: parsed.data.prompt,
    });
    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create Operator proposal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
