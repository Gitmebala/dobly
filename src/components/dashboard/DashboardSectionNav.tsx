"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Boxes,
  Building2,
  CheckCircle2,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  ListTodo,
  Network,
  Radar,
  Users,
} from "lucide-react";

type Section = {
  name: string;
  routes: string[];
  items: Array<{ label: string; href: string; icon: React.ComponentType<{ className?: string }> }>;
};

const sections: Section[] = [
  {
    name: "Work",
    routes: ["/dashboard/tasks", "/dashboard/inbox", "/dashboard/projects", "/dashboard/documents", "/dashboard/activity"],
    items: [
      { label: "Tasks", href: "/dashboard/tasks", icon: ListTodo },
      { label: "Inbox", href: "/dashboard/inbox", icon: Inbox },
      { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
      { label: "Documents", href: "/dashboard/documents", icon: FileText },
      { label: "Activity", href: "/dashboard/activity", icon: Activity },
    ],
  },
  {
    name: "Coworkers",
    routes: ["/dashboard/coworkers", "/dashboard/departments", "/dashboard/pods", "/dashboard/team"],
    items: [
      { label: "Coworkers", href: "/dashboard/coworkers", icon: Bot },
      { label: "Departments", href: "/dashboard/departments", icon: Building2 },
      { label: "Pods", href: "/dashboard/pods", icon: Boxes },
      { label: "People", href: "/dashboard/team", icon: Users },
    ],
  },
  {
    name: "Map",
    routes: ["/dashboard/map", "/dashboard/states", "/dashboard/approvals"],
    items: [
      { label: "Live map", href: "/dashboard/map", icon: Network },
      { label: "States", href: "/dashboard/states", icon: Radar },
      { label: "Approvals", href: "/dashboard/approvals", icon: CheckCircle2 },
    ],
  },
  {
    name: "Home",
    routes: ["/dashboard"],
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Live map", href: "/dashboard/map", icon: Network },
    ],
  },
];

function matches(pathname: string, route: string) {
  if (route === "/dashboard") return pathname === route;
  return pathname === route || pathname.startsWith(`${route}/`);
}

export default function DashboardSectionNav() {
  const pathname = usePathname() ?? "/dashboard";
  const section =
    sections.find((candidate) => candidate.routes.some((route) => matches(pathname, route))) ??
    null;

  if (!section) return null;

  return (
    <nav className="workspace-section-nav" aria-label={`${section.name} views`}>
      <span className="workspace-section-name">{section.name}</span>
      <div className="workspace-section-links">
        {section.items.map((item) => {
          const Icon = item.icon;
          const active = matches(pathname, item.href);
          return (
            <Link href={item.href} key={item.href} data-active={active}>
              <Icon className="workspace-section-icon" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
