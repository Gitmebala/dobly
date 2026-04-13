import Link from "next/link";
import GlassCard from "@/components/shared/GlassCard";

const tiers = [
  {
    title: "Standard Execution",
    price: "$4 / 1,000 runs",
    body: "Deterministic automation. No AI involvement at runtime. Fast, reliable, predictable.",
    points: [
      "Unlimited workflow creation",
      "All integrations included",
      "Retry logic and failure logs",
      "Plain-English status updates",
      "Approval flows",
    ],
    featured: false,
  },
  {
    title: "Intelligence Execution",
    price: "$6 / 100 intelligence calls",
    body: "When Dobly needs to make a judgment call mid-run - classify, decide, summarize - this is what runs.",
    points: [
      "Everything in Standard",
      "AI decision steps in workflow",
      "Dynamic branching based on content",
      "Smart retry decisions",
      "Contextual failure explanations",
    ],
    featured: true,
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="relative z-[1] py-28">
      <div className="mx-auto w-full max-w-[1200px] px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-[48px] font-bold tracking-[-0.04em] text-white">
          Simple pricing. Fair by design.
        </h2>
        <p className="mx-auto mt-4 max-w-[720px] text-[16px] leading-8 text-[var(--text-secondary)]">
          Most workflows never touch AI mid-run. You pay for what actually happens.
        </p>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {tiers.map((tier) => (
            <GlassCard
              key={tier.title}
              className={`card-hover text-left ${
                tier.featured
                  ? "scale-[1.02] border-[rgba(0,255,135,0.25)] shadow-[0_0_60px_rgba(0,255,135,0.06)]"
                  : ""
              }`}
              data-tilt
            >
              {tier.featured ? (
                <div className="absolute right-6 top-6 rounded-full bg-[var(--green-dim)] px-3 py-1 text-[11px] text-[var(--green)]">
                  For complex flows
                </div>
              ) : null}
              <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.35)]">
                {tier.title}
              </div>
              <div className="mt-5 font-display text-[40px] font-bold tracking-[-0.04em] text-white">
                {tier.price}
              </div>
              <p className="mt-4 text-[15px] leading-8 text-[var(--text-secondary)]">{tier.body}</p>

              <div className="mt-8 space-y-3">
                {tier.points.map((point) => (
                  <div key={point} className="flex items-center gap-3 text-[15px] text-[rgba(255,255,255,0.82)]">
                    <span className="text-[var(--green)]">+</span>
                    {point}
                  </div>
                ))}
              </div>

              <Link
                href="/auth/signup"
                className={`mt-8 inline-flex rounded-full px-5 py-3 text-sm transition-colors ${
                  tier.featured
                    ? "btn-primary bg-[var(--green)] text-[#08080e]"
                    : "btn-secondary border border-[var(--green)] text-[var(--green)] hover:bg-[var(--green)] hover:text-[#08080e]"
                }`}
                data-cursor="hover"
              >
                Start free
              </Link>

              {tier.featured ? (
                <div className="mt-5 text-[13px] text-[rgba(255,255,255,0.35)]">
                  Intelligence calls are rare. Most workflows never need them.
                </div>
              ) : null}
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
