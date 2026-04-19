"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bot, Home, Sparkles, Workflow } from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/create", label: "Create", icon: Sparkles },
  { href: "/dashboard/automations", label: "Flows", icon: Workflow },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/notifications", label: "Alerts", icon: Bell },
];

export default function MobileDock() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
      <div className="surface-panel flex items-center justify-between rounded-[1.7rem] px-2 py-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname?.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.1rem] px-2 py-2 text-[11px] transition-all ${
                active
                  ? "bg-[rgba(77,122,255,0.16)] text-white"
                  : "text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
