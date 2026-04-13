import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, GitBranch, Sparkles } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function CreatePage({
  searchParams,
}: {
  searchParams?: Promise<{ kind?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = (await searchParams) ?? {};
  const kind = params.kind === "agent" || params.kind === "automation" ? params.kind : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="card">
        <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Create</div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">
          Tell Dobly what your business needs next.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
          Start with an AI agent when the business needs a role handled, or start with an automation when the business needs a process to keep running.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Link
          href="/dashboard/generate?kind=agent"
          className={`card-hover ${kind === "agent" ? "border-accent/30" : ""}`}
        >
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-dim text-accent">
            <Bot className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold text-text">Build an agent</h2>
          <p className="mt-3 text-sm leading-7 text-text-muted">
            Best for business roles that need to respond, guide, qualify, route, escalate, or operate inside a channel.
          </p>
        </Link>

        <Link
          href="/dashboard/generate?kind=automation"
          className={`card-hover ${kind === "automation" ? "border-accent/30" : ""}`}
        >
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-dim text-accent">
            <GitBranch className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold text-text">Build an automation</h2>
          <p className="mt-3 text-sm leading-7 text-text-muted">
            Best for triggers, schedules, follow-ups, notifications, updates, and repeatable work that should run without supervision.
          </p>
        </Link>
      </section>

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-text">Dobly will reuse your business context</h2>
            <p className="mt-2 text-sm leading-7 text-text-muted">
              Add your website, docs, FAQs, policies, and brand voice once so every new system starts with better context.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/business" className="btn-secondary">
              <Sparkles className="h-4 w-4" />
              Open business setup
            </Link>
            <Link href={`/dashboard/generate${kind ? `?kind=${kind}` : ""}`} className="btn-primary">
              Continue to builder
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
