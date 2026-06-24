"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Cable,
  CheckCheck,
  Orbit,
  Sparkles,
} from "lucide-react";

const steps = [
  {
    id: "01",
    title: "Tell Dobly the task",
    body: "Type what should happen.",
    panelTitle: "You say it",
    panelItems: ["New payment", "New order", "New booking"],
    icon: Sparkles,
  },
  {
    id: "02",
    title: "Dobly builds the worker system",
    body: "It maps the departments, tools, memory, and retries for you.",
    panelTitle: "Dobly orchestrates it",
    panelItems: ["Plan", "Route", "Retry"],
    icon: Orbit,
  },
  {
    id: "03",
    title: "Adjust it fast",
    body: "Change timing or wording before launch.",
    panelTitle: "You tweak it",
    panelItems: ["Timing", "Tone", "Rules"],
    icon: Cable,
  },
  {
    id: "04",
    title: "Run with confidence",
    body: "See every run, escalation, and boundary in one place.",
    panelTitle: "Dobly keeps watch",
    panelItems: ["Live status", "History", "Escalations"],
    icon: CheckCheck,
  },
];

export default function HowItWorks() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((value) => (value + 1) % steps.length);
    }, 3600);
    return () => clearInterval(timer);
  }, []);

  const current = steps[active] ?? steps[0]!;
  const CurrentIcon = current.icon;

  return (
    <section id="command" className="py-20">
      <div className="container-main">
        <div className="pointer-events-none mb-8 overflow-hidden">
          <div className="flex min-w-max gap-8 whitespace-nowrap text-6xl font-display font-bold tracking-[-0.08em] text-white/[0.04] sm:text-8xl">
            <span>Command</span>
            <span>Compose</span>
            <span>Approve</span>
            <span>Run</span>
            <span>Command</span>
          </div>
        </div>
        <div className="mb-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="badge-muted mb-4">Command Surface</div>
            <h2 className="font-display text-4xl font-bold tracking-tight text-text sm:text-5xl">
              From one sentence to an always-on department.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-text-muted">
            No forms. No confusion. Just tell Dobly what should happen.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === active;

              return (
                <motion.button
                  key={step.id}
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  whileHover={{ x: 4 }}
                  className={`w-full rounded-[1.75rem] border p-5 text-left transition-all ${
                    isActive
                      ? "surface-panel border-accent/35 shadow-[0_24px_60px_rgba(5,7,12,0.16)]"
                      : "bg-surface/45 border-border hover:border-border-bright"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${
                        isActive ? "bg-accent text-surface" : "bg-surface-2 text-text-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 text-xs uppercase tracking-[0.28em] text-text-dim">{step.id}</div>
                      <div className="font-display text-xl font-semibold text-text">{step.title}</div>
                      <p className="mt-2 text-sm leading-6 text-text-muted">{step.body}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="clay-panel noise section-shell overflow-hidden p-6 sm:p-8">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-text-dim">Live walkthrough</div>
                <div className="mt-2 font-display text-2xl font-semibold text-text">{current.panelTitle}</div>
              </div>
              <div className="badge-green">{current.id} / 04</div>
            </div>

            <div className="grid gap-4 md:grid-cols-[0.88fr_1.12fr]">
              <div className="tile-float" style={{ ["--float-delay" as any]: "0ms" }}>
                <div className="premium-tile min-h-[220px]">
                  <div className="mb-6 inline-flex rounded-[1.4rem] bg-accent px-4 py-4 text-surface">
                    <CurrentIcon className="h-5 w-5" />
                  </div>
                  <div className="font-display text-2xl font-semibold text-text">{current.title}</div>
                  <p className="mt-4 text-sm leading-6 text-text-muted">{current.body}</p>
                </div>
              </div>

              <div className="space-y-3">
                {current.panelItems.map((item, index) => (
                  <div
                    key={item}
                    className="tile-float"
                    style={{ ["--float-delay" as any]: `${index * 180}ms` }}
                  >
                    <motion.div
                      initial={{ opacity: 0.6, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="premium-tile flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-xs uppercase tracking-[0.25em] text-text-dim">Signal {index + 1}</div>
                        <div className="mt-2 font-display text-lg font-semibold text-text">{item}</div>
                      </div>
                      <div className="glow-dot" />
                    </motion.div>
                  </div>
                ))}

                <div className="tile-float" style={{ ["--float-delay" as any]: "720ms" }}>
                  <div className="premium-tile">
                    <div className="mb-3 text-xs uppercase tracking-[0.25em] text-text-dim">System feel</div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {["Readable", "Reactive", "Calm"].map((word) => (
                        <div key={word} className="rounded-[1.2rem] bg-surface px-4 py-4 text-center text-sm text-text">
                          {word}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
