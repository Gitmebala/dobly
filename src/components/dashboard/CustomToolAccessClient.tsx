"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  Eye,
  Loader2,
  LockKeyhole,
  PlugZap,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Wrench,
} from "lucide-react";

type ConnectorStatus = {
  definition: {
    id: string;
    label: string;
    provider: string;
    kind: string;
    category: string;
    description: string;
    whatItEnables: string[];
    examplePrompts: string[];
    setupSteps: string[];
    requiredUserInputs: Array<{ key: string; label: string; type: string; required: boolean; help: string }>;
    capabilities: string[];
    defaultRisk: string;
    approvalPolicies: Array<{ action: string; description: string; riskLevel: string; approvalRequired: boolean; rollbackSupport: string }>;
    permissionScopes: string[];
    sandbox: { available: boolean; defaultMode: string; notes: string };
    localBridge?: { required: boolean; name: string; installHint: string; healthPath?: string };
    artifactSupport: string[];
    rollbackSupport: string;
  };
  connectionStatus: "not_connected" | "connected" | "needs_setup" | "error";
  health: { status: string; message: string; checkedAt?: string };
  discoveredTools: Array<{ id: string; label: string; name: string; riskLevel: string; approvalRequired: boolean; description?: string }>;
  existingConnection?: { id: string; server_url?: string; base_url?: string; status?: string; metadata?: Record<string, unknown> } | null;
};

const categoryOrder = [
  "communication",
  "social",
  "crm",
  "commerce",
  "finance",
  "documents",
  "data",
  "media",
  "design",
  "engineering",
  "code",
  "browser",
  "personal",
  "custom",
];

export default function CustomToolAccessClient() {
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = useMemo(
    () => connectors.find((connector) => connector.definition.id === selectedId) ?? connectors[0],
    [connectors, selectedId],
  );
  const selectedUsesTechnicalSetup = selected?.definition.kind === "local_bridge" || selected?.definition.kind === "custom_api";

  function refresh() {
    fetch("/api/connectors/marketplace")
      .then((response) => response.json())
      .then((data) => {
        const sorted = (data.connectors ?? []).sort((a: ConnectorStatus, b: ConnectorStatus) => {
          const categoryDelta = categoryOrder.indexOf(a.definition.category) - categoryOrder.indexOf(b.definition.category);
          return categoryDelta || a.definition.label.localeCompare(b.definition.label);
        });
        setConnectors(sorted);
        setSelectedId((current) => current ?? sorted[0]?.definition.id ?? null);
      })
      .catch(() => setError("Could not load connector marketplace."));
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const existingUrl = selected.existingConnection?.server_url ?? selected.existingConnection?.base_url ?? "";
    setServerUrl(existingUrl || (selected.definition.kind === "local_bridge" ? "http://localhost:3009/mcp" : ""));
    setAuthToken("");
    setTestResult(null);
  }, [selected?.definition.id]);

  function connectSelected() {
    if (!selected) return;
    setError(null);
    setTestResult(null);
    startTransition(async () => {
      const response = await fetch(`/api/connectors/marketplace/${selected.definition.id}/connect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serverUrl: selectedUsesTechnicalSetup ? serverUrl || undefined : undefined,
          baseUrl: selected.definition.kind === "custom_api" ? serverUrl : undefined,
          authToken: selectedUsesTechnicalSetup ? authToken || undefined : undefined,
          authSecret: selectedUsesTechnicalSetup ? authToken || undefined : undefined,
          allowPrivateNetwork: selected.definition.kind === "local_bridge",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not connect tool.");
        return;
      }
      setTestResult(`${selected.definition.label} setup saved. Run Test Connection next.`);
      refresh();
    });
  }

  function testSelected() {
    if (!selected?.existingConnection?.id) {
      setError("Connect this tool before testing it.");
      return;
    }
    setError(null);
    setTestResult(null);
    startTransition(async () => {
      const response = await fetch(`/api/connectors/marketplace/${selected.definition.id}/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ connectionId: selected.existingConnection?.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Connection test failed.");
        return;
      }
      setTestResult(data.message ?? `${selected.definition.label} test completed.`);
      refresh();
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.5rem] border border-[var(--dobly-border)] bg-[radial-gradient(circle_at_15%_10%,rgba(196,80,26,0.14),transparent_32%),color-mix(in_srgb,var(--dobly-surface-raised)_78%,transparent)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--dobly-accent)]">Universal tool marketplace</div>
            <h1 className="mt-3 font-display text-4xl tracking-[-0.05em] text-[var(--dobly-text)]">Connect any tool. Dobly handles the work.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
              Every connector follows the same flow: setup wizard, health check, tool discovery, permission scopes, sandbox mode,
              approval policy, artifact handling, rollback/versioning, and realtime Operator Chat events.
            </p>
          </div>
          <div className="badge-green text-xs">
            <ShieldCheck className="h-3 w-3" />
            Universal approval-gated flow
          </div>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div> : null}
      {testResult ? <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{testResult}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[0.38fr_0.62fr]">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl text-[var(--dobly-text)]">Marketplace</h2>
            <span className="badge-muted text-xs">{connectors.length} connectors</span>
          </div>
          <div className="grid max-h-[760px] gap-2 overflow-auto pr-1">
            {connectors.map((connector) => (
              <button
                key={connector.definition.id}
                onClick={() => setSelectedId(connector.definition.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  selected?.definition.id === connector.definition.id
                    ? "border-[rgba(196,80,26,0.5)] bg-[rgba(196,80,26,0.12)]"
                    : "border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] hover:border-[rgba(196,80,26,0.28)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[var(--dobly-text)]">{connector.definition.label}</div>
                    <div className="mt-1 text-xs capitalize text-[var(--dobly-text-muted)]">
                      {connector.definition.category} / {connector.definition.kind === "local_bridge" ? "local app bridge" : connector.definition.kind === "custom_api" ? "custom API" : "Dobly-hosted"}
                    </div>
                  </div>
                  <StatusPill status={connector.connectionStatus} />
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">{connector.definition.description}</p>
              </button>
            ))}
          </div>
        </div>

        {selected ? (
          <div className="grid gap-4">
            <section className="card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--dobly-accent)]">{selected.definition.category}</div>
                  <h2 className="mt-2 font-display text-3xl tracking-[-0.04em] text-[var(--dobly-text)]">{selected.definition.label}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">{selected.definition.description}</p>
                </div>
                <div className="grid min-w-[190px] gap-2 rounded-xl border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] p-3 text-xs text-[var(--dobly-text-muted)]">
                  <div className="flex justify-between gap-3"><span>Health</span><span>{selected.health.status}</span></div>
                  <div className="flex justify-between gap-3"><span>Risk</span><span>{selected.definition.defaultRisk}</span></div>
                  <div className="flex justify-between gap-3"><span>Rollback</span><span>{selected.definition.rollbackSupport.replace("_", " ")}</span></div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InfoBlock icon={Sparkles} title="What this enables" items={selected.definition.whatItEnables} />
                <InfoBlock icon={Wrench} title="Setup wizard" items={selected.definition.setupSteps} />
                <InfoBlock icon={LockKeyhole} title="Permission scopes" items={selected.definition.permissionScopes} />
                <InfoBlock icon={RotateCcw} title="Artifacts + rollback" items={[
                  `Artifacts: ${selected.definition.artifactSupport.join(", ")}`,
                  `Rollback: ${selected.definition.rollbackSupport.replace("_", " ")}`,
                  selected.definition.sandbox.notes,
                ]} />
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="card">
                <div className="badge-muted text-xs">
                  <PlugZap className="h-3 w-3" />
                  Setup
                </div>
                <div className="mt-4 grid gap-3">
                  {selectedUsesTechnicalSetup ? (
                    <label className="grid gap-2 text-sm">
                      <span className="text-[var(--dobly-text-muted)]">{selected.definition.kind === "local_bridge" ? "Local bridge URL" : "Secure API / bridge URL"}</span>
                      <input value={serverUrl} onChange={(event) => setServerUrl(event.target.value)} className="rounded-lg border border-[var(--dobly-border)] bg-transparent px-3 py-2 text-sm" placeholder="https://mcp.example.com or http://localhost:3009/mcp" />
                    </label>
                  ) : (
                    <div className="rounded-lg border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] p-3 text-sm leading-6 text-[var(--dobly-text-muted)]">
                      This uses Dobly-hosted setup. The user connects their account, Dobly handles provider auth and connector routing behind the scenes, and Operators only see approved tools/actions.
                    </div>
                  )}
                  {selectedUsesTechnicalSetup ? (
                    <label className="grid gap-2 text-sm">
                      <span className="text-[var(--dobly-text-muted)]">Auth token / secret, optional</span>
                      <input value={authToken} onChange={(event) => setAuthToken(event.target.value)} type="password" className="rounded-lg border border-[var(--dobly-border)] bg-transparent px-3 py-2 text-sm" placeholder="Optional token" />
                    </label>
                  ) : null}
                  {selected.definition.localBridge?.required ? (
                    <div className="rounded-lg border border-[rgba(196,80,26,0.25)] bg-[rgba(196,80,26,0.08)] p-3 text-xs leading-5 text-[var(--dobly-text-secondary)]">
                      <strong>{selected.definition.localBridge.name}:</strong> {selected.definition.localBridge.installHint}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={connectSelected} disabled={isPending} className="btn-primary disabled:opacity-60">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
                    Connect
                  </button>
                  <button onClick={testSelected} disabled={isPending || !selected.existingConnection?.id} className="btn-secondary disabled:opacity-60">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
                    Test connection
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="badge-muted text-xs">
                  <Eye className="h-3 w-3" />
                  Tool discovery preview
                </div>
                <div className="mt-4 grid gap-2">
                  {selected.discoveredTools.length ? selected.discoveredTools.map((tool) => (
                    <div key={tool.id} className="rounded-lg border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[var(--dobly-text)]">{tool.label}</div>
                          <p className="mt-1 text-xs leading-5 text-[var(--dobly-text-muted)]">{tool.description || tool.name}</p>
                        </div>
                        <span className="badge-muted text-[10px]">{tool.riskLevel}</span>
                      </div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">
                        {tool.approvalRequired ? "Approval required" : "Can run without approval"}
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-lg border border-dashed border-[var(--dobly-border)] p-4 text-sm text-[var(--dobly-text-muted)]">
                      Run Test Connection to discover tools/actions. Dobly will show what Operators can use before anything goes live.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="card">
              <div className="badge-muted text-xs">
                <ShieldCheck className="h-3 w-3" />
                Approval policies per action
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {selected.definition.approvalPolicies.map((policy) => (
                  <div key={policy.action} className="rounded-lg border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[var(--dobly-text)]">{policy.action.replaceAll("_", " ")}</div>
                        <p className="mt-1 text-xs leading-5 text-[var(--dobly-text-muted)]">{policy.description}</p>
                      </div>
                      <span className={policy.approvalRequired ? "badge-amber text-[10px]" : "badge-green text-[10px]"}>
                        {policy.approvalRequired ? "Approval" : "Auto"}
                      </span>
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">
                      {policy.riskLevel} risk / rollback {policy.rollbackSupport.replace("_", " ")}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "connected") return <span className="badge-green text-[10px]"><CheckCircle2 className="h-3 w-3" />Connected</span>;
  if (status === "needs_setup") return <span className="badge-amber text-[10px]">Setup needed</span>;
  if (status === "error") return <span className="badge-red text-[10px]">Error</span>;
  return <span className="badge-muted text-[10px]">Not connected</span>;
}

function InfoBlock({ icon: Icon, title, items }: { icon: React.ComponentType<{ className?: string }>; title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dobly-text)]">
        <Icon className="h-4 w-4 text-[var(--dobly-accent)]" />
        {title}
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 text-xs leading-5 text-[var(--dobly-text-muted)]">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--dobly-accent)]" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
