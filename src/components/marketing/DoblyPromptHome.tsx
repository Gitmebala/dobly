"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { DOBLY_ALL_TEMPLATES, DOBLY_PROMPT_EXAMPLES } from "@/lib/dobly-core";

const exampleChips = DOBLY_PROMPT_EXAMPLES.slice(0, 5);
const starterTemplates = DOBLY_ALL_TEMPLATES.slice(0, 6);

export default function DoblyPromptHome() {
  const [prompt, setPrompt] = useState(DOBLY_PROMPT_EXAMPLES[0]?.prompt ?? "");

  const nextHref = useMemo(() => {
    const next = `/dashboard/generate?prompt=${encodeURIComponent(prompt.trim())}`;
    return `/auth/signup?next=${encodeURIComponent(next)}`;
  }, [prompt]);

  const loginHref = useMemo(() => {
    const next = `/dashboard/generate?prompt=${encodeURIComponent(prompt.trim())}`;
    return `/auth/login?redirect=${encodeURIComponent(next)}`;
  }, [prompt]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[calc(100vh-2rem)] flex-col rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(12,14,18,0.96)]">
          <header className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] px-5 py-4 sm:px-6">
            <BrandLogo className="justify-start" markClassName="h-9 w-9" wordmarkClassName="text-[1.05rem]" />
            <div className="flex items-center gap-2">
              <Link
                href={loginHref}
                className="rounded-full px-4 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text)]"
              >
                Sign in
              </Link>
              <Link href={nextHref} className="btn-primary px-4 py-2.5 text-sm">
                Start free
              </Link>
            </div>
          </header>

          <main className="flex flex-1 flex-col">
            <section className="mx-auto flex w-full max-w-[980px] flex-1 flex-col justify-center px-5 py-12 sm:px-6 lg:py-20">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">Prompt-first operating workspace</p>
                <h1 className="mx-auto mt-5 max-w-[760px] text-[clamp(2.5rem,6vw,4.8rem)] font-semibold tracking-[-0.06em] text-white">
                  Describe the work. Dobly turns it into the right system.
                </h1>
                <p className="mx-auto mt-5 max-w-[640px] text-base leading-8 text-[var(--text-muted)] sm:text-lg">
                  Start from a prompt on the homepage, then move into setup, access, approvals,
                  reports, and settings in the same simple dark dashboard.
                </p>
              </div>

              <div className="mx-auto mt-10 w-full max-w-[860px] rounded-[26px] border border-[rgba(255,255,255,0.08)] bg-[rgba(16,18,23,0.96)] p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">What should Dobly handle?</span>
                  <span className="rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-1 text-xs text-[var(--text-dim)]">
                    Home
                  </span>
                </div>
                <div className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3">
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    className="min-h-[180px] w-full resize-none border-0 bg-transparent px-2 py-2 text-[15px] leading-8 text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]"
                    placeholder="Every time a lead comes in, qualify it, update the CRM, and only ask me when the message needs a human reply."
                    maxLength={1400}
                  />
                  <div className="mt-3 flex flex-col gap-3 border-t border-[rgba(255,255,255,0.08)] pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {exampleChips.map((example) => (
                        <button
                          key={example.prompt}
                          type="button"
                          onClick={() => setPrompt(example.prompt)}
                          className="rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-2 text-xs text-[var(--text-muted)] transition hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text)]"
                        >
                          {example.audience === "business" ? "Business flow" : "Personal flow"}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Link href={loginHref} className="btn-secondary px-4 py-2.5 text-sm">
                        Sign in
                      </Link>
                      <Link href={nextHref} className="btn-primary px-4 py-2.5 text-sm">
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-[rgba(255,255,255,0.08)] px-5 py-8 sm:px-6">
              <div className="mx-auto grid w-full max-w-[1180px] gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(16,18,23,0.96)] p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">How the flow works</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <FlowStep title="Start on the homepage" text="The first screen is the prompt box, not a marketing wall." />
                    <FlowStep title="Open the dashboard" text="Your dashboard keeps the same dark shell and simple navigation." />
                    <FlowStep title="Refine what you built" text="Connections, approvals, and settings stay close to the work." />
                  </div>
                </div>

                <div className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(16,18,23,0.96)] p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">Starter prompts</p>
                  <div className="mt-4 grid gap-2">
                    {starterTemplates.map((template) => (
                      <Link
                        key={template.id}
                        href={`/auth/signup?next=${encodeURIComponent(`/dashboard/generate?prompt=${encodeURIComponent(template.prompt)}`)}`}
                        className="rounded-[16px] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-sm text-[var(--text-muted)] transition hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text)]"
                      >
                        {template.title}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-[rgba(255,255,255,0.08)] px-5 py-8 sm:px-6">
              <div className="mx-auto flex w-full max-w-[1180px] flex-wrap gap-3 text-sm text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Minimal dark UI
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Prompt-first homepage
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Dashboard-ready flow
                </span>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function FlowStep({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
      <p className="text-sm font-medium text-[var(--text)]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{text}</p>
    </div>
  );
}
