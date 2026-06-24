import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { approvalDecisionSchema } from "@/lib/validations";
import { decideApproval } from "@/lib/approvals";
import { decideRuntimeApproval } from "@/lib/runtime/approvals";
import { rateLimits } from "@/lib/rate-limit";
import { captureServerEvent } from "@/lib/telemetry/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimits.write(user.id).allowed) return NextResponse.json({ error: "Too many approval attempts." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = approvalDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid approval decision." }, { status: 400 });
  }

  try {
    const approval = await decideApproval({
      approvalId: id,
      userId: user.id,
      decision: parsed.data.decision,
      note: parsed.data.note,
    });
    await captureServerEvent({ event: "approval_decided", distinctId: user.id, properties: { decision: parsed.data.decision, approval_source: "workflow" } });

    return NextResponse.json({ approval });
  } catch (error) {
    try {
      const approval = await decideRuntimeApproval({
        approvalId: id,
        userId: user.id,
        decision: parsed.data.decision,
        note: parsed.data.note,
      });
      await captureServerEvent({ event: "approval_decided", distinctId: user.id, properties: { decision: parsed.data.decision, approval_source: "runtime" } });
      return NextResponse.json({ approval, source: "runtime" });
    } catch {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update approval." },
        { status: 400 }
      );
    }
  }
}
