import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("workspace_tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
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

  const { data, error } = await supabase
    .from("workspace_tasks")
    .insert({
      user_id: user.id,
      title,
      description: typeof body?.description === "string" ? body.description.trim() : "",
      project_id: typeof body?.projectId === "string" && body.projectId ? body.projectId : null,
      priority: ["low", "medium", "high"].includes(body?.priority) ? body.priority : "medium",
      due_at: typeof body?.dueAt === "string" && body.dueAt ? body.dueAt : null,
      status: "open",
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to create task." }, { status: 500 });
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
  if (typeof body.status === "string" && ["open", "in_progress", "completed"].includes(body.status)) {
    updates.status = body.status;
    updates.completed_at = body.status === "completed" ? new Date().toISOString() : null;
  }
  if (typeof body.priority === "string" && ["low", "medium", "high"].includes(body.priority)) {
    updates.priority = body.priority;
  }

  const { data, error } = await supabase
    .from("workspace_tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error || !data) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  return NextResponse.json({ task: data });
}
