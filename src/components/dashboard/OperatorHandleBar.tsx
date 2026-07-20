"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, PlugZap, Rocket, ShieldCheck, Sparkles, TestTube2, UserRoundPlus } from "lucide-react";

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
  { label: "Inbound leads", prompt: "Handle new inbound leads, qualify them, book calls, and ask before sending the first outreach." },
  { label: "Market watch", prompt: "Watch my stock strategy every market day and alert me when the signals drift." },
  { label: "Social content", prompt: "Create weekly social posts from my ideas, prepare videos, and ask before publishing." },
];

function formatConnectionMeta(value: string) {
  return value.replaceAll("_", " ");
}

export default function OperatorHandleBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
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
    <section className="hire-flow" data-compact={compact}>
      {!proposal ? (
        <div className="hire-brief dobly-anim-rise">
          <div className="hire-brief-copy">
            <span className="hire-kicker">
              <UserRoundPlus aria-hidden="true" />
              Hire a coworker
            </span>
            <h2>Describe the job. Dobly finds the person.</h2>
            <p>
              Write it the way you would brief a new hire. Dobly proposes the coworker —
              their skills, tools, working loops, and the rules they will ask you about — before anything goes live.
            </p>
          </div>

          <div className="hire-brief-input">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={compact ? 3 : 4}
              placeholder="For example: answer customer emails within the hour, keep the tone warm, and ask me before offering any refund..."
              autoFocus
            />
            <div className="hire-brief-footer">
              <div className="hire-examples">
                {examples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setPrompt(example.prompt)}
                    title={example.prompt}
                  >
                    {example.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={isPending || prompt.trim().length < 8}
                onClick={propose}
                className="hire-propose-button"
              >
                {isPending ? <Loader2 className="hire-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
                {isPending ? "Interviewing..." : "Propose my coworker"}
              </button>
            </div>
          </div>
          {error ? <p className="hire-error" role="alert">{error}</p> : null}
        </div>
      ) : (
        <div className="hire-proposal dobly-anim-rise" key={proposal.id}>
          <header className="hire-proposal-header">
            <div>
              <span className="hire-kicker">
                <Sparkles aria-hidden="true" />
                Meet your proposed coworker
              </span>
              <h3>{proposal.proposal.name}</h3>
              <p>{proposal.proposal.mission}</p>
              <small>{proposal.proposal.office} / {proposal.proposal.department}</small>
            </div>
            <span className="hire-status" data-status={proposal.status}>{proposal.status}</span>
          </header>

          <div className="hire-facts dobly-stagger">
            <HireFact icon={PlugZap} label="Tools" value={proposal.proposal.requiredConnections.length ? `${proposal.proposal.requiredConnections.length} suggested` : "None needed"} />
            <HireFact icon={ShieldCheck} label="Approvals" value={proposal.proposal.approvalMode.replace("_", " ")} />
            <HireFact icon={TestTube2} label="Trial runs" value={`${proposal.proposal.testScenarios.length} scenarios`} />
          </div>

          {proposal.proposal.coworkerRecipe ? (
            <div className="hire-panel">
              <div className="hire-panel-title">What they can do</div>
              <div className="hire-abilities">
                {proposal.proposal.coworkerRecipe.abilityStack.slice(0, 8).map((ability) => (
                  <span key={ability}>{ability}</span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="hire-panel-grid">
            <div className="hire-panel">
              <div className="hire-panel-title">Tools they will ask to use</div>
              <div className="hire-panel-list">
                {proposal.proposal.requiredConnections.slice(0, 4).map((connection) => (
                  <div key={connection.id} className="hire-connection">
                    <strong>{connection.label}</strong>
                    <span>
                      {connection.setupMode.replace("_", " ")}
                      {connection.costModes?.length ? ` · ${connection.costModes.map(formatConnectionMeta).join(", ")}` : ""}
                    </span>
                  </div>
                ))}
                {!proposal.proposal.requiredConnections.length ? (
                  <p>No external account required for the first safe run.</p>
                ) : null}
              </div>
            </div>

            <div className="hire-panel">
              <div className="hire-panel-title">When they will ask you first</div>
              <div className="hire-panel-list">
                {proposal.proposal.approvalRules.slice(0, 4).map((rule) => (
                  <div key={rule} className="hire-rule">
                    <CheckCircle2 aria-hidden="true" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {proposal.test_results?.summary ? (
            <div className="hire-test-result dobly-anim-rise">{proposal.test_results.summary}</div>
          ) : null}

          {error ? <p className="hire-error" role="alert">{error}</p> : null}

          <footer className="hire-actions">
            <button type="button" onClick={() => { setProposal(null); setError(null); }} className="hire-back-button" disabled={isPending}>
              Change the brief
            </button>
            <div>
              <button type="button" onClick={testProposal} disabled={isPending} className="hire-test-button">
                {isPending ? <Loader2 className="hire-spin" aria-hidden="true" /> : <TestTube2 aria-hidden="true" />}
                Run a trial first
              </button>
              <button type="button" onClick={deployProposal} disabled={isPending} className="hire-deploy-button">
                {isPending ? <Loader2 className="hire-spin" aria-hidden="true" /> : <Rocket aria-hidden="true" />}
                Hire {proposal.proposal.name.split(" ")[0]}
              </button>
            </div>
          </footer>
        </div>
      )}
    </section>
  );
}

function HireFact({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="hire-fact">
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
