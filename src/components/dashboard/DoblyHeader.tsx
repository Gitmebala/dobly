"use client";

import Link from "next/link";
import { Bell, Monitor, Moon, Plus, Search, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function DoblyHeader({
  profile,
}: {
  profile: { full_name?: string; avatar_url?: string } | null;
}) {
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <header
      className="sticky top-0 z-30 flex h-[52px] items-center justify-between border-b px-4"
      style={{
        background: "color-mix(in srgb, var(--dobly-bg-subtle) 84%, transparent)",
        borderColor: "var(--dobly-border)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
          <div className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-[var(--success)] opacity-50 [animation-duration:2.4s]" />
        </div>
        <div className="truncate text-[12px] text-[var(--dobly-text-muted)]">
          Always-on coworkers active
        </div>
        <div className="hidden h-4 w-px sm:block" style={{ backgroundColor: "var(--dobly-border)" }} />
        <div className="hidden text-[12px] text-[var(--dobly-text-muted)] md:block">
          {dateStr} · {timeStr}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="hidden items-center gap-2 rounded-xl px-3 py-1.5 transition-all duration-300 hover:-translate-y-0.5 sm:flex"
          style={{
            backgroundColor: "var(--dobly-surface)",
            border: "1px solid var(--dobly-border)",
            color: "var(--dobly-text-muted)",
          }}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-[12px]">Search...</span>
          <kbd
            className="rounded px-1.5 py-0.5 font-mono text-[10px]"
            style={{ backgroundColor: "var(--dobly-border)" }}
          >
            Ctrl K
          </kbd>
        </button>

        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 hover:-translate-y-0.5"
          style={{
            backgroundColor: "var(--dobly-surface)",
            border: "1px solid var(--dobly-border)",
            color: "var(--dobly-text-muted)",
          }}
          title={`Theme: ${theme}`}
        >
          {theme === "system" ? (
            <Monitor className="h-4 w-4" />
          ) : resolvedTheme === "dark" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </button>

        <Link
          href="/dashboard/generate"
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
          style={{ backgroundColor: "var(--dobly-accent)" }}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Hire</span>
        </Link>

        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 hover:-translate-y-0.5"
          style={{ color: "var(--dobly-text-muted)" }}
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--dobly-accent)]" />
        </button>

        <button className="flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 hover:-translate-y-0.5">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
            style={{
              background: "linear-gradient(135deg, #C4501A, #CE7A3C)",
              color: "#F5EDE4",
            }}
          >
            {profile?.full_name?.[0] || "?"}
          </div>
        </button>
      </div>
    </header>
  );
}
