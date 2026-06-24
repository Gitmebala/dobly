import Link from "next/link";
import GlassCard from "@/components/shared/GlassCard";

const tiers = [
  {
    title: "Kenya Launch Execution",
    price: "KES-first",
    body: "Paystack, M-PESA, WhatsApp, local SMS, and guarded local voice before any expensive provider sprawl.",
    points: [
      "Unlimited workflow creation",
      "Paystack checkout and M-PESA paths",
      "WhatsApp and local SMS routes",
      "Retry logic and failure logs",
      "Plain-English status updates",
      "Approval flows",
    ],
    featured: false,
  },
  {
    title: "Research + Intelligence",
    price: "Capped by plan",
    body: "When Dobly needs to research, classify, decide, summarize, or write the next move, Anthropic does the heavy thinking with usage controls.",
    points: [
      "Everything in Kenya Launch",
      "AI decision steps in workflow",
      "Market and customer research",
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
          Kenya-first pricing. Fair by design.
        </h2>
        <p className="mx-auto mt-4 max-w-[720px] text-[16px] leading-8 text-[var(--text-secondary)]">
          Dobly can be wildly capable without wiring every provider on day one. You pay for the stack that actually ships: payments, messaging, voice, email, research, memory, and approvals.
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
                  Intelligence calls are capped by plan. Research-heavy workflows can upgrade before they burn margin.
                </div>
              ) : null}
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
