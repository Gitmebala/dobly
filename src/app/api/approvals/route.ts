import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { listRuntimeApprovals } from "@/lib/runtime/approvals";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = new URL(req.url).searchParams.get("status");
  const admin = createAdminSupabaseClient();

  let workflowQuery = admin
    .from("approvals")
    .select("*")
    .eq("user_id", user.id)
    .order("requested_at", { ascending: false })
    .limit(100);

  if (status) workflowQuery = workflowQuery.eq("status", status);

  const [{ data: workflowApprovals }, runtimeApprovals] = await Promise.all([
    workflowQuery.catch(() => ({ data: [] })),
    listRuntimeApprovals({ userId: user.id, status: status as any }).catch(() => []),
  ]);

  const approvals = [
    ...((workflowApprovals ?? []) as Array<Record<string, unknown>>).map((approval) => ({
      ...approval,
      source: "workflow",
    })),
    ...runtimeApprovals.map((approval) => ({
      ...approval,
      source: "runtime",
      workflow_id: null,
    })),
  ].sort((a, b) => String(b.requested_at).localeCompare(String(a.requested_at)));

  return NextResponse.json({ approvals });
}
