import Link from "next/link";
import { Bell, Command, Radar, Search, Sparkles, Zap } from "lucide-react";
import type { Profile } from "@/types";
import ThemeToggle from "@/components/ThemeToggle";

export default function DashboardHeader({ profile }: { profile: Profile | null }) {
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <header className="z-20 shrink-0 border-b border-[rgba(245,237,228,0.08)] bg-[color-mix(in_srgb,var(--dobly-bg)_82%,transparent)] backdrop-blur-2xl">
      <div className="dashboard-topbar mx-3 mt-3 flex min-h-[64px] items-center justify-between gap-4 rounded-[14px] border border-[rgba(245,237,228,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:mx-5 sm:px-5 lg:mx-6 lg:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(196,80,26,0.24)] bg-[rgba(196,80,26,0.1)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--dobly-accent)]">
              <Radar className="h-3.5 w-3.5" />
              Homebase
            </span>
            <span className="hidden rounded-full border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-muted)] sm:inline-flex">
              Live command surface
            </span>
          </div>
          <p className="mt-2 truncate text-sm text-[var(--dobly-text-secondary)]">
            Good to see you, {firstName}. Run the office from one surface.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="hidden min-w-[230px] items-center justify-between gap-3 rounded-[16px] border border-[rgba(245,237,228,0.08)] bg-[rgba(255,255,255,0.03)] px-3.5 py-2.5 text-sm text-[var(--dobly-text-muted)] transition hover:border-[rgba(196,80,26,0.24)] hover:bg-[rgba(245,237,228,0.05)] lg:inline-flex"
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search rooms, workers, reports
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(242,232,220,0.08)] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
              <Command className="h-3 w-3" />
              K
            </span>
          </button>
          <Link
            href="/dashboard/notifications"
            className="grid h-10 w-10 place-items-center rounded-xl border border-[rgba(245,237,228,0.08)] bg-[rgba(255,255,255,0.025)] text-[var(--dobly-text-muted)] transition hover:bg-[rgba(245,237,228,0.05)]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Link>
          <ThemeToggle compact />
          <Link
            href="/dashboard/briefings"
            className="hidden items-center gap-2 rounded-xl border border-[rgba(245,237,228,0.08)] bg-[rgba(255,255,255,0.025)] px-3.5 py-2.5 text-sm text-[var(--dobly-text-secondary)] transition hover:border-[rgba(196,80,26,0.24)] hover:text-[var(--dobly-text)] sm:inline-flex"
          >
            <Zap className="h-4 w-4 text-[var(--dobly-accent)]" />
            Morning brief
          </Link>
          <Link
            href="/dashboard/generate"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--dobly-accent)] px-3.5 py-2.5 text-sm font-medium text-[#F5EDE4] transition hover:bg-[var(--dobly-accent)]/90"
          >
            <Sparkles className="h-4 w-4" />
            Hire coworker
          </Link>
        </div>
      </div>
    </header>
  );
}
