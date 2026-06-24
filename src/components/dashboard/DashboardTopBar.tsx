"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, MoonStar, PanelLeftClose, PanelLeftOpen, Search, SunMedium } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { WorkspaceCreateMenu } from "@/components/dashboard/WorkspaceCreateMenu";

const routeNames: Record<string, string> = {
  activity: "Activity",
  approvals: "Approvals",
  billing: "Billing",
  briefings: "Briefings",
  business: "Business context",
  channels: "Channels",
  connections: "Connections",
  coworkers: "Coworkers",
  departments: "Departments",
  documents: "Documents",
  help: "Help",
  inbox: "Inbox",
  map: "Work map",
  memory: "Memory",
  projects: "Projects",
  reports: "Reports",
  search: "Search",
  settings: "Settings",
  tasks: "Tasks",
  workflows: "Workflows",
};

export default function DashboardTopBar({
  collapsed,
  onToggleSidebar,
  onOpenSearch,
  workspaces,
  activeWorkspaceId,
  switchingWorkspace,
  onSwitchWorkspace,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  workspaces: Array<{ id: string; name: string }>;
  activeWorkspaceId: string | null;
  switchingWorkspace: boolean;
  onSwitchWorkspace: (workspaceId: string) => void;
}) {
  const pathname = usePathname() ?? "/dashboard";
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const segment = pathname.split("/").filter(Boolean)[1] ?? "home";
  const pageName = routeNames[segment] ?? "Workspace";

  return (
    <header className="workspace-topbar">
      <button
        type="button"
        className="workspace-icon-button desktop-sidebar-toggle"
        onClick={onToggleSidebar}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </button>

      <div className="workspace-topbar-context">
        <Building2 aria-hidden="true" />
        {workspaces.length > 1 ? (
          <select
            className="workspace-switcher"
            aria-label="Active workspace"
            value={activeWorkspaceId ?? ""}
            disabled={switchingWorkspace}
            onChange={(event) => onSwitchWorkspace(event.target.value)}
          >
            {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </select>
        ) : <span className="workspace-context-kicker">{workspaces[0]?.name ?? "Workspace"}</span>}
        <span className="workspace-context-separator" />
        <strong>{pageName}</strong>
      </div>

      <div className="workspace-topbar-actions">
        <button
          type="button"
          onClick={onOpenSearch}
          className="workspace-search-button"
          aria-label="Search Dobly"
          title="Search Dobly"
        >
          <Search />
          <span>Search</span>
          <kbd>Ctrl K</kbd>
        </button>
        <button
          type="button"
          className="workspace-icon-button workspace-theme-button"
          data-theme-state={dark ? "dark" : "light"}
          onClick={() => setTheme(dark ? "light" : "dark")}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <SunMedium /> : <MoonStar />}
        </button>
        <Link href="/dashboard/notifications" className="workspace-icon-button workspace-notification-button" aria-label="Notifications" title="Notifications">
          <Bell />
        </Link>
        <WorkspaceCreateMenu />
      </div>
    </header>
  );
}
