"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Link2,
  Loader2,
  Rocket,
  RotateCcw,
  Settings2,
  ShieldCheck,
  TestTube2,
  UserRound,
  Wand2,
  X,
} from "lucide-react";
import { getAgentCapabilityContract } from "@/lib/agent-capability-contracts";
import { getConnectionProvider } from "@/lib/connection-catalog";
import { getConnectionReadiness } from "@/lib/connection-readiness";
import { analyzePromptDesign, type DoblyClarificationAnswers } from "@/lib/generation";
import { STARTER_TEMPLATES } from "@/lib/starter-templates";
import { getDoblyVerticalById } from "@/lib/verticals";
import type { Connection, GenerateWorkflowResponse } from "@/types";

type Step = "input" | "clarify" | "generating" | "result";

const launchRail = [
  { icon: Wand2, title: "Map", body: "Describe the business outcome. Dobly chooses the right operator or specialist swarm." },
  { icon: TestTube2, title: "Compile", body: "Turn the brief into a launch contract with memory, guardrails, and output steps." },
  { icon: Rocket, title: "Connect", body: "Link the systems, channels, and tools needed for the real path." },
  { icon: Activity, title: "Run", body: "Keep approvals, artifacts, failures, and learning visible after launch." },
];

const promptExamples = [
  "Handle inbound WhatsApp leads, qualify them, and ask me before sending sensitive replies.",
  "Research our top 5 competitors, write the summary, build the slide deck, and draft the follow-up email.",
  "Track overdue invoices every morning and prepare polite follow-ups for approval.",
  "Turn our product notes into a launch brief, social assets, presentation, and onboarding doc.",
];

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("input");
  const [prompt, setPrompt] = useState("");
  const [clarifyDraft, setClarifyDraft] = useState("");
  const [clarifyIndex, setClarifyIndex] = useState(0);
  const [result, setResult] = useState<GenerateWorkflowResponse | null>(null);
  const [error, setError] = useState("");
  const [businessSummary, setBusinessSummary] = useState("");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsModalOpen, setConnectionsModalOpen] = useState(false);
  const [clarifications, setClarifications] = useState<DoblyClarificationAnswers>({
    responsibility: "",
    watch: "",
    access: "",
    approvals: "",
    updates: "",
  });

  useEffect(() => {
    const templatePrompt = searchParams?.get("prompt");
    if (templatePrompt) setPrompt(templatePrompt);
  }, [searchParams]);

  useEffect(() => {
    if (step !== "result") return;
    void refreshConnections();
  }, [step]);

  useEffect(() => {
    fetch("/api/business-profile")
      .then((res) => res.json())
      .then((data) => {
        const profile = data.businessProfile;
        if (profile?.context_summary || profile?.business_name) {
          setBusinessSummary(
            profile.context_summary ??
              `${profile.business_name}${profile.business_type ? ` · ${profile.business_type}` : ""}`,
          );
        }
      })
      .catch(() => setBusinessSummary(""));
  }, []);

  const kind =
    searchParams?.get("kind") === "agent"
      ? "agent"
      : searchParams?.get("kind") === "automation"
        ? "automation"
        : null;
  const analysis = useMemo(() => analyzePromptDesign(prompt), [prompt]);
  const detectedVertical = useMemo(() => getDoblyVerticalById(analysis.verticalId), [analysis.verticalId]);
  const capabilityContract = useMemo(
    () => getAgentCapabilityContract(analysis.verticalId),
    [analysis.verticalId],
  );
  const clarifyQuestions = analysis.questions;
  const answeredQuestions = clarifyQuestions.filter((question) =>
    Boolean((clarifications[question.id] ?? "").trim()),
  );
  const currentQuestion = clarifyQuestions[clarifyIndex] ?? null;
  const clarificationComplete = clarifyIndex >= clarifyQuestions.length;
  const filteredTemplates = useMemo(
    () =>
      STARTER_TEMPLATES.filter((template) =>
        kind
          ? template.type === kind
          : ["business_owner", "service_business", "freelancer"].includes(analysis.primarySegment)
            ? template.category !== "Personal"
            : true,
      ).slice(0, 6),
    [analysis.primarySegment, kind],
  );

  function startClarification() {
    if (!prompt.trim() || prompt.trim().length < 10) {
      setError("Describe the work in at least 10 characters.");
      return;
    }
    setError("");
    setClarifyIndex(0);
    setClarifyDraft(analysis.questions[0] ? clarifications[analysis.questions[0].id] ?? "" : "");
    setStep("clarify");
  }

  function saveCurrentClarification(nextValue: string) {
    if (!currentQuestion) return;
    setClarifications((current) => ({
      ...current,
      [currentQuestion.id]: nextValue.trim(),
    }));
  }

  function moveToNextQuestion(nextValue?: string) {
    if (currentQuestion && typeof nextValue === "string") {
      saveCurrentClarification(nextValue);
    }

    const nextIndex = Math.min(clarifyIndex + 1, clarifyQuestions.length);
    setClarifyIndex(nextIndex);
    setClarifyDraft(nextIndex < clarifyQuestions.length ? clarifications[clarifyQuestions[nextIndex].id] ?? "" : "");
  }

  function submitClarification() {
    if (!currentQuestion) return;
    moveToNextQuestion(clarifyDraft);
  }

  function skipClarification() {
    moveToNextQuestion("");
  }

  async function handleGenerate() {
    setError("");
    setStep("generating");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          operatorModel: analysis.operatorModel,
          clarifications,
        }),
      });

      const data = (await res.json()) as GenerateWorkflowResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Generation failed.");
      }

      setResult(data);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("clarify");
    }
  }

  async function refreshConnections() {
    setConnectionsLoading(true);
    try {
      const response = await fetch("/api/connections", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      setConnections(data.connections ?? []);
    } finally {
      setConnectionsLoading(false);
    }
  }

  function reset() {
    setStep("input");
    setResult(null);
    setError("");
    setPrompt("");
    setClarifyDraft("");
    setClarifyIndex(0);
    setClarifications({
      responsibility: "",
      watch: "",
      access: "",
      approvals: "",
      updates: "",
    });
  }

  if (step === "input") {
    return (
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="overflow-hidden rounded-[1.5rem] border border-border bg-[radial-gradient(circle_at_20%_0%,rgba(196,80,26,0.16),transparent_34%),rgba(255,255,255,0.025)]">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-5 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(196,80,26,0.22)] bg-[rgba(196,80,26,0.08)] px-3 py-1 text-xs font-medium text-[var(--dobly-accent)]">
                <Wand2 className="h-3.5 w-3.5" />
                Company operating system planner
              </div>
              <h1 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-tight text-text sm:text-5xl">
                Describe the outcome like you would brief your company.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-text-muted sm:text-base">
                Dobly should ask follow-up questions, map the work to the right operators, show what it needs to connect, and compile a launchable system with visible guardrails, memory, and outputs.
              </p>

              <div className="mt-6 rounded-[1.5rem] border border-border bg-[rgba(8,12,24,0.72)] p-4 sm:p-5">
                <div className="space-y-4">
                  <ChatBubble
                    role="assistant"
                    title="Dobly planner"
                    body="Tell me the outcome you want, the departments involved, the outputs you expect, and where I must stop and ask before acting."
                  />
                  {businessSummary ? (
                    <ChatBubble
                      role="assistant"
                      title="Workspace memory in use"
                      body={`${businessSummary}. I use this as context, not as permission to guess.`}
                    />
                  ) : null}
                  {prompt.trim() ? (
                    <>
                      <ChatBubble role="user" title="Your brief" body={prompt} />
                      <ChatBubble
                        role="assistant"
                        title="Dobly's first read"
                        body={
                          detectedVertical
                            ? `This looks closest to ${detectedVertical.title}. I will map the work, ask for the missing rules, and then generate the first operating contract.`
                            : "I can shape this into an operating contract, but I still need a few rules before I generate anything real."
                        }
                        footnote={`Model shape: ${analysis.operatorModel}. Category: ${analysis.likelyCategory}.`}
                      />
                    </>
                  ) : null}
                </div>

                <div className="mt-5 rounded-[1.25rem] border border-[rgba(245,237,228,0.1)] bg-[rgba(255,255,255,0.03)] p-3">
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    className="min-h-[160px] w-full resize-none rounded-[1rem] border border-transparent bg-transparent px-3 py-3 text-base leading-8 text-text outline-none placeholder:text-text-dim focus:border-[rgba(196,80,26,0.32)]"
                    placeholder="Example: Research the market, build the deck, write the document, create the follow-up assets, and ask me before anything customer-facing goes out."
                    maxLength={1000}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 pt-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="badge-green capitalize">{analysis.operatorModel}</span>
                      <span className="badge-muted capitalize">{analysis.primarySegment.replace(/_/g, " ")}</span>
                      <span className="badge-muted">{analysis.likelyCategory}</span>
                    </div>
                    <span className="text-xs text-text-dim">{prompt.length}/1000</span>
                  </div>
                </div>
              </div>

              {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={startClarification} className="btn-primary">
                  Continue planning chat
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={handleGenerate} disabled={!prompt.trim() || prompt.trim().length < 10} className="btn-secondary">
                  <Settings2 className="h-4 w-4" />
                  Compile from current brief
                </button>
              </div>
            </div>

            <aside className="border-t border-border bg-[rgba(255,255,255,0.02)] p-5 sm:p-6 lg:border-l lg:border-t-0">
              <div className="text-xs uppercase tracking-[0.18em] text-text-dim">Launch path</div>
              <div className="mt-4 grid gap-3">
                {launchRail.map((item, index) => (
                  <div key={item.title} className="flex gap-3 rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-4">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[rgba(196,80,26,0.1)] text-[var(--dobly-accent)]">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text">{index + 1}. {item.title}</div>
                      <p className="mt-1 text-xs leading-5 text-text-muted">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Current read</div>
                <div className="mt-3 space-y-3 text-sm text-text-muted">
                  <p>
                    <span className="text-text">Best fit:</span>{" "}
                    {detectedVertical?.title ?? "Still broad until the brief is clearer."}
                  </p>
                  <p>
                    <span className="text-text">Systems likely needed:</span>{" "}
                    {analysis.suggestedProviderIds.length > 0 ? analysis.suggestedProviderIds.join(", ") : "None yet"}
                  </p>
                  <p>
                    <span className="text-text">First guardrail:</span>{" "}
                    {capabilityContract?.mandatoryEscalations[0] ?? "Ask on ambiguity or missing access."}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="card">
            <p className="text-xs uppercase tracking-[0.16em] text-text-dim">Try one</p>
            <div className="mt-4 grid gap-2">
              {promptExamples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="rounded-xl border border-border bg-[rgba(255,255,255,0.025)] p-3 text-left text-sm leading-6 text-text-muted transition hover:border-[rgba(196,80,26,0.28)] hover:text-text"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-text-dim">Templates</p>
                <p className="mt-1 text-sm text-text-muted">Fast starts, still editable.</p>
              </div>
              <Link href="/dashboard/templates" className="text-sm text-text-muted hover:text-text">
                View all
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {filteredTemplates.slice(0, 4).map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setPrompt(template.prompt)}
                  className="rounded-xl border border-border bg-[rgba(255,255,255,0.025)] p-4 text-left transition hover:border-[rgba(196,80,26,0.28)]"
                >
                  <div className="badge-muted mb-3">{template.category}</div>
                  <div className="text-sm font-medium text-text">{template.title}</div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-muted">{template.summary}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (step === "clarify") {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="card space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-text-dim">Planning chat</p>
                <h1 className="mt-2 text-3xl font-semibold text-text">Lock the operating rules before launch</h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-text-muted">
                  Dobly should earn clarity before it earns autonomy. Answer in plain language and it will turn the rules into a visible contract.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge-green capitalize">{analysis.operatorModel}</span>
                <span className="badge-muted">{analysis.likelyCategory}</span>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-[rgba(8,12,24,0.72)] p-4 sm:p-5">
              <div className="space-y-4">
                <ChatBubble role="assistant" title="Dobly planner" body="I am turning your brief into a narrow agent contract." />
                <ChatBubble role="user" title="Your brief" body={prompt} />
                <ChatBubble
                  role="assistant"
                  title="Dobly's read"
                  body={
                    capabilityContract
                      ? `${capabilityContract.title} fits best. I will keep it focused on: ${capabilityContract.endToEndFlow[0]}`
                      : "I have the general job. Now I need the rules that decide where automation stops and a human takes over."
                  }
                />

                {clarifyQuestions.slice(0, clarifyIndex).map((question) => (
                  <div key={question.id} className="space-y-3">
                    <ChatBubble role="assistant" title={question.label} body={question.help} />
                    <ChatBubble
                      role="user"
                      title="Your answer"
                      body={clarifications[question.id]?.trim() || "Skipped. Dobly will use defaults and keep confidence lower here."}
                    />
                  </div>
                ))}

                {currentQuestion ? (
                  <ChatBubble
                    role="assistant"
                    title={currentQuestion.label}
                    body={currentQuestion.help}
                    footnote={currentQuestion.placeholder}
                  />
                ) : (
                  <ChatBubble
                    role="assistant"
                    title="Ready to compile"
                    body="I have enough to generate the first version. I will keep your answers visible in the final contract so you can inspect every assumption."
                  />
                )}
              </div>

              {currentQuestion ? (
                <div className="mt-5 rounded-[1.25rem] border border-[rgba(245,237,228,0.1)] bg-[rgba(255,255,255,0.03)] p-3">
                  <textarea
                    value={clarifyDraft}
                    onChange={(event) => setClarifyDraft(event.target.value)}
                    className="min-h-[140px] w-full resize-none rounded-[1rem] border border-transparent bg-transparent px-3 py-3 text-base leading-7 text-text outline-none placeholder:text-text-dim focus:border-[rgba(196,80,26,0.32)]"
                    placeholder={currentQuestion.placeholder}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 pt-3">
                    <span className="text-xs text-text-dim">
                      Question {clarifyIndex + 1} of {clarifyQuestions.length}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={skipClarification} className="btn-ghost">
                        Skip
                      </button>
                      <button type="button" onClick={submitClarification} className="btn-primary">
                        Save answer
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button onClick={handleGenerate} className="btn-primary">
                    Generate launch contract
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button onClick={() => setStep("input")} className="btn-secondary">
                    Back to brief
                  </button>
                </div>
              )}
            </div>

            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="card">
              <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Progress</div>
              <div className="mt-4 space-y-3">
                {clarifyQuestions.map((question, index) => {
                  const answered = Boolean((clarifications[question.id] ?? "").trim());
                  const current = index === clarifyIndex && !clarificationComplete;

                  return (
                    <div key={question.id} className="rounded-xl border border-border bg-[rgba(255,255,255,0.03)] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-text">{question.label}</div>
                        <span className="badge-muted">
                          {answered ? "Answered" : current ? "Now" : "Waiting"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {detectedVertical ? (
              <div className="card">
                <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Matched playbook</div>
                <div className="mt-2 text-lg font-semibold text-text">{detectedVertical.title}</div>
                <p className="mt-2 text-sm leading-6 text-text-muted">{detectedVertical.tagline}</p>
                <div className="mt-4 space-y-2 text-sm text-text-muted">
                  <p><span className="text-text">Owns:</span> {capabilityContract?.endToEndFlow[0] ?? detectedVertical.purpose}</p>
                  <p><span className="text-text">Stops when:</span> {capabilityContract?.mandatoryEscalations[0] ?? "Confidence drops or rules are unclear."}</p>
                </div>
              </div>
            ) : null}

            <div className="card">
              <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Likely launch stack</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.suggestedProviderIds.map((providerId) => (
                  <span key={providerId} className="badge-muted">
                    {providerId}
                  </span>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-sm text-text-muted">
                <p>Dobly should only request the smallest live-access path needed for the first version.</p>
                <p>{answeredQuestions.length} of {clarifyQuestions.length} answers captured so far.</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    );
  }

  if (step === "generating") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card py-16 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]">
            <Loader2 className="h-6 w-6 animate-spin text-text" />
          </div>
          <h2 className="text-xl font-semibold text-text">Compiling the system</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-text-muted">
            Dobly is using your prompt, workspace memory, standards, and follow-up answers to shape
            responsibilities, escalation rules, delivery stages, runtime behavior, and the first learning loop.
          </p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const classification = result.classification;
  const requiredProviders = Array.from(
    new Set(result.connection_strategy?.required_provider_ids ?? result.missing_providers ?? []),
  );
  const resultContract = getAgentCapabilityContract(result.vertical?.id ?? analysis.verticalId);
  const providerStates = requiredProviders.map((providerId) => {
    const provider = getConnectionProvider(providerId);
    const activeConnection = connections.find(
      (connection) => connection.provider === providerId && getConnectionReadiness(connection).operational,
    );

    return {
      providerId,
      label: provider?.label ?? providerId,
      ready: Boolean(activeConnection),
      detail: activeConnection
        ? getConnectionReadiness(activeConnection).label
        : "Not connected yet",
    };
  });
  const allRequiredConnectionsReady = providerStates.length === 0 || providerStates.every((provider) => provider.ready);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="card space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              System package ready
            </div>
            <h1 className="text-3xl font-semibold text-text">{result.workflow.name}</h1>
            <p className="mt-2 text-sm leading-7 text-text-muted">{result.workflow.description}</p>
          </div>
          <button onClick={reset} className="btn-ghost">
            <RotateCcw className="h-4 w-4" />
            New prompt
          </button>
        </div>

        {classification ? (
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
            <div className="flex flex-wrap gap-2">
              <span className="badge-green capitalize">{classification.operator_model}</span>
              <span className="badge-muted capitalize">{classification.primary_segment.replace(/_/g, " ")}</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-text-muted">{classification.explanation}</p>
          </div>
        ) : null}

        {result.vertical ? (
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge-green">{result.vertical.title}</span>
              <span className="badge-muted">{result.vertical.tagline}</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-text-muted">{result.vertical.purpose}</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <BuilderMini title="Memory" items={result.vertical.memory_fields.slice(0, 4)} />
              <BuilderMini title="Approval rules" items={result.vertical.approval_rules.slice(0, 4)} />
            </div>
          </div>
        ) : null}

        {result.operating_model ? (
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
            <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Operating package</div>
            <h2 className="mt-2 text-xl font-semibold text-text">{result.operating_model.job_to_be_done}</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <BuilderMini title="Responsibilities" items={result.operating_model.responsibilities} />
              <BuilderMini title="Watches" items={result.operating_model.watches} />
              <BuilderMini title="Handled by Dobly" items={result.operating_model.handled_by_dobly} />
              <BuilderMini title="Learning guardrail" items={result.operating_model.learning_contract} />
              <BuilderMini title="Success looks like" items={result.operating_model.success_definition} />
            </div>
          </div>
        ) : null}

        {resultContract ? (
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
            <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Capability contract</div>
            <h2 className="mt-2 text-xl font-semibold text-text">{resultContract.title}</h2>
            <p className="mt-2 text-sm leading-7 text-text-muted">{resultContract.headline}</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <BuilderMini title="Must escalate" items={resultContract.mandatoryEscalations} />
              <BuilderMini title="Never do automatically" items={resultContract.neverDoes} />
              <BuilderMini title="Visible memory writes" items={resultContract.memoryWrites.slice(0, 5)} />
              <BuilderMini title="Explain every run with" items={resultContract.explainability} />
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
          <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Delivery stages</div>
          <h2 className="mt-2 text-xl font-semibold text-text">How this system should launch</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              ["Draft", "Dobly compiles the first version and keeps assumptions visible."],
              ["Simulation", "Test against expected and risky scenarios before any live action."],
              ["Supervised", "Run with user review while Dobly learns the exact standard."],
              ["Rule candidate", "Stable patterns are proposed for owner approval; uncertain ones still escalate."],
              ["Approved rule", "Only approved low-risk patterns become deterministic paths with rollback."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] p-4">
                <div className="text-sm font-medium text-text">{title}</div>
                <p className="mt-2 text-sm leading-6 text-text-muted">{copy}</p>
              </div>
            ))}
          </div>
        </div>

        {result.capability_plan ? (
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-text-dim">How Dobly will make it happen</div>
                <h2 className="mt-2 text-xl font-semibold text-text">Capability-first delivery plan</h2>
                <p className="mt-2 text-sm leading-7 text-text-muted">
                  Dobly resolves the job into capabilities, then uses Dobly-native paths, your current stack,
                  or the smallest unlock needed to make it live.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge-green">{result.capability_plan.summary.ready_now} ready now</span>
                <span className="badge-muted">{result.capability_plan.summary.one_unlock} one unlock away</span>
                <span className="badge-muted">{result.capability_plan.summary.draft_ready} draft-ready paths</span>
              </div>
            </div>
            <div className="mt-4 grid gap-4">
              {result.capability_plan.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-medium text-text">{item.title}</div>
                      <p className="mt-1 text-sm text-text-muted">{item.user_need}</p>
                    </div>
                    <span className={item.status === "dobly_now" || item.status === "connected_now" ? "badge-green" : "badge-muted"}>
                      {item.status_label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-text-muted">{item.summary}</p>
                  {item.connected_provider_label ? (
                    <div className="mt-3 text-sm text-text-muted">
                      Using now: <span className="text-text">{item.connected_provider_label}</span>
                    </div>
                  ) : null}
                  {item.unlock_options.length > 0 ? (
                    <div className="mt-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Supported options</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.unlock_options.map((option) => (
                          <span key={option} className="badge-muted">
                            {option}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-3 text-sm text-text-muted">
                    Fallback: <span className="text-text">{item.fallback_path}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {requiredProviders.length > 0 ? (
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Connection checkpoint</div>
                <h2 className="mt-2 text-xl font-semibold text-text">
                  {allRequiredConnectionsReady ? "All connections available" : "These connections are required"}
                </h2>
                <p className="mt-2 text-sm leading-7 text-text-muted">
                  Dobly should only ask for the live access needed for this launch path. Connect what is missing, then refresh this checklist.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setConnectionsModalOpen(true)} className="btn-secondary">
                  <Link2 className="h-4 w-4" />
                  Open connection checklist
                </button>
                <button type="button" onClick={() => void refreshConnections()} className="btn-ghost">
                  {connectionsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Refresh
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {providerStates.map((provider) => (
                <div key={provider.providerId} className="rounded-xl border border-border bg-[rgba(255,255,255,0.03)] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-text">{provider.label}</div>
                      <div className="mt-1 text-xs text-text-muted">{provider.detail}</div>
                    </div>
                    <span className={provider.ready ? "badge-green" : "badge-muted"}>
                      {provider.ready ? "Ready" : "Needed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card">
          <p className="text-xs uppercase tracking-[0.16em] text-text-dim">First-value checklist</p>
          <ol className="mt-4 space-y-3">
            {(result.first_value_checklist ?? []).map((item, index) => (
              <li key={item} className="flex gap-3 text-sm leading-7 text-text-muted">
                <span className="text-text">{index + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={result.next_url ?? (result.pod_id ? `/dashboard/pods/${result.pod_id}` : `/dashboard/workflows/${result.workflow_id}?mode=sandbox`)}
              className="btn-primary"
            >
              Open Pod
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={`/dashboard/workflows/${result.workflow_id}`} className="btn-secondary">
              Open advanced editor
            </Link>
            <button type="button" onClick={() => setConnectionsModalOpen(true)} className="btn-ghost">
              Open access
            </button>
          </div>
        </div>

        <div className="card space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-text-dim">Access plan</p>
            <p className="mt-2 text-sm leading-7 text-text-muted">
              Dobly should ask for access progressively. Start with what it can already handle, then only
              unlock the smallest live path needed to make this work.
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Needed now</div>
            <div className="mt-2 space-y-2 text-sm text-text-muted">
              {result.operating_model?.access_needed_now?.length ? (
                result.operating_model.access_needed_now.map((item) => <div key={item}>{item}</div>)
              ) : result.missing_providers && result.missing_providers.length > 0 ? (
                <div>{result.missing_providers.join(", ")}</div>
              ) : (
                <div>No required live access detected yet.</div>
              )}
            </div>
          </div>
          {result.operating_model?.access_optional_later?.length ? (
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Optional later</div>
              <div className="mt-2 space-y-2 text-sm text-text-muted">
                {result.operating_model.access_optional_later.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </div>
          ) : null}
          {result.operating_model?.work_talents?.length ? (
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Work talents in play</div>
              <div className="mt-2 space-y-2 text-sm text-text-muted">
                {result.operating_model.work_talents.map((talent) => (
                  <div key={talent.id}>
                    <span className="text-text">{talent.title}:</span> {talent.summary}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {result.operating_model?.update_contract?.length ? (
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Update contract</div>
              <div className="mt-2 space-y-2 text-sm text-text-muted">
                {result.operating_model.update_contract.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Setup guide</div>
            <ol className="mt-2 space-y-2 text-sm text-text-muted">
              {result.workflow.setup_steps.slice(0, 4).map((stepItem) => (
                <li key={stepItem}>{stepItem}</li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Recommended next step</div>
            <div className="mt-2 text-sm leading-7 text-text-muted">
              Start in the safe sandbox first. Dobly will simulate side effects, show you what would happen,
              and let you go live only after you are comfortable.
            </div>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-text-dim">Recommended starter stack</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {analysis.suggestedProviderIds.map((providerId) => (
                <span key={providerId} className="badge-muted">
                  {providerId}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <p className="text-xs uppercase tracking-[0.16em] text-text-dim">System explanation</p>
          {result.explanation ? (
            <>
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-green capitalize">{result.explanation.confidence_label.replace(/_/g, " ")}</span>
                  <span className="badge-muted">{result.explanation.confidence}% confidence</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-text-muted">{result.explanation.confidence_reason}</p>
              </div>
              <ExplainCard label="What this is" value={result.explanation.what_this_is} />
              <ExplainCard label="Why Dobly built it this way" value={result.explanation.why_built_this_way} />
              <ExplainList label="What happens next" items={result.explanation.what_happens_next} />
              <ExplainList label="Assumptions" items={result.explanation.assumptions} />
            </>
          ) : (
            <p className="text-sm text-text-muted">No explanation was returned for this draft.</p>
          )}
        </div>

        <div className="card">
          <p className="text-xs uppercase tracking-[0.16em] text-text-dim">Workflow steps</p>
          <div className="mt-4 space-y-3">
            {result.workflow.steps.map((workflowStep, index) => (
              <div key={workflowStep.id} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <div className="flex items-center gap-3">
                  <span className="badge-muted">{index + 1}</span>
                  <div className="text-sm font-medium text-text">{workflowStep.name}</div>
                </div>
                <p className="mt-2 text-sm leading-7 text-text-muted">{workflowStep.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {resultContract ? (
        <section className="card">
          <p className="text-xs uppercase tracking-[0.16em] text-text-dim">Launch evals</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {resultContract.evalScenarios.map((scenario) => (
              <div key={scenario.title} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <div className="text-sm font-medium text-text">{scenario.title}</div>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  <span className="text-text">Input:</span> {scenario.prompt}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  <span className="text-text">Expected:</span> {scenario.expected}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  <span className="text-text">Pass condition:</span> {scenario.passCondition}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card">
          <p className="text-xs uppercase tracking-[0.16em] text-text-dim">Workspace memory used</p>
          <div className="mt-4">
            <ExplainList items={result.workspace_memory ?? []} empty="No saved workspace memory yet." />
          </div>
        </div>

        <div className="card">
          <p className="text-xs uppercase tracking-[0.16em] text-text-dim">Policy summary</p>
          <div className="mt-4">
            <ExplainList items={result.policy_summary ?? []} empty="No explicit workspace policies were found." />
          </div>
        </div>

        <div className="card">
          <p className="text-xs uppercase tracking-[0.16em] text-text-dim">Guardrails and failure handling</p>
          {result.explanation ? (
            <div className="mt-4 space-y-4">
              <ExplainList label="Approval points" items={result.explanation.approval_points} />
              <ExplainList label="Failure modes to watch" items={result.explanation.failure_modes} />
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <div className="text-sm font-medium text-text">Dobly defaults</div>
                <div className="mt-3 space-y-2 text-sm leading-7 text-text-muted">
                  <p><span className="text-text">Operator:</span> {result.explanation.defaults.operator_type}</p>
                  <p><span className="text-text">Trigger:</span> {result.explanation.defaults.trigger_strategy}</p>
                  <p><span className="text-text">Approvals:</span> {result.explanation.defaults.approval_policy}</p>
                  <p><span className="text-text">Retries:</span> {result.explanation.defaults.retry_policy}</p>
                  <p><span className="text-text">First connection:</span> {result.explanation.defaults.first_connection}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-muted">No guardrail summary was returned for this draft.</p>
          )}
        </div>
      </section>

      <section className="card">
        <p className="text-xs uppercase tracking-[0.16em] text-text-dim">Your setup answers</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {[
            ["Responsibility", clarifications.responsibility],
            ["Watch closely", clarifications.watch],
            ["Access needed now", clarifications.access],
            ["Approvals", clarifications.approvals],
            ["Updates", clarifications.updates],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="text-sm font-medium text-text">{label}</div>
              <p className="mt-2 text-sm leading-7 text-text-muted">{value || "No extra detail provided."}</p>
            </div>
          ))}
        </div>
      </section>

      {connectionsModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xl">
          <div className="w-full max-w-3xl rounded-[1.5rem] border border-border bg-[var(--dobly-bg)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="badge-green">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Launch checklist
                </div>
                <h2 className="mt-4 font-display text-3xl text-text">
                  {allRequiredConnectionsReady ? "All connections available" : "Finish the required connections"}
                </h2>
                <p className="mt-3 text-sm leading-7 text-text-muted">
                  Connect only what this system truly needs. After each connection, come back here and refresh to let Dobly detect the new access automatically.
                </p>
              </div>
              <button type="button" onClick={() => setConnectionsModalOpen(false)} className="btn-ghost">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {providerStates.map((provider) => (
                <div key={provider.providerId} className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-medium text-text">{provider.label}</div>
                      <p className="mt-1 text-sm text-text-muted">{provider.detail}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={provider.ready ? "badge-green" : "badge-muted"}>
                        {provider.ready ? "Connected" : "Missing"}
                      </span>
                      {!provider.ready ? (
                        <Link href={`/dashboard/connect/${provider.providerId}`} className="btn-primary px-4 py-2 text-xs">
                          Connect
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => void refreshConnections()} className="btn-secondary">
                {connectionsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Refresh connection status
              </button>
              <button type="button" onClick={() => setConnectionsModalOpen(false)} className="btn-ghost">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChatBubble({
  role,
  title,
  body,
  footnote,
}: {
  role: "assistant" | "user";
  title: string;
  body: string;
  footnote?: string;
}) {
  const assistant = role === "assistant";

  return (
    <div className={`flex gap-3 ${assistant ? "" : "justify-end"}`}>
      {assistant ? (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[rgba(196,80,26,0.22)] bg-[rgba(196,80,26,0.08)] text-[var(--dobly-accent)]">
          <Bot className="h-4 w-4" />
        </div>
      ) : null}
      <div
        className={`max-w-[46rem] rounded-[1.25rem] border px-4 py-3 ${
          assistant
            ? "border-[rgba(245,237,228,0.1)] bg-[rgba(255,255,255,0.04)]"
            : "border-[rgba(196,80,26,0.18)] bg-[rgba(196,80,26,0.08)]"
        }`}
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-text-dim">
          {!assistant ? <UserRound className="h-3.5 w-3.5" /> : null}
          {title}
        </div>
        <p className="mt-2 text-sm leading-7 text-text-muted">{body}</p>
        {footnote ? <p className="mt-2 text-xs leading-5 text-text-dim">{footnote}</p> : null}
      </div>
      {!assistant ? (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[rgba(245,237,228,0.1)] bg-[rgba(255,255,255,0.04)] text-text">
          <UserRound className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  );
}

function ExplainCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
      <div className="text-sm font-medium text-text">{label}</div>
      <p className="mt-2 text-sm leading-7 text-text-muted">{value}</p>
    </div>
  );
}

function ExplainList({
  label,
  items,
  empty,
}: {
  label?: string;
  items: string[];
  empty?: string;
}) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
      {label ? <div className="text-sm font-medium text-text">{label}</div> : null}
      {items.length > 0 ? (
        <div className={`${label ? "mt-3" : ""} space-y-2`}>
          {items.map((item) => (
            <p key={item} className="text-sm leading-7 text-text-muted">
              {item}
            </p>
          ))}
        </div>
      ) : (
        <p className={`${label ? "mt-2" : ""} text-sm leading-7 text-text-muted`}>{empty ?? "Nothing yet."}</p>
      )}
    </div>
  );
}

function BuilderMini({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.16em] text-text-dim">{title}</div>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={item} className="text-sm text-text-muted">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
