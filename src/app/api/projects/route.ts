import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { computeProjectProgress } from "@/lib/workspace-tasks";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("workspace_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Failed to load projects." }, { status: 500 });

  const projects = data ?? [];
  // Progress is derived from real task completion, never a manually-set
  // number, so a project can't say "80% done" while its tasks disagree.
  const progressByProject = await computeProjectProgress(user.id, projects.map((project) => project.id));
  const withProgress = projects.map((project) => ({
    ...project,
    progress: progressByProject[project.id]?.percent ?? 0,
    taskCount: progressByProject[project.id]?.total ?? 0,
  }));

  return NextResponse.json({ projects: withProgress });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Project name is required." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("workspace_projects")
    .insert({
      user_id: user.id,
      name,
      description: typeof body?.description === "string" ? body.description.trim() : "",
      status: "active",
      currency: typeof body?.currency === "string" && body.currency ? body.currency : "KES",
      budget_minor: typeof body?.budgetMinor === "number" ? Math.round(body.budgetMinor) : null,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to create project." }, { status: 500 });
  return NextResponse.json({ project: { ...data, progress: 0, taskCount: 0 } }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Project id is required." }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.description === "string") updates.description = body.description.trim();
  if (typeof body.status === "string" && ["active", "paused", "completed"].includes(body.status)) {
    updates.status = body.status;
  }
  if (typeof body.budgetMinor === "number") updates.budget_minor = Math.round(body.budgetMinor);

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("workspace_projects")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error || !data) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const progressByProject = await computeProjectProgress(user.id, [id]);
  return NextResponse.json({ project: { ...data, progress: progressByProject[id]?.percent ?? 0, taskCount: progressByProject[id]?.total ?? 0 } });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Project id is required." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("workspace_projects").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Failed to delete project." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
