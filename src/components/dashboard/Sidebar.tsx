"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  Activity,
  BarChart3,
  BellRing,
  Bot,
  Compass,
  LifeBuoy,
  Link2,
  LogOut,
  Menu,
  Settings,
  Shield,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

const SIDEBAR_STORAGE_KEY = "dobly-dashboard-sidebar-collapsed";

const primaryNav = [
  { href: "/dashboard", label: "Overview", icon: Sparkles, exact: true },
  { href: "/dashboard/create", label: "Create", icon: Sparkles },
  { href: "/dashboard/automations", label: "Automations", icon: Workflow },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/approvals", label: "Approvals", icon: BellRing },
];

const secondaryNav = [
  { href: "/dashboard/business", label: "Business", icon: Compass },
  { href: "/dashboard/connections", label: "Connections", icon: Link2 },
  { href: "/dashboard/usage", label: "Usage", icon: BarChart3 },
  { href: "/dashboard/health", label: "Health", icon: Activity },
  { href: "/dashboard/help", label: "Help", icon: LifeBuoy },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface Props {
  profile: Profile | null;
}

function SidebarSection({
  title,
  items,
  pathname,
  onNavigate,
  collapsed,
}: {
  title: string;
  items: { href: string; label: string; icon: ElementType; exact?: boolean }[];
  pathname: string | null;
  onNavigate: () => void;
  collapsed: boolean;
}) {
  return (
    <div className="space-y-2">
      {!collapsed ? (
        <p className="px-3 text-[11px] uppercase tracking-[0.32em] text-[var(--text-dim)]">{title}</p>
      ) : null}
      <div className="space-y-1.5">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : Boolean(pathname?.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              title={label}
              onClick={onNavigate}
              className={`group flex items-center rounded-[1.15rem] text-sm transition-all ${
                collapsed ? "justify-center px-2 py-3" : "gap-3 px-3.5 py-3"
              } ${
                active
                  ? "border border-[rgba(77,122,255,0.24)] bg-[linear-gradient(135deg,rgba(77,122,255,0.16),rgba(77,122,255,0.05))] text-white shadow-[0_18px_44px_rgba(10,18,36,0.28)]"
                  : "border border-transparent text-[var(--text-muted)] hover:border-[rgba(77,122,255,0.14)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--text)]"
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl transition-all ${
                  active
                    ? "bg-[rgba(216,231,255,0.1)] text-[var(--accent)]"
                    : "bg-[rgba(255,255,255,0.03)] text-[var(--text-dim)] group-hover:text-[var(--accent)]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {!collapsed ? <span className="truncate font-medium">{label}</span> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardSidebar({ profile }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = isAdminEmail(profile?.email);
  const firstName = profile?.full_name?.split(" ")[0] ?? "Operator";

  useEffect(() => {
    const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved === "true") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const secondaryItems = useMemo(
    () =>
      isAdmin
        ? [...secondaryNav, { href: "/dashboard/ops", label: "Ops", icon: Shield }]
        : secondaryNav,
    [isAdmin],
  );

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  function closeMobile() {
    setMobileOpen(false);
  }

  const content = (
    <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-[rgba(113,140,194,0.16)] bg-[linear-gradient(180deg,rgba(10,16,28,0.95),rgba(7,11,21,0.88))] shadow-[0_28px_80px_rgba(2,6,16,0.42)]">
      <div className="flex-1 overflow-y-auto">
        <div className={`space-y-5 ${collapsed ? "px-3 py-4" : "px-4 py-5"}`}>
          <div className="rounded-[1.6rem] border border-[rgba(113,140,194,0.14)] bg-[rgba(255,255,255,0.02)] p-3">
            <BrandLogo
              className={collapsed ? "justify-center" : ""}
              markClassName={collapsed ? "h-10 w-10" : "h-10 w-10"}
              wordmarkClassName="text-[1.1rem]"
              animatedMark
              showWordmark={!collapsed}
            />
            {!collapsed ? (
              <div className="mt-4 rounded-[1.3rem] border border-[rgba(77,122,255,0.16)] bg-[linear-gradient(135deg,rgba(77,122,255,0.12),rgba(255,255,255,0.03))] p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[var(--text-dim)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--green)] shadow-[0_0_14px_rgba(0,232,122,0.7)]" />
                  Runtime stable
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Clear room. Quiet signal.
                </p>
              </div>
            ) : null}
          </div>

          <div className={`rounded-[1.45rem] border border-[rgba(113,140,194,0.14)] bg-[rgba(255,255,255,0.02)] ${collapsed ? "p-3" : "p-4"}`}>
            {collapsed ? (
              <div className="grid place-items-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,232,122,0.2)] bg-[rgba(0,232,122,0.08)] text-xs font-semibold capitalize text-[var(--green)]">
                  {(profile?.plan ?? "free").slice(0, 1).toUpperCase()}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-dim)]">Current plan</p>
                  <p className="mt-2 font-display text-xl font-semibold capitalize text-[var(--text)]">
                    {profile?.plan ?? "free"}
                  </p>
                </div>
                <span className="inline-flex rounded-full border border-[rgba(0,232,122,0.22)] bg-[rgba(0,232,122,0.08)] px-3 py-1 text-xs font-medium capitalize text-[var(--green)]">
                  {profile?.plan ?? "free"}
                </span>
              </div>
            )}
          </div>

          <div className={`rounded-[1.45rem] border border-[rgba(113,140,194,0.14)] bg-[rgba(255,255,255,0.02)] ${collapsed ? "p-2.5" : "p-3.5"}`}>
            <SidebarSection
              title="Command"
              items={primaryNav}
              pathname={pathname}
              onNavigate={closeMobile}
              collapsed={collapsed}
            />
          </div>

          <div className={`rounded-[1.45rem] border border-[rgba(113,140,194,0.14)] bg-[rgba(255,255,255,0.02)] ${collapsed ? "p-2.5" : "p-3.5"}`}>
            <SidebarSection
              title="Control"
              items={secondaryItems}
              pathname={pathname}
              onNavigate={closeMobile}
              collapsed={collapsed}
            />
          </div>

          <div className={`rounded-[1.45rem] border border-[rgba(113,140,194,0.14)] bg-[rgba(255,255,255,0.02)] ${collapsed ? "p-3" : "p-4"}`}>
            {collapsed ? (
              <div className="flex flex-col items-center gap-3">
                <ThemeToggle compact />
                {profile?.plan === "free" ? (
                  <Link href="/pricing" title="Upgrade plan" className="grid h-10 w-10 place-items-center rounded-2xl border border-[rgba(113,140,194,0.16)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] transition-all hover:border-[rgba(77,122,255,0.22)] hover:text-[var(--text)]">
                    <Sparkles className="h-4 w-4" />
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="grid h-10 w-10 place-items-center rounded-2xl border border-[rgba(196,154,42,0.2)] bg-[rgba(196,154,42,0.08)] text-[#d7b15b] transition-all hover:border-[rgba(196,154,42,0.3)] hover:text-[#e5c679]"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between gap-3 rounded-[1.2rem] border border-[rgba(113,140,194,0.14)] bg-[rgba(255,255,255,0.03)] px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-dim)]">Appearance</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Set the tone</p>
                  </div>
                  <ThemeToggle compact />
                </div>

                {profile?.plan === "free" ? (
                  <Link href="/pricing" className="btn-secondary mb-4 w-full justify-center">
                    <Sparkles className="h-4 w-4" />
                    Upgrade plan
                  </Link>
                ) : null}

                {profile ? (
                  <div className="mb-4 flex items-center gap-3 rounded-[1.35rem] border border-[rgba(113,140,194,0.14)] bg-[rgba(255,255,255,0.03)] px-3.5 py-3.5">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-[linear-gradient(135deg,rgba(77,122,255,0.22),rgba(255,176,32,0.12))] font-display font-semibold text-[var(--text)]">
                      {(profile.full_name?.[0] ?? profile.email[0] ?? "D").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[var(--text)]">
                        {profile.full_name ?? firstName}
                      </div>
                      <div className="truncate text-xs text-[var(--text-dim)]">{profile.email}</div>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center justify-center gap-2 rounded-[1rem] border border-[rgba(196,154,42,0.18)] bg-[rgba(196,154,42,0.06)] px-4 py-3 text-sm text-[#d7b15b] transition-all hover:border-[rgba(196,154,42,0.28)] hover:bg-[rgba(196,154,42,0.1)] hover:text-[#e5c679]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-[rgba(113,140,194,0.14)] p-3">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className={`flex w-full items-center rounded-[1rem] border border-[rgba(113,140,194,0.14)] bg-[rgba(255,255,255,0.03)] px-3 py-3 text-sm text-[var(--text-secondary)] transition-all hover:border-[rgba(77,122,255,0.24)] hover:text-[var(--text)] ${
            collapsed ? "justify-center" : "justify-between"
          }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[rgba(255,255,255,0.03)]">
              <Menu className="h-4 w-4" />
            </span>
            {!collapsed ? <span className="font-medium">Collapse sidebar</span> : null}
          </span>
          {!collapsed ? <span className="text-xs uppercase tracking-[0.24em] text-[var(--text-dim)]">Dock</span> : null}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`hidden shrink-0 transition-[width] duration-300 lg:block ${
          collapsed ? "w-[104px]" : "w-[320px]"
        }`}
      >
        <aside className="sticky top-4 h-[calc(100vh-2rem)]">
          {content}
        </aside>
      </div>

      <button
        type="button"
        onClick={() => {
          setCollapsed(false);
          setMobileOpen(true);
        }}
        className="fixed bottom-4 left-4 z-40 grid h-12 w-12 place-items-center rounded-2xl border border-[rgba(113,140,194,0.16)] bg-[rgba(8,13,24,0.88)] text-[var(--text)] shadow-[0_16px_34px_rgba(2,6,16,0.32)] backdrop-blur-xl lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>

      {mobileOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-[rgba(3,7,14,0.72)] backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-x-3 bottom-3 top-3 z-50 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-2xl border border-[rgba(113,140,194,0.18)] bg-[rgba(8,13,24,0.9)] text-[var(--text)]"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
            {content}
          </aside>
        </>
      ) : null}
    </>
  );
}
