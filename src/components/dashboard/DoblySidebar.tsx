"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Activity,
  BarChart3,
  BookOpenText,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock,
  Link2,
  Menu,
  MoonStar,
  Network,
  NotebookText,
  RadioTower,
  Search,
  Settings,
  Sparkles,
  SunMedium,
  Table2,
  WalletCards,
  Workflow,
  X,
} from "lucide-react";
import SignOutButton from "@/components/dashboard/SignOutButton";
import { useTheme } from "@/components/providers/ThemeProvider";

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

// The five places in Dobly: Canvas (intent), Table (work), Assistants
// (coworkers), Knowledge (the Room), Activity (history). This is the
// primary taxonomy from the reference design — not a feature list.
const placeItems: NavItem[] = [
  { label: "Canvas", href: "/dashboard", icon: Sparkles },
  { label: "Table", href: "/dashboard/tasks", icon: Table2 },
  { label: "Assistants", href: "/dashboard/coworkers", icon: Network },
  { label: "Knowledge", href: "/dashboard/memory", icon: NotebookText },
  { label: "Activity", href: "/dashboard/activity", icon: Clock },
];

const routeFamilies: Record<string, string[]> = {
  "/dashboard/tasks": ["/dashboard/tasks", "/dashboard/projects", "/dashboard/documents"],
  "/dashboard/coworkers": ["/dashboard/coworkers"],
  "/dashboard/memory": ["/dashboard/memory", "/dashboard/business"],
};

const moreGroups = [
  {
    label: "Intelligence",
    items: [
      { label: "Briefings", href: "/dashboard/briefings", icon: BookOpenText },
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { label: "Reports", href: "/dashboard/reports", icon: RadioTower },
    ],
  },
  {
    label: "Systems",
    items: [
      { label: "Loops", href: "/dashboard/workflows", icon: Workflow },
      { label: "Approvals", href: "/dashboard/approvals", icon: CheckCircle2 },
      { label: "Connections", href: "/dashboard/connections", icon: Link2 },
      { label: "Health", href: "/dashboard/health", icon: Activity },
    ],
  },
  {
    label: "Library",
    items: [
      { label: "Inbox", href: "/dashboard/inbox", icon: ClipboardList },
      // A real, complete page (tasks/projects/documents/coworkers, already
      // had one real bug fixed in it - see its own file comment) with zero
      // inbound links anywhere in the app before this. The sidebar's
      // "Search" button opens the instant command palette instead
      // (onOpenSearch), which is a different, complementary surface - this
      // gives the fuller results page a real way in too.
      { label: "Search", href: "/dashboard/search", icon: Search },
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
      <span className="dobly-nav-icon-frame">
        <Icon className="dobly-nav-icon" />
      </span>
      <span className="dobly-nav-label">{item.label}</span>
      {item.count ? <span className="dobly-count">{item.count}</span> : null}
    </Link>
  );
}

type WorkspaceChoice = { id: string; name: string };

export default function DoblySidebar({
  profile,
  collapsed,
  onToggle,
  onOpenSearch,
  workspaces = [],
  activeWorkspaceId = null,
  switchingWorkspace = false,
  onSwitchWorkspace,
}: {
  profile: SidebarProfile;
  isAdmin?: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onOpenSearch?: () => void;
  workspaces?: WorkspaceChoice[];
  activeWorkspaceId?: string | null;
  switchingWorkspace?: boolean;
  onSwitchWorkspace?: (workspaceId: string) => void;
}) {
  const pathname = usePathname() ?? "";
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
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
        <button
          type="button"
          className="dobly-sidebar-collapse-toggle"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <Link href="/dashboard" className="dobly-brand">
          <span className="dobly-mark" aria-hidden="true">D</span>
          <span className="dobly-brand-name">Dobly</span>
        </Link>

        {/* Five places in Dobly — Canvas, Table, Assistants, Knowledge,
            Activity — shown as a calm vertical rail (icon over label),
            matching the reference workspace design. Everything else
            (Loops, Approvals, Connections, Inbox, Briefings...) is one
            step away behind "More" rather than crowding this rail. */}
        <nav className="dobly-nav-scroll" aria-label="Workspace navigation">
          {placeItems.map((item) => (
            <NavRow key={item.href} item={item} active={activePath(pathname, item.href)} collapsed={collapsed} />
          ))}
          <div className="dobly-nav-divider" role="separator" />
          <DropdownMenu.Root open={moreOpen} onOpenChange={setMoreOpen} modal={false}>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className={`dobly-nav-row dobly-more-trigger ${moreGroups.some((group) => group.items.some((item) => activePath(pathname, item.href))) ? "is-active" : ""}`}
                aria-label={collapsed ? "More" : undefined}
                title={collapsed ? "More" : undefined}
              >
                <span className="dobly-nav-icon-frame">
                  <ChevronRight className="dobly-nav-icon dobly-more-icon" />
                </span>
                <span className="dobly-nav-label">More</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="dobly-more-menu" side="right" sideOffset={10} align="start">
                <div className="dobly-more-intro">
                  <strong>Explore Dobly</strong>
                  <span>Loops, approvals, connections, and your shared library.</span>
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
          <button type="button" className="dobly-sidebar-search" onClick={onOpenSearch} aria-label="Search Dobly">
            <Search className="dobly-nav-icon" />
            {!collapsed ? <span>Search</span> : null}
            {!collapsed ? <kbd>Ctrl K</kbd> : null}
          </button>
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
                <DropdownMenu.Item
                  onSelect={(event) => {
                    event.preventDefault();
                    setTheme(dark ? "light" : "dark");
                  }}
                >
                  {dark ? <SunMedium /> : <MoonStar />} {dark ? "Light mode" : "Dark mode"}
                </DropdownMenu.Item>
                {workspaces.length > 1 ? (
                  <>
                    <DropdownMenu.Separator className="dobly-profile-separator" />
                    {workspaces.map((workspace) => (
                      <DropdownMenu.Item
                        key={workspace.id}
                        onSelect={() => onSwitchWorkspace?.(workspace.id)}
                        data-active={workspace.id === activeWorkspaceId}
                        style={{ opacity: switchingWorkspace ? 0.6 : 1 }}
                      >
                        <Building2 />
                        <span>{workspace.name}</span>
                      </DropdownMenu.Item>
                    ))}
                  </>
                ) : null}
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
