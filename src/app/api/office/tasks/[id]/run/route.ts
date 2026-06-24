import { NextRequest, NextResponse } from "next/server";
import { executeQueuedOfficeTask } from "@/lib/office/runtime";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const admin = createAdminSupabaseClient();

  const { data: task, error: taskError } = await admin
    .from("office_tasks")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (taskError || !task) {
    return NextResponse.json<ApiError>(
      { error: taskError?.message ?? "Office task not found." },
      { status: 404 },
    );
  }

  const runId = typeof (task as any).agent_run_id === "string" ? (task as any).agent_run_id : null;
  if (!runId) {
    return NextResponse.json({ task, run: null, steps: [], confidence: [] });
  }

  const [{ data: run }, { data: steps }, { data: confidence }] = await Promise.all([
    admin.from("office_agent_runs").select("*").eq("id", runId).eq("user_id", user.id).maybeSingle(),
    admin.from("office_agent_steps").select("*").eq("run_id", runId).eq("user_id", user.id).order("step_number", { ascending: true }),
    admin.from("office_agent_confidence_log").select("*").eq("run_id", runId).eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    task,
    run: run ?? null,
    steps: steps ?? [],
    confidence: confidence ?? [],
  });
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const task = await executeQueuedOfficeTask({
      userId: user.id,
      taskId: id,
    });

    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json<ApiError>(
      { error: error instanceof Error ? error.message : "Failed to run office task." },
      { status: 400 },
    );
  }
}
