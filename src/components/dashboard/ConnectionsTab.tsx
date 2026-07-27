"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link2, Loader2, PlugZap, X } from "lucide-react";
import { CONNECTION_GROUPS, CONNECTION_PROVIDERS } from "@/lib/connection-catalog";
import { getConnectionReadiness } from "@/lib/connection-readiness";
import type { Connection, PlanId } from "@/types";

export default function ConnectionsTab({
  planId: initialPlanId = "free",
  launchReadyProviderIds,
  optionalLaunchProviderIds,
}: {
  planId?: PlanId;
  /**
   * Provider readiness depends on server-only credential env vars
   * (e.g. GOOGLE_CLIENT_ID). This is a client component, so it can never
   * read those directly without a server/client hydration mismatch
   * (the server sees the secret, the browser bundle never does) - that
   * mismatch was silently making React drop event handlers on this page.
   * Server callers should pass the ids down; callers that can't (fully
   * client pages) fall back to fetching them from /api/connections below.
   */
  launchReadyProviderIds?: string[];
  optionalLaunchProviderIds?: string[];
}) {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");
  const [planId] = useState<PlanId>(initialPlanId);
  const [fetchedLaunchReadyIds, setFetchedLaunchReadyIds] = useState<string[]>([]);
  const [fetchedOptionalIds, setFetchedOptionalIds] = useState<string[]>([]);

  const launchReadyProviders = useMemo(() => {
    const idSet = new Set(launchReadyProviderIds ?? fetchedLaunchReadyIds);
    return CONNECTION_PROVIDERS.filter((provider) => idSet.has(provider.id));
  }, [launchReadyProviderIds, fetchedLaunchReadyIds]);
  const optionalLaunchProviders = useMemo(() => {
    const idSet = new Set(optionalLaunchProviderIds ?? fetchedOptionalIds);
    return CONNECTION_PROVIDERS.filter((provider) => idSet.has(provider.id));
  }, [optionalLaunchProviderIds, fetchedOptionalIds]);

  useEffect(() => {
    fetch("/api/connections")
      .then((response) => response.json())
      .then((connectionsData) => {
        setConnections(connectionsData.connections ?? []);
        if (!launchReadyProviderIds) setFetchedLaunchReadyIds(connectionsData.launchReadyProviderIds ?? []);
        if (!optionalLaunchProviderIds) setFetchedOptionalIds(connectionsData.optionalLaunchProviderIds ?? []);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allProviders = useMemo(
    () => [...launchReadyProviders, ...optionalLaunchProviders],
    [launchReadyProviders, optionalLaunchProviders],
  );

  const providerStatus = useMemo(() => {
    return new Map(
      allProviders.map((provider) => {
        const active = connections.find((connection) => connection.provider === provider.id);
        const readiness = active ? getConnectionReadiness(active) : null;
        return [
          provider.id,
          readiness
            ? { label: readiness.label, ready: readiness.operational }
            : { label: "Not connected", ready: false },
        ];
      }),
    );
  }, [connections, allProviders]);

  const successMessage = searchParams?.get("success");
  const errorMessage = searchParams?.get("error");
  const advancedMode = planId === "operator" || planId === "command" || planId === "business";
  const connectedCount = connections.length;
  const readyCount = connections.filter((connection) => getConnectionReadiness(connection).operational).length;

  async function handleRemove(id: string) {
    setRemovingId(id);
    setRemoveError("");
    const response = await fetch(`/api/connections/${id}`, { method: "DELETE" }).catch(() => null);
    if (response?.ok) {
      setConnections((current) => current.filter((connection) => connection.id !== id));
    } else {
      // Never optimistically drop it on failure: the row reappearing on the
      // next reload is exactly how this bug stayed invisible before.
      setRemoveError("Could not remove that connection. Try again.");
    }
    setRemovingId(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-text">Connections</h1>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span><span className="font-display text-sm font-semibold text-text">{readyCount}</span> ready</span>
          <span><span className="font-display text-sm font-semibold text-text">{connectedCount}</span> connected</span>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /> : null}
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-lg border border-accent/24 bg-accent-dim px-3 py-2 text-xs text-text">
          {successMessage === "whatsapp_number_verified" ? "WhatsApp verified. Finish setup." : "Access granted."}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-lg border border-red-500/24 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          Request failed. Try again.
        </div>
      ) : null}

      {removeError ? (
        <div className="rounded-lg border border-red-500/24 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {removeError}
        </div>
      ) : null}

      {connections.length > 0 ? (
        <section className="space-y-2">
          {connections.map((connection) => {
            const readiness = getConnectionReadiness(connection);
            return (
              <div
                key={connection.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-[rgba(255,255,255,0.02)] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-medium text-text">{connection.label}</span>
                    <span className={readiness.operational ? "badge-green text-xs" : "badge-muted text-xs"}>
                      {readiness.label}
                    </span>
                  </div>
                  {readiness.detail ? <div className="mt-0.5 truncate text-xs text-text-muted">{readiness.detail}</div> : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(connection.id)}
                  disabled={removingId === connection.id}
                  className="btn-ghost shrink-0 !p-1.5"
                  aria-label={`Remove ${connection.label}`}
                >
                  {removingId === connection.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            );
          })}
        </section>
      ) : null}

      <section className="space-y-4">
        {CONNECTION_GROUPS.map((group) => {
          const providers = allProviders.filter((provider) => provider.category === group.id);
          if (providers.length === 0) return null;

          return (
            <div key={group.id}>
              <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-text-dim">{group.label}</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {providers.map((provider) => {
                  const status = providerStatus.get(provider.id) ?? { label: "Not connected", ready: false };
                  return (
                    <Link
                      key={provider.id}
                      href={`/dashboard/connect/${provider.id}`}
                      className="premium-tile flex items-center justify-between gap-3 transition hover:border-accent/40"
                    >
                      <div className="min-w-0">
                        <div className="font-display text-sm font-semibold text-text">{provider.label}</div>
                        <div className={status.ready ? "text-xs text-accent" : "text-xs text-text-muted"}>
                          {status.ready ? status.label : advancedMode ? "Open" : "Connect"}
                        </div>
                      </div>
                      <Link2 className="h-3.5 w-3.5 shrink-0 text-text-dim" />
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <Link href="/dashboard/connections/custom" className="btn-ghost inline-flex text-xs">
        <PlugZap className="h-3.5 w-3.5" />
        Add a custom API or webhook
      </Link>
    </div>
  );
}
