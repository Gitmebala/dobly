import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { dispatchTaskToOperator } from "@/lib/workspace-tasks";

// Real table now (see supabase/migrations/202608050002_workspace_tasks_projects.sql) -
// reads go through the admin client like every other operator-adjacent table in this
// codebase, since RLS on these tables is workspace-scoped and most rows have no
// workspace_id yet. Every write is still explicitly scoped with .eq("user_id", user.id).

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const projectId = request.nextUrl.searchParams.get("projectId");

  let query = admin.from("workspace_tasks").select("*").eq("user_id", user.id).order("position", { ascending: true }).order("created_at", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to load tasks." }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Task title is required." }, { status: 400 });

  const assigneeUserId = typeof body?.assigneeUserId === "string" && body.assigneeUserId ? body.assigneeUserId : null;
  const assigneeOperatorId = typeof body?.assigneeOperatorId === "string" && body.assigneeOperatorId ? body.assigneeOperatorId : null;
  if (assigneeUserId && assigneeOperatorId) {
    return NextResponse.json({ error: "A task can be assigned to a teammate or a coworker, not both." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("workspace_tasks")
    .insert({
      user_id: user.id,
      title,
      description: typeof body?.description === "string" ? body.description.trim() : "",
      project_id: typeof body?.projectId === "string" && body.projectId ? body.projectId : null,
      parent_task_id: typeof body?.parentTaskId === "string" && body.parentTaskId ? body.parentTaskId : null,
      priority: ["low", "medium", "high"].includes(body?.priority) ? body.priority : "medium",
      due_at: typeof body?.dueAt === "string" && body.dueAt ? body.dueAt : null,
      status: "open",
      assignee_user_id: assigneeUserId,
      assignee_operator_id: assigneeOperatorId,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to create task." }, { status: 500 });

  if (assigneeOperatorId) {
    dispatchTaskToOperator({ userId: user.id, operatorId: assigneeOperatorId, task: data }).catch((dispatchError) => {
      console.error("[tasks] failed to dispatch task to operator", dispatchError);
    });
  }

  return NextResponse.json({ task: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Task id is required." }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") updates.title = body.title.trim();
  if (typeof body.description === "string") updates.description = body.description.trim();
  if (typeof body.status === "string" && ["open", "in_progress", "blocked", "completed"].includes(body.status)) {
    updates.status = body.status;
    updates.completed_at = body.status === "completed" ? new Date().toISOString() : null;
  }
  if (typeof body.priority === "string" && ["low", "medium", "high"].includes(body.priority)) {
    updates.priority = body.priority;
  }
  if ("dueAt" in (body ?? {})) {
    updates.due_at = typeof body.dueAt === "string" && body.dueAt ? body.dueAt : null;
  }
  if ("projectId" in (body ?? {})) {
    updates.project_id = typeof body.projectId === "string" && body.projectId ? body.projectId : null;
  }

  let dispatchOperatorId: string | null = null;
  if ("assigneeUserId" in (body ?? {}) || "assigneeOperatorId" in (body ?? {})) {
    const nextAssigneeUserId = typeof body.assigneeUserId === "string" && body.assigneeUserId ? body.assigneeUserId : null;
    const nextAssigneeOperatorId = typeof body.assigneeOperatorId === "string" && body.assigneeOperatorId ? body.assigneeOperatorId : null;
    if (nextAssigneeUserId && nextAssigneeOperatorId) {
      return NextResponse.json({ error: "A task can be assigned to a teammate or a coworker, not both." }, { status: 400 });
    }
    updates.assignee_user_id = nextAssigneeUserId;
    updates.assignee_operator_id = nextAssigneeOperatorId;
    dispatchOperatorId = nextAssigneeOperatorId;
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("workspace_tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error || !data) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  if (dispatchOperatorId) {
    dispatchTaskToOperator({ userId: user.id, operatorId: dispatchOperatorId, task: data }).catch((dispatchError) => {
      console.error("[tasks] failed to dispatch task to operator", dispatchError);
    });
  }

  return NextResponse.json({ task: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Task id is required." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("workspace_tasks").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Failed to delete task." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
