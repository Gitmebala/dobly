"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface CanvasOperator {
  id: string;
  name: string;
  status: string;
  mission: string;
  approval_mode: string;
  last_run_at: string | null;
  /** Which table this came from; decides where the detail link points. */
  source?: "operator" | "office_worker";
}

export interface CanvasDepartment {
  id: string;
  slug: string;
  name: string;
  outcome: string;
  status: string;
  trust_level: string;
  accent_color: string | null;
  canvas_x: number | null;
  canvas_y: number | null;
  operators: CanvasOperator[];
}

interface Props {
  departments: CanvasDepartment[];
  /** Whether departments can be dragged to new canvas positions. */
  canEdit: boolean;
  /** Off for the no-auth design preview, which has no workspace to save to. */
  persist?: boolean;
}

/**
 * Palette used when a department has no accent of its own.
 *
 * These are Dobly's own material tokens, not raw hex: this started out as a
 * stock blue/pink/cyan/purple ramp, which was wrong twice over - it read as a
 * different product from the warm rust system everywhere else, and being fixed
 * hex it stayed light-mode coloured on a dark background. Referencing the
 * tokens means these follow the theme. Ordered so adjacent departments on the
 * canvas land on visibly different hues and depths rather than three
 * near-identical reds in a row.
 */
const FALLBACK_ACCENTS = [
  "var(--app-rust)",
  "var(--app-green)",
  "var(--app-gold)",
  "var(--app-wood)",
  "var(--app-clay)",
  "var(--app-stone-text)",
  "var(--app-rust-dark)",
  "var(--app-slate)",
];

const NODE_RADIUS = 64;
const ORBIT_RADIUS = 116;
const WORLD_PADDING = 240;

/** Ring layout for departments that have never been placed on the canvas. */
function defaultPosition(index: number, total: number) {
  const ringSize = 8;
  const ring = Math.floor(index / ringSize);
  const withinRing = index % ringSize;
  const countInRing = Math.min(ringSize, total - ring * ringSize);
  const angle = (withinRing / countInRing) * Math.PI * 2 - Math.PI / 2;
  const radius = 260 + ring * 240;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

export default function DepartmentCanvas({ departments, canEdit, persist = true }: Props) {
  const router = useRouter();
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  // Pointer bookkeeping lives in a ref so move handlers stay referentially stable.
  // `active` gates the move handler: it is bound to the surface, so without this
  // a plain hover would accumulate movement and swallow the following click.
  const gesture = useRef({
    active: false,
    panning: false,
    originX: 0,
    originY: 0,
    viewX: 0,
    viewY: 0,
    nodeX: 0,
    nodeY: 0,
    moved: false,
  });

  useEffect(() => {
    setPositions((current) => {
      const next = { ...current };
      departments.forEach((department, index) => {
        if (next[department.id]) return;
        next[department.id] =
          department.canvas_x !== null && department.canvas_y !== null
            ? { x: department.canvas_x, y: department.canvas_y }
            : defaultPosition(index, departments.length);
      });
      return next;
    });
  }, [departments]);

  const accentFor = useCallback(
    (department: CanvasDepartment, index: number) =>
      department.accent_color ?? FALLBACK_ACCENTS[index % FALLBACK_ACCENTS.length],
    [],
  );

  const selected = useMemo(
    () => departments.find((department) => department.id === selectedId) ?? null,
    [departments, selectedId],
  );

  const persistPositions = useCallback(
    async (moved: Array<{ id: string; x: number; y: number }>) => {
      if (!canEdit || !persist || !moved.length) return;
      setSaveState("saving");
      try {
        const response = await fetch("/api/departments/positions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positions: moved }),
        });
        if (!response.ok) throw new Error(await response.text());
        setSaveState("saved");
        window.setTimeout(() => setSaveState("idle"), 1600);
      } catch {
        setSaveState("error");
      }
    },
    [canEdit, persist],
  );

  const seedStarterDepartments = useCallback(async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      const response = await fetch("/api/departments/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Could not set up departments.");
      router.refresh();
    } catch (error) {
      setSeedError(error instanceof Error ? error.message : "Could not set up departments.");
      setSeeding(false);
    }
  }, [router]);

  const onSurfacePointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    gesture.current = {
      ...gesture.current,
      active: true,
      panning: true,
      originX: event.clientX,
      originY: event.clientY,
      viewX: view.x,
      viewY: view.y,
      moved: false,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onNodePointerDown = (event: React.PointerEvent, departmentId: string) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const position = positions[departmentId] ?? { x: 0, y: 0 };
    gesture.current = {
      active: true,
      panning: false,
      originX: event.clientX,
      originY: event.clientY,
      viewX: view.x,
      viewY: view.y,
      nodeX: position.x,
      nodeY: position.y,
      moved: false,
    };
    setDragging(departmentId);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const state = gesture.current;
    if (!state.active) return; // hover is not a gesture
    const dx = event.clientX - state.originX;
    const dy = event.clientY - state.originY;

    if (!state.moved && Math.hypot(dx, dy) > 3) gesture.current.moved = true;

    if (state.panning) {
      setView((current) => ({ ...current, x: state.viewX + dx, y: state.viewY + dy }));
      return;
    }

    if (dragging && canEdit) {
      // Screen delta -> world delta, so drag tracks the cursor at any zoom.
      setPositions((current) => ({
        ...current,
        [dragging]: { x: state.nodeX + dx / view.scale, y: state.nodeY + dy / view.scale },
      }));
    }
  };

  const onPointerUp = () => {
    if (dragging && gesture.current.moved) {
      const position = positions[dragging];
      if (position) void persistPositions([{ id: dragging, x: position.x, y: position.y }]);
    }
    gesture.current.active = false;
    gesture.current.panning = false;
    setDragging(null);
  };

  /** Zoom about a fixed point, so whatever is under it stays put. */
  const zoomAbout = useCallback((factor: number, anchorX: number, anchorY: number) => {
    setView((current) => {
      const scale = Math.min(2.4, Math.max(0.25, current.scale * factor));
      const ratio = scale / current.scale;
      return {
        scale,
        x: anchorX - (anchorX - current.x) * ratio,
        y: anchorY - (anchorY - current.y) * ratio,
      };
    });
  }, []);

  const zoomFromCentre = (factor: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    zoomAbout(factor, (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2);
  };

  // Wheel zoom is deliberately gated behind ctrl/cmd. The canvas is a tall
  // element inside a scrolling dashboard page, so swallowing plain wheel would
  // hijack page scroll and drift the zoom whenever the cursor happens to be
  // over it. Bound natively because React's wheel listener is passive, and
  // preventDefault is required to suppress browser pinch-zoom on the ctrl path.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return; // let the page scroll
      event.preventDefault();
      const rect = surface.getBoundingClientRect();
      zoomAbout(event.deltaY < 0 ? 1.1 : 1 / 1.1, event.clientX - rect.left, event.clientY - rect.top);
    };

    surface.addEventListener("wheel", handleWheel, { passive: false });
    return () => surface.removeEventListener("wheel", handleWheel);
  }, [zoomAbout]);

  const resetView = () => setView({ x: 0, y: 0, scale: 1 });

  const fitToContent = () => {
    const surface = surfaceRef.current;
    const entries = Object.values(positions);
    if (!surface || !entries.length) return;

    const xs = entries.map((entry) => entry.x);
    const ys = entries.map((entry) => entry.y);
    const minX = Math.min(...xs) - WORLD_PADDING;
    const maxX = Math.max(...xs) + WORLD_PADDING;
    const minY = Math.min(...ys) - WORLD_PADDING;
    const maxY = Math.max(...ys) + WORLD_PADDING;

    const rect = surface.getBoundingClientRect();
    const scale = Math.min(2.4, Math.max(0.25, Math.min(rect.width / (maxX - minX), rect.height / (maxY - minY))));
    setView({
      scale,
      x: rect.width / 2 - ((minX + maxX) / 2) * scale,
      y: rect.height / 2 - ((minY + maxY) / 2) * scale,
    });
  };

  if (!departments.length) {
    return (
      <div className="deptcanvas-empty">
        <h2>No departments yet</h2>
        <p>Departments are where your coworkers live. Start with a standard set, or build your own.</p>
        <div className="deptcanvas-empty-actions">
          <button
            type="button"
            className="deptcanvas-cta"
            disabled={seeding}
            onClick={seedStarterDepartments}
          >
            {seeding ? "Setting up…" : "Set up starter departments"}
          </button>
          <Link href="/dashboard/departments/new">Create one manually</Link>
        </div>
        {seedError && <p className="deptcanvas-empty-error">{seedError}</p>}
      </div>
    );
  }

  return (
    <div className="deptcanvas">
      <div className="deptcanvas-toolbar">
        <div className="deptcanvas-toolbar-group">
          <button type="button" onClick={fitToContent}>Fit</button>
          <button type="button" onClick={resetView}>Reset</button>
          <button type="button" aria-label="Zoom out" onClick={() => zoomFromCentre(1 / 1.2)}>−</button>
          <span className="deptcanvas-zoom">{Math.round(view.scale * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => zoomFromCentre(1.2)}>+</button>
        </div>
        <div className="deptcanvas-toolbar-group">
          {saveState === "saving" && <span className="deptcanvas-save">Saving layout…</span>}
          {saveState === "saved" && <span className="deptcanvas-save is-ok">Layout saved</span>}
          {saveState === "error" && <span className="deptcanvas-save is-error">Could not save layout</span>}
          <Link className="deptcanvas-cta" href="/dashboard/departments/new">New department</Link>
        </div>
      </div>

      <div
        ref={surfaceRef}
        className="deptcanvas-surface"
        data-dragging={dragging ? "true" : "false"}
        onPointerDown={onSurfacePointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="deptcanvas-world"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          {departments.map((department, index) => {
            const position = positions[department.id];
            if (!position) return null;
            const accent = accentFor(department, index);
            const operators = department.operators.slice(0, 10);
            const overflow = department.operators.length - operators.length;
            const isSelected = department.id === selectedId;

            return (
              <div
                key={department.id}
                className="deptcanvas-node"
                data-selected={isSelected ? "true" : "false"}
                data-status={department.status}
                style={{
                  left: position.x,
                  top: position.y,
                  // @ts-expect-error -- custom property consumed by the stylesheet
                  "--accent": accent,
                }}
                onPointerDown={(event) => onNodePointerDown(event, department.id)}
                onClick={() => {
                  if (gesture.current.moved) return; // a drag is not a click
                  setSelectedId((current) => (current === department.id ? null : department.id));
                }}
              >
                <div className="deptcanvas-orbit" style={{ width: ORBIT_RADIUS * 2, height: ORBIT_RADIUS * 2 }}>
                  {operators.map((operator, operatorIndex) => {
                    const angle = (operatorIndex / Math.max(operators.length, 1)) * Math.PI * 2 - Math.PI / 2;
                    return (
                      <span
                        key={operator.id}
                        className="deptcanvas-operator"
                        data-status={operator.status}
                        title={`${operator.name} — ${operator.mission}`}
                        style={{
                          left: ORBIT_RADIUS + Math.cos(angle) * ORBIT_RADIUS,
                          top: ORBIT_RADIUS + Math.sin(angle) * ORBIT_RADIUS,
                        }}
                      >
                        <em>{operator.name.slice(0, 2).toUpperCase()}</em>
                      </span>
                    );
                  })}
                </div>

                <div className="deptcanvas-core" style={{ width: NODE_RADIUS * 2, height: NODE_RADIUS * 2 }}>
                  <strong>{department.name}</strong>
                  <span>
                    {department.operators.length || "no"} coworker{department.operators.length === 1 ? "" : "s"}
                    {overflow > 0 ? ` (+${overflow})` : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <aside className="deptcanvas-panel">
          <header>
            <span className="deptcanvas-panel-trust" data-trust={selected.trust_level}>
              {selected.trust_level.replaceAll("_", " ")}
            </span>
            <h2>{selected.name}</h2>
            <p>{selected.outcome}</p>
          </header>

          <div className="deptcanvas-panel-body">
            <h3>Coworkers</h3>
            {selected.operators.length ? (
              <ul>
                {selected.operators.map((operator) => (
                  <li key={operator.id}>
                    <Link
                      href={
                        operator.source === "office_worker"
                          ? `/dashboard/departments/${selected.slug}?worker=${operator.id}`
                          : `/dashboard/coworkers/${operator.id}`
                      }
                    >
                      <strong>{operator.name}</strong>
                      <span>{operator.mission}</span>
                    </Link>
                    <em data-status={operator.status}>{operator.status}</em>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="deptcanvas-panel-empty">
                Nobody works here yet. Hire a coworker and file them into {selected.name}.
              </p>
            )}
          </div>

          <footer>
            <Link className="deptcanvas-cta" href={`/dashboard/departments/${selected.slug}`}>
              Open department
            </Link>
            <button type="button" onClick={() => setSelectedId(null)}>Close</button>
          </footer>
        </aside>
      )}
    </div>
  );
}
