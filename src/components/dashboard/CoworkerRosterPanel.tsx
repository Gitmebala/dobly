"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bot, Plus, Search } from "lucide-react";
import type { OperatorWithLoops } from "@/lib/dobly-operators";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "draft", label: "Building" },
  { id: "paused", label: "On break" },
  { id: "archived", label: "Archived" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["id"];

export default function CoworkerRosterPanel({
  operators,
  activeOperatorId,
}: {
  operators: OperatorWithLoops[];
  activeOperatorId: string | null;
}) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map: Record<StatusFilter, number> = { all: operators.length, active: 0, draft: 0, paused: 0, archived: 0 };
    for (const operator of operators) {
      const status = operator.status as StatusFilter;
      if (status in map) map[status] += 1;
    }
    return map;
  }, [operators]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return operators.filter((operator) => {
      if (filter !== "all" && operator.status !== filter) return false;
      if (!term) return true;
      return operator.name.toLowerCase().includes(term) || operator.mission.toLowerCase().includes(term);
    });
  }, [operators, filter, query]);

  return (
    <div className="coworker-roster-panel">
      <div className="coworker-roster-panel-head">
        <div>
          <span>Your team</span>
          <strong>{operators.length} coworker{operators.length === 1 ? "" : "s"} you've hired</strong>
        </div>
      </div>

      {operators.length > 0 ? (
        <>
          <div className="coworker-roster-filters" role="tablist" aria-label="Filter coworkers by status">
            {STATUS_FILTERS.filter((item) => item.id === "all" || counts[item.id] > 0).map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                data-active={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                <em>{counts[item.id]}</em>
              </button>
            ))}
          </div>

          <label className="coworker-roster-search">
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search coworkers..."
              aria-label="Search coworkers"
            />
          </label>
        </>
      ) : null}

      <nav className="coworker-roster-list" aria-label="Coworkers">
        {visible.map((operator) => (
          <CoworkerRosterItem key={operator.id} operator={operator} active={activeOperatorId === operator.id} />
        ))}
        {operators.length && !visible.length ? (
          <div className="coworker-roster-empty">
            <span>No coworkers match "{query}".</span>
          </div>
        ) : null}
        {!operators.length ? (
          <div className="coworker-roster-empty">
            <Bot aria-hidden="true" />
            <strong>No coworkers yet</strong>
            <span>Describe a job (inbound leads, bookkeeping, market watch) and Dobly proposes who to hire.</span>
          </div>
        ) : null}
      </nav>

      <Link href="/dashboard/coworkers?create=true" className="coworker-roster-hire">
        <Plus aria-hidden="true" />
        <span>
          <strong>Hire new coworker</strong>
          <small>Describe the role. Dobly will build it.</small>
        </span>
      </Link>
    </div>
  );
}

const STATUS_BADGE_LABEL: Record<string, string> = {
  active: "Active",
  draft: "Building",
  paused: "On break",
  archived: "Archived",
};

function CoworkerRosterItem({ operator, active }: { operator: OperatorWithLoops; active: boolean }) {
  const loops = operator.loops ?? [];
  return (
    <Link
      href={`/dashboard/coworkers?operatorId=${encodeURIComponent(operator.id)}`}
      className="coworker-roster-item"
      data-active={active}
    >
      <span className="coworker-roster-avatar" data-status={operator.status} aria-hidden="true">
        {operator.name.slice(0, 1).toUpperCase()}
        <i />
      </span>
      <span className="coworker-roster-copy">
        <strong>{operator.name}</strong>
        <small>{loops.length ? `${loops.length} loop${loops.length === 1 ? "" : "s"}` : operator.mission}</small>
      </span>
      <span className="coworker-roster-badge" data-status={operator.status}>
        {STATUS_BADGE_LABEL[operator.status] ?? operator.status}
      </span>
    </Link>
  );
}
