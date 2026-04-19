import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { describeProviderReadinessIssue, findOperationalConnection } from "@/lib/connection-readiness";
import { getWorkflowConnectionStrategy } from "@/lib/provider-strategy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRequiredProviderIdsForWorkflow, getRequiredProvidersById } from "@/lib/connection-requirements";
import type { Connection } from "@/types";

export default async function WorkflowActivatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: workflow }, { data: connections }] = await Promise.all([
    supabase.from("workflows").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("connections").select("*").eq("user_id", user.id),
  ]);

  if (!workflow) notFound();

  const integrations = ((workflow.blueprint as Record<string, unknown>)?.integrations ?? []) as string[];
  const requiredProviders = getRequiredProvidersById(getRequiredProviderIdsForWorkflow(workflow.blueprint, workflow.prompt));
  const strategy = getWorkflowConnectionStrategy(workflow.blueprint, workflow.prompt);
  const allConnections = (connections ?? []) as Connection[];
  const missing = requiredProviders.filter((provider) => !findOperationalConnection(allConnections, provider.id));
  const definition = (workflow.blueprint as Record<string, unknown>)?.definition as
    | {
        trigger?: { type?: string; schedule?: string; webhook_path?: string; config?: Record<string, unknown> };
        operator?: {
          enabled?: boolean;
          role?: string;
          objective?: string;
          autonomy?: string;
          approvalRiskThreshold?: string;
          allowedDomains?: string[];
          escalationMessage?: string;
        };
      }
    | undefined;
  const trigger = definition?.trigger;
  const operator = definition?.operator;
  const webhookSecret = String(trigger?.config?.secret ?? "").trim();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href={`/dashboard/workflows/${id}`} className="btn-ghost inline-flex">
        <ArrowLeft className="h-4 w-4" />
        Back to workflow
      </Link>

      <section className="card">
        <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Activation review</div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">{workflow.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
          Review what this automation will do, what it needs, and what should be approved before you let it run on its own.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-semibold text-text">Ready to run</h2>
          </div>
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div key={integration} className="badge-muted">
                {integration}
              </div>
            ))}
            {integrations.length === 0 ? (
              <p className="text-sm leading-7 text-text-muted">
                This workflow is currently using Dobly-native steps and does not require a branded third-party integration list yet.
              </p>
            ) : null}
          </div>
          <div className="mt-5 rounded-[1rem] border border-border bg-surface px-4 py-4 text-sm text-text-muted">
            Status: <span className="text-text capitalize">{workflow.status}</span>. Review missing accounts and approval-sensitive actions before turning it loose.
          </div>
          {trigger?.type === "webhook" ? (
            <div className="mt-4 rounded-[1rem] border border-border bg-surface px-4 py-4 text-sm text-text-muted">
              <div className="font-display text-sm font-semibold text-text">Webhook deployment details</div>
              <div className="mt-3 space-y-2 font-mono text-xs leading-6 text-text-muted">
                <div>Path: /api/triggers/webhook/{trigger.webhook_path}</div>
                <div>Header: x-dobly-webhook-secret</div>
                <div>Secret: {webhookSecret || "Not generated yet"}</div>
              </div>
            </div>
          ) : null}
          {trigger?.type === "schedule" ? (
            <div className="mt-4 rounded-[1rem] border border-border bg-surface px-4 py-4 text-sm text-text-muted">
              <div className="font-display text-sm font-semibold text-text">Scheduled trigger</div>
              <div className="mt-3 font-mono text-xs leading-6 text-text-muted">
                {trigger.schedule || "No schedule configured yet"}
              </div>
            </div>
          ) : null}
          {operator?.enabled ? (
            <div className="mt-4 rounded-[1rem] border border-accent/20 bg-accent-dim px-4 py-4 text-sm text-text-muted">
              <div className="font-display text-sm font-semibold text-text">Bounded operator policy</div>
              <div className="mt-3 space-y-2">
                <div>Role: <span className="text-text">{operator.role || "Operator"}</span></div>
                <div>Objective: <span className="text-text">{operator.objective || "Not set"}</span></div>
                <div>
                  Autonomy: <span className="text-text">{operator.autonomy || "guarded"}</span> · Approval threshold:{" "}
                  <span className="text-text">{operator.approvalRiskThreshold || "high"}</span>
                </div>
                {operator.allowedDomains?.length ? (
                  <div>Allowed domains: <span className="text-text">{operator.allowedDomains.join(", ")}</span></div>
                ) : null}
                {operator.escalationMessage ? (
                  <div>Escalation: <span className="text-text">{operator.escalationMessage}</span></div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="card">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-semibold text-text">Missing before launch</h2>
          </div>
          {missing.length === 0 ? (
            <p className="text-sm leading-7 text-text-muted">All known required connections appear to be deploy-ready.</p>
          ) : (
            <div className="space-y-3">
              {missing.map((provider) => (
                <div key={provider.id} className="flex items-center justify-between gap-3 rounded-[1rem] border border-border px-4 py-3">
                  <div>
                    <div className="font-display text-lg font-medium text-text">{provider.label}</div>
                    <div className="text-xs text-text-muted">{provider.description}</div>
                    <div className="mt-2 text-xs text-text-dim">
                      {describeProviderReadinessIssue(allConnections, provider.id)}
                    </div>
                  </div>
                  <Link href={`/dashboard/connect/${provider.id}`} className="btn-secondary">
                    Connect
                  </Link>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5">
            <Link href={missing.length > 0 ? `/dashboard/workflows/${id}/connections` : `/dashboard/workflows/${id}`} className="btn-primary">
              {missing.length > 0 ? "Fix missing connections" : "Return to workflow"}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-semibold text-text">Dobly-managed by default</h2>
          </div>
          <div className="space-y-3">
            {strategy.managedCapabilities.map((capability) => (
              <div key={capability.id} className="rounded-[1rem] border border-border px-4 py-3">
                <div className="font-display text-lg font-medium text-text">{capability.label}</div>
                <div className="mt-1 text-sm text-text-muted">{capability.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-semibold text-text">Optional enrichments</h2>
          </div>
          {strategy.optionalProviders.length === 0 ? (
            <p className="text-sm leading-7 text-text-muted">
              Dobly can launch this workflow without extra optional systems right now.
            </p>
          ) : (
            <div className="space-y-3">
              {strategy.optionalProviders.map((provider) => (
                <div key={provider.providerId} className="rounded-[1rem] border border-border px-4 py-3">
                  <div className="font-display text-lg font-medium text-text">{provider.label}</div>
                  <div className="mt-1 text-sm text-text-muted">{provider.reason}</div>
                  <div className="mt-2 text-xs text-text-dim">{provider.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
