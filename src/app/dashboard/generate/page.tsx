"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Cpu, Zap, Clock, ArrowRight, CheckCircle2,
  Loader2, ChevronDown, ChevronUp, Copy, Check, RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";
import type { WorkflowBlueprint } from "@/types";
import { STARTER_TEMPLATES } from "@/lib/starter-templates";

const EXAMPLE_PROMPTS = [
  "Every Sunday at 7pm, send me a summary of my calendar, unpaid bills, and top priorities for the week",
  "When someone books a call, send them a confirmation and add it to my calendar automatically",
  "Every morning at 7am, send me a short summary of important emails that need a reply today",
  "When a client fills my contact form, send them a welcome email and add them to my CRM",
  "Remind my appointment clients 24 hours before automatically",
  "When a new order comes in, update my tracker and send the customer a confirmation",
];

type Step = "input" | "generating" | "result";

interface GeneratedResult {
  workflow: WorkflowBlueprint;
  workflow_id: string;
  missing_providers?: string[];
  next_url?: string | null;
}

export default function GeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("input");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState("");
  const [businessSummary, setBusinessSummary] = useState<string>("");
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [copied, setCopied] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const templatePrompt = searchParams?.get("prompt");
    if (templatePrompt) {
      setPrompt(templatePrompt);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/business-profile")
      .then((res) => res.json())
      .then((data) => {
        const profile = data.businessProfile;
        if (profile?.context_summary || profile?.business_name) {
          setBusinessSummary(
            profile.context_summary ??
              `${profile.business_name}${profile.business_type ? ` · ${profile.business_type}` : ""}`
          );
        }
      })
      .catch(() => setBusinessSummary(""));
  }, []);

  const kind = searchParams?.get("kind") === "agent" ? "agent" : searchParams?.get("kind") === "automation" ? "automation" : null;

  async function handleGenerate() {
    if (!prompt.trim() || prompt.trim().length < 10) {
      setError("Please describe your automation in at least 10 characters.");
      return;
    }

    setError("");
    setStep("generating");
    setGeneratingProgress(0);

    // Animate progress bar
    progressRef.current = setInterval(() => {
      setGeneratingProgress((p) => {
        if (p >= 92) {
          clearInterval(progressRef.current!);
          return 92;
        }
        return p + Math.random() * 8;
      });
    }, 300);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Generation failed");
      }

      clearInterval(progressRef.current!);
      setGeneratingProgress(100);

      if (Array.isArray(data.missing_providers) && data.missing_providers.length > 0 && data.next_url) {
        setTimeout(() => {
          router.push(data.next_url);
        }, 500);
        return;
      }

      setTimeout(() => {
        setResult(data as GeneratedResult);
        setStep("result");
      }, 400);
    } catch (err) {
      clearInterval(progressRef.current!);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("input");
    }
  }

  function toggleStep(i: number) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function copyBlueprint() {
    if (!result) return;
    await navigator.clipboard.writeText(JSON.stringify(result.workflow, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setStep("input");
    setResult(null);
    setPrompt("");
    setError("");
    setGeneratingProgress(0);
    setExpandedSteps(new Set([0]));
  }

  // ── Input step ──────────────────────────────────────────────────────────────
  if (step === "input") {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-text mb-2">
            {kind === "agent" ? "Generate an agent" : kind === "automation" ? "Generate an automation" : "Generate a system"}
          </h1>
          <p className="text-text-muted">
            {kind === "agent"
              ? "Describe the business role you want handled. Dobly will draft a bounded agent with the right behavior, tools, and safeguards."
              : kind === "automation"
                ? "Describe the business process you want running. Dobly will draft a deployable automation with triggers, steps, and required tools."
                : "Describe the business role or process you want handled. Dobly will classify it and draft the right system."}
          </p>
        </div>

        {businessSummary ? (
          <div className="rounded-[1rem] border border-accent/16 bg-accent-dim px-4 py-3 text-sm text-text-muted">
            Using saved business context: <span className="text-text">{businessSummary}</span>.{" "}
            <Link href="/dashboard/business" className="text-accent hover:text-text">
              Edit business context
            </Link>
          </div>
        ) : (
          <div className="rounded-[1rem] border border-border bg-surface px-4 py-3 text-sm text-text-muted">
            Add your website, FAQs, and brand context once to make new agents and automations generate faster and more accurately.{" "}
            <Link href="/dashboard/business" className="text-accent hover:text-text">
              Open business setup
            </Link>
          </div>
        )}

        {/* Input */}
        <div className="card">
          <label className="block text-sm font-display font-medium text-text mb-3">
            What do you want to automate?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="input min-h-[120px] resize-none text-base leading-relaxed"
            placeholder="e.g. Every Sunday at 7pm, send me next week's calendar, unpaid bills, and my top priorities..."
            maxLength={1000}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-text-dim">{prompt.length}/1000</span>
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>

          <button
            onClick={handleGenerate}
            disabled={prompt.trim().length < 10}
            className="btn-primary w-full justify-center mt-4 py-3.5 text-base"
          >
            <Zap className="w-4 h-4" />
            {kind === "agent" ? "Generate bounded agent" : kind === "automation" ? "Generate runnable automation" : "Generate system"}
          </button>
        </div>

        {/* Examples */}
        <div>
          <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">
            Or try an example
          </p>
          <div className="grid gap-2">
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => setPrompt(p)}
                className="text-left px-4 py-3 rounded-lg border border-border hover:border-accent/40 hover:bg-accent-dim bg-surface-1 text-sm text-text-muted hover:text-text transition-all duration-200 group"
              >
                <span className="text-accent group-hover:text-accent-hover mr-2">-&gt;</span>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs font-mono text-text-dim uppercase tracking-wider">
              Starter templates
            </p>
            <Link href="/dashboard/workflows" className="text-xs text-text-muted hover:text-text">
              View workflows
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {STARTER_TEMPLATES.slice(0, 4).map((template) => (
              <button
                key={template.id}
                onClick={() => setPrompt(template.prompt)}
                className="premium-tile text-left"
              >
                <div className="badge-muted mb-3">{template.category}</div>
                <div className="font-display text-lg font-semibold text-text">{template.title}</div>
                <p className="mt-2 text-sm leading-6 text-text-muted">{template.summary}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Generating step ─────────────────────────────────────────────────────────
  if (step === "generating") {
    const generationSteps = [
      { threshold: 0, msg: "Analysing your request..." },
      { threshold: 25, msg: "Identifying the right tools..." },
      { threshold: 55, msg: "Mapping automation steps..." },
      { threshold: 80, msg: "Finalising your workflow..." },
    ];

    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-16">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-accent/10 animate-ping" />
            <div className="relative w-16 h-16 bg-accent-dim rounded-full flex items-center justify-center border border-accent/30">
              <Cpu className="w-7 h-7 text-accent animate-pulse" />
            </div>
          </div>

          <h2 className="font-display font-bold text-xl text-text mb-2">
            Designing your workflow...
          </h2>
          <p className="text-sm text-text-muted mb-8 max-w-sm mx-auto">
            Dobly's AI is mapping every step, selecting the right tools, and
            building your runnable workflow draft.
          </p>

          {/* Progress */}
          <div className="max-w-xs mx-auto mb-3">
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                style={{ width: `${generatingProgress}%` }}
              />
            </div>
          </div>
          <p className="font-mono text-xs text-text-dim">
            {Math.round(generatingProgress)}%
          </p>

          <div className="mt-8 space-y-3 text-left">
            {generationSteps.map(({ threshold, msg }, index) =>
              generatingProgress >= threshold ? (
                <motion.div
                  key={msg}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: index * 0.12 }}
                  className="mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-[rgba(0,223,160,0.04)] px-4 py-3 text-sm text-text-muted"
                >
                  <motion.div
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: 360 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.12 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/20 bg-accent-dim"
                  >
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                  </motion.div>
                  {msg}
                </motion.div>
              ) : null
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Result step ─────────────────────────────────────────────────────────────
  const wf = result?.workflow;
  if (!wf) return null;
  const operator = wf.definition?.operator;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            <span className="text-sm text-accent font-display font-medium">
              Workflow ready
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl text-text">{wf.name}</h1>
          <p className="text-text-muted text-sm mt-1">{wf.description}</p>
        </div>
        <button onClick={reset} className="btn-ghost text-xs flex-shrink-0">
          <RotateCcw className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-2">
        <span className="badge-muted">
          <Clock className="w-3 h-3" />
          {wf.estimated_time_saved} saved
        </span>
        <span className="badge-muted">{wf.difficulty}</span>
        <span className="badge-green">{wf.category}</span>
        <span className="badge-muted">Trigger: {wf.trigger}</span>
      </div>

      {/* Integrations */}
      <div className="card">
        <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">
          Tools required
        </p>
        <div className="flex flex-wrap gap-2">
          {wf.integrations.map((tool) => (
            <span
              key={tool}
              className="px-3 py-1 bg-surface-2 border border-border rounded-full text-xs text-text-muted font-body"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>

      {operator?.enabled ? (
        <div className="card border-accent/20 bg-accent-dim/40">
          <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">
            Bounded operator policy
          </p>
          <div className="space-y-3 text-sm text-text-muted">
            <div>
              <span className="text-text font-display font-medium">Role:</span> {operator.role}
            </div>
            <div>
              <span className="text-text font-display font-medium">Objective:</span> {operator.objective}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="badge-muted">Autonomy: {operator.autonomy}</span>
              <span className="badge-muted">Approval threshold: {operator.approvalRiskThreshold}</span>
              {operator.channel ? <span className="badge-muted">Channel: {operator.channel}</span> : null}
            </div>
            {operator.allowedDomains.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {operator.allowedDomains.map((domain) => (
                  <span key={domain} className="badge-muted">{domain}</span>
                ))}
              </div>
            ) : null}
            {operator.escalationMessage ? (
              <div className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-text-muted">
                Escalation rule: {operator.escalationMessage}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Steps */}
      <div>
        <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">
          Automation steps
        </p>
        <div className="space-y-2">
          {wf.steps.map((step, i) => {
            const isExpanded = expandedSteps.has(i);
            return (
              <div
                key={step.id}
                className="border border-border rounded-xl overflow-hidden bg-surface-1"
              >
                <button
                  onClick={() => toggleStep(i)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-2 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-accent-dim border border-accent/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-mono text-xs text-accent font-bold">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-medium text-sm text-text">
                      {step.name}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {step.tool} - {step.action}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-text-dim flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-dim flex-shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border">
                    <p className="text-sm text-text-muted mt-3 leading-relaxed">
                      {step.description}
                    </p>
                    {step.output && (
                      <div className="mt-3 bg-surface-2 rounded-lg px-3 py-2">
                        <span className="text-xs font-mono text-accent">Output: </span>
                        <span className="text-xs text-text-muted">{step.output}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Setup steps */}
      <div className="card bg-surface-2 border-border-bright">
        <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-4">
          Setup guide
        </p>
        <ol className="space-y-3">
          {wf.setup_steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-text-muted">
              <span className="font-mono text-xs text-accent mt-0.5 flex-shrink-0">
                {String(i + 1).padStart(2, "0")}.
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={copyBlueprint} className="btn-secondary flex items-center gap-2">
          {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy workflow JSON"}
        </button>
        <a href={`/dashboard/workflows/${result.workflow_id}`} className="btn-primary flex items-center gap-2">
          Edit and run
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
