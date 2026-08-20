"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Users, Workflow, ZoomIn, ZoomOut, Waypoints } from "lucide-react";

type NodeKind = "operator" | "loop" | "group";

interface BrainNode {
  id: string;
  kind: NodeKind;
  label: string;
  sublabel: string;
  status: string;
  href: string;
}

interface BrainEdge {
  from: string;
  to: string;
}

interface SimNode extends BrainNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const KIND_RADIUS: Record<NodeKind, number> = { operator: 27, group: 21, loop: 14 };
const KIND_ICON: Record<NodeKind, typeof Bot> = { operator: Bot, group: Users, loop: Workflow };

// Real, dependency-free force layout - no graph library added given disk
// space was critical when this was built. Node counts here are small
// (coworkers + their loops + groups, not thousands of notes the way
// Obsidian's own graph can get), so an O(n^2) repulsion pass every frame
// is genuinely fine, not a shortcut that will bite at real scale.
const REPULSION = 2600;
const CENTER_PULL = 0.0022;
const DAMPING = 0.82;
const EDGE_TARGET_DISTANCE = 130;
const EDGE_STRENGTH = 0.02;
const CLICK_DRAG_THRESHOLD = 6;

function layoutInitial(nodes: BrainNode[], width: number, height: number): SimNode[] {
  const cx = width / 2;
  const cy = height / 2;
  return nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    const radius = 110 + (index % 3) * 55;
    return { ...node, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, vx: 0, vy: 0 };
  });
}

export function BrainView({
  nodes,
  edges,
  hasAnyOperators,
}: {
  nodes: BrainNode[];
  edges: BrainEdge[];
  hasAnyOperators: boolean;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 960, height: 640 });
  const [renderNodes, setRenderNodes] = useState<SimNode[]>([]);
  const [zoom, setZoom] = useState(1);
  const [hovered, setHovered] = useState<string | null>(null);
  const simRef = useRef<SimNode[]>([]);
  const dragRef = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);
  const nodeIdsKey = nodes.map((n) => n.id).sort().join(",");

  // Measure container so the graph fills the real available space instead
  // of an assumed fixed size.
  useEffect(() => {
    function measure() {
      const el = containerRef.current;
      if (el) setSize({ width: el.clientWidth || 960, height: el.clientHeight || 640 });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Re-seed the simulation when the real node set changes (new coworker
  // hired, loop added, etc.) or the canvas is resized.
  useEffect(() => {
    const seeded = layoutInitial(nodes, size.width, size.height);
    simRef.current = seeded;
    setRenderNodes(seeded);
    // nodeIdsKey intentionally stands in for `nodes` - re-seeding on every
    // new array identity (same ids, same data) would reset drag-placed
    // positions on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIdsKey, size.width, size.height]);

  // The physics loop itself.
  useEffect(() => {
    if (simRef.current.length === 0) return;
    let raf = 0;
    let alive = true;

    function tick() {
      if (!alive) return;
      const list = simRef.current;
      const cx = size.width / 2;
      const cy = size.height / 2;
      const draggingId = dragRef.current?.id;

      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (a.id === draggingId) continue;
        let fx = 0;
        let fy = 0;
        for (let j = 0; j < list.length; j++) {
          if (i === j) continue;
          const b = list[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = Math.max(dx * dx + dy * dy, 1);
          const dist = Math.sqrt(distSq);
          const force = REPULSION / distSq;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
        fx += (cx - a.x) * CENTER_PULL;
        fy += (cy - a.y) * CENTER_PULL;
        a.vx = (a.vx + fx) * DAMPING;
        a.vy = (a.vy + fy) * DAMPING;
      }

      for (const edge of edges) {
        const a = list.find((n) => n.id === edge.from);
        const b = list.find((n) => n.id === edge.to);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (dist - EDGE_TARGET_DISTANCE) * EDGE_STRENGTH;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (a.id !== draggingId) { a.vx += fx; a.vy += fy; }
        if (b.id !== draggingId) { b.vx -= fx; b.vy -= fy; }
      }

      for (const n of list) {
        if (n.id === draggingId) continue;
        n.x += n.vx;
        n.y += n.vy;
      }

      setRenderNodes([...list]);
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [edges, size.width, size.height]);

  const handlePointerDown = useCallback((event: React.PointerEvent, node: SimNode) => {
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    dragRef.current = { id: node.id, startX: event.clientX, startY: event.clientY, moved: false };
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > CLICK_DRAG_THRESHOLD) drag.moved = true;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const node = simRef.current.find((n) => n.id === drag.id);
    if (!node) return;
    // Inverse of the <g> transform below (translate(c*(1-zoom)) scale(zoom),
    // i.e. "scale around the center point c") - screen = c*(1-zoom) + zoom*sim,
    // so sim = (screen - c*(1-zoom)) / zoom. Dividing by zoom alone (the
    // naive inverse of a plain scale-from-origin) would only be correct if
    // the graph scaled from (0,0) - it doesn't, it scales from the center,
    // so that version silently misplaced dragged nodes at any zoom != 100%.
    const cx = size.width / 2;
    const cy = size.height / 2;
    node.x = (event.clientX - rect.left - cx * (1 - zoom)) / zoom;
    node.y = (event.clientY - rect.top - cy * (1 - zoom)) / zoom;
    node.vx = 0;
    node.vy = 0;
    setRenderNodes([...simRef.current]);
  }, [zoom, size.width, size.height]);

  const handlePointerUp = useCallback((node: SimNode) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && !drag.moved) {
      router.push(node.href);
    }
  }, [router]);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    setZoom((current) => Math.min(2.2, Math.max(0.45, current - event.deltaY * 0.001)));
  }, []);

  if (!hasAnyOperators) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="card text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-dim text-accent">
            <Waypoints className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-semibold text-text">Nothing to map yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            Hire your first coworker and the brain view fills in — every coworker, loop, and group they&apos;re part of, connected the way they actually are.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="brain-view">
      <header className="brain-view-header">
        <div>
          <div className="brain-view-kicker">Brain view</div>
          <h1>Everything, connected</h1>
        </div>
        <div className="brain-view-zoom">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.45, z - 0.15))} aria-label="Zoom out"><ZoomOut /></button>
          <button type="button" onClick={() => setZoom(1)} aria-label="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button type="button" onClick={() => setZoom((z) => Math.min(2.2, z + 0.15))} aria-label="Zoom in"><ZoomIn /></button>
        </div>
      </header>

      <div className="brain-canvas" ref={containerRef} onWheel={handleWheel}>
        <svg width="100%" height="100%" role="img" aria-label="Graph of coworkers, loops, and groups">
          {/* transform-origin (a CSS property) does not reliably apply to
              this SVG *attribute* transform across browsers - built the
              scale-around-center directly into the matrix instead:
              translate(c*(1-zoom)) then scale(zoom), the standard
              "scale about point c" decomposition. handlePointerMove above
              inverts this exact expression, so the two must stay in sync. */}
          <g transform={`translate(${(size.width / 2) * (1 - zoom)}, ${(size.height / 2) * (1 - zoom)}) scale(${zoom})`}>
            {edges.map((edge) => {
              const a = renderNodes.find((n) => n.id === edge.from);
              const b = renderNodes.find((n) => n.id === edge.to);
              if (!a || !b) return null;
              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  className="brain-edge"
                  data-dim={hovered ? hovered !== a.id && hovered !== b.id : false}
                />
              );
            })}
            {renderNodes.map((node) => {
              const Icon = KIND_ICON[node.kind];
              const radius = KIND_RADIUS[node.kind];
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="brain-node"
                  data-kind={node.kind}
                  data-status={node.status}
                  data-dim={hovered ? hovered !== node.id : false}
                  onPointerDown={(event) => handlePointerDown(event, node)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={() => handlePointerUp(node)}
                  onPointerEnter={() => setHovered(node.id)}
                  onPointerLeave={() => setHovered((current) => (current === node.id ? null : current))}
                >
                  <circle r={radius} className="brain-node-circle" />
                  <foreignObject x={-11} y={-11} width={22} height={22} className="brain-node-icon">
                    <Icon size={16} />
                  </foreignObject>
                  <text y={radius + 16} textAnchor="middle" className="brain-node-label">{node.label}</text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {hovered ? (
        <div className="brain-hover-card">
          {(() => {
            const node = renderNodes.find((n) => n.id === hovered);
            if (!node) return null;
            return (
              <>
                <strong>{node.label}</strong>
                <span>{node.sublabel}</span>
              </>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
