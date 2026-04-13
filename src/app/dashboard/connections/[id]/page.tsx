import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ConnectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: connection }, { data: workflows }] = await Promise.all([
    supabase.from("connections").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("workflows").select("*").eq("user_id", user.id),
  ]);

  if (!connection) notFound();

  const related = (workflows ?? []).filter((workflow) => {
    const integrations = ((workflow.blueprint as Record<string, unknown>)?.integrations ?? []) as string[];
    return integrations.some((integration) => integration.toLowerCase().includes(connection.provider));
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/dashboard/settings?tab=connections" className="btn-ghost inline-flex">
        <ArrowLeft className="h-4 w-4" />
        Back to connections
      </Link>

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Connection detail</div>
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
        <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Used by workflows</div>
        <div className="mt-4 space-y-3">
          {related.map((workflow) => (
            <Link key={workflow.id} href={`/dashboard/workflows/${workflow.id}`} className="premium-tile block">
              <div className="font-display text-xl font-semibold text-text">{workflow.title}</div>
              <div className="mt-2 text-sm text-text-muted">{workflow.description}</div>
            </Link>
          ))}
          {related.length === 0 ? (
            <div className="text-sm text-text-muted">No workflows are currently using this connection.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
