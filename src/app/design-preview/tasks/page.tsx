// No-auth preview of the real Table (tasks) page with mock data.
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";
import WorkspaceTasksClient from "@/components/dashboard/WorkspaceTasksClient";
import "@/app/dashboard/reference-app.css";

export default function TasksDesignPreviewPage() {
  return (
    <DashboardWorkspace
      profile={{ full_name: "Michael", email: "michael@dobly.io" }}
      isAdmin={false}
      workspaces={[]}
      activeWorkspaceId={null}
    >
      <WorkspaceTasksClient
        initialTasks={[
          { id: "t1", title: "Reply to backlog of WhatsApp questions", priority: "high", status: "in_progress", assignee_operator_id: "op-1", project_id: "p1" },
          { id: "t2", title: "Draft September pricing update", priority: "medium", status: "open", assignee_user_id: "u1" },
          { id: "t3", title: "Reconnect Gmail for Alex", priority: "high", status: "blocked" },
          { id: "t4", title: "Publish landing page copy", priority: "low", status: "completed", project_id: "p1" },
        ]}
        projects={[{ id: "p1", name: "Product Launch" }]}
        operators={[{ id: "op-1", name: "Maya" }, { id: "op-2", name: "Alex" }]}
        teammates={[{ id: "u1", name: "Michael" }]}
      />
    </DashboardWorkspace>
  );
}
