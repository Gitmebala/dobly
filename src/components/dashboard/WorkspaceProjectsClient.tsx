"use client";

import { useState } from "react";
import { ArrowRight, Folder, Plus, Sparkles, X } from "lucide-react";

type Project = {
  id: string;
  name: string;
  description?: string;
  status: "active" | "paused" | "completed";
  progress: number;
};

export default function WorkspaceProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function createProject() {
    if (!name.trim()) return;
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const result = await response.json();
    if (response.ok) {
      setProjects((current) => [result.project, ...current]);
      setName("");
      setCreating(false);
    }
  }

  return (
    <div className="ref-page">
      <header className="ref-header">
        <div>
          <div className="ref-greeting"><Sparkles size={16} /> Outcomes in motion</div>
          <h1>Projects</h1>
          <p className="ref-subtitle">Group work around outcomes, owners, and visible progress.</p>
        </div>
        <button className="ref-button primary" onClick={() => setCreating(true)}><Plus size={16} /> New project</button>
      </header>

      <div className="ref-stack">
        {creating ? (
          <section className="ref-card ref-panel">
            <div className="ref-between"><strong>Create project</strong><button onClick={() => setCreating(false)} aria-label="Close"><X size={17} /></button></div>
            <div className="ref-row" style={{ marginTop: 14 }}>
              <input className="ref-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" autoFocus />
              <button className="ref-button primary" onClick={createProject}>Create</button>
            </div>
          </section>
        ) : null}

        {projects.length ? (
          <section className="ref-grid-3">
            {projects.map((project) => (
              <article className="ref-card ref-project" key={project.id}>
                <span className="ref-icon"><Folder /></span>
                <h3>{project.name}</h3>
                <p>{project.description || "No description yet"} · {project.status}</p>
                <div className="ref-progress-line"><i style={{ width: `${project.progress || 0}%` }} /></div>
                <a href={`/dashboard/tasks?project=${project.id}`}>View tasks <ArrowRight size={14} /></a>
              </article>
            ))}
          </section>
        ) : (
          <section className="ref-card ref-empty-state"><Sparkles /><h2>No projects yet</h2><p>Create an outcome and attach tasks, Operators, and documents as the work grows.</p></section>
        )}
      </div>
    </div>
  );
}
