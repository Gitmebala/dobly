"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Link2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Workflow,
  Wrench,
} from "lucide-react";
import {
  CONNECTION_GROUPS,
  getLaunchReadyConnectionProviders,
} from "@/lib/connection-catalog";
import { getConnectionReadiness } from "@/lib/connection-readiness";
import { getWorkflowConnectionStrategy } from "@/lib/provider-strategy";
import type { Connection } from "@/types";

export default function ConnectionsTab({
  planId: initialPlanId = "free",
}: {
  planId?: "free" | "starter" | "pro" | "agency";
}) {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [planId] = useState<"free" | "starter" | "pro" | "agency">(initialPlanId);
  const launchReadyProviders = useMemo(() => getLaunchReadyConnectionProviders(), []);

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
  const advancedMode = planId === "pro" || planId === "agency";
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

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(77,122,255,0.14),transparent_52%)] lg:block" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Connections</div>
            <h2 className="mt-2 font-display text-3xl font-semibold text-text">
              Connect the tools your agents and automations actually depend on.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">
              Connect email, messaging, commerce, CRM, data stores, and internal systems without
              dropping users into raw developer setup unless they ask for it.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="badge-muted">Messaging and inboxes</span>
              <span className="badge-muted">Payments and commerce</span>
              <span className="badge-muted">CRM and databases</span>
              <span className="badge-muted">Internal APIs</span>
            </div>
          </div>
          <div className="badge-green">
            <ShieldCheck className="h-3.5 w-3.5" />
            {advancedMode ? "Easy setup + advanced mode" : "Easy setup only"}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="premium-tile">
            <div className="badge-green">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ready
            </div>
            <p className="mt-4 font-display text-3xl font-semibold text-text">{readyCount}</p>
            <p className="mt-2 text-sm text-text-muted">
              Live connections operational inside workflows right now.
            </p>
          </div>
          <div className="premium-tile">
            <div className="badge-muted">
              <Workflow className="h-3.5 w-3.5" />
              Coverage
            </div>
            <p className="mt-4 font-display text-3xl font-semibold text-text">
              {launchReadyProviders.length}
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Setup-ready providers across messaging, ops, finance, and infrastructure.
            </p>
          </div>
          <div className="premium-tile">
            <div className="badge-muted">
              <Wrench className="h-3.5 w-3.5" />
              Connected
            </div>
            <p className="mt-4 font-display text-3xl font-semibold text-text">{connectedCount}</p>
            <p className="mt-2 text-sm text-text-muted">
              Accounts or systems already linked into the Dobly workspace.
            </p>
          </div>
        </div>
      </section>

      {successMessage ? (
        <div className="rounded-[1rem] border border-accent/24 bg-accent-dim px-4 py-3 text-sm text-text">
          {successMessage === "whatsapp_number_verified"
            ? "WhatsApp number verified. Finish the messaging setup before Dobly can send live messages from it."
            : "Connection complete. Dobly can now use that account in your workflows."}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-[1rem] border border-red-500/24 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Dobly could not finish that connection. Try again or use advanced setup if you are on Pro or Agency.
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="badge-muted">
            <Sparkles className="h-3.5 w-3.5" />
            Dobly-managed first
          </div>
          <h3 className="mt-4 font-display text-2xl font-semibold text-text">
            Most work should start inside Dobly
          </h3>
          <div className="mt-4 space-y-3 text-sm text-text-muted">
            {strategyPreview.managedCapabilities.slice(0, 3).map((capability) => (
              <div
                key={capability.id}
                className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-3"
              >
                <div className="text-text">{capability.label}</div>
                <div className="mt-1 text-text-muted">{capability.description}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="badge-muted">
            <Workflow className="h-3.5 w-3.5" />
            Connection policy
          </div>
          <h3 className="mt-4 font-display text-2xl font-semibold text-text">
            Connect late, not upfront
          </h3>
          <div className="mt-4 space-y-3 text-sm text-text-muted">
            <div className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-3">
              <div className="text-text">Required</div>
              <div className="mt-1">Only for actions that must happen inside the customer&apos;s own account, ledger, store, inbox, or communication system.</div>
            </div>
            <div className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-3">
              <div className="text-text">Optional</div>
              <div className="mt-1">Helpful for sync, delivery, and deeper business context, but usually not necessary to design and stage the workflow.</div>
            </div>
            <div className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-3">
              <div className="text-text">Dobly-managed</div>
              <div className="mt-1">Drafting, routing, summaries, approvals, reports, prompts, and internal orchestration should work before most third-party connections are added.</div>
            </div>
          </div>
        </div>
      </section>

      {CONNECTION_GROUPS.map((group) => {
        const providers = launchReadyProviders.filter((provider) => provider.category === group.id);
        if (providers.length === 0) return null;

        return (
          <section key={group.id} className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-text-dim">{group.label}</div>
              <p className="mt-2 text-sm text-text-muted">{group.copy}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {providers.map((provider) => {
                const status = providerStatus.get(provider.id) ?? {
                  label: "Not connected",
                  tone: "badge-muted",
                };

                return (
                  <div key={provider.id} className="premium-tile">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-display text-2xl font-semibold text-text">{provider.label}</div>
                        <p className="mt-2 text-sm leading-7 text-text-muted">{provider.description}</p>
                      </div>
                      <span className={status.tone}>{status.label}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {provider.useCases.map((item) => (
                        <span key={item} className="badge-muted">
                          {item}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link href={`/dashboard/connect/${provider.id}`} className="btn-primary">
                        <Link2 className="h-4 w-4" />
                        {advancedMode ? `Open ${provider.label} setup` : `Connect ${provider.label}`}
                      </Link>
                      <Link href={`/dashboard/connect/${provider.id}`} className="btn-ghost">
                        View setup
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <div className="badge-muted">
            <Sparkles className="h-3.5 w-3.5" />
            Good starter stack
          </div>
          <h3 className="mt-4 font-display text-2xl font-semibold text-text">
            Start with three
          </h3>
          <p className="mt-3 text-sm leading-7 text-text-muted">
            Most teams only need one communication connector, one system-of-record connector, and
            one payment or webhook connector to launch useful workflows.
          </p>
        </div>
        <div className="card">
          <div className="badge-muted">
            <ShieldCheck className="h-3.5 w-3.5" />
            For agents
          </div>
          <h3 className="mt-4 font-display text-2xl font-semibold text-text">Channels and context</h3>
          <p className="mt-3 text-sm leading-7 text-text-muted">
            Agents usually need inbox, chat, CRM, or helpdesk-style connections so they can reply,
            gather context, and escalate cleanly.
          </p>
        </div>
        <div className="card">
          <div className="badge-muted">
            <Workflow className="h-3.5 w-3.5" />
            For automations
          </div>
          <h3 className="mt-4 font-display text-2xl font-semibold text-text">
            Triggers and destinations
          </h3>
          <p className="mt-3 text-sm leading-7 text-text-muted">
            Automations need reliable event sources and update targets: payments, orders, records,
            spreadsheets, APIs, and reporting endpoints.
          </p>
        </div>
      </section>

      <section className="card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl font-semibold text-text">Current connections</h3>
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : null}
        </div>

        {connections.length === 0 && !loading ? (
          <div className="rounded-[1.2rem] border border-dashed border-border p-5 text-sm text-text-muted">
            No connected accounts yet. Start with whichever account your first automation actually needs.
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((connection) => {
              const readiness = getConnectionReadiness(connection);
              return (
                <div
                  key={connection.id}
                  className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-3"
                >
                  <div>
                    <div className="font-display text-lg font-medium text-text">{connection.label}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-text-dim">
                      {connection.provider} | {connection.status}
                    </div>
                    {readiness.detail ? (
                      <div className="mt-2 text-xs text-text-muted">{readiness.detail}</div>
                    ) : null}
                  </div>
                  {readiness.operational ? (
                    <span className="badge-green">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {readiness.label}
                    </span>
                  ) : (
                    <span className="badge-muted">{readiness.label}</span>
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
