// No-auth preview of the departments canvas empty state. Dev-only, never
// linked from product navigation. See src/app/design-preview/page.tsx.
import DepartmentCanvas from "@/app/dashboard/departments/DepartmentCanvas";
import "@/app/dashboard/reference-app.css";

export default function DepartmentsEmptyPreview() {
  return (
    // Wrapped in the real shell classes so the preview inherits the same
    // palette and typography as production. Without this the preview rendered
    // on globals.css tokens and silently disagreed with the actual dashboard.
    <div className="dashboard-shell app-shell">
      <div className="dept-page">
        <header className="dept-page-header">
          <div>
            <span className="dept-page-kicker">Homebase</span>
            <h1>Departments</h1>
            <p>0 departments · 0 coworkers.</p>
          </div>
        </header>

        <DepartmentCanvas departments={[]} canEdit persist={false} />
      </div>
    </div>
  );
}
