"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type ElementType } from "react";
import { BellRing, Boxes, BrainCircuit, Home, LayoutTemplate, LifeBuoy, Link2, LogOut, ScrollText, Settings, Shield, Sparkles } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

const primaryNav = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/generate", label: "Build", icon: Sparkles },
  { href: "/dashboard/workflows", label: "Systems", icon: Boxes },
  { href: "/dashboard/approvals", label: "Approvals", icon: BellRing },
  { href: "/dashboard/connections", label: "Access", icon: Link2 },
  { href: "/dashboard/reports", label: "Reports", icon: ScrollText },
];

const secondaryNav = [
  { href: "/dashboard/business", label: "Memory", icon: BrainCircuit },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/help", label: "Help", icon: LifeBuoy },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function NavSection({
  items,
  pathname,
  onNavigate,
}: {
  items: { href: string; label: string; icon: ElementType; exact?: boolean }[];
  pathname: string | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : Boolean(pathname?.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              active
                ? "bg-[rgba(245,237,228,0.05)] text-[var(--dobly-text)]"
                : "text-[var(--dobly-text-muted)] hover:bg-[rgba(245,237,228,0.03)] hover:text-[var(--dobly-text)]"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default function DashboardSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = isAdminEmail(profile?.email);

  const secondaryItems = useMemo(
    () => (isAdmin ? [...secondaryNav, { href: "/dashboard/ops", label: "Ops", icon: Shield }] : secondaryNav),
    [isAdmin],
  );

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const content = (
    <div className="flex h-full flex-col border-r border-[rgba(245,237,228,0.08)] bg-[rgba(255,255,255,0.01)] px-4 py-4">
      <div className="pb-4">
        <BrandLogo markClassName="h-8 w-8" wordmarkClassName="text-[1rem]" />
      </div>

      <div className="space-y-6 border-t border-[rgba(245,237,228,0.08)] pt-5">
        <div>
          <p className="px-3 text-[11px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Workspace</p>
          <div className="mt-3">
            <NavSection items={primaryNav} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>

        <div className="border-t border-[rgba(245,237,228,0.08)] pt-5">
          <p className="px-3 text-[11px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Manage</p>
          <div className="mt-3">
            <NavSection items={secondaryItems} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-[rgba(245,237,228,0.08)] pt-4">
        <div className="px-3">
          <div className="text-sm text-[var(--dobly-text)]">{profile?.full_name ?? "Dobly"}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">{profile?.plan ?? "free"} plan</div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-3 inline-flex items-center gap-2 px-3 text-sm text-[var(--dobly-text-muted)] transition hover:text-[var(--dobly-text)]"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden w-[240px] shrink-0 lg:block">
        <aside className="sticky top-0 h-screen">{content}</aside>
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 left-4 z-40 border border-[rgba(245,237,228,0.08)] bg-[var(--dobly-bg-subtle)] px-4 py-2.5 text-sm text-[var(--dobly-text)] lg:hidden"
      >
        Menu
      </button>

      {mobileOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-[240px] lg:hidden">{content}</aside>
        </>
      ) : null}
    </>
  );
}
