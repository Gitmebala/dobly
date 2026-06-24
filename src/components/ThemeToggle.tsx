"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./providers/ThemeProvider";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />;
      case "dark":
        return <Moon className="h-4 w-4" />;
      case "system":
        return <Monitor className="h-4 w-4" />;
      default:
        return <Moon className="h-4 w-4" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "System";
      default:
        return "Dark";
    }
  };

  return (
    <button
      type="button"
      className="theme-chip"
      onClick={toggleTheme}
      aria-label={`Current theme: ${theme}. Click to toggle.`}
    >
      {getIcon()}
      {!compact ? <span className="hidden sm:inline">{getLabel()}</span> : null}
    </button>
  );
}