"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, PlugZap, Rocket, ShieldCheck, Sparkles, TestTube2 } from "lucide-react";

type ProposalRecord = {
  id: string;
  status: "draft" | "tested" | "deployed" | "archived";
  prompt: string;
  proposal: {
    name: string;
    mission: string;
    office: string;
    department: string;
    coworkerRecipe?: {
      label: string;
      family: string;
      abilityStack: string[];
      executionModes: {
        free: string[];
        connectedAccount: string[];
        paidRail: string[];
      };
      outputs: string[];
      memoryRules: string[];
      qualityBar: string[];
    };
    approvalMode: string;
    capabilityTags: string[];
    requiredConnections: Array<{
      id: string;
      label: string;
      provider: string;
      reason: string;
      setupMode: string;
      approvalRequired: boolean;
      supportLevel?: string;
      serviceLabels?: string[];
      costModes?: string[];
    }>;
    loops: Array<{ name: string; cadence: string; trigger: string }>;
    approvalRules: string[];
    testScenarios: Array<{ title: string; risk: string; expected: string }>;
    riskCards: Array<{ title: string; level: string; control: string }>;
  };
  test_results?: {
    status?: string;
    summary?: string;
    scenarios?: Array<{ title: string; status: string; observed: string }>;
  };
};

const examples = [
  "Handle new inbound leads, qualify them, book calls, and ask before sending the first outreach.",
  "Watch my stock strategy every market day and alert me when the signals drift.",
  "Create weekly social posts from my ideas, prepare videos, and ask before publishing.",
];

function formatConnectionMeta(value: string) {
  return value.replaceAll("_", " ");
}

export default function OperatorHandleBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(examples[0]);
  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function requestJson(url: string, init: RequestInit) {
    const response = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Dobly could not complete that step.");
    return data;
  }

  function propose() {
    setError(null);
    startTransition(async () => {
      try {
        const data = await requestJson("/api/operators/propose", {
          method: "POST",
          body: JSON.stringify({ prompt }),
        });
        setProposal(data.proposal);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not propose an Operator.");
      }
    });
  }

  function testProposal() {
    if (!proposal) return;
    setError(null);
    startTransition(async () => {
      try {
        const data = await requestJson(`/api/operators/proposals/${proposal.id}/test`, { method: "POST" });
        setProposal(data.proposal);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not test the Operator.");
      }
    });
  }

  function deployProposal() {
    if (!proposal) return;
    setError(null);
    startTransition(async () => {
      try {
        await requestJson(`/api/operators/proposals/${proposal.id}/deploy`, { method: "POST" });
        router.refresh();
        router.push("/dashboard/coworkers");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not deploy the coworker.");
      }
    });
  }

  return (
    <section className="relative overflow-hidden rounded-[1.55rem] border border-[color-mix(in_srgb,var(--dobly-text)_10%,transparent)] bg-[linear-gradient(145deg,rgba(255,255,255,0.11),rgba(255,255,255,0.035))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[rgba(196,80,26,0.14)] blur-3xl" />
      <div className="pointer-events-none absolute left-8 right-8 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.48)] to-transparent" />
      <div className={compact ? "grid gap-3" : "grid gap-4 lg:grid-cols-[0.95fr_1.05fr]"}>
        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--dobly-accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            Coworker Builder
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--dobly-text)]">
            Tell Dobly what you want handled next.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--dobly-text-secondary)]">
            Dobly proposes the coworker, tools, loops, memory, tests, and approval rules before anything goes live.
          </p>

          <div className="mt-4 rounded-[1.2rem] border border-[color-mix(in_srgb,var(--dobly-text)_10%,transparent)] bg-[rgba(255,255,255,0.055)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={compact ? 3 : 4}
              className="min-h-[92px] w-full resize-none bg-transparent text-sm leading-6 text-[var(--dobly-text)] outline-none placeholder:text-[var(--dobly-text-dim)]"
              placeholder="Handle this..."
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[color-mix(in_srgb,var(--dobly-text)_10%,transparent)] pt-3">
              <button
                type="button"
                disabled={isPending || prompt.trim().length < 8}
                onClick={propose}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Propose coworker
              </button>
              {examples.map((example, index) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="rounded-full border border-[color-mix(in_srgb,var(--dobly-text)_10%,transparent)] bg-[rgba(255,255,255,0.045)] px-3 py-2 text-[11px] text-[var(--dobly-text-muted)] hover:border-[rgba(196,80,26,0.45)] hover:text-[var(--dobly-text)]"
                >
                  Example {index + 1}
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </div>

        <div className="relative rounded-[1.25rem] border border-[color-mix(in_srgb,var(--dobly-text)_10%,transparent)] bg-[rgba(255,255,255,0.055)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          {proposal ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--dobly-text-dim)]">
                    {proposal.proposal.office} / {proposal.proposal.department}
                  </div>
                  <h3 className="mt-2 font-display text-3xl tracking-[-0.05em] text-[var(--dobly-text)]">
                    {proposal.proposal.name}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--dobly-text-secondary)]">{proposal.proposal.mission}</p>
                </div>
                <span className="badge-muted capitalize">{proposal.status}</span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <MiniPanel icon={PlugZap} label="Connections" value={`${proposal.proposal.requiredConnections.length} suggested`} />
                <MiniPanel icon={ShieldCheck} label="Approval" value={proposal.proposal.approvalMode.replace("_", " ")} />
                <MiniPanel icon={TestTube2} label="Tests" value={`${proposal.proposal.testScenarios.length} scenarios`} />
              </div>

              {proposal.proposal.coworkerRecipe ? (
                <div className="rounded-[1rem] border border-[color-mix(in_srgb,var(--dobly-text)_10%,transparent)] bg-[rgba(255,255,255,0.04)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-[var(--dobly-text)]">{proposal.proposal.coworkerRecipe.label}</div>
                      <div className="mt-1 text-[11px] text-[var(--dobly-text-muted)]">{proposal.proposal.coworkerRecipe.family}</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {proposal.proposal.coworkerRecipe.abilityStack.slice(0, 6).map((ability) => (
                        <span key={ability} className="rounded-full bg-[rgba(255,255,255,0.06)] px-2 py-1 text-[10px] text-[var(--dobly-text-muted)]">
                          {ability}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <ModePanel title="Free path" items={proposal.proposal.coworkerRecipe.executionModes.free} />
                    <ModePanel title="Connected path" items={proposal.proposal.coworkerRecipe.executionModes.connectedAccount} />
                    <ModePanel title="Paid rails" items={proposal.proposal.coworkerRecipe.executionModes.paidRail} />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1rem] border border-[color-mix(in_srgb,var(--dobly-text)_10%,transparent)] bg-[rgba(255,255,255,0.04)] p-3">
                  <div className="text-xs font-semibold text-[var(--dobly-text)]">Tools Dobly wants</div>
                  <div className="mt-2 grid gap-2">
                    {proposal.proposal.requiredConnections.slice(0, 4).map((connection) => (
                      <div key={connection.id} className="rounded-[0.8rem] bg-[rgba(255,255,255,0.055)] p-2 text-xs text-[var(--dobly-text-muted)]">
                        <span className="font-semibold text-[var(--dobly-text)]">{connection.label}</span>
                        {connection.costModes?.length ? <span> | {connection.costModes.map(formatConnectionMeta).join(", ")}</span> : null}
                        {connection.serviceLabels?.length ? (
                          <div className="mt-1 leading-5 text-[var(--dobly-text-dim)]">
                            {connection.serviceLabels.slice(0, 3).join(" / ")}
                          </div>
                        ) : null}
                        <span> · {connection.setupMode.replace("_", " ")}</span>
                      </div>
                    ))}
                    {!proposal.proposal.requiredConnections.length ? (
                      <div className="text-xs text-[var(--dobly-text-muted)]">No external account required for the first safe run.</div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[1rem] border border-[color-mix(in_srgb,var(--dobly-text)_10%,transparent)] bg-[rgba(255,255,255,0.04)] p-3">
                  <div className="text-xs font-semibold text-[var(--dobly-text)]">Trust controls</div>
                  <div className="mt-2 grid gap-2">
                    {proposal.proposal.approvalRules.slice(0, 4).map((rule) => (
                      <div key={rule} className="flex gap-2 text-xs leading-5 text-[var(--dobly-text-muted)]">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--dobly-accent)]" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {proposal.test_results?.summary ? (
                <div className="rounded-[0.9rem] border border-[rgba(67,160,71,0.32)] bg-[rgba(67,160,71,0.08)] p-3 text-sm leading-6 text-[var(--dobly-text-secondary)]">
                  {proposal.test_results.summary}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={testProposal} disabled={isPending} className="btn-secondary disabled:opacity-50">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
                  Test first
                </button>
                <button type="button" onClick={deployProposal} disabled={isPending} className="btn-primary disabled:opacity-50">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  Deploy coworker
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-[1.1rem] border border-dashed border-[rgba(196,80,26,0.28)] bg-[rgba(255,255,255,0.035)] p-6 text-center">
              <Sparkles className="h-8 w-8 text-[var(--dobly-accent)]" />
              <h3 className="mt-4 font-display text-3xl tracking-[-0.05em] text-[var(--dobly-text)]">No dashboard dumping.</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--dobly-text-muted)]">
                Start from one responsibility. Dobly turns it into a coworker with a visible plan, tests, controls, and chat.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MiniPanel({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-[0.85rem] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">{label}</span>
        <Icon className="h-4 w-4 text-[var(--dobly-accent)]" />
      </div>
      <div className="mt-2 text-sm font-semibold capitalize text-[var(--dobly-text)]">{value}</div>
    </div>
  );
}

function ModePanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[0.85rem] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">{title}</div>
      <div className="mt-2 space-y-1.5">
        {items.slice(0, 2).map((item) => (
          <p key={item} className="line-clamp-2 text-[11px] leading-4 text-[var(--dobly-text-muted)]">{item}</p>
        ))}
      </div>
    </div>
  );
}
