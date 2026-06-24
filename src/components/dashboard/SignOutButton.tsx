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
    await fetch("/api/auth/logout", { method: "POST" });
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
