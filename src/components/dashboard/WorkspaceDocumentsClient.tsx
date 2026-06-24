"use client";

import { useState } from "react";
import { FileText, Plus, Sparkles, X } from "lucide-react";

type DocumentRecord = { id: string; title: string; content?: string; type: string; updated_at: string };

export default function WorkspaceDocumentsClient({ initialDocuments }: { initialDocuments: DocumentRecord[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function createDocument() {
    if (!title.trim()) return;
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), content, type: "note" }),
    });
    const result = await response.json();
    if (response.ok) {
      setDocuments((current) => [result.document, ...current]);
      setTitle("");
      setContent("");
      setCreating(false);
    }
  }

  return (
    <div className="ref-page">
      <header className="ref-header"><div><div className="ref-greeting"><Sparkles size={16} /> Workspace knowledge</div><h1>Documents</h1><p className="ref-subtitle">Notes, artifacts, and generated work available to Dobly and your team.</p></div><button className="ref-button primary" onClick={() => setCreating(true)}><Plus size={16} /> Create note</button></header>
      <div className="ref-stack">
        {creating ? <section className="ref-card ref-panel"><div className="ref-between"><strong>New note</strong><button onClick={() => setCreating(false)}><X size={17} /></button></div><input className="ref-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" style={{ marginTop: 14 }} /><textarea className="ref-input ref-textarea" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write the context Dobly should remember..." /><button className="ref-button primary" onClick={createDocument}>Save note</button></section> : null}
        <section className="ref-card"><table className="ref-table"><thead><tr><th>Name</th><th>Type</th><th>Updated</th></tr></thead><tbody>{documents.map((document) => <tr key={document.id}><td><FileText size={16} /> {document.title}</td><td>{document.type}</td><td>{new Date(document.updated_at).toLocaleString()}</td></tr>)}</tbody></table>{!documents.length ? <div className="ref-empty-state"><FileText /><h2>No documents yet</h2><p>Create a note or organize an Inbox item into workspace knowledge.</p></div> : null}</section>
      </div>
    </div>
  );
}
