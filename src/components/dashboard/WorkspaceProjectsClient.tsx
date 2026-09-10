"use client";

import { useState } from "react";
import { ArrowRight, Folder, Loader2, Plus, Sparkles, X } from "lucide-react";
import { apiSend } from "@/lib/api-client";

type Project = {
  id: string;
  name: string;
  description?: string;
  status: "active" | "paused" | "completed";
  progress: number;
  taskCount: number;
  currency?: string;
  budget_minor?: number | null;
};

export default function WorkspaceProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function createProject() {
    if (!name.trim() || saving) return;
    setError(null);

    // parseFloat returns NaN for anything non-numeric ("1,000", "ksh 500"),
    // and JSON.stringify turns NaN into null - so a mistyped budget was
    // silently saved as no budget at all rather than being questioned.
    let budgetMinor: number | null = null;
    if (budget.trim()) {
      const parsed = Number(budget.replace(/[,\s]/g, ""));
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("Enter the budget as a plain number, for example 15000.");
        return;
      }
      budgetMinor = Math.round(parsed * 100);
    }

    setSaving(true);
    // Failure used to be entirely silent: `if (response.ok)` with no else.
    const outcome = await apiSend<{ project: Project }>("/api/projects", {
      name: name.trim(),
      budgetMinor,
    });
    setSaving(false);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    setProjects((current) => [outcome.data.project, ...current]);
    setName("");
    setBudget("");
    setCreating(false);
  }

  return (
    <div className="ref-page">
      <header className="ref-header">
        <div>
          <div className="ref-greeting"><Sparkles size={16} /> Outcomes in motion</div>
          <h1>Projects</h1>
          <p className="ref-subtitle">Group work around outcomes, owners, and progress that comes from real tasks.</p>
        </div>
        <button className="ref-button primary" onClick={() => setCreating(true)}><Plus size={16} /> New project</button>
      </header>

      <div className="ref-stack">
        {creating ? (
          <section className="ref-card ref-panel">
            <div className="ref-between"><strong>Create project</strong><button onClick={() => setCreating(false)} aria-label="Close"><X size={17} /></button></div>
            <div className="ref-row" style={{ marginTop: 14, gap: 10 }}>
              <input className="ref-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" autoFocus />
              <input className="ref-input" style={{ maxWidth: 160 }} value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Budget (KES)" inputMode="decimal" />
              <button className="ref-button primary" onClick={createProject} disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : null} {saving ? "Creating..." : "Create"}</button>
              {error ? <p role="alert" style={{ marginTop: 10, fontSize: 13, color: "var(--ui-danger)" }}>{error}</p> : null}
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
                {typeof project.budget_minor === "number" && project.budget_minor > 0 ? (
                  <p className="ref-muted" style={{ marginTop: -6, fontSize: 12 }}>
                    Budget: {project.currency ?? "KES"} {(project.budget_minor / 100).toLocaleString()}
                  </p>
                ) : null}
                <div className="ref-progress-line"><i style={{ width: `${project.progress || 0}%` }} /></div>
                <div className="ref-between" style={{ marginTop: 6 }}>
                  <small className="ref-muted">{project.progress}% · {project.taskCount} task{project.taskCount === 1 ? "" : "s"}</small>
                  <a href={`/dashboard/tasks?project=${project.id}`}>View tasks <ArrowRight size={14} /></a>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="ref-card ref-empty-state"><Sparkles /><h2>No projects yet</h2><p>Create an outcome and attach tasks, coworkers, and documents as the work grows.</p></section>
        )}
      </div>
    </div>
  );
}
