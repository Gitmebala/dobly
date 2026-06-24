import { NextRequest, NextResponse } from "next/server";
import { createOperatingState, listOperatingStates } from "@/lib/state-engine";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  const status = req.nextUrl.searchParams.get("status") as "active" | "paused" | "archived" | null;

  try {
    const states = await listOperatingStates({
      userId: user.id,
      workspaceId,
      status: status ?? undefined,
    });
    return NextResponse.json({ states });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load states" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.objective || !body?.desired_condition) {
    return NextResponse.json(
      { error: "title, objective, and desired_condition are required" },
      { status: 400 },
    );
  }

  try {
    const state = await createOperatingState({
      userId: user.id,
      workspaceId: body.workspace_id ?? null,
      deskId: body.desk_id ?? null,
      coworkerId: body.coworker_id ?? null,
      deskKey: body.desk_key ?? null,
      deskName: body.desk_name ?? null,
      title: String(body.title),
      objective: String(body.objective),
      desiredCondition: String(body.desired_condition),
      stateType: body.state_type ?? "custom",
      targetMetric: body.target_metric ?? null,
      targetConfig: body.target_config ?? {},
      watchConfig: body.watch_config ?? {},
      actionPlaybook: body.action_playbook ?? {},
      approvalPolicy: body.approval_policy ?? {},
    });

    return NextResponse.json({ state }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create state" },
      { status: 500 },
    );
  }
}
