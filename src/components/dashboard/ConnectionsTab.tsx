"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Link2, Loader2, ShieldCheck } from "lucide-react";
import {
  CONNECTION_GROUPS,
  getLaunchReadyConnectionProviders,
} from "@/lib/connection-catalog";
import { getConnectionReadiness } from "@/lib/connection-readiness";
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

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Connections</div>
            <h2 className="mt-2 font-display text-3xl font-semibold text-text">
              Connect the tools your work and life already use.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">
              Connect email, calendar, commerce, messaging, and workspace accounts. Dobly keeps the intelligence layer behind the scenes so you only connect tools you actually recognize.
            </p>
          </div>
          <div className="badge-green">
            <ShieldCheck className="h-3.5 w-3.5" />
            {advancedMode ? "Easy setup + advanced mode" : "Easy setup only"}
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
