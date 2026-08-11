"use client";

import { useEffect, useState, useTransition } from "react";
import { BrainCircuit, Loader2, PencilLine, Plus, Search, Sparkles } from "lucide-react";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setMessage(payload.id ? "Memory updated. Coworkers will use the new rule immediately." : "Memory saved. Coworkers can use this context now.");
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
    <div className="ref-page-grid memory-grid">
      <section className="ref-card memory-composer">
        <div className="ref-pill"><BrainCircuit size={12} /> Add memory</div>
        <h2>Teach Dobly how the business works.</h2>
        <p className="ref-muted">Every coworker whose department matches the scope below can use this.</p>

        <div className="memory-composer-row">
          <label>
            <span>Kind</span>
            <select className="ref-input" value={kind} onChange={(event) => setKind(event.target.value as BusinessMemoryKind)}>
              {BUSINESS_MEMORY_KINDS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Scope</span>
            <select className="ref-input" value={scope} onChange={(event) => setScope(event.target.value as BusinessMemoryScope)}>
              {BUSINESS_MEMORY_SCOPES.map((item) => (
                <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="memory-field">
          <span>Title</span>
          <input className="ref-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For example: Refund policy" />
        </label>
        <label className="memory-field">
          <span>Details</span>
          <textarea
            className="ref-input memory-textarea"
            rows={6}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write the rule, FAQ answer, service detail, customer note, brand-voice example, or decision Dobly should remember."
          />
        </label>
        <label className="memory-field">
          <span>Tags</span>
          <input className="ref-input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Tags separated by commas" />
        </label>

        <button
          type="button"
          onClick={() => saveMemory()}
          disabled={isPending || title.trim().length < 2 || body.trim().length < 2}
          className="ref-button primary memory-save-button"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {editingId ? "Save changes" : "Save memory"}
        </button>

        <div className="memory-starters">
          <div className="ref-greeting"><Sparkles size={14} /> Starter memory</div>
          {STARTER_MEMORY.map((item) => (
            <button key={item.title} type="button" onClick={() => saveMemory({ ...item })} className="memory-starter-row">
              Add: {item.title}
            </button>
          ))}
          {editingId ? (
            <button type="button" onClick={resetComposer} className="ref-button memory-cancel-edit">Cancel edit</button>
          ) : null}
        </div>
      </section>

      <section className="memory-results">
        <div className="ref-card">
          <div className="memory-search-row">
            <div className="ref-command memory-search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search memory…" />
            </div>
            <button type="button" onClick={() => loadMemory()} disabled={isPending} className="ref-button primary">
              {isPending ? <Loader2 size={16} className="animate-spin" /> : null} Load
            </button>
          </div>
          <div className="ref-chip-row memory-scope-chips">
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
                className={query === value ? "active" : ""}
                onClick={() => {
                  setQuery(value);
                  loadMemory(value);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {message ? <p className="ref-muted memory-message">{message}</p> : null}
        </div>

        {items.length === 0 ? (
          <div className="ref-empty-state">
            <Sparkles />
            <h2>No memory loaded yet</h2>
            <p>Add a few rules, FAQs, services, or tone examples, then load memory to see the business brain.</p>
          </div>
        ) : (
          <div className="memory-item-list">
            {items.map((item) => (
              <article key={item.id} className="ref-card memory-item">
                <div className="ref-chip-row">
                  <span className="ref-pill">{item.kind.replaceAll("_", " ")}</span>
                  <span className="ref-pill">{item.scope.replaceAll("_", " ")}</span>
                  {item.tags.map((tag) => <span key={tag} className="ref-pill">{tag}</span>)}
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <div className="memory-item-footer">
                  <button type="button" onClick={() => beginEdit(item)} className="ref-button">
                    <PencilLine size={13} /> Edit
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
