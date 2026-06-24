"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  FileText,
  Inbox,
  Lightbulb,
  ListTodo,
  MessageSquareText,
  Plus,
  Sparkles,
} from "lucide-react";

type InboxItem = { id: string; content: string; detected_type: string; status: string; created_at: string };

const captureStarters = [
  { label: "Task", text: "I need to ", icon: ListTodo },
  { label: "Idea", text: "An idea worth exploring: ", icon: Lightbulb },
  { label: "Note", text: "Remember this: ", icon: FileText },
  { label: "Follow-up", text: "Follow up with ", icon: MessageSquareText },
];

export default function WorkspaceInboxClient({ initialItems }: { initialItems: InboxItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    items.forEach((item) => { result[item.detected_type || "note"] = (result[item.detected_type || "note"] ?? 0) + 1; });
    return result;
  }, [items]);

  async function capture() {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), detectedType: detectType(content) }),
      });
      const result = await response.json();
      if (response.ok) {
        setItems((current) => [result.item, ...current]);
        setContent("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function organize(item: InboxItem, destination: "task" | "document" | "archive") {
    const response = await fetch("/api/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, destination }),
    });
    if (response.ok) setItems((current) => current.filter((candidate) => candidate.id !== item.id));
  }

  return (
    <div className="ref-page inbox-page">
      <header className="ref-header">
        <div>
          <div className="ref-greeting"><Sparkles size={16} /> Capture first, organize with context</div>
          <h1>Inbox</h1>
          <p className="ref-subtitle">A landing place for unfinished thoughts before Dobly turns them into useful work.</p>
        </div>
        <Link href="/dashboard/tasks" className="ref-button">Open work <ArrowRight size={15} /></Link>
      </header>

      <section className="inbox-capture">
        <div className="inbox-capture-main">
          <span className="inbox-capture-icon"><Plus /></span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Drop in a request, thought, voice-note summary, customer message, or loose end..."
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") capture();
            }}
          />
          <button onClick={capture} disabled={!content.trim() || saving} aria-label="Capture item">
            {saving ? <Sparkles className="animate-pulse" /> : <ArrowRight />}
          </button>
        </div>
        <div className="inbox-starters">
          <span>Start with</span>
          {captureStarters.map((starter) => {
            const Icon = starter.icon;
            return <button type="button" key={starter.label} onClick={() => setContent(starter.text)}><Icon /> {starter.label}</button>;
          })}
          <kbd>Ctrl Enter</kbd>
        </div>
      </section>

      <section className="inbox-overview">
        <div><strong>{items.length}</strong><span>Unsorted</span></div>
        <div><strong>{counts.task ?? 0}</strong><span>Likely tasks</span></div>
        <div><strong>{counts.idea ?? 0}</strong><span>Ideas</span></div>
        <div><strong>{counts.note ?? 0}</strong><span>Notes</span></div>
      </section>

      <div className="inbox-layout">
        <main className="ref-card inbox-list">
          <div className="ref-section-title">
            <div><strong>To organize</strong><small>Dobly suggests a destination; you stay in control.</small></div>
            <span className="ref-pill">{items.length}</span>
          </div>
          {items.length ? items.map((item) => (
            <article className="inbox-item" key={item.id}>
              <span className="inbox-item-icon">{iconFor(item.detected_type)}</span>
              <div className="inbox-item-copy">
                <strong>{item.content}</strong>
                <small>{humanType(item.detected_type)} · captured {relativeTime(item.created_at)}</small>
              </div>
              <div className="inbox-item-actions">
                <button onClick={() => organize(item, "task")}><ListTodo /> Task</button>
                <button onClick={() => organize(item, "document")}><FileText /> Note</button>
                <button onClick={() => organize(item, "archive")} aria-label="Archive"><Archive /></button>
              </div>
            </article>
          )) : (
            <div className="inbox-clear-state">
              <span><CheckCircle2 /></span>
              <h2>Everything has a place</h2>
              <p>Your inbox is clear. Capture freely here; Dobly can help route each item into work, knowledge, or follow-up.</p>
              <button type="button" className="ref-button primary" onClick={() => setContent("I need Dobly to ")}>Capture the next thing</button>
            </div>
          )}
        </main>

        <aside className="inbox-rail">
          <section className="ref-card ref-panel">
            <strong>Where things go</strong>
            <div className="inbox-destinations">
              <Link href="/dashboard/tasks"><ListTodo /><span><strong>Tasks</strong><small>Committed work with an owner and state</small></span><ArrowRight /></Link>
              <Link href="/dashboard/documents"><FileText /><span><strong>Knowledge</strong><small>Notes, references, and durable context</small></span><ArrowRight /></Link>
              <Link href="/dashboard/projects"><Sparkles /><span><strong>Projects</strong><small>Related work organized around an outcome</small></span><ArrowRight /></Link>
            </div>
          </section>
          <section className="ref-card ref-panel inbox-philosophy">
            <Inbox />
            <strong>Messy input is allowed</strong>
            <p>The inbox should lower the cost of remembering something. Structure comes after capture, not before it.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function detectType(value: string) {
  const text = value.toLowerCase();
  if (/follow up|reply|call|email/.test(text)) return "follow_up";
  if (/idea|explore|maybe|what if/.test(text)) return "idea";
  if (/need to|task|finish|send|prepare|review/.test(text)) return "task";
  return "note";
}

function iconFor(type: string) {
  if (type === "task") return <ListTodo />;
  if (type === "idea") return <Lightbulb />;
  if (type === "follow_up") return <MessageSquareText />;
  return <FileText />;
}

function humanType(type: string) {
  return (type || "note").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(delta / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
