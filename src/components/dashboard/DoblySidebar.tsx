"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Activity,
  BarChart3,
  BookOpenText,
  Brain,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock,
  GraduationCap,
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
  Users,
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
      { label: "Groups", href: "/dashboard/groups", icon: Users },
      { label: "Skills", href: "/dashboard/skills", icon: GraduationCap },
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
        <Link href="/dashboard" className="dobly-brand" aria-label="Dobly">
          <span className="dobly-mark" aria-hidden="true">D</span>
        </Link>
        <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen}>
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </header>
      <button type="button" className="dobly-mobile-scrim" data-open={mobileOpen} onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
      {/* Rendered as a sibling of <aside>, not a child of it - founder,
          directly: "why is it not seen, have it at the very top left...
          side bar slides away and disappears completely, and when you
          want it again, you hit the button and it comes back." A toggle
          living inside the sidebar can't bring the sidebar back once
          that sidebar is the thing sliding fully out of view - it would
          slide away with it. This cluster is fixed at the actual page
          corner, independent of sidebar state, so it's always reachable
          whichever way collapsed currently reads.
          Founder, directly, on what used to be one lone circular button
          here: "make button at the top just a button... not a whole top
          bar that then goes on to compete for space... just buttons...
          like how claude is" (reference: a plain row of icon-only
          buttons, no per-button card/border/shadow). Brain view and
          light/dark mode - previously buried in the account dropdown -
          join the sidebar toggle in this same plain row instead of each
          getting their own separate treatment. */}
      <div className="dobly-top-controls">
        <button
          type="button"
          className="dobly-top-control-btn"
          data-collapsed={collapsed}
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft aria-hidden="true" className="dobly-top-control-chevron" />
        </button>
        <Link
          href="/dashboard/brain"
          className={`dobly-top-control-btn ${pathname.startsWith("/dashboard/brain") ? "is-active" : ""}`}
          aria-label="Brain view — see everything connected"
          title="Brain view — see everything connected"
        >
          <Brain aria-hidden="true" />
        </Link>
        <button
          type="button"
          className="dobly-top-control-btn"
          onClick={() => setTheme(dark ? "light" : "dark")}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <SunMedium aria-hidden="true" /> : <MoonStar aria-hidden="true" />}
        </button>
      </div>
      <aside className="dobly-sidebar" data-mobile-open={mobileOpen} data-collapsed={collapsed}>
        {/* Icon only, no wordmark - founder, directly: "why do you have
            the icon nd words there." Note this is a deliberate reversal
            of an earlier explicit request in the other direction ("you
            chaged our logo, thhere isnt even a logo anymorre its just
            the word Dobly") - asked before touching it a third time,
            this is the confirmed answer. aria-label carries the
            accessible name now that there's no visible text. */}
        <Link href="/dashboard" className="dobly-brand" aria-label="Dobly">
          <span className="dobly-mark" aria-hidden="true">D</span>
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
                {/* Light/dark moved to the top control row (see above) -
                    founder, directly: "light/dark mode... should also be
                    at the top." Not duplicated here anymore. */}
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
