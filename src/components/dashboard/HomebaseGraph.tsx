"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import type {
  HomebaseDepartmentView,
  HomebaseTaskView,
  HomebaseWorkerView,
} from "@/lib/office/homebase";
import type { OfficeEventRecord } from "@/lib/office/types";

const COMMAND_LINKS: Array<[string, string]> = [
  ["reception", "sales"],
  ["marketing", "sales"],
  ["sales", "finance"],
  ["support", "general_manager"],
  ["operations", "general_manager"],
  ["finance", "general_manager"],
  ["training_room", "general_manager"],
  ["filing_cabinet", "general_manager"],
  ["general_manager", "boardroom"],
];

const TONES = {
  signal: "94,184,255",
  money: "84,186,123",
  growth: "196,80,26",
  support: "176,129,255",
  ops: "245,214,111",
  memory: "123,164,255",
  leadership: "255,152,103",
} as const;

interface GraphNode {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  kind: "department" | "worker" | "task" | "event";
  tone: keyof typeof TONES;
  x: number;
  y: number;
  weight: number;
  attention: boolean;
  departmentId?: string | null;
}

function workerOffset(index: number) {
  const offsets = [
    { x: -7, y: 10 },
    { x: 8, y: 9 },
    { x: -10, y: -8 },
    { x: 10, y: -9 },
  ];
  return offsets[index % offsets.length];
}

export function HomebaseGraph({
  departments,
  workers,
  tasks = [],
  recentEvents,
}: {
  departments: HomebaseDepartmentView[];
  workers: HomebaseWorkerView[];
  tasks?: HomebaseTaskView[];
  recentEvents: OfficeEventRecord[];
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "department" | "worker" | "task" | "event">("all");
  const deferredQuery = useDeferredValue(query.toLowerCase().trim());

  const { nodes, links } = useMemo(() => {
    const roomNodes: GraphNode[] = departments.map((room) => ({
      id: `department:${room.id}`,
      label: room.name,
      sublabel: `${room.activeWorkers} coworkers · ${room.openTasks} tasks`,
      href: `/dashboard/departments/${room.id}`,
      kind: "department",
      tone: room.visual.tone,
      x: room.visual.x,
      y: room.visual.y,
      weight: room.status === "needs_attention" ? 3 : room.status === "active" ? 2 : 1,
      attention: room.status === "needs_attention" || room.approvalCount > 0,
      departmentId: room.id,
    }));

    const workerNodes = workers.slice(0, 28).map((worker, index) => {
      const room = departments.find((department) => department.id === worker.departmentId);
      const offset = workerOffset(index);
      return {
        id: `worker:${worker.id}`,
        label: worker.name,
        sublabel: `${worker.runtimeKind} · ${Math.round(worker.trustScore * 100)}% trust`,
        href: `/dashboard/coworkers/${worker.id}`,
        kind: "worker" as const,
        tone: room?.visual.tone ?? "memory",
        x: Math.max(5, Math.min(95, (room?.visual.x ?? 50) + offset.x)),
        y: Math.max(5, Math.min(95, (room?.visual.y ?? 50) + offset.y)),
        weight: worker.status === "active" ? 2 : 1,
        attention: worker.healthScore < 0.55 || worker.trustScore < 0.55,
        departmentId: worker.departmentId,
      };
    });

    const eventNodes = recentEvents.slice(0, 10).map((event, index) => {
      const room = departments.find((department) => department.id === event.departmentId);
      return {
        id: `event:${event.id}`,
        label: event.title,
        sublabel: event.eventType,
        href: room ? `/dashboard/departments/${room.id}` : "/dashboard",
        kind: "event" as const,
        tone: room?.visual.tone ?? "signal",
        x: Math.max(5, Math.min(95, (room?.visual.x ?? 50) + (index % 2 === 0 ? 14 : -14))),
        y: Math.max(5, Math.min(95, (room?.visual.y ?? 50) + 18 + (index % 3) * 3)),
        weight: ["high", "critical"].includes(event.riskLevel) ? 2 : 1,
        attention: ["high", "critical"].includes(event.riskLevel),
        departmentId: event.departmentId,
      };
    });

    const taskNodes = tasks.slice(0, 18).map((task, index) => {
      const room = departments.find((department) => department.id === task.departmentId);
      const ring = 9 + (index % 4) * 3;
      const angle = (index * 137.5 * Math.PI) / 180;
      return {
        id: `task:${task.id}`,
        label: task.title,
        sublabel: `${task.status.replaceAll("_", " ")} · ${task.workerKey}`,
        href: task.approvalRequired ? "/dashboard/approvals" : "/dashboard/tasks",
        kind: "task" as const,
        tone: room?.visual.tone ?? "ops",
        x: Math.max(4, Math.min(96, (room?.visual.x ?? 50) + Math.cos(angle) * ring)),
        y: Math.max(5, Math.min(95, (room?.visual.y ?? 50) + Math.sin(angle) * ring)),
        weight: task.status === "running" ? 2 : 1,
        attention: task.status === "failed" || task.status === "waiting_approval" || task.riskLevel === "critical",
        departmentId: task.departmentId,
      };
    });

    const allNodes = [...roomNodes, ...workerNodes, ...taskNodes, ...eventNodes];
    const graphLinks = [
      ...COMMAND_LINKS.map(([from, to]) => [`department:${from}`, `department:${to}`] as const),
      ...workerNodes.map((node) => [node.id, `department:${node.departmentId}`] as const),
      ...taskNodes.map((node) => [node.id, `department:${node.departmentId}`] as const),
      ...eventNodes.map((node) => [node.id, `department:${node.departmentId}`] as const),
    ];

    return { nodes: allNodes, links: graphLinks };
  }, [departments, recentEvents, tasks, workers]);

  const visibleNodes = nodes.filter((node) => {
    const matchesKind = kind === "all" || node.kind === kind;
    const matchesQuery =
      !deferredQuery ||
      node.label.toLowerCase().includes(deferredQuery) ||
      node.sublabel.toLowerCase().includes(deferredQuery);
    return matchesKind && matchesQuery;
  });
  const visibleIds = new Set(visibleNodes.map((node) => node.id));

  return (
    <div className="work-map">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search rooms, coworkers, events..."
          className="work-map-search"
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "department", "worker", "task", "event"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setKind(item)}
              className="work-map-filter"
              data-active={kind === item}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="work-map-canvas">
        <div className="work-map-grid" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {links.map(([from, to]) => {
            if (!visibleIds.has(from) || !visibleIds.has(to)) return null;
            const origin = nodes.find((node) => node.id === from);
            const destination = nodes.find((node) => node.id === to);
            if (!origin || !destination) return null;
            const color = TONES[origin.tone];

            return (
              <line
                key={`${from}-${to}`}
                x1={origin.x}
                y1={origin.y}
                x2={destination.x}
                y2={destination.y}
                stroke={`rgba(${color},0.24)`}
                strokeWidth={origin.kind === "department" ? "0.42" : "0.24"}
              />
            );
          })}
        </svg>

        {visibleNodes.map((node) => (
          <KnowledgeNode key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}

function KnowledgeNode({ node }: { node: GraphNode }) {
  const color = TONES[node.tone];
  const size =
    node.kind === "department" ? 172 + node.weight * 8 : node.kind === "worker" ? 124 : node.kind === "task" ? 116 : 104;

  return (
    <Link
      href={node.href}
      className="work-map-node"
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        width: size,
        borderColor: `rgba(${color},${node.attention ? 0.52 : 0.26})`,
        background: `linear-gradient(180deg, rgba(${color},0.14), rgba(255,255,255,0.025))`,
        boxShadow: node.attention
          ? `0 0 0 1px rgba(${color},0.2), 0 0 38px rgba(${color},0.18)`
          : "0 20px 38px rgba(0,0,0,0.18)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full border px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-[var(--dobly-text-muted)]" style={{ borderColor: `rgba(${color},0.26)` }}>
          {node.kind}
        </span>
        {node.attention ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `rgb(${color})` }} /> : null}
      </div>
      <div className="mt-3 line-clamp-2 text-sm font-medium leading-5 text-[var(--dobly-text)]">{node.label}</div>
      <div className="mt-2 line-clamp-2 text-[11px] leading-4 text-[var(--dobly-text-secondary)]">{node.sublabel}</div>
    </Link>
  );
}
