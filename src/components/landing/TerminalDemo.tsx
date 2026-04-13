"use client";

import { useEffect, useMemo, useState } from "react";
import GlassCard from "@/components/shared/GlassCard";

const demos = [
  {
    prompt:
      "When a new order comes in on Shopify, send a Slack message to the team, update the inventory in Airtable, and email the customer their receipt.",
    tools: "Shopify, Slack, Airtable, Gmail",
    compiled: [
      "TRIGGER: Shopify -> order.created",
      "STEP 1: Slack -> send_message (#orders channel)",
      "STEP 2: Airtable -> update_record (inventory -1)",
      "STEP 3: Gmail -> send_email (customer receipt)",
      "STATUS: Ready to deploy",
    ],
  },
  {
    prompt:
      "When someone submits my contact form, create a Notion page, send me a Slack alert, and email them a reply.",
    tools: "Forms, Notion, Slack, Gmail",
    compiled: [
      "TRIGGER: Form -> response.created",
      "STEP 1: Notion -> create_page",
      "STEP 2: Slack -> send_message",
      "STEP 3: Gmail -> send_email",
      "STATUS: Ready to deploy",
    ],
  },
  {
    prompt:
      "When a new form submission arrives, create a Notion page, notify Slack, and schedule a calendar event.",
    tools: "Forms, Notion, Slack, Calendar",
    compiled: [
      "TRIGGER: Form -> response.created",
      "STEP 1: Notion -> create_page",
      "STEP 2: Slack -> send_message",
      "STEP 3: Calendar -> create_event",
      "STATUS: Ready to deploy",
    ],
  },
];

export default function TerminalDemo() {
  const [demoIndex, setDemoIndex] = useState(0);
  const [typedPrompt, setTypedPrompt] = useState("");
  const [phase, setPhase] = useState<"typing" | "analysis" | "compiled" | "live">("typing");
  const demo = useMemo(() => demos[demoIndex] ?? demos[0], [demoIndex]);

  useEffect(() => {
    if (!demo) return;

    let cancelled = false;
    const timers: number[] = [];

    setTypedPrompt("");
    setPhase("typing");

    const typePrompt = (index: number) => {
      if (cancelled) return;

      if (index >= demo.prompt.length) {
        setPhase("analysis");
        timers.push(window.setTimeout(() => !cancelled && setPhase("compiled"), 1000));
        timers.push(window.setTimeout(() => !cancelled && setPhase("live"), 3500));
        timers.push(
          window.setTimeout(() => !cancelled && setDemoIndex((value) => (value + 1) % demos.length), 8000),
        );
        return;
      }

      setTypedPrompt(demo.prompt.slice(0, index + 1));
      timers.push(window.setTimeout(() => typePrompt(index + 1), 18 + Math.random() * 16));
    };

    timers.push(window.setTimeout(() => typePrompt(0), 160));

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [demo]);

  const analysisRows = ["Parsing intent...", "Resolving connectors...", `Tools required: ${demo?.tools}`];

  return (
    <section className="relative z-[1] py-28">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="font-display text-5xl font-bold tracking-[-0.04em] text-white">
            A live compile surface.
          </div>
          <p className="mt-4 max-w-[760px] text-[16px] leading-8 text-[var(--text-secondary)]">
            This is where the product proves itself: plain language goes in, a live workflow comes out.
          </p>
        </div>

        <GlassCard className="terminal-panel rounded-[1.5rem] p-0">
          <div className="flex items-center gap-3 border-b border-[rgba(79,70,229,0.18)] px-6 py-4">
            <div className="flex gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="font-mono text-[12px] text-[rgba(255,255,255,0.4)]">dobly compile</div>
            <div className="ml-auto flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--green)]">
              <span className="pulse h-2 w-2 rounded-full bg-[var(--green)]" />
              live
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-2">
            <div className="border-b border-[rgba(255,255,255,0.06)] px-6 py-6 lg:border-b-0 lg:border-r">
              <div className="mb-4 font-mono text-[12px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.35)]">
                Input
              </div>
              <div className="min-h-[180px] font-mono text-[13px] leading-7 text-[rgba(255,255,255,0.8)]">
                {typedPrompt}
                <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-[var(--accent)] align-middle" />
              </div>

              {(phase === "analysis" || phase === "compiled" || phase === "live") && (
                <div className="mt-6 space-y-3 font-mono text-[13px] text-[var(--green)]">
                  <div>Analyzing intent...</div>
                  {analysisRows.map((row, index) => (
                    <div key={row} className="terminal-line" style={{ animationDelay: `${index * 0.12}s` }}>
                      {row}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-6">
              <div className="mb-4 font-mono text-[12px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.35)]">
                Compiled Workflow
              </div>
              <div className="min-h-[240px] space-y-3 font-mono text-[13px] leading-7">
                {(phase === "compiled" || phase === "live") &&
                  demo?.compiled.map((line, index) => (
                    <div
                      key={line}
                      className={`terminal-line ${
                        line.includes("STATUS") ? "text-[var(--green)]" : "text-[rgba(255,255,255,0.75)]"
                      }`}
                      style={{ animationDelay: `${index * 0.14}s` }}
                    >
                      {line}
                    </div>
                  ))}
                {phase === "live" ? (
                  <div className="pt-3 font-mono text-[13px] text-[var(--green)]">Live - watching for events</div>
                ) : null}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
