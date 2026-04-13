"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, MoonStar, SunMedium } from "lucide-react";

type ThemeMode = "light" | "dark" | "system";

const OPTIONS: { value: ThemeMode; label: string; icon: typeof SunMedium }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: SunMedium },
  { value: "dark", label: "Dark", icon: MoonStar },
];

const STORAGE_KEY = "dobly-theme";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = mode === "system" ? (prefersDark ? "dark" : "light") : mode;

  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.dataset.theme = mode;
  root.style.colorScheme = resolved;
  window.localStorage.setItem(STORAGE_KEY, mode);
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootTheme = document.documentElement.dataset.theme as ThemeMode | undefined;
    setTheme(rootTheme ?? "system");

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      const current = (window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "system";
      if (current === "system") {
        applyTheme("system");
      }
    };

    const handleOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    media.addEventListener("change", syncSystemTheme);
    window.addEventListener("mousedown", handleOutside);

    return () => {
      media.removeEventListener("change", syncSystemTheme);
      window.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  const active = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[0]!;
  const ActiveIcon = active.icon;

  const chooseTheme = (mode: ThemeMode) => {
    setTheme(mode);
    applyTheme(mode);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`theme-chip ${compact ? "h-10 w-10 justify-center px-0" : ""}`}
        aria-label="Open theme switcher"
        aria-expanded={open}
      >
        <ActiveIcon className="h-4 w-4" />
        {!compact ? <span className="hidden sm:inline">{active.label}</span> : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-44 rounded-[1.25rem] border border-border bg-surface/92 p-2 shadow-[0_24px_80px_rgba(11,15,27,0.24)] backdrop-blur-2xl">
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => chooseTheme(value)}
                className={`flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-sm transition-all ${
                  selected
                    ? "bg-accent-dim text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
                    : "text-text-muted hover:bg-surface-1 hover:text-text"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
