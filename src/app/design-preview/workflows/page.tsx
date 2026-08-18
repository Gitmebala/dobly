"use client";

// No-auth preview of the real Loops page pieces built this session:
// CreateLoopDrawer, LoopTriggerPopover, LoopRowMenu. Same fetch-stub
// technique as design-preview/hire - the REAL components run, only the
// network calls they make are intercepted with realistic responses, so
// three brand-new UI primitives (Sheet, Popover, RadioGroup) get an actual
// render check instead of resting on typecheck alone.
import { useEffect, useState } from "react";
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";
import { CreateLoopDrawer } from "@/components/dashboard/CreateLoopDrawer";
import { LoopTriggerPopover } from "@/components/dashboard/LoopTriggerPopover";
import { LoopRowMenu } from "@/components/dashboard/LoopRowMenu";
import "@/app/dashboard/reference-app.css";

const MOCK_COWORKERS = [
  { id: "op-1", name: "Maya" },
  { id: "op-2", name: "Dex" },
];

const MOCK_LOOPS = [
  { id: "loop-1", name: "New order alert", operator: "Maya", cadence: "When something happens", status: "active" as const, lastRun: "ran 2026-08-16", webhook: true, masked: "a1b2" },
  { id: "loop-2", name: "Morning briefing", operator: "Dex", cadence: "Every day", status: "active" as const, lastRun: "ran 2026-08-17", webhook: false, masked: "" },
  { id: "loop-3", name: "Weekly report", operator: "Maya", cadence: "Every week", status: "paused" as const, lastRun: "not run yet", webhook: false, masked: "" },
];

export default function WorkflowsDesignPreviewPage() {
  const [ready, setReady] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/loops") && url.includes("/api/operators/") && method === "POST") {
        setLog((prev) => [...prev, `POST ${url} :: ${init?.body}`]);
        const body = JSON.parse(String(init?.body ?? "{}"));
        return new Response(
          JSON.stringify({
            loop: { id: "loop-new", name: body.name, status: "active" },
            webhookUrl: body.kind === "webhook" ? "https://dobly-dev.vercel.app/api/loops/loop-new/trigger/mock_token_abcdef123456" : null,
            githubWebhookUrl: body.kind === "github_repo" ? "https://dobly-dev.vercel.app/api/loops/loop-new/github" : null,
            githubSecret: body.kind === "github_repo" ? "mock_github_secret_abcdef123456" : null,
          }),
          { status: 201 },
        );
      }
      if (url.includes("/regenerate") && method === "POST") {
        setLog((prev) => [...prev, `POST ${url}`]);
        return new Response(
          JSON.stringify({ loop: { id: "loop-1", status: "active" }, webhookUrl: "https://dobly-dev.vercel.app/api/loops/loop-1/trigger/mock_new_token_98765" }),
          { status: 200 },
        );
      }
      if (url.match(/\/api\/loops\/[^/]+$/) && method === "PATCH") {
        setLog((prev) => [...prev, `PATCH ${url} :: ${init?.body}`]);
        return new Response(JSON.stringify({ loop: { id: "loop-1", status: JSON.parse(String(init?.body ?? "{}")).status } }), { status: 200 });
      }
      return realFetch(input, init);
    };
    setReady(true);
    return () => { window.fetch = realFetch; };
  }, []);

  if (!ready) return null;

  return (
    <DashboardWorkspace profile={{ full_name: "Michael", email: "michael@dobly.io" }} isAdmin={false} workspaces={[]} activeWorkspaceId={null}>
      <div className="workflows-page mx-auto max-w-5xl space-y-4">
        <section className="card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-text-dim">Loops</div>
              <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">The recurring work your coworkers run</h1>
              <p className="mt-2 text-sm leading-6 text-text-muted">2 running across 2 coworkers</p>
            </div>
            <div className="flex items-center gap-2">
              <CreateLoopDrawer coworkers={MOCK_COWORKERS} />
            </div>
          </div>
        </section>

        <section className="home-list">
          {MOCK_LOOPS.map((loop) => (
            <div key={loop.id} className="home-list-row loop-row">
              <a className="home-list-main loop-row-link" href="#void" onClick={(e) => e.preventDefault()}>
                <strong>{loop.name}</strong>
                <small>{loop.operator} · {loop.cadence}</small>
              </a>
              <span className="home-list-meta">
                {loop.webhook ? <LoopTriggerPopover loopId={loop.id} maskedToken={loop.masked} /> : null}
                <em data-status={loop.status}>{loop.status}</em>
                <time>{loop.lastRun}</time>
                <LoopRowMenu loopId={loop.id} status={loop.status} />
              </span>
            </div>
          ))}
        </section>

        <section className="card">
          <strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--app-muted)" }}>Intercepted requests (mock verification log)</strong>
          <pre style={{ fontSize: 11, marginTop: 8, whiteSpace: "pre-wrap", color: "var(--app-text)" }}>{log.length ? log.join("\n") : "(none yet — try creating a loop, opening a webhook trigger, or pausing one)"}</pre>
        </section>
      </div>
    </DashboardWorkspace>
  );
}
