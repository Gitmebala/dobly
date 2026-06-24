"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Check, Circle, Clock3, Play, Plus, Sparkles, X } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "completed";
  due_at?: string | null;
};

export default function WorkspaceTasksClient({ initialTasks }: { initialTasks: Task[] }) {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState(initialTasks);
  const [creating, setCreating] = useState(searchParams?.get("create") === "true");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueAt, setDueAt] = useState("");
  const [filter, setFilter] = useState<"all" | Task["status"]>("all");
  const [error, setError] = useState("");
  const completed = useMemo(() => tasks.filter((task) => task.status === "completed").length, [tasks]);
  const visibleTasks = useMemo(
    () => filter === "all" ? tasks : tasks.filter((task) => task.status === filter),
    [filter, tasks],
  );

  async function createTask() {
    if (!title.trim()) return;
    setError("");
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      }),
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "Could not create task.");
    setTasks((current) => [result.task, ...current]);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueAt("");
    setCreating(false);
  }

  async function updateTaskStatus(task: Task, status: Task["status"]) {
    const response = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status }),
    });
    const result = await response.json();
    if (response.ok) setTasks((current) => current.map((item) => item.id === task.id ? result.task : item));
  }

  return (
    <div className="ref-page">
      <header className="ref-header">
        <div>
          <div className="ref-greeting"><Sparkles size={16} /> Workspace tasks</div>
          <h1>Tasks</h1>
          <p className="ref-subtitle">The shared queue for work you assigned and work your coworkers created.</p>
        </div>
        <button className="ref-button primary" onClick={() => setCreating(true)}><Plus size={16} /> Add task</button>
      </header>

      <div className="ref-stack">
        <section className="ref-card ref-progress">
          <div><b>{completed}</b><span>Completed</span></div>
          <div><b>{tasks.length - completed}</b><span>Remaining</span></div>
          <div><b>{tasks.filter((task) => task.priority === "high" && task.status !== "completed").length}</b><span>High priority</span></div>
          <div className="ref-muted">Progress is calculated from your actual workspace tasks.</div>
        </section>

        {creating ? (
          <section className="ref-card ref-panel task-composer">
            <div className="ref-between">
              <strong>New task</strong>
              <button onClick={() => setCreating(false)} aria-label="Close"><X size={17} /></button>
            </div>
            <div className="task-composer-grid">
              <label className="task-title-field">
                <span>Task</span>
                <input className="ref-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to move forward?" autoFocus />
              </label>
              <label>
                <span>Priority</span>
                <select className="ref-input" value={priority} onChange={(event) => setPriority(event.target.value as Task["priority"])}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label>
                <span>Due</span>
                <input className="ref-input" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
              </label>
              <label className="task-description-field">
                <span>Notes</span>
                <textarea className="ref-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Context, outcome, or anything the coworker should know." />
              </label>
            </div>
            <div className="task-composer-actions">
              <button className="ref-button" onClick={() => setCreating(false)}>Cancel</button>
              <button className="ref-button primary" onClick={createTask}>Create task</button>
            </div>
            {error ? <p className="reference-auth__error">{error}</p> : null}
          </section>
        ) : null}

        <section className="ref-card">
          <div className="ref-section-title task-list-heading">
            <div><strong>Work queue</strong><small>{visibleTasks.length} shown</small></div>
            <div className="task-filters" aria-label="Task status">
              {(["all", "open", "in_progress", "completed"] as const).map((status) => (
                <button key={status} type="button" data-active={filter === status} onClick={() => setFilter(status)}>
                  {status === "in_progress" ? "In progress" : status[0].toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {visibleTasks.length ? visibleTasks.map((task) => (
            <div className={`ref-task-row ${task.status === "completed" ? "done" : ""}`} key={task.id}>
              <button className="ref-check" onClick={() => updateTaskStatus(task, task.status === "completed" ? "open" : "completed")} aria-label={task.status === "completed" ? "Reopen task" : "Complete task"}>
                {task.status === "completed" ? <Check size={13} /> : <Circle size={13} />}
              </button>
              <div><strong>{task.title}</strong><small>{task.description || "No additional details"}</small></div>
              <span className="task-due"><CalendarDays /> {task.due_at ? new Date(task.due_at).toLocaleString() : "No due date"}</span>
              <span className={`ref-pill ${task.priority === "low" ? "green" : "amber"}`}>{task.priority}</span>
              {task.status === "open" ? (
                <button className="task-start-button" onClick={() => updateTaskStatus(task, "in_progress")} aria-label="Start task"><Play /></button>
              ) : task.status === "in_progress" ? (
                <span className="task-running"><Clock3 /> Active</span>
              ) : <span />}
            </div>
          )) : (
            <div className="ref-empty-state"><Sparkles /><h2>{tasks.length ? "No tasks in this view" : "The queue is clear"}</h2><p>{tasks.length ? "Choose another status to see the rest of the work." : "Create a task or ask a coworker to take on the next outcome."}</p></div>
          )}
        </section>
      </div>
    </div>
  );
}
