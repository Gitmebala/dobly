"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  BookOpenText,
  CheckCircle2,
  Home,
  Inbox,
  Link2,
  ListTodo,
  Plus,
  Search,
  Settings,
  Workflow,
} from "lucide-react";

type PaletteItem = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const baseItems: PaletteItem[] = [
  { id: "hire", label: "Hire a coworker", hint: "describe a job", href: "/dashboard/coworkers?create=true", icon: Plus },
  { id: "home", label: "Home", href: "/dashboard", icon: Home },
  { id: "coworkers", label: "Coworkers", href: "/dashboard/coworkers", icon: Bot },
  { id: "approvals", label: "Approvals", hint: "waiting on you", href: "/dashboard/approvals", icon: CheckCircle2 },
  { id: "loops", label: "Loops", href: "/dashboard/workflows", icon: Workflow },
  { id: "briefings", label: "Briefings", href: "/dashboard/briefings", icon: BookOpenText },
  { id: "tasks", label: "Work", href: "/dashboard/tasks", icon: ListTodo },
  { id: "inbox", label: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { id: "connections", label: "Connections", href: "/dashboard/connections", icon: Link2 },
  { id: "settings", label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [coworkers, setCoworkers] = useState<PaletteItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetch("/api/operators")
        .then((response) => (response.ok ? response.json() : { operators: [] }))
        .then((data) => {
          const list = Array.isArray(data.operators) ? data.operators : [];
          setCoworkers(
            list.slice(0, 8).map((operator: { id: string; name: string; mission?: string }) => ({
              id: `coworker-${operator.id}`,
              label: operator.name,
              hint: operator.mission,
              href: `/dashboard/coworkers?operatorId=${operator.id}`,
              icon: Bot,
            })),
          );
        })
        .catch(() => undefined);
    }
  }, [open]);

  const items = useMemo(() => {
    const all = [...baseItems, ...coworkers];
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(needle) ||
        (item.hint ?? "").toLowerCase().includes(needle),
    );
  }, [query, coworkers]);

  const go = useCallback(
    (item: PaletteItem | undefined) => {
      if (!item) return;
      setOpen(false);
      router.push(item.href);
    },
    [router],
  );

  if (!open) return null;

  return (
    <div className="palette-scrim" onClick={() => setOpen(false)} role="presentation">
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="palette-input">
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((current) => Math.min(current + 1, items.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((current) => Math.max(current - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                go(items[active]);
              }
            }}
            placeholder="Where to? Try a coworker's name…"
            aria-label="Search pages and coworkers"
          />
          <code>esc</code>
        </div>
        <div className="palette-list" role="listbox">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={index === active}
                data-active={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(item)}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
                {item.hint ? <small>{item.hint}</small> : null}
              </button>
            );
          })}
          {!items.length ? <p>Nothing matches. Try a page name or a coworker.</p> : null}
        </div>
      </div>
    </div>
  );
}
