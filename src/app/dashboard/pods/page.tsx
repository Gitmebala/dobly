import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Boxes, Plus } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PodRecord } from "@/lib/pods/types";

export default async function PodsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: pods } = await supabase
    .from("pods")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const podList = (pods ?? []) as PodRecord[];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(245,237,228,0.08)] pb-6">
        <div>
          <p className="dobly-kicker">Pods</p>
          <h1 className="mt-3 font-display text-4xl tracking-[-0.05em] text-[var(--dobly-text)]">
            Digital helpers built for specific work
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
            Pods are the product object: each one has a job, capabilities, rules, memory, approvals, and activity.
          </p>
        </div>
        <Link href="/dashboard/generate" className="dobly-action">
          Create Pod
          <Plus className="h-4 w-4" />
        </Link>
      </section>

      {podList.length === 0 ? (
        <section className="rounded-[1.2rem] border border-[rgba(245,237,228,0.08)] bg-[rgba(255,255,255,0.02)] p-8">
          <Boxes className="h-8 w-8 text-[var(--dobly-accent)]" />
          <h2 className="mt-4 text-2xl font-semibold text-[var(--dobly-text)]">No Pods yet</h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
            Describe what you need handled and Dobly will build the first Pod with only the capabilities that job needs.
          </p>
          <Link href="/dashboard/generate" className="dobly-action mt-5">
            Build first Pod
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {podList.map((pod) => (
            <Link
              key={pod.id}
              href={`/dashboard/pods/${pod.id}`}
              className="rounded-[1.2rem] border border-[rgba(245,237,228,0.08)] bg-[rgba(255,255,255,0.02)] p-5 transition hover:bg-[rgba(255,255,255,0.04)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="badge-green">{pod.mode}</span>
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">
                  {pod.readiness_score}% ready
                </span>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-[var(--dobly-text)]">{pod.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-7 text-[var(--dobly-text-secondary)]">
                {pod.purpose}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {pod.spec.capabilities.slice(0, 4).map((capability) => (
                  <span key={capability.id} className="badge-muted">
                    {capability.kind}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
