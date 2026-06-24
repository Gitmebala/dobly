"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Play,
  Plus,
  Save,
  Trash2,
  Zap,
} from "lucide-react";
import { isConnectionOperational } from "@/lib/connection-readiness";
import { CONNECTOR_CATALOG, getConnector, getConnectorAction } from "@/lib/connectors/catalog";
import { getWorkflowConnectionStrategy } from "@/lib/provider-strategy";
import type { Connection, Workflow, WorkflowActionStep, WorkflowDefinition, WorkflowRun } from "@/types";

function prettyJson(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

function artifactHref(path: string) {
  return `/api/artifacts?path=${encodeURIComponent(path)}`;
}

function collectVariables(value: unknown, bucket = new Set<string>()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
      if (match[1]) bucket.add(match[1]);
    }
    return bucket;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectVariables(item, bucket);
    return bucket;
  }

  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) collectVariables(nested, bucket);
  }

  return bucket;
}

const SUPPORTED_CONNECTOR_IDS = new Set(
  CONNECTOR_CATALOG.filter((connector) => !["linkedin", "x", "desktop"].includes(connector.id)).map(
    (connector) => connector.id,
  ),
);

function isLegacyAgentStep(step: WorkflowActionStep) {
  const actionType = String(step.actionType ?? "");
  return actionType === "browser_agent" || actionType === "local_agent";
}

function normalizeLegacyStep(step: WorkflowActionStep): WorkflowActionStep {
  if (!isLegacyAgentStep(step)) return step;

  const instruction =
    typeof step.config.instruction === "string" && step.config.instruction.trim().length > 0
      ? step.config.instruction
      : step.description;

  const targetUrl =
    typeof step.config.targetUrl === "string" && step.config.targetUrl.trim().length > 0
      ? step.config.targetUrl
      : "";

  const targetApp =
    typeof step.config.targetApp === "string" && step.config.targetApp.trim().length > 0
      ? step.config.targetApp
      : "";

  return {
    ...step,
    app: "webhook",
    actionType: "webhook_request",
    lane: "generic",
    connectorId: "generic-http",
    connectorActionId: "request",
    description: `${step.description} Converted from a legacy ${String(step.actionType ?? "") === "browser_agent" ? "browser" : "local"} agent step.`,
    config: {
      url: targetUrl,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        instruction,
        targetApp,
        previousOutput: "{{trigger}}",
      },
      migrationNote:
        "This step was converted from a legacy Dobly agent action. Point it at a supported API or webhook before running.",
      legacySource: step.actionType,
    },
  };
}

export default function WorkflowEditor({
  workflow,
  appUrl,
  recentRuns,
}: {
  workflow: Workflow;
  appUrl: string;
  recentRuns: WorkflowRun[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(workflow.title);
  const [description, setDescription] = useState(workflow.description);
  const [status, setStatus] = useState(workflow.status);
  const [blueprint, setBlueprint] = useState(() => ({
    ...workflow.blueprint,
    definition: workflow.blueprint.definition
      ? {
          ...workflow.blueprint.definition,
          steps: workflow.blueprint.definition.steps.map((step) => normalizeLegacyStep(step)),
        }
      : workflow.blueprint.definition,
  }));
  const [runPayload, setRunPayload] = useState('{\n  "email": "customer@example.com"\n}');
  const [dryRun, setDryRun] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);

  const definition = blueprint.definition as WorkflowDefinition;
  const operatingModel = blueprint.operating_model;
  const sandboxMode = searchParams?.get("mode") === "sandbox";
  const hasLegacyAgentSteps = definition?.steps.some((step) => isLegacyAgentStep(step)) ?? false;
  const operator = definition?.operator;
  const webhookUrl = useMemo(() => {
    if (definition?.trigger.type !== "webhook" || !definition.trigger.webhook_path) return "";
    return `${appUrl}/api/triggers/webhook/${definition.trigger.webhook_path}`;
  }, [appUrl, definition]);
  const variableList = useMemo(
    () => Array.from(collectVariables({ trigger: definition?.trigger, steps: definition?.steps ?? [] })),
    [definition],
  );
  const connectionStrategy = useMemo(
    () => getWorkflowConnectionStrategy(blueprint, workflow.prompt),
    [blueprint, workflow.prompt],
  );

  useEffect(() => {
      fetch("/api/connections")
        .then((res) => res.json())
        .then((data) => {
          const activeConnections = (data.connections ?? []).filter(
            (item: Connection) => isConnectionOperational(item)
          );
        setConnections(activeConnections);
        const activeProviders = activeConnections.map((item: Connection) => item.provider);
        setConnectedProviders(activeProviders);
      })
      .catch(() => {
        setConnections([]);
        setConnectedProviders([]);
      });
  }, []);

  function updateDefinition(next: WorkflowDefinition) {
    setBlueprint((prev) => ({
      ...prev,
      definition: next,
    }));
  }

  function updateStep(stepId: string, updater: (step: WorkflowActionStep) => WorkflowActionStep) {
    updateDefinition({
      ...definition,
      steps: definition.steps.map((step) => (step.id === stepId ? updater(step) : step)),
    });
  }

  function updateStepConfig(stepId: string, key: string, value: unknown) {
    updateStep(stepId, (current) => ({
      ...current,
      config: {
        ...current.config,
        [key]: value,
      },
    }));
  }

  function addStep() {
    const formatter = getConnector("formatter");
    const defaultAction = formatter?.actions[0];
    updateDefinition({
      ...definition,
      steps: [
        ...definition.steps,
        {
          id: `step_${definition.steps.length + 1}`,
          name: `Step ${definition.steps.length + 1}`,
          description: "Describe what this step should do.",
          app: formatter?.id ?? "formatter",
          actionType: defaultAction?.runtimeAction ?? "compose_text",
          lane: defaultAction?.lane ?? "generic",
          connectorId: defaultAction?.connectorId ?? "generic-http",
          connectorActionId: defaultAction?.connectorActionId ?? "request",
          enabled: true,
          config: (defaultAction?.defaultConfig ?? { template: "Hello {{trigger.email}}" }) as Record<string, unknown>,
        },
      ],
    });
  }

  function removeStep(stepId: string) {
    updateDefinition({
      ...definition,
      steps: definition.steps.filter((step) => step.id !== stepId),
    });
  }

  async function saveWorkflow() {
    setMessage(null);

    startTransition(async () => {
      const res = await fetch(`/api/workflows/${workflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          status,
          blueprint,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to save workflow." }));
        setMessage({ type: "error", text: data.error ?? "Failed to save workflow." });
        return;
      }

      setMessage({ type: "success", text: "Workflow saved." });
      router.refresh();
    });
  }

  async function runWorkflow(runMode: "dry_run" | "live" = dryRun ? "dry_run" : "live") {
    setMessage(null);
    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(runPayload) as Record<string, unknown>;
    } catch {
      setMessage({ type: "error", text: "Trigger payload must be valid JSON." });
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/workflows/${workflow.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: runMode,
          payload,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Workflow run failed." });
        return;
      }

      const runStatus = typeof data.run?.status === "string" ? data.run.status : null;
      const successText =
        runMode === "dry_run"
          ? runStatus === "awaiting_approval"
            ? "Dry run reached an approval checkpoint successfully."
            : "Dry run completed. No live systems were touched."
          : runStatus === "awaiting_approval"
            ? "Live run is waiting for approval."
            : "Workflow run completed.";

      setMessage({ type: "success", text: successText });
      router.refresh();
    });
  }

  async function deleteWorkflow() {
    const confirmed = window.confirm("Delete this workflow? This cannot be undone.");
    if (!confirmed) return;

    startTransition(async () => {
      const res = await fetch(`/api/workflows/${workflow.id}`, { method: "DELETE" });
      if (!res.ok) {
        setMessage({ type: "error", text: "Failed to delete workflow." });
        return;
      }

      router.push("/dashboard/workflows");
      router.refresh();
    });
  }

  async function copyWebhook() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function applyConnectorAction(stepId: string, connectorId: string, actionId: string) {
    const connector = getConnector(connectorId);
    const action = getConnectorAction(connectorId, actionId);
    if (!connector || !action) return;

    updateStep(stepId, (current) => ({
      ...current,
      app: connector.id,
      actionType: action.runtimeAction,
      lane: action.lane,
      connectorId: action.connectorId,
      connectorActionId: action.connectorActionId,
      description: action.description,
      config: action.defaultConfig,
      name: action.label,
    }));
  }

  function convertLegacyStep(stepId: string) {
    updateStep(stepId, (current) => normalizeLegacyStep(current));
    setMessage({
      type: "success",
      text: "Legacy agent step converted into a supported webhook-style step. Point it at a real endpoint before running.",
    });
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-2">
              {sandboxMode ? "Safe sandbox" : "Runnable workflow"}
            </p>
            <h1 className="font-display font-bold text-3xl text-text">
              {sandboxMode ? "Test safely first" : "Edit and run"}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {sandboxMode
                ? "Dobly simulates the run here first so you can see what happens before any live system is touched."
                : "Dobly builds the first draft. You can tune the runtime before turning it loose."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => runWorkflow("live")} disabled={isPending || status !== "active"} className="btn-primary">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run now
            </button>
            <button onClick={() => runWorkflow("dry_run")} disabled={isPending} className="btn-secondary">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Dry run
            </button>
            <button onClick={saveWorkflow} disabled={isPending} className="btn-secondary">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button onClick={deleteWorkflow} disabled={isPending} className="btn-ghost text-red-400 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {sandboxMode ? (
          <div className="rounded-xl border border-accent/30 bg-accent-dim px-4 py-3 text-sm text-text">
            Start with <span className="font-medium text-white">Dry run</span>. Dobly will simulate external side effects,
            keep live systems untouched, and show you the full run result before you decide to go live.
          </div>
        ) : (
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-text-muted">
            This is the optional advanced layer. Most users should test in sandbox first, then only open the editor if they want deeper control.
          </div>
        )}

        {message ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-accent/30 bg-accent-dim text-accent"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        {workflow.blueprint.definition?.steps.some((step) => isLegacyAgentStep(step)) ? (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
            This workflow used Dobly&apos;s old browser/local agent model. It has been opened in the supported connector model so you can keep it maintainable.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-display font-medium text-text-muted mb-2">
              Workflow name
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-xs font-display font-medium text-text-muted mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Workflow["status"])}
              className="input"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-display font-medium text-text-muted mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input min-h-[96px] resize-y"
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          {operatingModel ? (
            <div className="card space-y-4">
              <div>
                <h2 className="font-display font-semibold text-xl text-text">What this setup owns</h2>
                <p className="text-sm text-text-muted">
                  Dobly should feel like it owns real work, not just a sequence of steps.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-display font-medium text-text-muted mb-2">
                    Job to be done
                  </label>
                  <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-muted">
                    {operatingModel.job_to_be_done}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-display font-medium text-text-muted mb-2">
                    Work talents
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {operatingModel.work_talents.map((talent) => (
                      <span key={talent} className="badge-muted">
                        {talent.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InlineMiniList title="Responsibilities" items={operatingModel.responsibilities} />
                <InlineMiniList title="Watches" items={operatingModel.watches} />
                <InlineMiniList title="Handled by Dobly" items={operatingModel.handled_by_dobly} />
                <InlineMiniList title="Approvals" items={operatingModel.approval_contract} />
              </div>
            </div>
          ) : null}

          {operator?.enabled ? (
            <div className="card space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-semibold text-xl text-text">Agent runtime</h2>
                  <p className="text-sm text-text-muted">
                    Role, autonomy, and escalation in one place.
                  </p>
                </div>
                <span className="badge-green">{operator.autonomy}</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-display font-medium text-text-muted mb-2">
                    Role
                  </label>
                  <input
                    className="input"
                    value={operator.role}
                    onChange={(e) =>
                      updateDefinition({
                        ...definition,
                        operator: { ...operator, role: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-display font-medium text-text-muted mb-2">
                    Channel
                  </label>
                  <input
                    className="input"
                    value={operator.channel ?? ""}
                    onChange={(e) =>
                      updateDefinition({
                        ...definition,
                        operator: { ...operator, channel: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-display font-medium text-text-muted mb-2">
                  Objective
                </label>
                <textarea
                  className="input min-h-[88px]"
                  value={operator.objective}
                  onChange={(e) =>
                    updateDefinition({
                      ...definition,
                      operator: { ...operator, objective: e.target.value },
                    })
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-display font-medium text-text-muted mb-2">
                    Autonomy
                  </label>
                  <select
                    className="input"
                    value={operator.autonomy}
                    onChange={(e) =>
                      updateDefinition({
                        ...definition,
                        operator: {
                          ...operator,
                          autonomy: e.target.value as typeof operator.autonomy,
                        },
                      })
                    }
                  >
                    <option value="supervised">Supervised</option>
                    <option value="guarded">Guarded</option>
                    <option value="delegated">Delegated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-display font-medium text-text-muted mb-2">
                    Approval threshold
                  </label>
                  <select
                    className="input"
                    value={operator.approvalRiskThreshold}
                    onChange={(e) =>
                      updateDefinition({
                        ...definition,
                        operator: {
                          ...operator,
                          approvalRiskThreshold: e.target.value as typeof operator.approvalRiskThreshold,
                        },
                      })
                    }
                  >
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
          ) : null}

          <div className="card space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display font-semibold text-xl text-text">Trigger</h2>
                <p className="text-sm text-text-muted">
                  Choose how this automation starts.
                </p>
              </div>
              <span className="badge-green capitalize">{definition.trigger.type}</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-display font-medium text-text-muted mb-2">
                  Trigger type
                </label>
                <select
                  className="input"
                  value={definition.trigger.type}
                  onChange={(e) =>
                    updateDefinition({
                      ...definition,
                      trigger: {
                        ...definition.trigger,
                        type: e.target.value as WorkflowDefinition["trigger"]["type"],
                        webhook_path:
                          e.target.value === "webhook"
                            ? definition.trigger.webhook_path || workflow.id
                            : undefined,
                      },
                    })
                  }
                >
                  <option value="manual">Manual</option>
                  <option value="webhook">Webhook</option>
                  <option value="schedule">Schedule</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-display font-medium text-text-muted mb-2">
                  Trigger label
                </label>
                <input
                  className="input"
                  value={definition.trigger.label}
                  onChange={(e) =>
                    updateDefinition({
                      ...definition,
                      trigger: { ...definition.trigger, label: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            {definition.trigger.type === "schedule" ? (
              <div>
                <label className="block text-xs font-display font-medium text-text-muted mb-2">
                  Cron schedule
                </label>
                <input
                  className="input"
                  placeholder="0 8 * * *"
                  value={definition.trigger.schedule ?? ""}
                  onChange={(e) =>
                    updateDefinition({
                      ...definition,
                      trigger: { ...definition.trigger, schedule: e.target.value },
                    })
                  }
                />
              </div>
            ) : null}

            {definition.trigger.type === "webhook" ? (
              <div className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-display font-medium text-text">Webhook URL</p>
                    <p className="text-xs text-text-muted mt-1 break-all">{webhookUrl}</p>
                  </div>
                  <button onClick={copyWebhook} className="btn-ghost text-xs">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="card space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display font-semibold text-xl text-text">Steps</h2>
                <p className="text-sm text-text-muted">
                  This is the executable side of the workflow.
                </p>
              </div>
              <button onClick={addStep} className="btn-secondary text-xs py-2">
                <Plus className="w-3.5 h-3.5" />
                Add step
              </button>
            </div>

            <div className="space-y-4">
              {definition.steps.map((step, index) => (
                <div key={step.id} className="rounded-2xl border border-border bg-surface-2 p-4 space-y-4">
                  {(() => {
                    const connector = getConnector(step.app);
                    const hasConnection =
                      connector?.connectionRequired ? connectedProviders.includes(connector.provider) : true;

                    return connector?.connectionRequired && !hasConnection ? (
                      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
                        Connect {connector.provider} in Settings before this step can run for real.
                      </div>
                    ) : null;
                  })()}
                  {(() => {
                    const connector = getConnector(step.app);
                    if (!connector?.connectionRequired) return null;
                    const availableConnections = connections.filter(
                      (item) => item.provider === connector.provider
                    );

                    return (
                      <div>
                        <label className="block text-xs font-display font-medium text-text-muted mb-2">
                          Connected account
                        </label>
                        <select
                          className="input"
                          value={String(step.config.connectionId ?? "")}
                          onChange={(e) =>
                            updateStep(step.id, (current) => ({
                              ...current,
                              config: {
                                ...current.config,
                                connectionId: e.target.value || undefined,
                              },
                            }))
                          }
                        >
                          <option value="">Use latest active {connector.provider} connection</option>
                          {availableConnections.map((connection) => (
                            <option key={connection.id} value={connection.id}>
                              {connection.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/20 bg-accent-dim text-xs font-mono text-accent">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-display font-semibold text-text">{step.name}</p>
                        <p className="text-xs text-text-muted">
                          {step.app} {step.lane ? `· ${step.lane}` : ""}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => removeStep(step.id)} className="btn-ghost text-xs hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-display font-medium text-text-muted mb-2">
                        Step name
                      </label>
                      <input
                        className="input"
                        value={step.name}
                        onChange={(e) => updateStep(step.id, (current) => ({ ...current, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-display font-medium text-text-muted mb-2">
                        App
                      </label>
                      <select
                        className="input"
                        value={step.app}
                        onChange={(e) => {
                          const connector = getConnector(e.target.value);
                          const action = connector?.actions[0];
                          updateStep(step.id, (current) => ({
                            ...current,
                            app: e.target.value,
                            name: action?.label ?? current.name,
                            description: action?.description ?? current.description,
                            actionType: action?.runtimeAction ?? current.actionType,
                            lane: action?.lane ?? current.lane,
                            connectorId: action?.connectorId ?? current.connectorId,
                            connectorActionId: action?.connectorActionId ?? current.connectorActionId,
                            config: (action?.defaultConfig ?? current.config) as Record<string, unknown>,
                          }));
                        }}
                      >
                        {CONNECTOR_CATALOG.filter((connector) => SUPPORTED_CONNECTOR_IDS.has(connector.id) || connector.id === step.app).map((connector) => (
                          <option key={connector.id} value={connector.id}>
                            {connector.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-display font-medium text-text-muted mb-2">
                        Action
                      </label>
                      <select
                        className="input"
                        value={getConnector(step.app)?.actions.find((option) => option.runtimeAction === step.actionType)?.id ?? ""}
                        onChange={(e) => applyConnectorAction(step.id, step.app, e.target.value)}
                      >
                        {(getConnector(step.app)?.actions ?? []).map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="inline-flex items-center gap-2 text-sm text-text-muted">
                        <input
                          type="checkbox"
                          checked={step.enabled}
                          onChange={(e) =>
                            updateStep(step.id, (current) => ({ ...current, enabled: e.target.checked }))
                          }
                        />
                        Step enabled
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-display font-medium text-text-muted mb-2">
                      Description
                    </label>
                    <textarea
                      className="input min-h-[76px]"
                      value={step.description}
                      onChange={(e) =>
                        updateStep(step.id, (current) => ({ ...current, description: e.target.value }))
                      }
                    />
                  </div>

                  {step.actionType === "orchestrate_document" ? (
                    <div className="rounded-2xl border border-border bg-surface p-4 space-y-4">
                      <div>
                        <h3 className="font-display font-semibold text-base text-text">
                          Document output
                        </h3>
                        <p className="text-xs text-text-muted mt-1">
                          The orchestrator can assemble a report and also write `.md`, `.html`, and `.json` artifacts into the workspace.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-display font-medium text-text-muted mb-2">
                          Report prompt
                        </label>
                        <textarea
                          className="input min-h-[110px]"
                          value={String(step.config.prompt ?? "")}
                          onChange={(e) => updateStepConfig(step.id, "prompt", e.target.value)}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="inline-flex items-center gap-2 text-sm text-text-muted">
                          <input
                            type="checkbox"
                            checked={step.config.writeArtifacts !== false}
                            onChange={(e) =>
                              updateStepConfig(step.id, "writeArtifacts", e.target.checked)
                            }
                          />
                          Write document artifacts to workspace
                        </label>
                        <div>
                          <label className="block text-xs font-display font-medium text-text-muted mb-2">
                            Artifact base path
                          </label>
                          <input
                            className="input"
                            value={String(step.config.artifactBasePath ?? "")}
                            onChange={(e) =>
                              updateStepConfig(step.id, "artifactBasePath", e.target.value)
                            }
                            placeholder="outputs/reports/daily-summary"
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="block text-xs font-display font-medium text-text-muted mb-2">
                      Step config JSON
                    </label>
                    <textarea
                      className="input min-h-[150px] font-mono text-xs"
                      value={prettyJson(step.config)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value) as Record<string, unknown>;
                          updateStep(step.id, (current) => ({ ...current, config: parsed }));
                        } catch {
                          setMessage({
                            type: "error",
                            text: `Invalid JSON in ${step.name}.`,
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card space-y-4">
          <div>
            <h2 className="font-display font-semibold text-xl text-text">
              {sandboxMode ? "Sandbox payload" : "Test payload"}
            </h2>
            <p className="text-sm text-text-muted mt-1">
              {sandboxMode ? "Used for safe sandbox runs first, then live runs if you choose." : "Used for live runs and dry runs."}
            </p>
          </div>
          <textarea
            value={runPayload}
            onChange={(e) => setRunPayload(e.target.value)}
            className="input min-h-[180px] font-mono text-xs"
          />
          <label className="inline-flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
            />
            Default to dry runs first
          </label>
          <div className="rounded-xl border border-border bg-surface-2 p-4 text-xs text-text-muted">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <p>
                  Email steps use `trigger.email`. Dry runs simulate external side effects, while live runs hit real connected systems. Delay steps are capped to 30 seconds per run in-app so testing stays fast.
                </p>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <div>
              <h2 className="font-display font-semibold text-xl text-text">Launch readiness</h2>
              <p className="text-sm text-text-muted mt-1">
                Keep setup lean. Connect only what must run live.
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-text-dim">Required</div>
                <div className="mt-2 text-sm text-text">
                  {connectionStrategy.requiredProviders.length > 0
                    ? connectionStrategy.requiredProviders.map((item) => item.label).join(", ")
                    : "No hard connection requirement detected."}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-text-dim">Optional</div>
                <div className="mt-2 text-sm text-text">
                  {connectionStrategy.optionalProviders.length > 0
                    ? connectionStrategy.optionalProviders.slice(0, 5).map((item) => item.label).join(", ")
                    : "No optional enrichments suggested."}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-text-dim">Dobly-managed</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {connectionStrategy.managedCapabilities.slice(0, 3).map((item) => (
                    <span key={item.id} className="badge-muted">
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <div>
              <h2 className="font-display font-semibold text-xl text-text">Variables</h2>
              <p className="text-sm text-text-muted mt-1">
                Inputs already referenced by this runtime.
              </p>
            </div>

            {variableList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-bright p-4 text-sm text-text-muted">
                No runtime variables detected yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {variableList.map((item) => (
                  <span key={item} className="badge-muted">
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-semibold text-xl text-text">Recent runs</h2>
                <p className="text-sm text-text-muted mt-1">
                  Latest execution history for this workflow.
                </p>
              </div>
              <Zap className="w-5 h-5 text-accent" />
            </div>

            {recentRuns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-bright p-6 text-sm text-text-muted">
                No runs yet. Save the workflow, then trigger it manually or via webhook.
              </div>
            ) : (
              <div className="space-y-3">
                {recentRuns.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelectedRun(run)}
                    className="w-full text-left rounded-xl border border-border bg-surface-2 p-4 transition-all hover:border-accent/30 hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`badge ${run.status === "success" ? "badge-green" : "badge-muted"}`}
                      >
                        {run.status}
                      </span>
                      <span className="text-xs text-text-dim capitalize">{run.trigger_type}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-3">
                      {new Date(run.started_at).toLocaleString()}
                    </p>
                    {run.error_message ? (
                      <p className="text-xs text-red-300 mt-2">{run.error_message}</p>
                    ) : null}
                    {run.trigger_payload && typeof run.trigger_payload === "object" && "mode" in run.trigger_payload ? (
                      <p className="mt-2 text-xs text-text-dim">
                        Mode: {String((run.trigger_payload as Record<string, unknown>).mode)}
                      </p>
                    ) : null}
                    <div className="mt-3 space-y-2">
                      {run.step_results?.slice(0, 3).map((step) => (
                        <div key={step.id} className="rounded-lg border border-border px-3 py-2">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-text">{step.name}</span>
                            <span className={step.status === "success" ? "text-accent" : "text-red-300"}>
                              {step.status}
                            </span>
                          </div>
                          {step.output?.verification ? (
                            <p className="mt-2 text-[11px] text-accent">
                              Verified selector: {String((step.output.verification as Record<string, unknown>).selector ?? "")}
                            </p>
                          ) : null}
                          {step.output?._meta ? (
                            <p className="mt-2 text-[11px] text-text-dim">
                              Attempts: {String(((step.output._meta as Record<string, unknown>).attempts ?? 1))} ·
                              Dry run: {String(((step.output._meta as Record<string, unknown>).dryRun ?? false))}
                            </p>
                          ) : null}
                          {step.output?.artifacts ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {Object.entries(step.output.artifacts as Record<string, unknown>).map(([label, filePath]) =>
                                typeof filePath === "string" ? (
                                  <a
                                    key={label}
                                    href={artifactHref(filePath)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-border-bright bg-surface px-2.5 py-1 text-[11px] text-text-muted hover:border-accent hover:text-accent transition-all"
                                  >
                                    Open {label.replace(/Path$/, "")}
                                  </a>
                                ) : null
                              )}
                            </div>
                          ) : null}
                          {typeof step.output?.screenshot === "string" ? (
                            <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
                              <img
                                src={step.output.screenshot}
                                alt={`${step.name} screenshot`}
                                className="h-40 w-full object-cover"
                              />
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedRun ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="card clay-panel w-full max-w-4xl max-h-[85vh] overflow-hidden p-0">
            <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
              <div>
                <h3 className="font-display font-semibold text-xl text-text">Run details</h3>
                <p className="text-sm text-text-muted">
                  {new Date(selectedRun.started_at).toLocaleString()} · {selectedRun.trigger_type}
                </p>
              </div>
              <button onClick={() => setSelectedRun(null)} className="btn-ghost text-xs">
                Close
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-4">
              {selectedRun.step_results.map((step) => (
                <div key={step.id} className="rounded-2xl border border-border bg-surface-2/80 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display font-medium text-text">{step.name}</p>
                      <p className="text-xs text-text-dim">
                        {new Date(step.started_at).toLocaleTimeString()} to{" "}
                        {new Date(step.finished_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className={step.status === "success" ? "badge-green" : "badge-muted"}>
                      {step.status}
                    </span>
                  </div>

                  {step.error ? <p className="text-sm text-red-300">{step.error}</p> : null}
                  {step.output?._meta ? (
                    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-surface px-3 py-2 text-xs text-text-dim">
                      Attempts: {String(((step.output._meta as Record<string, unknown>).attempts ?? 1))} ·
                      Dry run: {String(((step.output._meta as Record<string, unknown>).dryRun ?? false))}
                    </div>
                  ) : null}

                  {step.output?.verification ? (
                    <div className="rounded-xl border border-accent/20 bg-accent-dim px-3 py-2 text-xs text-accent">
                      Verified success selector:{" "}
                      {String((step.output.verification as Record<string, unknown>).selector ?? "")}
                    </div>
                  ) : null}

                  {step.output?.artifacts ? (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(step.output.artifacts as Record<string, unknown>).map(([label, filePath]) =>
                        typeof filePath === "string" ? (
                          <a
                            key={label}
                            href={artifactHref(filePath)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary text-xs py-2 px-3"
                          >
                            Open {label.replace(/Path$/, "")}
                          </a>
                        ) : null
                      )}
                    </div>
                  ) : null}

                  {typeof step.output?.screenshot === "string" ? (
                    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                      <img
                        src={step.output.screenshot}
                        alt={`${step.name} screenshot`}
                        className="max-h-[340px] w-full object-cover"
                      />
                    </div>
                  ) : null}

                  <details className="rounded-xl border border-border bg-surface px-3 py-2">
                    <summary className="cursor-pointer text-xs font-display text-text-muted">
                      View step output JSON
                    </summary>
                    <pre className="mt-3 overflow-x-auto text-xs text-text-muted font-mono whitespace-pre-wrap">
                      {JSON.stringify(step.output ?? {}, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InlineMiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <label className="block text-xs font-display font-medium text-text-muted mb-2">{title}</label>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-muted">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
