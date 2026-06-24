import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Link2 } from "lucide-react";
import { describeProviderReadinessIssue, findOperationalConnection } from "@/lib/connection-readiness";
import { getWorkflowConnectionStrategy } from "@/lib/provider-strategy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRequiredProviderIdsForWorkflow, getRequiredProvidersById } from "@/lib/connection-requirements";
import type { Connection } from "@/types";

export default async function WorkflowMissingConnectionsPage({
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

  const requiredProviderIds = getRequiredProviderIdsForWorkflow(workflow.blueprint, workflow.prompt);
  const requiredProviders = getRequiredProvidersById(requiredProviderIds);
  const strategy = getWorkflowConnectionStrategy(workflow.blueprint, workflow.prompt);
  const allConnections = (connections ?? []) as Connection[];
  const missing = requiredProviders.filter((provider) => !findOperationalConnection(allConnections, provider.id));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href={`/dashboard/workflows/${id}/activate`} className="btn-ghost inline-flex">
        <ArrowLeft className="h-4 w-4" />
        Back to activation review
      </Link>

      <section className="card">
        <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Missing access</div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">
          To run this, unlock the missing tools.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
          Dobly already knows what this setup needs. Unlock only the missing accounts below.
        </p>
      </section>

      <section className="grid gap-4">
        {missing.map((provider) => (
          <div key={provider.id} className="card-hover">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="font-display text-2xl font-semibold text-text">{provider.label}</div>
                <p className="mt-2 text-sm leading-7 text-text-muted">{provider.description}</p>
                <p className="mt-2 text-xs text-text-dim">{describeProviderReadinessIssue(allConnections, provider.id)}</p>
              </div>
              <Link href={`/dashboard/connect/${provider.id}`} className="btn-primary">
                <Link2 className="h-4 w-4" />
                Use {provider.label}
              </Link>
            </div>
          </div>
        ))}
        {missing.length === 0 ? (
          <div className="card space-y-4 text-sm text-text-muted">
            <div>No missing access found for this workflow.</div>
            <Link href={`/dashboard/workflows/${id}/activate`} className="btn-secondary inline-flex">
              Return to activation review
            </Link>
          </div>
        ) : null}
      </section>

      {strategy.optionalProviders.length > 0 ? (
        <section className="card">
          <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Optional later</div>
          <h2 className="mt-2 font-display text-2xl font-semibold text-text">
            Useful additions, but not blockers
          </h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {strategy.optionalProviders.map((provider) => (
              <div key={provider.providerId} className="rounded-[1rem] border border-border px-4 py-3">
                <div className="font-display text-lg font-medium text-text">{provider.label}</div>
                <div className="mt-1 text-sm text-text-muted">{provider.reason}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
