"use client";

import { useState } from "react";
import { FileText, Loader2, Plus, Sparkles, X } from "lucide-react";
import { apiSend } from "@/lib/api-client";

type DocumentRecord = { id: string; title: string; content?: string; type: string; updated_at: string };

export default function WorkspaceDocumentsClient({ initialDocuments }: { initialDocuments: DocumentRecord[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function createDocument() {
    if (!title.trim() || saving) return;
    setError(null);
    setSaving(true);
    // Every failure path here used to be silent: `if (response.ok)` had no
    // else, so a rejected save simply left the composer sitting there as
    // though nothing had been clicked, and `response.json()` threw outright
    // on any non-JSON error page.
    const outcome = await apiSend<{ document: DocumentRecord }>("/api/documents", {
      title: title.trim(),
      content,
      type: "note",
    });
    setSaving(false);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    setDocuments((current) => [outcome.data.document, ...current]);
    setTitle("");
    setContent("");
    setCreating(false);
  }

  return (
    <div className="ref-page">
      <header className="ref-header"><div><div className="ref-greeting"><Sparkles size={16} /> Workspace knowledge</div><h1>Documents</h1><p className="ref-subtitle">Notes, artifacts, and generated work available to Dobly and your team.</p></div><button className="ref-button primary" onClick={() => setCreating(true)}><Plus size={16} /> Create note</button></header>
      <div className="ref-stack">
        {creating ? <section className="ref-card ref-panel"><div className="ref-between"><strong>New note</strong><button onClick={() => setCreating(false)}><X size={17} /></button></div><input className="ref-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" style={{ marginTop: 14 }} /><textarea className="ref-input ref-textarea" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write the context Dobly should remember..." /><button className="ref-button primary" onClick={createDocument} disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : null} {saving ? "Saving..." : "Save note"}</button>{error ? <p role="alert" style={{ marginTop: 10, fontSize: 13, color: "var(--ui-danger)" }}>{error}</p> : null}</section> : null}
        <section className="ref-card"><table className="ref-table"><thead><tr><th>Name</th><th>Type</th><th>Updated</th></tr></thead><tbody>{documents.map((document) => <tr key={document.id}><td><FileText size={16} /> {document.title}</td><td>{document.type}</td><td>{new Date(document.updated_at).toLocaleString()}</td></tr>)}</tbody></table>{!documents.length ? <div className="ref-empty-state"><FileText /><h2>No documents yet</h2><p>Create a note or organize an Inbox item into workspace knowledge.</p></div> : null}</section>
      </div>
    </div>
  );
}
