"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Bot,
  BarChart3,
  BellRing,
  Compass,
  LifeBuoy,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Orbit,
  Sparkles,
  Settings,
  Shield,
  X,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/business", label: "Business", icon: Compass },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/automations", label: "Automations", icon: Orbit },
  { href: "/dashboard/create", label: "Create", icon: Sparkles },
  { href: "/dashboard/onboarding", label: "Onboarding", icon: Compass },
  { href: "/dashboard/usage", label: "Usage", icon: BarChart3 },
  { href: "/dashboard/health", label: "Health", icon: Activity },
  { href: "/dashboard/approvals", label: "Approvals", icon: BellRing },
  { href: "/dashboard/notifications", label: "Notifications", icon: BellRing },
  { href: "/dashboard/help", label: "Help", icon: LifeBuoy },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/settings?tab=connections", label: "Connections", icon: Link2 },
];

interface Props {
  profile: Profile | null;
}

export default function DashboardSidebar({ profile }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = isAdminEmail(profile?.email);
  const visibleNavItems = isAdmin
    ? [...navItems, { href: "/dashboard/ops", label: "Ops", icon: Shield }]
    : navItems;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const content = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-5">
        <BrandLogo markClassName="h-9 w-9" wordmarkClassName="text-lg" />
        <p className="mt-4 text-sm leading-6 text-text-muted">
          Business agents and automations from plain language.
        </p>
      </div>

      {profile ? (
        <div className="border-b border-border px-5 py-4">
          <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Current plan</div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="font-display text-xl font-semibold capitalize text-text">{profile.plan}</span>
            <span className="badge-green capitalize">{profile.plan}</span>
          </div>
        </div>
      ) : null}

      <nav className="flex-1 px-4 py-5">
        <div className="space-y-2">
          {visibleNavItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : Boolean(pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-[1.15rem] px-4 py-3 text-sm transition-all ${
                  active
                    ? "bg-accent-dim text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                    : "text-text-muted hover:bg-surface-1 hover:text-text"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-accent" : ""}`} />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-border px-4 py-5">
        <div className="mb-4">
          <ThemeToggle />
        </div>
        {profile?.plan === "free" ? (
          <Link href="/pricing" className="btn-secondary mb-4 w-full justify-center">
            <Sparkles className="h-4 w-4" />
            Upgrade
          </Link>
        ) : null}

        {profile ? (
          <div className="mb-4 flex items-center gap-3 rounded-[1.2rem] bg-surface px-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-dim font-display font-semibold text-accent">
              {(profile.full_name?.[0] ?? profile.email[0] ?? "D").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-medium text-text">
                {profile.full_name ?? "Dobly user"}
              </div>
              <div className="truncate text-xs text-text-dim">{profile.email}</div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-[1rem] border border-border px-4 py-3 text-sm text-text-muted transition-all hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed left-0 top-0 hidden h-full w-72 border-r border-border bg-[rgba(12,14,24,0.78)] backdrop-blur-2xl lg:block">
        {content}
      </aside>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="theme-chip fixed left-4 top-5 z-40 h-11 w-11 justify-center px-0 lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>

      {mobileOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="surface-panel fixed left-3 top-3 z-50 h-[calc(100vh-1.5rem)] w-[min(20rem,calc(100vw-1.5rem))] rounded-[1.75rem] lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="theme-chip absolute right-4 top-4 h-10 w-10 justify-center px-0"
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
