"use client";

import { useEffect, useState, useTransition } from "react";
import { Brain, Loader2, PencilLine, Plus, Search, Sparkles } from "lucide-react";
import type {
  BusinessMemoryItem,
  BusinessMemoryKind,
  BusinessMemoryScope,
} from "@/lib/business-memory";
import {
  BUSINESS_MEMORY_KINDS,
  BUSINESS_MEMORY_SCOPES,
} from "@/lib/business-memory";

const STARTER_MEMORY: Array<{
  kind: BusinessMemoryKind;
  scope: BusinessMemoryScope;
  title: string;
  body: string;
  tags: string[];
}> = [
  {
    kind: "tone",
    scope: "global",
    title: "Business voice",
    body: "Friendly, direct, helpful, and confident. Avoid overpromising. Escalate uncertainty instead of guessing.",
    tags: ["tone", "brand"],
  },
  {
    kind: "escalation_rule",
    scope: "global",
    title: "Escalate sensitive actions",
    body: "Ask for owner approval before refunds, discounts, legal claims, angry customer replies, payment changes, or public publishing.",
    tags: ["approval", "risk"],
  },
  {
    kind: "sales_rule",
    scope: "sales",
    title: "Lead follow-up standard",
    body: "New leads should receive a meaningful response quickly, then a polite follow-up if they do not reply.",
    tags: ["sales", "follow-up"],
  },
];

export default function BusinessMemoryClient() {
  const [items, setItems] = useState<BusinessMemoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [kind, setKind] = useState<BusinessMemoryKind>("faq");
  const [scope, setScope] = useState<BusinessMemoryScope>("global");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadMemory("board-directive");
  }, []);

  function resetComposer() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setTags("");
    setKind("faq");
    setScope("global");
  }

  function beginEdit(item: BusinessMemoryItem) {
    setEditingId(item.id);
    setKind(item.kind);
    setScope(item.scope);
    setTitle(item.title);
    setBody(item.body);
    setTags(item.tags.join(", "));
    setMessage(`Editing ${item.title}`);
  }

  function saveMemory(input?: {
    id?: string;
    kind: BusinessMemoryKind;
    scope: BusinessMemoryScope;
    title: string;
    body: string;
    tags: string[];
  }) {
    const payload = input ?? {
      id: editingId ?? undefined,
      kind,
      scope,
      title,
      body,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/business-memory", {
        method: payload.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result?.setupWarning ?? result?.error ?? "Memory could not be saved.");
        return;
      }

      setItems((current) => {
        const existingIndex = current.findIndex((item) => item.id === result.item.id);
        if (existingIndex >= 0) {
          return current.map((item) => (item.id === result.item.id ? result.item : item));
        }
        return [result.item, ...current];
      });
      resetComposer();
      setMessage(payload.id ? "Memory updated. Dobly will use the new rule immediately." : "Memory saved. Department workers can use this context.");
    });
  }

  function loadMemory(search = query.trim()) {
    setMessage(null);
    startTransition(async () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      params.set("limit", "30");

      const response = await fetch(`/api/business-memory?${params.toString()}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result?.setupWarning ?? result?.error ?? "Memory could not be loaded.");
        return;
      }

      setItems(result.items ?? []);
      setMessage(`${result.items?.length ?? 0} memory items loaded.`);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="card h-fit">
        <div className="badge-muted text-xs">
          <Brain className="h-3.5 w-3.5" />
          Business brain
        </div>
        <h2 className="mt-4 font-display text-2xl tracking-[-0.04em] text-[var(--dobly-text)]">
          Teach Dobly how the business works.
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--dobly-text-secondary)]">
          This memory powers voice agents, chatbots, automations, approvals, content workers, the General Manager,
          and the Boardroom.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs text-[var(--dobly-text-dim)]">Kind</span>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as BusinessMemoryKind)}
              className="min-h-[46px] w-full rounded-xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.035)] px-3 text-sm text-[var(--dobly-text)] outline-none"
            >
              {BUSINESS_MEMORY_KINDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-[var(--dobly-text-dim)]">Scope</span>
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as BusinessMemoryScope)}
              className="min-h-[46px] w-full rounded-xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.035)] px-3 text-sm text-[var(--dobly-text)] outline-none"
            >
              {BUSINESS_MEMORY_SCOPES.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title, for example: Refund policy"
          className="mt-4 min-h-[48px] w-full rounded-xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.035)] px-4 text-sm text-[var(--dobly-text)] outline-none placeholder:text-[var(--dobly-text-dim)]"
        />
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write the rule, FAQ answer, service detail, customer note, brand voice example, or decision Dobly should remember."
          className="mt-3 min-h-[150px] w-full resize-none rounded-xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.035)] px-4 py-3 text-sm leading-6 text-[var(--dobly-text)] outline-none placeholder:text-[var(--dobly-text-dim)]"
        />
        <input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="Tags separated by commas"
          className="mt-3 min-h-[48px] w-full rounded-xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.035)] px-4 text-sm text-[var(--dobly-text)] outline-none placeholder:text-[var(--dobly-text-dim)]"
        />

        <button
          type="button"
          onClick={() => saveMemory()}
          disabled={isPending || title.trim().length < 2 || body.trim().length < 2}
          className="btn-primary mt-4 w-full justify-center"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Save memory
        </button>

        <div className="mt-5 rounded-2xl border border-[rgba(196,80,26,0.18)] bg-[rgba(196,80,26,0.08)] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--dobly-text)]">
            <Sparkles className="h-4 w-4 text-[var(--dobly-accent)]" />
            Starter memory
          </div>
          <div className="mt-3 space-y-2">
            {STARTER_MEMORY.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => saveMemory({ ...item })}
                className="block w-full rounded-xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] px-3 py-2 text-left text-xs text-[var(--dobly-text-secondary)] transition hover:border-[rgba(196,80,26,0.3)]"
              >
                Add: {item.title}
              </button>
            ))}
          </div>
          {editingId ? (
            <button type="button" onClick={resetComposer} className="btn-secondary mt-3 w-full justify-center">
              Cancel edit
            </button>
          ) : null}
        </div>
      </section>

      <section className="space-y-5">
        <div className="card">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex min-h-[48px] flex-1 items-center gap-3 rounded-xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.035)] px-4">
              <Search className="h-4 w-4 text-[var(--dobly-text-dim)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search memory..."
                className="flex-1 bg-transparent text-sm text-[var(--dobly-text)] outline-none placeholder:text-[var(--dobly-text-dim)]"
              />
            </div>
            <button type="button" onClick={() => loadMemory()} disabled={isPending} className="btn-primary justify-center">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Load memory
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ["board-directive", "Board directives"],
              ["policy", "Policies"],
              ["sales", "Sales"],
              ["support", "Support"],
              ["finance", "Finance"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setQuery(value);
                  loadMemory(value);
                }}
                className="rounded-full border border-[rgba(242,232,220,0.08)] px-3 py-1.5 text-xs text-[var(--dobly-text-muted)] transition hover:border-[rgba(196,80,26,0.3)] hover:text-[var(--dobly-text)]"
              >
                {label}
              </button>
            ))}
          </div>
          {message ? <p className="mt-3 text-sm text-[var(--dobly-text-muted)]">{message}</p> : null}
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="card text-center">
              <h2 className="font-display text-xl text-[var(--dobly-text)]">No memory loaded yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--dobly-text-muted)]">
                Add a few rules, FAQs, services, or tone examples, then load memory to see the business brain.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <article key={item.id} className="card-hover">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-muted text-xs">{item.kind.replaceAll("_", " ")}</span>
                  <span className="badge-muted text-xs">{item.scope.replaceAll("_", " ")}</span>
                  {item.tags.map((tag) => (
                    <span key={tag} className="badge-muted text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="mt-3 font-display text-xl text-[var(--dobly-text)]">{item.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--dobly-text-secondary)]">{item.body}</p>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => beginEdit(item)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(242,232,220,0.08)] px-3 py-1.5 text-xs text-[var(--dobly-text-muted)] transition hover:border-[rgba(196,80,26,0.3)] hover:text-[var(--dobly-text)]"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
