import { Brain, Cpu, MessageSquareText } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";

const cards = [
  {
    icon: Brain,
    eyebrow: "The AI Brain",
    title: "Plans like a department lead",
    body: "Dobly breaks work into objectives, tools, dependencies, retries, and risk boundaries before the first action starts moving.",
    detail: "Powered by intent modeling and guarded orchestration",
  },
  {
    icon: Cpu,
    eyebrow: "The Runtime",
    title: "Runs like an infinite worker",
    body: "A persistent runtime that can keep multi-step work alive across tools, retries, queues, and handoffs even while you are offline.",
    detail: "Designed for long-running department workflows",
  },
  {
    icon: MessageSquareText,
    eyebrow: "Trust Layer",
    title: "Powerful everywhere except money",
    body: "Non-finance departments can act aggressively inside guardrails, while finance stays recommendation-only and approval-gated by design.",
    detail: "Trust layer built in, not bolted on",
  },
];

export default function FeatureCards() {
  return (
    <section className="relative z-[1] py-28">
      <div className="mx-auto grid w-full max-w-[1200px] gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        {cards.map(({ icon: Icon, eyebrow, title, body, detail }) => (
          <GlassCard
            key={title}
            className="card-hover group feature-card border-white/10 p-8 transition-all duration-300 hover:border-[rgba(0,255,135,0.2)] hover:shadow-[0_0_40px_rgba(0,255,135,0.04)]"
          >
            <div className="absolute left-0 top-8 h-6 w-[3px] rounded-full bg-[var(--green)]" />
            <Icon className="h-7 w-7 text-[var(--green)]" />
            <div className="mt-6 font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--green)]">
              {eyebrow}
            </div>
            <div className="mt-3 font-display text-[22px] font-semibold text-white">{title}</div>
            <p className="mt-4 text-[15px] leading-8 text-[var(--text-secondary)]">{body}</p>
            <div className="mt-6 text-[13px] text-[rgba(255,255,255,0.38)]">{detail}</div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
