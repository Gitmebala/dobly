"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  BarChart3,
  BookOpenText,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Compass,
  Files,
  FolderKanban,
  Home,
  Inbox,
  LayoutGrid,
  Link2,
  ListTodo,
  Menu,
  MoreHorizontal,
  Network,
  RadioTower,
  Settings,
  Sparkles,
  Users,
  WalletCards,
  Workflow,
  X,
} from "lucide-react";
import SignOutButton from "@/components/dashboard/SignOutButton";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
};

type SidebarProfile = {
  full_name?: string;
  email?: string;
};

const workspaceItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Work", href: "/dashboard/tasks", icon: ListTodo },
  { label: "Coworkers", href: "/dashboard/coworkers", icon: Users },
  { label: "Connections", href: "/dashboard/connections", icon: Link2 },
];

const todayItems: NavItem[] = [
  { label: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { label: "Approvals", href: "/dashboard/approvals", icon: CheckCircle2 },
  { label: "Briefings", href: "/dashboard/briefings", icon: BookOpenText },
];

const routeFamilies: Record<string, string[]> = {
  "/dashboard/tasks": ["/dashboard/tasks", "/dashboard/inbox", "/dashboard/projects", "/dashboard/documents", "/dashboard/activity"],
  "/dashboard/coworkers": ["/dashboard/coworkers", "/dashboard/departments", "/dashboard/pods", "/dashboard/team"],
  "/dashboard/map": ["/dashboard/map", "/dashboard/states"],
};

const moreGroups = [
  {
    label: "Intelligence",
    items: [
      { label: "Memory", href: "/dashboard/memory", icon: BrainCircuit },
      { label: "Briefings", href: "/dashboard/briefings", icon: BookOpenText },
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { label: "Reports", href: "/dashboard/reports", icon: RadioTower },
      { label: "Work map", href: "/dashboard/map", icon: Network },
    ],
  },
  {
    label: "Systems",
    items: [
      { label: "Automations", href: "/dashboard/automations", icon: Sparkles },
      { label: "Workflows", href: "/dashboard/workflows", icon: Workflow },
      { label: "Approvals", href: "/dashboard/approvals", icon: CheckCircle2 },
    ],
  },
  {
    label: "Library",
    items: [
      { label: "Templates", href: "/dashboard/templates", icon: LayoutGrid },
      { label: "Marketplace", href: "/dashboard/marketplace", icon: Compass },
      { label: "Files", href: "/dashboard/documents", icon: Files },
      { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
      { label: "Inbox", href: "/dashboard/inbox", icon: Inbox },
    ],
  },
] satisfies Array<{ label: string; items: NavItem[] }>;

function activePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  const family = routeFamilies[href];
  if (family) return family.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavRow({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`dobly-nav-row ${active ? "is-active" : ""}`}
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="dobly-nav-icon" />
      <span className="dobly-nav-label">{item.label}</span>
      {item.count ? <span className="dobly-count">{item.count}</span> : null}
    </Link>
  );
}

export default function DoblySidebar({
  profile,
  collapsed,
}: {
  profile: SidebarProfile;
  isAdmin?: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname() ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initials = (profile?.full_name || profile?.email || "A").slice(0, 1).toUpperCase();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  function keepAccountOpen() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setAccountOpen(true);
  }

  function scheduleAccountClose() {
    closeTimer.current = setTimeout(() => setAccountOpen(false), 180);
  }

  return (
    <>
      <header className="dobly-mobile-header">
        <Link href="/dashboard" className="dobly-brand">
          <span className="dobly-mark" aria-hidden="true">D</span>
          <span>Dobly</span>
        </Link>
        <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen}>
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </header>
      <button type="button" className="dobly-mobile-scrim" data-open={mobileOpen} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
      <aside className="dobly-sidebar" data-mobile-open={mobileOpen} data-collapsed={collapsed}>
        <Link href="/dashboard" className="dobly-brand">
          <span className="dobly-mark" aria-hidden="true">D</span>
          <span className="dobly-brand-name">Dobly</span>
        </Link>

        <nav className="dobly-nav-scroll" aria-label="Workspace navigation">
          <span className="dobly-nav-eyebrow">Workspace</span>
          {workspaceItems.map((item) => (
            <NavRow key={item.href} item={item} active={activePath(pathname, item.href)} collapsed={collapsed} />
          ))}
          <span className="dobly-nav-eyebrow dobly-today-eyebrow">Today</span>
          {todayItems.map((item) => (
            <NavRow key={item.href} item={item} active={activePath(pathname, item.href)} collapsed={collapsed} />
          ))}
          <DropdownMenu.Root open={moreOpen} onOpenChange={setMoreOpen} modal={false}>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className={`dobly-nav-row dobly-more-trigger ${moreGroups.some((group) => group.items.some((item) => activePath(pathname, item.href))) ? "is-active" : ""}`}
                aria-label={collapsed ? "More" : undefined}
                title={collapsed ? "More" : undefined}
              >
                <MoreHorizontal className="dobly-nav-icon" />
                <span className="dobly-nav-label">More</span>
                <ChevronRight className="dobly-more-chevron" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="dobly-more-menu" side="right" sideOffset={10} align="start">
                <div className="dobly-more-intro">
                  <strong>Explore Dobly</strong>
                  <span>Intelligence, systems, and your shared library.</span>
                </div>
                {moreGroups.map((group) => (
                  <div className="dobly-more-group" key={group.label}>
                    <span>{group.label}</span>
                    <div>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <DropdownMenu.Item asChild key={item.href}>
                            <Link href={item.href} data-active={activePath(pathname, item.href)}>
                              <Icon />
                              <span>{item.label}</span>
                            </Link>
                          </DropdownMenu.Item>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </nav>

        <div className="dobly-sidebar-footer">
          <DropdownMenu.Root open={accountOpen} onOpenChange={setAccountOpen} modal={false}>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="dobly-account"
                onPointerEnter={keepAccountOpen}
                onPointerLeave={scheduleAccountClose}
                aria-label="Open account menu"
              >
                <span className="dobly-avatar">{initials}</span>
                <span className="dobly-account-copy">
                  <strong>{profile?.full_name || profile?.email || "Your account"}</strong>
                  <small>{profile?.email || ""}</small>
                </span>
                <ChevronRight className="dobly-account-chevron" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="dobly-profile-menu"
                side="right"
                sideOffset={10}
                align="end"
                onPointerEnter={keepAccountOpen}
                onPointerLeave={scheduleAccountClose}
              >
                <div className="dobly-profile-menu-head">
                  <span className="dobly-avatar">{initials}</span>
                  <span>
                    <strong>{profile?.full_name || "Your account"}</strong>
                    <small>{profile?.email || ""}</small>
                  </span>
                </div>
                <DropdownMenu.Separator className="dobly-profile-separator" />
                <DropdownMenu.Item asChild><Link href="/dashboard/billing"><WalletCards /> Billing</Link></DropdownMenu.Item>
                <DropdownMenu.Item asChild><Link href="/dashboard/settings"><Settings /> Settings</Link></DropdownMenu.Item>
                <DropdownMenu.Item asChild><Link href="/dashboard/help"><CircleHelp /> Help and support</Link></DropdownMenu.Item>
                <DropdownMenu.Separator className="dobly-profile-separator" />
                <DropdownMenu.Item asChild>
                  <SignOutButton className="dobly-profile-signout" showLabel />
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </aside>
    </>
  );
}
