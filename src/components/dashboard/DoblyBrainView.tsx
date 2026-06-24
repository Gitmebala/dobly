"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Bot,
  Box,
  BriefcaseBusiness,
  ChevronLeft,
  Crosshair,
  Focus,
  Maximize2,
  Minus,
  Network,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    cytoscape?: (options: Record<string, unknown>) => any;
  }
}

type BrainOperator = {
  id: string;
  name: string;
  kind?: string;
  status?: string;
  mission?: string;
  outcome?: string;
  capability_tags?: string[];
  connected_tool_ids?: string[];
  last_run_at?: string | null;
  dobly_operator_loops?: Array<{ id: string; name: string; cadence: string; status: string }>;
};

type BrainConnection = {
  id: string;
  name?: string;
  label?: string;
  provider?: string;
  status?: string;
  capability_tags?: string[];
};

type BrainFeedItem = {
  id: string;
  operator_id?: string | null;
  run_id?: string | null;
  event_type?: string;
  title?: string;
  summary?: string;
  status?: string;
  created_at?: string;
};

export type DoblyBrainData = {
  userId: string;
  spaces: Array<{ id: string; name: string; kind: string; activeAgents: number; openTasks: number; connectedChannels: number }>;
  operators: BrainOperator[];
  connections: BrainConnection[];
  mcpConnections: BrainConnection[];
  customApiConnections: BrainConnection[];
  feed: BrainFeedItem[];
  approvals: Array<{ id: string; title: string; status: string; run_id?: string | null; metadata?: Record<string, unknown> }>;
};

type TooltipState = {
  show: boolean;
  x: number;
  y: number;
  data: Record<string, any> | null;
};

type DetailState = {
  open: boolean;
  data: Record<string, any> | null;
};

const officeZones = [
  { id: "office-sales", label: "Sales", keywords: ["sales", "lead", "prospect", "crm", "proposal", "sdr"] },
  { id: "office-marketing", label: "Marketing", keywords: ["marketing", "content", "social", "campaign", "growth", "video", "seo"] },
  { id: "office-support", label: "Support", keywords: ["support", "customer", "ticket", "refund", "complaint"] },
  { id: "office-finance", label: "Finance", keywords: ["finance", "invoice", "cash", "payment", "reconcile", "paystack", "mpesa", "xero"] },
  { id: "office-engineering", label: "Engineering", keywords: ["engineering", "code", "github", "bug", "release", "software"] },
  { id: "office-ops", label: "Operations", keywords: ["ops", "operation", "fulfillment", "supplier", "order", "admin"] },
  { id: "office-research", label: "Research", keywords: ["research", "market", "competitor", "perplexity", "dossier"] },
  { id: "office-life", label: "Personal Life", keywords: ["life", "travel", "bill", "home", "health", "family", "personal", "portfolio"] },
];

function officeForOperator(operator: BrainOperator) {
  const haystack = [
    operator.name,
    operator.kind,
    operator.mission,
    operator.outcome,
    ...(operator.capability_tags ?? []),
  ].join(" ").toLowerCase();
  return officeZones.find((office) => office.keywords.some((keyword) => haystack.includes(keyword))) ?? officeZones[5];
}

function recent(value?: string | null) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() < 60 * 60 * 1000;
}

function connectionName(connection: BrainConnection) {
  return connection.label ?? connection.name ?? connection.provider ?? "Tool";
}

function loadCytoscape() {
  return new Promise<void>((resolve, reject) => {
    if (window.cytoscape) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-dobly-cytoscape="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Cytoscape failed to load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js";
    script.async = true;
    script.dataset.doblyCytoscape = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Cytoscape failed to load."));
    document.head.appendChild(script);
  });
}

export default function DoblyBrainView({ data }: { data: DoblyBrainData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const cyRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const [feedOpen, setFeedOpen] = useState(true);
  const [breadcrumb, setBreadcrumb] = useState("All");
  const [tooltip, setTooltip] = useState<TooltipState>({ show: false, x: 0, y: 0, data: null });
  const [detail, setDetail] = useState<DetailState>({ open: false, data: null });
  const [loadError, setLoadError] = useState<string | null>(null);

  const elements = useMemo(() => buildElements(data), [data]);

  useEffect(() => {
    let disposed = false;

    async function init() {
      try {
        await loadCytoscape();
        if (disposed || !containerRef.current || !window.cytoscape) return;

        cyRef.current?.destroy();
        const cy = window.cytoscape({
          container: containerRef.current,
          elements,
          style: graphStyle(),
          layout: {
            name: "cose",
            idealEdgeLength: 120,
            nodeOverlap: 20,
            refresh: 20,
            fit: true,
            padding: 60,
            randomize: false,
            componentSpacing: 100,
            nodeRepulsion: 450000,
            edgeElasticity: 100,
            nestingFactor: 5,
            gravity: 80,
            numIter: 1000,
            initialTemp: 200,
            coolingFactor: 0.95,
            minTemp: 1.0,
          },
          wheelSensitivity: 0.3,
          minZoom: 0.3,
          maxZoom: 3,
        });
        cyRef.current = cy;

        cy.on("mouseover", "node", (event: any) => {
          const node = event.target;
          const connected = node.connectedEdges().connectedNodes();
          cy.elements().addClass("dimmed");
          node.removeClass("dimmed");
          connected.removeClass("dimmed").addClass("highlighted");
          node.connectedEdges().removeClass("dimmed").addClass("highlighted");
          setTooltip({ show: true, x: event.renderedPosition.x + 18, y: event.renderedPosition.y + 18, data: node.data() });
        });

        cy.on("mousemove", "node", (event: any) => {
          setTooltip((current) => ({ ...current, x: event.renderedPosition.x + 18, y: event.renderedPosition.y + 18 }));
        });

        cy.on("mouseout", "node", () => {
          cy.elements().removeClass("dimmed highlighted");
          setTooltip({ show: false, x: 0, y: 0, data: null });
        });

        cy.on("tap", "node", (event: any) => {
          const node = event.target;
          cy.nodes().unselect();
          node.select();
          cy.animate({ fit: { eles: node.closedNeighborhood(), padding: 80 }, duration: 400, easing: "ease-in-out" });
          setDetail({ open: true, data: node.data() });
        });

        cy.on("dbltap", 'node[type="office"]', (event: any) => {
          const node = event.target;
          cy.animate({ fit: { eles: node.closedNeighborhood(), padding: 60 }, duration: 500, easing: "ease-in-out" });
          setBreadcrumb(node.data("label"));
        });

        startBreathing(cy);
        resizeCanvas();
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Brain graph failed to load.");
      }
    }

    init();

    return () => {
      disposed = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      cyRef.current?.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`dobly-brain-${data.userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "operator_chat_events", filter: `user_id=eq.${data.userId}` }, (payload) => {
        const operatorId = (payload.new as any)?.operator_id;
        if (operatorId) {
          pulseNode(operatorId);
          drawRippleForNode(operatorId);
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "runtime_approvals", filter: `user_id=eq.${data.userId}` }, (payload) => {
        const metadata = ((payload.new as any)?.metadata ?? {}) as Record<string, any>;
        const operatorId = metadata?.resume?.context?.operatorId ?? metadata?.operatorId;
        if (operatorId && cyRef.current) cyRef.current.getElementById(operatorId).addClass("escalated");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.userId]);

  function resizeCanvas() {
    const canvas = overlayRef.current;
    const host = containerRef.current;
    if (!canvas || !host) return;
    const rect = host.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }

  function startBreathing(cy: any) {
    const phases: Record<string, number> = {};
    cy.nodes().forEach((node: any) => {
      phases[node.id()] = Math.random() * Math.PI * 2;
    });

    const loop = (timestamp: number) => {
      cy.nodes().forEach((node: any) => {
        const type = node.data("type");
        const base = type === "gm" ? 68 : type === "office" ? 52 : type === "worker" ? 36 : 24;
        const speed = node.data("active") === "true" ? 0.0008 : 0.0005;
        const scale = 1 + Math.sin(timestamp * speed + phases[node.id()]) * (node.data("active") === "true" ? 0.05 : 0.03);
        node.style({ width: base * scale, height: base * scale });
      });
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
  }

  function pulseNode(nodeId: string) {
    const node = cyRef.current?.getElementById(nodeId);
    if (!node?.length) return;
    node.addClass("pulse");
    window.setTimeout(() => node.removeClass("pulse"), 1600);
  }

  function drawRippleForNode(nodeId: string) {
    const cy = cyRef.current;
    const node = cy?.getElementById(nodeId);
    if (!node?.length) return;
    const pos = node.renderedPosition();
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    let radius = 0;
    let opacity = 0.62;
    const draw = () => {
      ctx.clearRect((pos.x - 90) * ratio, (pos.y - 90) * ratio, 180 * ratio, 180 * ratio);
      for (let index = 0; index < 3; index++) {
        ctx.beginPath();
        ctx.arc(pos.x * ratio, pos.y * ratio, (radius + index * 14) * ratio, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(196,80,26,${Math.max(opacity - index * 0.14, 0)})`;
        ctx.lineWidth = 1.5 * ratio;
        ctx.stroke();
      }
      radius += 2.2;
      opacity -= 0.018;
      if (opacity > 0) requestAnimationFrame(draw);
    };
    draw();
  }

  function zoom(multiplier: number) {
    const cy = cyRef.current;
    if (!cy) return;
    cy.animate({ zoom: cy.zoom() * multiplier, center: { eles: cy.elements() }, duration: 180 });
  }

  function fitAll() {
    cyRef.current?.animate({ fit: { eles: cyRef.current.elements(), padding: 60 }, duration: 300 });
    setBreadcrumb("All");
  }

  function centerSelected() {
    const selected = cyRef.current?.elements(":selected");
    if (selected?.length) cyRef.current.animate({ fit: { eles: selected.closedNeighborhood(), padding: 80 }, duration: 300 });
  }

  function highlightNode(nodeId?: string | null) {
    const cy = cyRef.current;
    if (!cy || !nodeId) return;
    const node = cy.getElementById(nodeId);
    if (!node.length) return;
    cy.elements().addClass("dimmed");
    node.removeClass("dimmed").addClass("highlighted");
    node.connectedEdges().removeClass("dimmed").addClass("highlighted");
    node.connectedEdges().connectedNodes().removeClass("dimmed").addClass("highlighted");
  }

  function clearHighlight() {
    cyRef.current?.elements().removeClass("dimmed highlighted");
  }

  return (
    <div className="relative h-[calc(100vh-130px)] min-h-[720px] overflow-hidden rounded-[8px] border border-[rgba(245,237,228,0.08)] bg-[#1C1C1A]">
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(196,80,26,0.06)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#centerGlow)" />
      </svg>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
          backgroundSize: "220px 220px",
        }}
      />

      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-[8px] border border-[rgba(245,237,228,0.08)] bg-[rgba(28,28,26,0.84)] px-3 py-2 text-xs text-[var(--dobly-text-muted)] backdrop-blur-xl">
        <button onClick={fitAll} className="text-[var(--rust)]">All</button>
        {breadcrumb !== "All" ? <span>/ {breadcrumb}</span> : null}
      </div>

      <button
        onClick={() => setFeedOpen((value) => !value)}
        className="absolute left-0 top-1/2 z-30 grid h-12 w-8 -translate-y-1/2 place-items-center rounded-r-[8px] border border-l-0 border-[rgba(245,237,228,0.08)] bg-[#222220] text-[var(--rust)]"
        aria-label="Toggle brain feed"
      >
        <ChevronLeft className={`h-4 w-4 transition ${feedOpen ? "" : "rotate-180"}`} />
      </button>

      <aside className={`absolute inset-y-0 left-0 z-20 w-[280px] border-r border-[rgba(245,237,228,0.08)] bg-[rgba(28,28,26,0.92)] p-3 backdrop-blur-2xl transition-transform duration-300 ${feedOpen ? "translate-x-0" : "-translate-x-[280px]"}`}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dobly-text-muted)]">Live feed</div>
          <Activity className="h-4 w-4 text-[var(--rust)]" />
        </div>
        <div className="space-y-2 overflow-y-auto pr-1">
          {data.feed.slice(0, 18).map((item) => (
            <button
              key={item.id}
              onMouseEnter={() => highlightNode(item.operator_id)}
              onMouseLeave={clearHighlight}
              onClick={() => {
                if (!item.operator_id || !cyRef.current) return;
                const node = cyRef.current.getElementById(item.operator_id);
                if (!node.length) return;
                node.select();
                cyRef.current.animate({ fit: { eles: node.closedNeighborhood(), padding: 80 }, duration: 350 });
                setDetail({ open: true, data: node.data() });
              }}
              className="w-full rounded-[8px] border border-[rgba(245,237,228,0.08)] bg-[rgba(255,255,255,0.025)] p-2 text-left transition hover:border-[rgba(196,80,26,0.28)] hover:bg-[rgba(196,80,26,0.08)]"
            >
              <div className="line-clamp-1 text-[12px] font-semibold text-[var(--dobly-text)]">{item.title ?? item.event_type ?? "Activity"}</div>
              <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--dobly-text-muted)]">{item.summary ?? item.status ?? "Dobly activity recorded."}</div>
            </button>
          ))}
        </div>
      </aside>

      <div ref={containerRef} id="brain-canvas" className="absolute inset-0 z-10" />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 z-10" />

      {loadError ? (
        <div className="absolute inset-0 z-20 grid place-items-center p-6">
          <div className="max-w-md rounded-[12px] border border-[rgba(196,80,26,0.3)] bg-[#272724] p-5 text-center">
            <Network className="mx-auto h-8 w-8 text-[var(--rust)]" />
            <h3 className="mt-3 text-lg font-semibold text-[var(--dobly-text)]">Brain View could not load Cytoscape</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--dobly-text-muted)]">{loadError}</p>
          </div>
        </div>
      ) : null}

      {tooltip.show && tooltip.data ? <BrainTooltip tooltip={tooltip} /> : null}

      <div className="absolute bottom-4 right-4 z-30 grid gap-1 rounded-[8px] border border-[rgba(245,237,228,0.08)] bg-[#222220] p-1.5">
        <ControlButton label="Zoom in" onClick={() => zoom(1.2)} icon={Plus} />
        <ControlButton label="Zoom out" onClick={() => zoom(0.8)} icon={Minus} />
        <ControlButton label="Reset" onClick={fitAll} icon={RotateCcw} />
        <ControlButton label="Selected" onClick={centerSelected} icon={Crosshair} />
      </div>

      {detail.open && detail.data ? <BrainDetailPanel data={detail.data} onClose={() => setDetail({ open: false, data: null })} /> : null}
    </div>
  );
}

function buildElements(data: DoblyBrainData) {
  const elements: any[] = [{
    data: {
      id: "gm",
      label: "General Manager",
      type: "gm",
      active: data.feed.length ? "true" : "false",
      description: `Coordinating ${data.operators.length} Operators across ${Math.max(data.spaces.length, 1)} space(s).`,
      stats: `${data.feed.length} recent signals. ${data.approvals.filter((approval) => approval.status === "pending").length} waiting approvals.`,
    },
  }];

  const usedOffices = new Map<string, { id: string; label: string; count: number }>();
  for (const office of officeZones) usedOffices.set(office.id, { id: office.id, label: office.label, count: 0 });

  data.operators.forEach((operator) => {
    const office = officeForOperator(operator);
    const item = usedOffices.get(office.id);
    if (item) item.count += 1;
  });

  for (const office of Array.from(usedOffices.values()).filter((item) => item.count > 0 || data.operators.length === 0)) {
    elements.push({ data: { id: office.id, label: office.label, type: "office", active: office.count > 0 ? "true" : "false", description: `${office.count} Operator(s)` } });
    elements.push({ data: { id: `${office.id}-gm`, source: office.id, target: "gm", type: "office-to-gm" } });
  }

  const connectionMap = new Map<string, BrainConnection>();
  [...data.connections, ...data.mcpConnections, ...data.customApiConnections].forEach((connection) => {
    connectionMap.set(String(connection.id), connection);
  });

  data.operators.forEach((operator) => {
    const office = officeForOperator(operator);
    elements.push({
      data: {
        id: operator.id,
        label: operator.name,
        type: "worker",
        officeId: office.id,
        active: recent(operator.last_run_at) ? "true" : "false",
        status: operator.status ?? "active",
        description: operator.mission ?? operator.outcome ?? "Operator responsibility.",
        lastRun: operator.last_run_at,
        capabilities: (operator.capability_tags ?? []).join(", "),
      },
    });
    elements.push({ data: { id: `${operator.id}-${office.id}`, source: operator.id, target: office.id, type: "office-to-worker" } });

    const toolIds = operator.connected_tool_ids?.length ? operator.connected_tool_ids.slice(0, 5) : (operator.capability_tags ?? []).slice(0, 3).map((tag) => `runtime-${tag}`);
    toolIds.forEach((toolId) => {
      const raw = connectionMap.get(toolId);
      const nodeId = raw ? `conn-${raw.id}` : `conn-${toolId}`;
      if (!elements.some((element) => element.data.id === nodeId)) {
        elements.push({
          data: {
            id: nodeId,
            label: raw ? connectionName(raw) : String(toolId).replace("runtime-", "").replaceAll("_", " "),
            type: "connection",
            active: raw?.status === "active" || !raw ? "true" : "false",
            status: raw?.status ?? "runtime",
            description: raw ? `Connected ${connectionName(raw)} account or tool.` : "Internal Dobly runtime capability.",
          },
        });
      }
      elements.push({ data: { id: `${operator.id}-${nodeId}`, source: operator.id, target: nodeId, type: "worker-to-connection" } });
    });
  });

  return elements;
}

function graphStyle() {
  return [
    {
      selector: "node",
      style: {
        "background-color": "#272724",
        "border-color": "rgba(245,237,228,0.12)",
        "border-width": 1,
        label: "data(label)",
        color: "rgba(245,237,228,0.7)",
        "font-family": "Instrument Sans, sans-serif",
        "font-size": 11,
        "text-valign": "bottom",
        "text-margin-y": 6,
        "text-wrap": "none",
      },
    },
    { selector: 'node[type="gm"]', style: { width: 68, height: 68, "background-color": "rgba(196,80,26,0.15)", "border-color": "rgba(196,80,26,0.4)", "border-width": 2, "font-size": 12, "font-weight": 600 } },
    { selector: 'node[type="office"]', style: { width: 52, height: 52, "font-size": 12, "font-weight": 500 } },
    { selector: 'node[type="worker"]', style: { width: 36, height: 36, "font-size": 11 } },
    { selector: 'node[type="connection"]', style: { width: 24, height: 24, "font-size": 10 } },
    { selector: 'node[active="true"]', style: { "border-color": "rgba(196,80,26,0.6)", "border-width": 2, "shadow-blur": 12, "shadow-color": "rgba(196,80,26,0.2)", "shadow-offset-x": 0, "shadow-offset-y": 0, "shadow-opacity": 1 } },
    { selector: "node:selected", style: { "border-color": "#C4501A", "border-width": 2, "shadow-blur": 20, "shadow-color": "rgba(196,80,26,0.35)", "shadow-offset-x": 0, "shadow-offset-y": 0, "shadow-opacity": 1 } },
    { selector: "node.dimmed", style: { opacity: 0.25 } },
    { selector: "node.highlighted", style: { "border-color": "rgba(245,237,228,0.3)", "border-width": 2 } },
    { selector: "node.escalated", style: { "border-color": "#E6A830", "border-width": 2, "shadow-color": "rgba(230,168,48,0.3)", "shadow-blur": 16, "shadow-opacity": 1 } },
    { selector: "node.pulse", style: { "border-color": "#C4501A", "shadow-blur": 28, "shadow-color": "rgba(196,80,26,0.45)", "shadow-opacity": 1 } },
    { selector: "edge", style: { width: 1, "line-color": "rgba(245,237,228,0.08)", "curve-style": "bezier", "target-arrow-shape": "none" } },
    { selector: 'edge[type="office-to-gm"]', style: { "line-color": "rgba(196,80,26,0.2)", width: 1.5 } },
    { selector: "edge.highlighted", style: { "line-color": "rgba(245,237,228,0.25)", width: 2 } },
    { selector: "edge.dimmed", style: { opacity: 0.05 } },
  ];
}

function BrainTooltip({ tooltip }: { tooltip: TooltipState }) {
  const data = tooltip.data ?? {};
  return (
    <div className="pointer-events-none absolute z-40 max-w-[260px] rounded-[8px] border border-[rgba(245,237,228,0.12)] bg-[#272724] px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.4)]" style={{ left: tooltip.x, top: tooltip.y }}>
      <div className="text-[13px] font-semibold text-[var(--dobly-text)]">{data.label}</div>
      <div className="mt-1 text-[11px] capitalize text-[var(--dobly-text-muted)]">{data.type}</div>
      {data.description ? <div className="mt-2 text-[12px] leading-5 text-[var(--dobly-text-secondary)]">{data.description}</div> : null}
      {data.lastRun ? <div className="mt-2 text-[11px] text-[var(--rust)]">Last run {new Date(data.lastRun).toLocaleString()}</div> : null}
    </div>
  );
}

function ControlButton({ label, icon: Icon, onClick }: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void }) {
  return (
    <button onClick={onClick} title={label} className="grid h-8 w-8 place-items-center rounded-[6px] text-[var(--dobly-text-muted)] transition hover:bg-[rgba(245,237,228,0.06)] hover:text-[var(--dobly-text)]">
      <Icon className="h-4 w-4" />
    </button>
  );
}

function BrainDetailPanel({ data, onClose }: { data: Record<string, any>; onClose: () => void }) {
  const isOperator = data.type === "worker";
  return (
    <aside className="absolute inset-y-0 right-0 z-40 w-[340px] border-l border-[rgba(245,237,228,0.08)] bg-[rgba(28,28,26,0.96)] p-4 shadow-[0_0_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--dobly-text-dim)]">{data.type}</div>
          <h3 className="mt-2 text-xl font-semibold text-[var(--dobly-text)]">{data.label}</h3>
        </div>
        <button onClick={onClose} className="rounded-[8px] border border-[rgba(245,237,228,0.08)] px-2 py-1 text-xs text-[var(--dobly-text-muted)]">Close</button>
      </div>

      <div className="mt-5 grid gap-3">
        <DetailRow icon={data.type === "gm" ? Sparkles : data.type === "office" ? BriefcaseBusiness : data.type === "connection" ? Wrench : Bot} label="Meaning" value={data.description ?? "Dobly node"} />
        <DetailRow icon={ShieldAlert} label="Status" value={data.status ?? (data.active === "true" ? "active" : "quiet")} />
        {data.capabilities ? <DetailRow icon={Box} label="Capabilities" value={data.capabilities} /> : null}
        {data.stats ? <DetailRow icon={Activity} label="System" value={data.stats} /> : null}
      </div>

      {isOperator ? (
        <div className="mt-6 grid gap-2">
          <Link href="/dashboard/operators" className="btn-primary justify-center rounded-[8px] text-xs">
            Open Operator Chat
          </Link>
          <Link href="/dashboard/approvals" className="btn-secondary justify-center rounded-[8px] text-xs">
            Review Approvals
          </Link>
        </div>
      ) : null}

      {data.type === "gm" ? (
        <div className="mt-6 rounded-[8px] border border-[rgba(196,80,26,0.22)] bg-[rgba(196,80,26,0.08)] p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dobly-text)]">
            <BrandMark size={18} showWord={false} />
            General Manager
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-muted)]">Coordinates Operators, detects conflicts, monitors approvals, and gives the user a whole-operation control point.</p>
        </div>
      ) : null}
    </aside>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[rgba(245,237,228,0.08)] bg-[rgba(255,255,255,0.025)] p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">
        <Icon className="h-3.5 w-3.5 text-[var(--rust)]" />
        {label}
      </div>
      <div className="mt-2 text-sm leading-6 text-[var(--dobly-text-secondary)]">{value}</div>
    </div>
  );
}
