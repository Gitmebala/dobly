"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { BrainCircuit, Loader2, PencilLine, Plus, Search, Sparkles, X } from "lucide-react";
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

// The business brain has 15 real kinds (business_profile, faq, policy,
// tone, decision, ...) - too granular to scan as a wall. Grouped here
// into the mental model the founder asked for: not a re-labeling of
// fake data, just a coarser view over the same real taxonomy every
// item already carries.
type MemoryGroup = "rules" | "knowledge" | "decisions" | "voice";

const GROUP_LABEL: Record<MemoryGroup, string> = {
  rules: "Rules",
  knowledge: "Knowledge",
  decisions: "Decisions",
  voice: "Voice",
};

const KIND_TO_GROUP: Record<BusinessMemoryKind, MemoryGroup> = {
  policy: "rules",
  escalation_rule: "rules",
  sales_rule: "rules",
  support_rule: "rules",
  finance_rule: "rules",
  business_profile: "knowledge",
  service: "knowledge",
  product: "knowledge",
  faq: "knowledge",
  customer_note: "knowledge",
  capability_profile: "knowledge",
  worker_marketplace_item: "knowledge",
  decision: "decisions",
  tone: "voice",
  content_example: "voice",
};

const GROUP_ORDER: MemoryGroup[] = ["rules", "knowledge", "decisions", "voice"];

function timeAgo(iso: string) {
  const ms = Date.now() - Date.parse(iso);
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 1) return "moments ago";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function BusinessMemoryClient() {
  const [items, setItems] = useState<BusinessMemoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [kind, setKind] = useState<BusinessMemoryKind>("faq");
  const [scope, setScope] = useState<BusinessMemoryScope>("global");
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<MemoryGroup | "all">("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // The brain browses on arrival - it already knows things, it isn't
  // a database you query before it'll show you anything. The old
  // default (only "board-directive" scope, and only once you clicked
  // Load) is why this page always read as "No memory loaded yet."
  useEffect(() => {
    loadMemory("");
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
    setComposerOpen(true);
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
      setComposerOpen(false);
      setMessage(payload.id ? "Updated. Coworkers use the new version immediately." : "Saved. Coworkers can use this now.");
    });
  }

  function loadMemory(search: string) {
    setMessage(null);
    startTransition(async () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      params.set("limit", "60");

      const response = await fetch(`/api/business-memory?${params.toString()}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result?.setupWarning ?? result?.error ?? "Memory could not be loaded.");
        setLoaded(true);
        return;
      }

      setItems(result.items ?? []);
      setLoaded(true);
    });
  }

  const grouped = useMemo(() => {
    const counts: Record<MemoryGroup, number> = { rules: 0, knowledge: 0, decisions: 0, voice: 0 };
    for (const item of items) counts[KIND_TO_GROUP[item.kind]] += 1;
    const visible = groupFilter === "all" ? items : items.filter((item) => KIND_TO_GROUP[item.kind] === groupFilter);
    const byGroup = new Map<MemoryGroup, BusinessMemoryItem[]>();
    for (const item of visible) {
      const group = KIND_TO_GROUP[item.kind];
      if (!byGroup.has(group)) byGroup.set(group, []);
      byGroup.get(group)!.push(item);
    }
    return { counts, byGroup };
  }, [items, groupFilter]);

  const recentlyChanged = useMemo(() => items.slice(0, 4), [items]);
  const mostRecentAt = items[0]?.updated_at;

  return (
    <div className="memory-workspace">
      <div className="memory-toolbar">
        <form
          className="memory-search"
          onSubmit={(event) => {
            event.preventDefault();
            loadMemory(query.trim());
          }}
        >
          <Search aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search everything..." aria-label="Search the business brain" />
        </form>
        <button
          type="button"
          className="memory-teach-button"
          onClick={() => {
            resetComposer();
            setComposerOpen(true);
          }}
        >
          <Plus aria-hidden="true" /> Teach Dobly
        </button>
      </div>

      <div className="memory-group-chips" role="tablist" aria-label="Filter by kind of knowledge">
        <button type="button" data-active={groupFilter === "all"} onClick={() => setGroupFilter("all")}>
          All <em>{items.length}</em>
        </button>
        {GROUP_ORDER.filter((group) => grouped.counts[group] > 0 || groupFilter === group).map((group) => (
          <button key={group} type="button" data-active={groupFilter === group} onClick={() => setGroupFilter(group)}>
            {GROUP_LABEL[group]} <em>{grouped.counts[group]}</em>
          </button>
        ))}
      </div>

      {message ? <p className="ref-muted memory-message">{message}</p> : null}

      <div className="memory-layout">
        <main className="memory-list-main">
          {!loaded ? (
            <div className="ref-empty-state">
              <Loader2 className="animate-spin" />
              <h2>Reading the business brain…</h2>
            </div>
          ) : items.length === 0 ? (
            <div className="ref-empty-state">
              <Sparkles />
              <h2>Dobly doesn't know anything yet</h2>
              <p>Teach it a policy, an FAQ answer, a decision, or how the business should sound - every coworker whose work matches will use it.</p>
              <button type="button" className="ref-button primary" onClick={() => setComposerOpen(true)}>
                <Plus size={15} /> Teach Dobly something
              </button>
            </div>
          ) : (
            GROUP_ORDER.filter((group) => grouped.byGroup.has(group)).map((group) => (
              <section key={group} className="memory-group-section">
                <h2>{GROUP_LABEL[group]}</h2>
                <div className="memory-item-list">
                  {grouped.byGroup.get(group)!.map((item) => (
                    <article key={item.id} className="memory-row">
                      <button type="button" className="memory-row-main" onClick={() => beginEdit(item)}>
                        <strong>{item.title}</strong>
                        <span>{item.body}</span>
                      </button>
                      <div className="memory-row-meta">
                        <span className="ref-pill">{item.scope.replaceAll("_", " ")}</span>
                        <time>{timeAgo(item.updated_at)}</time>
                        <button type="button" onClick={() => beginEdit(item)} aria-label={`Edit ${item.title}`}>
                          <PencilLine size={13} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </main>

        <aside className="memory-side">
          <div className="ref-card memory-side-card">
            <span className="memory-side-label">Brain overview</span>
            <strong className="memory-side-total">{items.length} thing{items.length === 1 ? "" : "s"} Dobly knows</strong>
            {mostRecentAt ? <p className="ref-muted">Updated {timeAgo(mostRecentAt)}</p> : null}
            <div className="memory-side-breakdown">
              {GROUP_ORDER.filter((group) => grouped.counts[group] > 0).map((group) => (
                <div key={group}>
                  <span>{GROUP_LABEL[group]}</span>
                  <strong>{grouped.counts[group]}</strong>
                </div>
              ))}
            </div>
          </div>

          {recentlyChanged.length ? (
            <div className="ref-card memory-side-card">
              <span className="memory-side-label">Recently changed</span>
              <div className="memory-side-recent">
                {recentlyChanged.map((item) => (
                  <button type="button" key={item.id} onClick={() => beginEdit(item)}>
                    <strong>{item.title}</strong>
                    <small>{timeAgo(item.updated_at)}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="ref-card memory-side-card memory-starters-card">
            <span className="memory-side-label">Starter memory</span>
            <div className="memory-starters">
              {STARTER_MEMORY.map((item) => (
                <button key={item.title} type="button" onClick={() => saveMemory({ ...item })} className="memory-starter-row">
                  Add: {item.title}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {composerOpen ? (
        <div className="memory-composer-overlay" role="dialog" aria-label={editingId ? "Edit memory" : "Teach Dobly"}>
          <button type="button" className="memory-composer-scrim" aria-label="Close" onClick={() => setComposerOpen(false)} />
          <section className="ref-card memory-composer">
            <header className="memory-composer-head">
              <div className="ref-pill"><BrainCircuit size={12} /> {editingId ? "Edit memory" : "Teach Dobly"}</div>
              <button type="button" onClick={() => setComposerOpen(false)} aria-label="Close">
                <X aria-hidden="true" />
              </button>
            </header>
            <h2>{editingId ? "Update what Dobly knows." : "Teach Dobly how the business works."}</h2>
            <p className="ref-muted">Every coworker whose work matches the scope below can use this.</p>

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

            <div className="memory-composer-actions">
              {editingId ? (
                <button type="button" onClick={() => { resetComposer(); setComposerOpen(false); }} className="ref-button">Cancel</button>
              ) : null}
              <button
                type="button"
                onClick={() => saveMemory()}
                disabled={isPending || title.trim().length < 2 || body.trim().length < 2}
                className="ref-button primary memory-save-button"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {editingId ? "Save changes" : "Save memory"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
