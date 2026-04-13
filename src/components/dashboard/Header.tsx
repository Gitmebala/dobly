import Link from "next/link";
import { Bell, Sparkles, Wand2 } from "lucide-react";
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
      <div className="surface-panel flex min-h-[88px] items-center justify-between rounded-[1.75rem] px-5 py-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Dobly runtime</div>
          <p className="mt-2 text-sm text-text-muted sm:text-base">
            {greeting},{" "}
            <span className="font-display font-semibold text-text">{firstName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {profile?.plan === "free" ? (
            <Link
              href="/pricing"
              className="hidden items-center gap-2 rounded-full border border-accent/30 bg-accent-dim px-4 py-2 text-sm text-text sm:inline-flex"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Upgrade plan
            </Link>
          ) : null}

          <ThemeToggle compact />

          <Link
            href="/dashboard/notifications"
            className="theme-chip h-10 w-10 justify-center px-0"
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
