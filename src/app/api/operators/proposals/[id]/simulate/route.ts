import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { simulateOperatorProposal } from "@/lib/dobly-operator-proposals";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const proposal = await simulateOperatorProposal({ userId: user.id, proposalId: id });
    return NextResponse.json({ proposal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not simulate this coworker.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
