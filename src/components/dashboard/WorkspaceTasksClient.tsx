"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, CalendarDays, Check, Circle, Clock3, LayoutGrid, List, Plus, Sparkles, User, X } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "blocked" | "completed";
  due_at?: string | null;
  project_id?: string | null;
  parent_task_id?: string | null;
  assignee_user_id?: string | null;
  assignee_operator_id?: string | null;
};

type Person = { id: string; name: string };

const STATUS_COLUMNS: { key: Task["status"]; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "blocked", label: "Blocked" },
  { key: "completed", label: "Completed" },
];

export default function WorkspaceTasksClient({
  initialTasks,
  projects,
  operators,
  teammates,
}: {
  initialTasks: Task[];
  projects: Person[];
  operators: Person[];
  teammates: Person[];
}) {
  const searchParams = useSearchParams();
  const projectParam = searchParams?.get("project") ?? "";
  // Coming from a coworker's "Assign a task" quick action (?assignee=<operatorId>)
  // should actually preselect them, not just land on a blank form.
  const assigneeParam = searchParams?.get("assignee") ?? "";
  const [tasks, setTasks] = useState(initialTasks);
  const [creating, setCreating] = useState(searchParams?.get("create") === "true" || Boolean(assigneeParam));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueAt, setDueAt] = useState("");
  const [projectId, setProjectId] = useState(projectParam);
  const [assignee, setAssignee] = useState(assigneeParam ? `operator:${assigneeParam}` : ""); // "" | `user:<id>` | `operator:<id>`
  const [filter, setFilter] = useState<"all" | Task["status"]>("all");
  const [view, setView] = useState<"list" | "board">("list");
  const [projectFilter, setProjectFilter] = useState(projectParam);
  const [error, setError] = useState("");

  const operatorMap = useMemo(() => Object.fromEntries(operators.map((o) => [o.id, o.name])), [operators]);
  const teammateMap = useMemo(() => Object.fromEntries(teammates.map((t) => [t.id, t.name])), [teammates]);
  const projectMap = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p.name])), [projects]);

  const topLevelTasks = useMemo(() => tasks.filter((t) => !t.parent_task_id), [tasks]);
  const subtasksByParent = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (task.parent_task_id) {
        (map[task.parent_task_id] ??= []).push(task);
      }
    }
    return map;
  }, [tasks]);

  const completed = useMemo(() => topLevelTasks.filter((t) => t.status === "completed").length, [topLevelTasks]);
  const visibleTasks = useMemo(() => {
    let list = topLevelTasks;
    if (projectFilter) list = list.filter((t) => t.project_id === projectFilter);
    if (filter !== "all") list = list.filter((t) => t.status === filter);
    return list;
  }, [topLevelTasks, filter, projectFilter]);

  function assigneeLabel(task: Task) {
    if (task.assignee_operator_id) return { label: operatorMap[task.assignee_operator_id] ?? "Coworker", icon: Bot, kind: "coworker" as const };
    if (task.assignee_user_id) return { label: teammateMap[task.assignee_user_id] ?? "Teammate", icon: User, kind: "human" as const };
    return null;
  }

  async function createTask() {
    if (!title.trim()) return;
    setError("");
    const [assignKind, assignId] = assignee.split(":");
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        projectId: projectId || null,
        assigneeUserId: assignKind === "user" ? assignId : null,
        assigneeOperatorId: assignKind === "operator" ? assignId : null,
      }),
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "Could not create task.");
    setTasks((current) => [result.task, ...current]);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueAt("");
    setAssignee("");
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
    <div className="ref-page tasks-page">
      <header className="ref-header">
        <div>
          <div className="ref-greeting"><Sparkles size={16} /> Your work table</div>
          <h1>Tasks</h1>
          <p className="ref-subtitle">Assign to a teammate to track it, or to a coworker to have it done.</p>
        </div>
        <div className="task-header-actions">
          <div className="task-view-toggle" role="tablist" aria-label="View">
            <button type="button" data-active={view === "list"} onClick={() => setView("list")} aria-label="List view"><List size={15} /></button>
            <button type="button" data-active={view === "board"} onClick={() => setView("board")} aria-label="Board view"><LayoutGrid size={15} /></button>
          </div>
          <button className="ref-button primary" onClick={() => setCreating(true)}><Plus size={16} /> Add task</button>
        </div>
      </header>

      <div className="ref-stack">
        <section className="ref-card ref-progress">
          <div><b>{completed}</b><span>Completed</span></div>
          <div><b>{topLevelTasks.length - completed}</b><span>Remaining</span></div>
          <div><b>{topLevelTasks.filter((t) => t.assignee_operator_id && t.status !== "completed").length}</b><span>With a coworker</span></div>
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
              <label>
                <span>Project</span>
                <select className="ref-input" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                  <option value="">No project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label>
                <span>Assign to</span>
                <select className="ref-input" value={assignee} onChange={(event) => setAssignee(event.target.value)}>
                  <option value="">Unassigned</option>
                  {operators.length ? (
                    <optgroup label="Coworkers — will do the work">
                      {operators.map((o) => <option key={o.id} value={`operator:${o.id}`}>{o.name}</option>)}
                    </optgroup>
                  ) : null}
                  {teammates.length ? (
                    <optgroup label="Teammates">
                      {teammates.map((t) => <option key={t.id} value={`user:${t.id}`}>{t.name}</option>)}
                    </optgroup>
                  ) : null}
                </select>
              </label>
              <label className="task-description-field">
                <span>Notes</span>
                <textarea className="ref-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Context, outcome, or anything the assignee should know." />
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
            <div className="task-filters" aria-label="Filters">
              {projects.length ? (
                <select className="ref-input task-project-filter" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
                  <option value="">All projects</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : null}
              {view === "list" ? (
                (["all", "open", "in_progress", "blocked", "completed"] as const).map((status) => (
                  <button key={status} type="button" data-active={filter === status} onClick={() => setFilter(status)}>
                    {status === "in_progress" ? "In progress" : status[0].toUpperCase() + status.slice(1)}
                  </button>
                ))
              ) : null}
            </div>
          </div>

          {view === "board" ? (
            <div className="task-board">
              {STATUS_COLUMNS.map((column) => {
                const columnTasks = (projectFilter ? topLevelTasks.filter((t) => t.project_id === projectFilter) : topLevelTasks).filter((t) => t.status === column.key);
                return (
                  <div className="task-board-column" key={column.key}>
                    <div className="task-board-column-head"><strong>{column.label}</strong><span>{columnTasks.length}</span></div>
                    {columnTasks.map((task) => {
                      const assignedTo = assigneeLabel(task);
                      return (
                        <div className="task-board-card" key={task.id}>
                          <strong>{task.title}</strong>
                          {task.project_id ? <small className="task-board-project">{projectMap[task.project_id]}</small> : null}
                          <div className="task-board-card-footer">
                            <span className={`ref-pill ${task.priority === "low" ? "green" : "amber"}`}>{task.priority}</span>
                            {assignedTo ? <span className="task-assignee-chip" data-kind={assignedTo.kind}><assignedTo.icon size={11} /> {assignedTo.label}</span> : null}
                          </div>
                        </div>
                      );
                    })}
                    {columnTasks.length === 0 ? <p className="task-board-empty">Nothing here</p> : null}
                  </div>
                );
              })}
            </div>
          ) : visibleTasks.length ? visibleTasks.map((task) => {
            const assignedTo = assigneeLabel(task);
            const subtasks = subtasksByParent[task.id] ?? [];
            return (
              <div key={task.id}>
                <div className={`ref-task-row ${task.status === "completed" ? "done" : ""}`}>
                  <button className="ref-check" onClick={() => updateTaskStatus(task, task.status === "completed" ? "open" : "completed")} aria-label={task.status === "completed" ? "Reopen task" : "Complete task"}>
                    {task.status === "completed" ? <Check size={13} /> : <Circle size={13} />}
                  </button>
                  <div>
                    <strong>{task.title}</strong>
                    <small>{task.description || "No additional details"}{task.project_id ? ` · ${projectMap[task.project_id] ?? ""}` : ""}</small>
                  </div>
                  <span className="task-due"><CalendarDays /> {task.due_at ? new Date(task.due_at).toLocaleString() : "No due date"}</span>
                  {assignedTo ? <span className="task-assignee-chip" data-kind={assignedTo.kind}><assignedTo.icon size={11} /> {assignedTo.label}</span> : <span className="task-assignee-chip task-unassigned">Unassigned</span>}
                  <span className={`ref-pill ${task.priority === "low" ? "green" : "amber"}`}>{task.priority}</span>
                  {task.status === "in_progress" ? <span className="task-running"><Clock3 /> Active</span> : <span />}
                </div>
                {subtasks.length ? (
                  <div className="task-subtasks">
                    {subtasks.map((sub) => (
                      <div className={`ref-task-row task-subtask-row ${sub.status === "completed" ? "done" : ""}`} key={sub.id}>
                        <button className="ref-check" onClick={() => updateTaskStatus(sub, sub.status === "completed" ? "open" : "completed")} aria-label="Toggle subtask">
                          {sub.status === "completed" ? <Check size={12} /> : <Circle size={12} />}
                        </button>
                        <div><strong>{sub.title}</strong></div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          }) : (
            <div className="ref-empty-state"><Sparkles /><h2>{topLevelTasks.length ? "No tasks in this view" : "The queue is clear"}</h2><p>{topLevelTasks.length ? "Choose another filter to see the rest of the work." : "Create a task, or assign it straight to a coworker to get it done."}</p></div>
          )}
        </section>
      </div>
    </div>
  );
}
