"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignOutButton({
  className = "",
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const router = useRouter();

  async function signOut() {
    // Always leave, even if the request fails. An unguarded await meant a
    // rejected fetch (offline, dropped connection) threw before the redirect,
    // so the Sign out button simply did nothing at all - the one action where
    // appearing to be ignored is least acceptable.
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignored on purpose: the redirect below still runs, and middleware
      // sends the user back here if the session somehow survived.
    }
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} className={className} aria-label="Sign out" title="Sign out">
      <LogOut className="h-4 w-4" />
      {showLabel ? <span>Sign out</span> : null}
    </button>
  );
}
