import Link from "next/link";
import { Bell, Command, Sparkles, Wand2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import type { Profile } from "@/types";

interface Props {
  profile: Profile | null;
}

export default function DashboardHeader({ profile }: Props) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="surface-panel flex min-h-[92px] items-center justify-between gap-4 rounded-[1.9rem] px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,232,122,0.18)] bg-[rgba(0,232,122,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[var(--green)]">
              <span className="h-2 w-2 rounded-full bg-[var(--green)] shadow-[0_0_12px_rgba(0,232,122,0.8)]" />
              All systems nominal
            </span>
            <span className="hidden items-center gap-2 rounded-full border border-[rgba(77,122,255,0.18)] bg-[rgba(77,122,255,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[var(--text-dim)] md:inline-flex">
              <Command className="h-3.5 w-3.5 text-[var(--accent)]" />
              Midnight Ocean
            </span>
          </div>
          <p className="mt-3 text-sm text-[var(--text-muted)] sm:text-base">
            {greeting},{" "}
            <span className="font-display font-semibold text-[var(--text)]">{firstName}</span>. Everything important is within view.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {profile?.plan === "free" ? (
            <Link
              href="/pricing"
              className="hidden items-center gap-2 rounded-full border border-[rgba(255,176,32,0.18)] bg-[rgba(255,176,32,0.08)] px-4 py-2 text-sm text-[#ffd084] sm:inline-flex"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Upgrade plan
            </Link>
          ) : null}

          <ThemeToggle compact />

          <Link
            href="/dashboard/notifications"
            className="grid h-10 w-10 place-items-center rounded-2xl border border-[rgba(113,140,194,0.16)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] transition-all hover:border-[rgba(77,122,255,0.24)] hover:text-[var(--text)]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Link>

          <Link href="/dashboard/create" className="btn-primary px-4 py-2.5">
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">Create system</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
