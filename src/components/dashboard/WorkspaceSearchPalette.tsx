"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bot, FileText, FolderKanban, ListTodo, Loader2, Search, Workflow, X } from "lucide-react";
import { WORKSPACE_SEARCH_INDEX } from "@/lib/workspace-search-index";

type RecordResult = {
  id: string;
  label: string;
  description: string;
  type: string;
  href: string;
};

const recordIcons: Record<string, typeof Search> = {
  Task: ListTodo,
  Project: FolderKanban,
  Document: FileText,
  Workflow,
  Coworker: Bot,
};

export function WorkspaceSearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<RecordResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);

  const destinations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return WORKSPACE_SEARCH_INDEX.slice(0, 12);
    return WORKSPACE_SEARCH_INDEX.filter((item) =>
      `${item.label} ${item.description} ${item.category} ${item.keywords}`.toLowerCase().includes(normalized),
    ).slice(0, 18);
  }, [query]);

  const results = useMemo(() => [
    ...destinations.map((item) => ({ ...item, resultType: item.category })),
    ...records.map((item) => ({ ...item, resultType: item.type, icon: recordIcons[item.type] ?? Search })),
  ], [destinations, records]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = await response.json().catch(() => ({}));
        if (response.ok) setRecords(data.records ?? []);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query ? 160 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  useEffect(() => {
    if (selected >= results.length) setSelected(Math.max(0, results.length - 1));
  }, [results.length, selected]);

  if (!open) return null;

  function choose(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div className="workspace-search-layer" role="dialog" aria-modal="true" aria-label="Search Dobly">
      <button type="button" className="workspace-search-scrim" onClick={onClose} aria-label="Close search" />
      <section className="workspace-search-palette">
        <header className="workspace-search-input-row">
          <Search />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSelected(0); }}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "ArrowDown" && results.length) { event.preventDefault(); setSelected((current) => Math.min(results.length - 1, current + 1)); }
              if (event.key === "ArrowUp" && results.length) { event.preventDefault(); setSelected((current) => Math.max(0, current - 1)); }
              if (event.key === "Enter" && results[selected]) { event.preventDefault(); choose(results[selected].href); }
            }}
            placeholder="Find anything in Dobly..."
            aria-label="Search workspace"
          />
          {loading ? <Loader2 className="workspace-search-spinner" /> : null}
          <button type="button" onClick={onClose} aria-label="Close search"><X /></button>
        </header>

        <div className="workspace-search-results">
          <div className="workspace-search-result-heading">
            <span>{query ? "Results" : "Quick access"}</span>
            <small>{results.length} found</small>
          </div>
          {results.map((result, index) => {
            const Icon = result.icon;
            return (
              <Link
                href={result.href}
                key={result.id}
                data-selected={selected === index}
                onMouseEnter={() => setSelected(index)}
                onClick={onClose}
                className="workspace-search-result"
              >
                <i><Icon /></i>
                <span><strong>{result.label}</strong><small>{result.description}</small></span>
                <em>{result.resultType}</em>
                <ArrowRight />
              </Link>
            );
          })}
          {!results.length && !loading ? (
            <div className="workspace-search-empty"><Search /><strong>No matches</strong><span>Try a page, coworker, task, project, document, or workflow.</span></div>
          ) : null}
        </div>
        <footer className="workspace-search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Move</span><span><kbd>Enter</kbd> Open</span><span><kbd>Esc</kbd> Close</span></footer>
      </section>
    </div>
  );
}
