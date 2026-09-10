import { redirect } from "next/navigation";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { listDepartments } from "@/lib/departments";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import DepartmentCanvas, { type CanvasDepartment } from "./DepartmentCanvas";

export const metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { activeWorkspace } = await resolveActiveWorkspace(user.id);
  if (!activeWorkspace) redirect("/dashboard/onboarding");

  const departments = await listDepartments({ workspaceId: activeWorkspace.id });

  const canvasDepartments: CanvasDepartment[] = departments.map((department) => ({
    id: department.id,
    slug: department.slug,
    name: department.name,
    outcome: department.outcome,
    status: department.status,
    trust_level: department.trust_level,
    accent_color: department.accent_color,
    canvas_x: department.canvas_x,
    canvas_y: department.canvas_y,
    operators: department.operators.map((operator) => ({
      id: operator.id,
      name: operator.name,
      status: operator.status,
      mission: operator.mission,
      approval_mode: operator.approval_mode,
      last_run_at: operator.last_run_at,
      source: operator.source,
    })),
  }));

  const coworkerCount = departments.reduce((total, department) => total + department.operators.length, 0);

  return (
    <div className="dept-page">
      <header className="dept-page-header">
        <div>
          <span className="dept-page-kicker">Homebase</span>
          <h1>Departments</h1>
          <p>
            {departments.length} department{departments.length === 1 ? "" : "s"} · {coworkerCount} coworker
            {coworkerCount === 1 ? "" : "s"}. Drag to arrange, scroll to zoom, click a department to look inside.
          </p>
        </div>
      </header>

      <DepartmentCanvas departments={canvasDepartments} canEdit />
    </div>
  );
}
