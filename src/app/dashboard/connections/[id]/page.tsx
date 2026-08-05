import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";

export default async function ConnectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Coworkers are the only thing that actually uses a connection today (via
  // connected_tool_ids on dobly_operators) - the legacy workflow-builder
  // product this page used to also check is retired.
  const [{ data: connection }, operators] = await Promise.all([
    supabase.from("connections").select("*").eq("id", id).eq("user_id", user.id).single(),
    listDoblyOperators({ userId: user.id }).catch((): OperatorWithLoops[] => []),
  ]);

  if (!connection) notFound();

  const relatedOperators = operators.filter((operator) =>
    (operator.connected_tool_ids ?? []).some((toolId) => toolId.toLowerCase().includes(connection.provider.toLowerCase())),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/dashboard/settings?tab=connections" className="btn-ghost inline-flex">
        <ArrowLeft className="h-4 w-4" />
        Back to access
      </Link>

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Access detail</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">{connection.label}</h1>
            <p className="mt-3 text-base leading-7 text-text-muted">
              Provider: {connection.provider}. Status: {connection.status}.
            </p>
          </div>
          <Link href={`/dashboard/connect/${connection.provider}`} className="btn-primary">
            Reconnect
          </Link>
        </div>
      </section>

      <section className="card">
        <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Used by live setups</div>
        <div className="mt-4 space-y-3">
          {relatedOperators.map((operator) => (
            <Link key={operator.id} href={`/dashboard/coworkers?operatorId=${operator.id}`} className="premium-tile block">
              <div className="font-display text-xl font-semibold text-text">{operator.name}</div>
              <div className="mt-2 text-sm text-text-muted">{operator.mission}</div>
            </Link>
          ))}
          {relatedOperators.length === 0 ? (
            <div className="text-sm text-text-muted">No live setups are currently using this access.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
