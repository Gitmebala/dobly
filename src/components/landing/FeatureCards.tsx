import { Brain, Cpu, MessageSquareText } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";

const cards = [
  {
    icon: Brain,
    eyebrow: "The AI Brain",
    title: "Understands what you mean",
    body: "Dobly reads your request, maps intent to tooling, identifies risks, and handles edge cases before a single line runs.",
    detail: "Powered by intent modeling - not prompt chaining",
  },
  {
    icon: Cpu,
    eyebrow: "The Runtime",
    title: "Runs reliably. Forever.",
    body: "A deterministic execution engine that wakes, runs, retries, logs, and keeps your workflow alive through failures, timeouts, and rate limits.",
    detail: "Zero manual babysitting required",
  },
  {
    icon: MessageSquareText,
    eyebrow: "Plain-English Failures",
    title: "When something breaks, you understand why",
    body: "No cryptic error codes. Dobly explains failures in plain English, tells you what went wrong, and asks if you want to retry.",
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
