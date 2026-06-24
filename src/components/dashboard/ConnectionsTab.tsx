"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Link2,
  Loader2,
  PlugZap,
  ShieldCheck,
  Sparkles,
  Workflow,
  Wrench,
} from "lucide-react";
import {
  CONNECTION_GROUPS,
  getLaunchReadyConnectionProviders,
  getOptionalLaunchConnectionProviders,
} from "@/lib/connection-catalog";
import { getConnectionReadiness } from "@/lib/connection-readiness";
import { getWorkflowConnectionStrategy } from "@/lib/provider-strategy";
import type { Connection, PlanId } from "@/types";

function formatConnectionMeta(value: string) {
  return value.replaceAll("_", " ");
}

export default function ConnectionsTab({
  planId: initialPlanId = "free",
}: {
  planId?: PlanId;
}) {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [planId] = useState<PlanId>(initialPlanId);
  const launchReadyProviders = useMemo(() => getLaunchReadyConnectionProviders(), []);
  const optionalLaunchProviders = useMemo(() => getOptionalLaunchConnectionProviders(), []);

  useEffect(() => {
    fetch("/api/connections")
      .then((response) => response.json())
      .then((connectionsData) => {
        setConnections(connectionsData.connections ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const providerStatus = useMemo(() => {
    return new Map(
      launchReadyProviders.map((provider) => {
        const active = connections.find(
          (connection) => connection.provider === provider.id,
        );
        const readiness = active ? getConnectionReadiness(active) : null;

        return [
          provider.id,
          readiness
            ? {
                label: readiness.label,
                tone:
                  readiness.tone === "ready"
                    ? "badge-green"
                    : readiness.tone === "warning"
                      ? "badge-muted"
                      : readiness.tone === "danger"
                        ? "badge-muted"
                        : "badge-muted",
              }
            : { label: "Not connected", tone: "badge-muted" },
        ];
      }),
    );
  }, [connections, launchReadyProviders]);

  const successMessage = searchParams?.get("success");
  const errorMessage = searchParams?.get("error");
  const advancedMode = planId === "operator" || planId === "command" || planId === "business";
  const connectedCount = connections.length;
  const readyCount = connections.filter((connection) => getConnectionReadiness(connection).operational).length;
  const strategyPreview = getWorkflowConnectionStrategy(
    {
      name: "Dobly preview",
      description: "Support, scheduling, reporting, and approvals",
      trigger: "manual",
      category: "HR & Operations",
      steps: [],
      estimated_time_saved: "2 hours/week",
      difficulty: "Simple",
      integrations: [],
      setup_steps: [],
    },
    "support, scheduling, reporting, approvals, reminders",
  );
  const accessStarts = [
    {
      title: "Get paid",
      copy: "Collect online payments with IntaSend and send direct M-PESA requests when a customer is ready.",
      tools: ["IntaSend", "M-PESA"],
    },
    {
      title: "Reach customers",
      copy: "Use WhatsApp and local calls or SMS for everyday customer conversations.",
      tools: ["WhatsApp Business", "Kenya Calls & SMS"],
    },
    {
      title: "Keep work together",
      copy: "Bring email, calendars, files, and customer records into the coworker workflow.",
      tools: ["Google", "Microsoft", "CRM"],
    },
    {
      title: "Add specialist tools",
      copy: "Connect another service when a coworker needs a specific place to read or act.",
      tools: optionalLaunchProviders.map((provider) => provider.label),
    },
  ];

  return (
    <div className="space-y-4">
      <section className="card connection-overview">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-text-dim">Connected work</div>
            <h2 className="mt-2 font-display text-2xl font-semibold text-text">
              Let coworkers take action
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              Start with the services your business already uses. Dobly keeps the local route first and only reaches for a fallback when the work needs it.
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              <span className="badge-muted text-xs">IntaSend</span>
              <span className="badge-muted text-xs">M-PESA</span>
              <span className="badge-muted text-xs">WhatsApp</span>
              <span className="badge-muted text-xs">Kenya Calls & SMS</span>
            </div>
          </div>
          <div className="badge-green text-xs">
            <ShieldCheck className="h-3 w-3" />
            {advancedMode ? "Easy + advanced" : "Easy setup"}
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <div className="premium-tile">
            <div className="badge-green text-xs">
              <CheckCircle2 className="h-3 w-3" />
              Ready
            </div>
            <p className="mt-2 font-display text-2xl font-semibold text-text">{readyCount}</p>
            <p className="mt-1 text-xs text-text-muted">
              Ready to use
            </p>
          </div>
          <div className="premium-tile">
            <div className="badge-muted text-xs">
              <Workflow className="h-3 w-3" />
              Coverage
            </div>
            <p className="mt-2 font-display text-2xl font-semibold text-text">
              {launchReadyProviders.length}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Available services
            </p>
          </div>
          <div className="premium-tile">
            <div className="badge-muted text-xs">
              <Wrench className="h-3 w-3" />
              Connected
            </div>
            <p className="mt-2 font-display text-2xl font-semibold text-text">{connectedCount}</p>
            <p className="mt-1 text-xs text-text-muted">
              Connected accounts
            </p>
          </div>
        </div>
      </section>

      {successMessage ? (
        <div className="rounded-lg border border-accent/24 bg-accent-dim px-3 py-2 text-xs text-text">
          {successMessage === "whatsapp_number_verified"
            ? "WhatsApp verified. Finish setup."
            : "Access granted."}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-lg border border-red-500/24 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          Request failed. Try again.
        </div>
      ) : null}

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="card">
          <div className="badge-muted text-xs">
            <Sparkles className="h-3 w-3" />
            Dobly-managed
          </div>
          <h3 className="mt-3 font-display text-base font-semibold text-text">
            Start inside Dobly
          </h3>
          <div className="mt-2 space-y-2 text-xs text-text-muted">
            {strategyPreview.managedCapabilities.slice(0, 3).map((capability) => (
              <div
                key={capability.id}
                className="rounded-lg border border-border bg-[rgba(255,255,255,0.02)] px-3 py-2"
              >
                <div className="text-text">{capability.label}</div>
                <div className="mt-0.5 text-text-muted">{capability.description}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="badge-muted text-xs">
            <Workflow className="h-3 w-3" />
            Policy
          </div>
          <h3 className="mt-3 font-display text-base font-semibold text-text">
            Unlock late
          </h3>
          <div className="mt-2 space-y-2 text-xs text-text-muted">
            <div className="rounded-lg border border-border bg-[rgba(255,255,255,0.02)] px-3 py-2">
              <div className="text-text">Required</div>
              <div className="mt-0.5">Actions in customer accounts.</div>
            </div>
            <div className="rounded-lg border border-border bg-[rgba(255,255,255,0.02)] px-3 py-2">
              <div className="text-text">Optional</div>
              <div className="mt-0.5">Sync and context.</div>
            </div>
            <div className="rounded-lg border border-border bg-[rgba(255,255,255,0.02)] px-3 py-2">
              <div className="text-text">Dobly-managed</div>
              <div className="mt-0.5">Drafting, routing, approvals.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="card border-[rgba(196,80,26,0.22)] bg-[rgba(196,80,26,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="badge-muted text-xs">
              <Wrench className="h-3 w-3" />
              Advanced optional access
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-text">
              Custom APIs and MCP servers
            </h3>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-text-muted">
              Add a private business service or an MCP tool when a coworker needs a specialist action that is not in the connection library.
            </p>
          </div>
          <Link href="/dashboard/connections/custom" className="btn-primary text-xs">
            <PlugZap className="h-3 w-3" />
            Add custom access
          </Link>
        </div>
      </section>

      <section className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        {accessStarts.map((item) => (
          <div key={item.title} className="card">
            <div className="badge-muted text-xs">Starter</div>
            <h3 className="mt-3 font-display text-sm font-semibold text-text">{item.title}</h3>
            <p className="mt-2 text-xs leading-4 text-text-muted">{item.copy}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {item.tools.map((tool) => (
                <span key={tool} className="badge-muted text-xs">
                  {tool}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      {CONNECTION_GROUPS.map((group) => {
        const providers = launchReadyProviders.filter((provider) => provider.category === group.id);
        if (providers.length === 0) return null;

        return (
          <section key={group.id} className="space-y-3">
            <details className="group rounded-lg border border-border bg-surface/70 p-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-text-dim">{group.label}</div>
                  <p className="mt-1 max-w-2xl text-xs text-text-muted">{group.copy}</p>
                </div>
                <span className="badge-muted text-xs">{providers.length} options</span>
              </summary>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {providers.map((provider) => {
                  const status = providerStatus.get(provider.id) ?? {
                    label: "Not connected",
                    tone: "badge-muted",
                  };

                  return (
                    <div key={provider.id} className="premium-tile">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-display text-base font-semibold text-text">{provider.label}</div>
                          <p className="mt-1 text-xs leading-4 text-text-muted">{provider.description}</p>
                        </div>
                        <span className={`${status.tone} text-xs`}>{status.label}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {provider.useCases.map((item) => (
                          <span key={item} className="badge-muted text-xs">
                            {item}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={`/dashboard/connect/${provider.id}`} className="btn-primary text-xs">
                          <Link2 className="h-3 w-3" />
                          {advancedMode ? `Open ${provider.label}` : `Use ${provider.label}`}
                        </Link>
                        <Link href={`/dashboard/connect/${provider.id}`} className="btn-ghost text-xs">
                          Why
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </section>
        );
      })}

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="card">
          <div className="badge-muted text-xs">
            <Sparkles className="h-3 w-3" />
            Starter stack
          </div>
          <h3 className="mt-3 font-display text-base font-semibold text-text">
            Start with four
          </h3>
          <p className="mt-2 text-xs leading-4 text-text-muted">
            IntaSend, M-PESA, WhatsApp, and Kenya Calls & SMS cover money, messaging, voice, and launch feedback.
          </p>
        </div>
        <div className="card">
          <div className="badge-muted text-xs">
            <ShieldCheck className="h-3 w-3" />
            Judgment work
          </div>
          <h3 className="mt-3 font-display text-base font-semibold text-text">Channels</h3>
          <p className="mt-2 text-xs leading-4 text-text-muted">
            Dobly keeps its own infrastructure in the background while your connected accounts stay under your control.
          </p>
        </div>
        <div className="card">
          <div className="badge-muted text-xs">
            <Workflow className="h-3 w-3" />
            Repeatable runs
          </div>
          <h3 className="mt-3 font-display text-base font-semibold text-text">
            Triggers
          </h3>
          <p className="mt-2 text-xs leading-4 text-text-muted">
            Add optional connectors only when a paid workflow needs more context or a new action surface.
          </p>
        </div>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-text">Current access</h3>
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : null}
        </div>

        {connections.length === 0 && !loading ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-xs text-text-muted">
            No access unlocked yet.
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((connection) => {
              const readiness = getConnectionReadiness(connection);
              return (
                <div
                  key={connection.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-[rgba(255,255,255,0.02)] px-3 py-2"
                >
                  <div>
                    <div className="font-display text-sm font-medium text-text">{connection.label}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-text-dim">
                      {connection.provider} | {connection.status}
                    </div>
                    {readiness.detail ? (
                      <div className="mt-1 text-xs text-text-muted">{readiness.detail}</div>
                    ) : null}
                    {readiness.serviceLabels?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {readiness.serviceLabels.slice(0, 4).map((service) => (
                          <span key={service} className="rounded-full border border-border px-2 py-1 text-[10px] text-text-muted">
                            {service}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {readiness.costModes?.length ? (
                      <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-text-dim">
                        {readiness.costModes.map(formatConnectionMeta).join(" / ")}
                      </div>
                    ) : null}
                  </div>
                  {readiness.operational ? (
                    <span className="badge-green text-xs">
                      <CheckCircle2 className="h-3 w-3" />
                      {readiness.label}
                    </span>
                  ) : (
                    <span className="badge-muted text-xs">{readiness.label}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
