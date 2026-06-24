"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Sparkles } from "lucide-react";

type SearchRecord = { id: string; title: string; subtitle: string; type: string; href: string };

export default function WorkspaceSearchClient({ records }: { records: SearchRecord[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return records.slice(0, 12);
    return records.filter((record) => `${record.title} ${record.subtitle} ${record.type}`.toLowerCase().includes(normalized));
  }, [query, records]);

  return (
    <div className="ref-page">
      <header className="ref-header"><div><div className="ref-greeting"><Sparkles size={16} /> Search your actual workspace</div><h1>Search</h1><p className="ref-subtitle">Find tasks, projects, documents, workflows, and coworkers in one place.</p></div></header>
      <div className="ref-stack">
        <div className="ref-command"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search across Dobly..." /><button aria-label="Search"><ArrowRight /></button></div>
        <section className="ref-card">
          <div className="ref-section-title"><strong>{query ? "Search results" : "Recent workspace records"}</strong><span className="ref-pill">{results.length}</span></div>
          {results.map((record) => <Link className="ref-search-result" href={record.href} key={`${record.type}-${record.id}`}><span className="ref-pill">{record.type}</span><div><strong>{record.title}</strong><small>{record.subtitle}</small></div><ArrowRight size={15} /></Link>)}
          {!results.length ? <div className="ref-empty-state"><Search /><h2>No matches</h2><p>Try a project, task, document, workflow, or coworker name.</p></div> : null}
        </section>
      </div>
    </div>
  );
}
