import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bot,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import WorkflowListActions from "@/components/dashboard/WorkflowListActions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const AGENT_EXAMPLES = [
  {
    title: "Lead qualifier",
    copy:
      "Screens inbound interest, asks the next useful question, and routes high-intent prospects to the right human.",
  },
  {
    title: "Support triage",
    copy:
      "Handles common questions, gathers missing order context, and escalates only when policy or judgment is required.",
  },
  {
    title: "Operations concierge",
    copy:
      "Responds to internal requests, drafts the next action, and keeps handoffs structured instead of messy.",
  },
];

export default async function AgentsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: workflows } = await supabase
    .from("workflows")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const agents = (workflows ?? []).filter((workflow) =>
    Boolean(workflow.blueprint?.definition?.operator?.enabled),
  );
  const liveAgents = agents.filter((workflow) => workflow.status === "active").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="card relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(77,122,255,0.14),transparent_52%)] lg:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Agents</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">
              AI operators with clear boundaries
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">
              Best for conversations, judgment, and handoff-aware work.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="badge-muted">Sales qualifier</span>
              <span className="badge-muted">Support triage</span>
              <span className="badge-muted">Concierge follow-up</span>
              <span className="badge-muted">Escalation handoff</span>
            </div>
          </div>
          <Link href="/dashboard/create?kind=agent" className="btn-primary">
            <Plus className="h-4 w-4" />
            New agent
          </Link>
        </div>

        <div className="relative mt-6 grid gap-4 md:grid-cols-3">
          <div className="premium-tile">
            <div className="badge-green">
              <Bot className="h-3.5 w-3.5" />
              Live agents
            </div>
            <p className="mt-4 font-display text-3xl font-semibold text-text">{liveAgents}</p>
            <p className="mt-2 text-sm text-text-muted">
              Already working live.
            </p>
          </div>
          <div className="premium-tile">
            <div className="badge-muted">
              <ShieldCheck className="h-3.5 w-3.5" />
              Guardrails
            </div>
            <p className="mt-4 font-display text-xl font-semibold text-text">
              Escalate instead of guessing
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Escalate instead of guessing.
            </p>
          </div>
          <div className="premium-tile">
            <div className="badge-muted">
              <MessageSquareText className="h-3.5 w-3.5" />
              Best for
            </div>
            <p className="mt-4 font-display text-xl font-semibold text-text">Human-facing work</p>
            <p className="mt-2 text-sm text-text-muted">
              Tone, context, judgment.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {agents.length === 0 ? (
          <div className="card text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-dim text-accent">
              <Bot className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-text">No agents yet</h2>
            <p className="mx-auto mt-3 max-w-md text-text-muted">
              Start with the business role you want handled and Dobly will shape it into a bounded
              agent with prompts, escalation rules, and example tasks.
            </p>
            <Link href="/dashboard/create?kind=agent" className="btn-primary mt-6">
              Build your first agent
            </Link>
          </div>
        ) : (
          agents.map((agent) => (
            <div key={agent.id} className="card-hover">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-dim text-accent">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link
                        href={`/dashboard/workflows/${agent.id}`}
                        className="font-display text-xl font-semibold text-text transition-colors hover:text-accent"
                      >
                        {agent.title}
                      </Link>
                      <p className="mt-2 text-sm leading-6 text-text-muted">{agent.description}</p>
                      <div className="mt-3 text-xs uppercase tracking-[0.18em] text-text-dim">
                        Role: {agent.blueprint?.definition?.operator?.role ?? "Business agent"}
                      </div>
                    </div>
                    <span className="badge-muted capitalize">{agent.status}</span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-3 py-3 text-sm text-text-muted">
                      <div className="text-xs uppercase tracking-[0.18em] text-text-dim">Style</div>
                      <div className="mt-2 text-text">Conversational operator</div>
                    </div>
                    <div className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-3 py-3 text-sm text-text-muted">
                      <div className="text-xs uppercase tracking-[0.18em] text-text-dim">
                        Escalation
                      </div>
                      <div className="mt-2 text-text">Hand off on ambiguity</div>
                    </div>
                    <div className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-3 py-3 text-sm text-text-muted">
                      <div className="text-xs uppercase tracking-[0.18em] text-text-dim">
                        Examples
                      </div>
                      <div className="mt-2 text-text">Qualify, answer, route</div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center">
                    <div className="text-xs uppercase tracking-[0.22em] text-text-dim">
                      {new Date(agent.created_at).toLocaleDateString()}
                    </div>
                    <div className="sm:ml-auto flex gap-2">
                      <Link href={`/dashboard/workflows/${agent.id}/agent-config/basic`} className="btn-secondary text-sm">
                        Configure
                      </Link>
                      <WorkflowListActions workflowId={agent.id} status={agent.status} />
                    </div>
                    <Link href={`/dashboard/workflows/${agent.id}`} className="btn-ghost">
                      Open agent
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {AGENT_EXAMPLES.map((example) => (
          <div key={example.title} className="card">
            <div className="badge-muted">
              <Sparkles className="h-3.5 w-3.5" />
              Example agent
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold text-text">
              {example.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-text-muted">{example.copy}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
