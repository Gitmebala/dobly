"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, Loader2, PlugZap, Search, TestTube2 } from "lucide-react";

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
  const [query, setQuery] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Nothing is selected until the user picks a tool: the old layout kept a
  // detail pane permanently open next to a cramped scrolling list, so the
  // browse step never had room to breathe.
  const selected = useMemo(
    () => connectors.find((connector) => connector.definition.id === selectedId) ?? null,
    [connectors, selectedId],
  );
  const selectedUsesTechnicalSetup = selected?.definition.kind === "local_bridge" || selected?.definition.kind === "custom_api";

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return connectors;
    return connectors.filter(
      (connector) =>
        connector.definition.label.toLowerCase().includes(term) ||
        connector.definition.category.toLowerCase().includes(term),
    );
  }, [connectors, query]);

  function refresh() {
    fetch("/api/connectors/marketplace")
      .then((response) => response.json())
      .then((data) => {
        const sorted = (data.connectors ?? []).sort((a: ConnectorStatus, b: ConnectorStatus) => {
          const categoryDelta = categoryOrder.indexOf(a.definition.category) - categoryOrder.indexOf(b.definition.category);
          return categoryDelta || a.definition.label.localeCompare(b.definition.label);
        });
        setConnectors(sorted);
      })
      .catch(() => setError("Could not load the tool list."));
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
    setError(null);
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
        setError(data.error ?? "Could not connect that tool.");
        return;
      }
      // This used to unconditionally say "X connected." regardless of what
      // the backend actually did - for oauth-flavored connectors with no
      // real provider wired up yet, that meant a placeholder row got created
      // (honestly marked pending in the database) while the screen claimed
      // success. Now: a real OAuth redirect actually navigates there, and
      // anything short of an active connection says so honestly instead of
      // celebrating early.
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }
      const status = data.connection?.status;
      if (status === "active" || status === "connected") {
        setTestResult(`${selected.definition.label} connected.`);
      } else if (status === "pending") {
        setTestResult(
          `${selected.definition.label} setup started, but isn't connected yet - ${
            selected.definition.setupSteps[0] ?? "finish the remaining setup steps"
          }.`,
        );
      } else {
        setTestResult(`${selected.definition.label} setup was recorded, but is not yet active.`);
      }
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
      setTestResult(data.message ?? `${selected.definition.label} is working.`);
      refresh();
    });
  }

  const banner = (
    <>
      {error ? <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div> : null}
      {testResult ? <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{testResult}</div> : null}
    </>
  );

  if (selected) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSelectedId(null)} className="btn-ghost inline-flex text-xs">
          <ArrowLeft className="h-3.5 w-3.5" />
          All tools
        </button>

        <div>
          <h1 className="font-display text-xl font-semibold text-text">{selected.definition.label}</h1>
          <p className="mt-1 text-sm text-text-muted">{selected.definition.description}</p>
        </div>

        {banner}

        <section className="card space-y-3">
          {selectedUsesTechnicalSetup ? (
            <>
              <label className="grid gap-1.5 text-sm">
                <span className="text-text-muted">{selected.definition.kind === "local_bridge" ? "Local bridge URL" : "API URL"}</span>
                <input
                  value={serverUrl}
                  onChange={(event) => setServerUrl(event.target.value)}
                  className="input"
                  placeholder="https://api.example.com"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="text-text-muted">Token or secret (optional)</span>
                <input
                  value={authToken}
                  onChange={(event) => setAuthToken(event.target.value)}
                  type="password"
                  className="input"
                  placeholder="Optional"
                />
              </label>
            </>
          ) : (
            <p className="text-sm text-text-muted">Connect your account and Dobly handles the rest.</p>
          )}

          {selected.definition.localBridge?.required ? (
            <div className="rounded-lg border border-[rgba(196,80,26,0.25)] bg-[rgba(196,80,26,0.08)] p-3 text-xs leading-5 text-text-secondary">
              <strong>{selected.definition.localBridge.name}:</strong> {selected.definition.localBridge.installHint}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={connectSelected} disabled={isPending} className="btn-primary disabled:opacity-60">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
              {selected.connectionStatus === "connected" ? "Reconnect" : "Connect"}
            </button>
            {selected.existingConnection?.id ? (
              <button onClick={testSelected} disabled={isPending} className="btn-secondary disabled:opacity-60">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
                Test
              </button>
            ) : null}
          </div>
        </section>

        {selected.discoveredTools.length ? (
          <section>
            <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-text-dim">What it can do</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {selected.discoveredTools.map((tool) => (
                <div key={tool.id} className="rounded-lg border border-border bg-[rgba(255,255,255,0.02)] px-3 py-2">
                  <div className="text-sm text-text">{tool.label}</div>
                  {tool.approvalRequired ? (
                    <div className="mt-0.5 text-xs text-text-muted">Asks you first</div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-text">Add a tool</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input !py-1.5 !pl-8 text-sm"
            placeholder="Search tools"
            aria-label="Search tools"
          />
        </div>
      </div>

      {banner}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((connector) => (
          <button
            key={connector.definition.id}
            onClick={() => setSelectedId(connector.definition.id)}
            className="premium-tile flex items-center justify-between gap-3 text-left transition hover:border-accent/40"
          >
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold text-text">{connector.definition.label}</div>
              <div className="text-xs capitalize text-text-muted">{connector.definition.category}</div>
            </div>
            {connector.connectionStatus === "connected" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
            ) : null}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-muted">
          No tools match “{query}”.
        </div>
      ) : null}
    </div>
  );
}
