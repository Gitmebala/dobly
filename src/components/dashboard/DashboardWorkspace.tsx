"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import DoblySidebar from "@/components/dashboard/DoblySidebar";

const WorkspaceSearchPalette = dynamic(
  () => import("@/components/dashboard/WorkspaceSearchPalette").then((module) => module.WorkspaceSearchPalette),
  { ssr: false },
);

type WorkspaceProfile = {
  full_name?: string;
  email?: string;
};

type WorkspaceChoice = { id: string; name: string };

export default function DashboardWorkspace({
  children,
  profile,
  isAdmin,
  workspaces,
  activeWorkspaceId,
}: {
  children: React.ReactNode;
  profile: WorkspaceProfile;
  isAdmin: boolean;
  workspaces: WorkspaceChoice[];
  activeWorkspaceId: string | null;
}) {
  // Expanded by default with labels visible - matches the reference
  // design (Canvas/Table/Assistants/Knowledge/Activity shown as a
  // labeled rail, not a collapsed icon-only strip). Still collapsible.
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => !current);
  }

  async function switchWorkspace(workspaceId: string) {
    if (!workspaceId || workspaceId === activeWorkspaceId || switchingWorkspace) return;
    setSwitchingWorkspace(true);
    const response = await fetch("/api/workspaces/active", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    if (response.ok) window.location.reload();
    else setSwitchingWorkspace(false);
  }

  return (
    <div className="dashboard-shell app-shell" data-sidebar-collapsed={collapsed}>
      <div className="dashboard-workspace">
        <DoblySidebar
          profile={profile}
          isAdmin={isAdmin}
          collapsed={collapsed}
          onToggle={toggleSidebar}
          onOpenSearch={() => setSearchOpen(true)}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          switchingWorkspace={switchingWorkspace}
          onSwitchWorkspace={switchWorkspace}
        />
        <div className="main-stage main-stage-no-topbar">
          <main className="main-stage-body">
            <div className="dashboard-page-shell">{children}</div>
          </main>
        </div>
      </div>
      <WorkspaceSearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
