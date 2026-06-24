"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react";
import CinematicBackdrop from "@/components/CinematicBackdrop";
import { DOBLY_PLANS, type DoblyPlanId } from "@/lib/billing/plans";

const faqs = [
  {
    question: "Why keep the launch stack this focused?",
    answer:
      "The Kenya-first launch spends where it creates product power: M-PESA and IntaSend for billing, local communications, connected customer accounts, and paid AI only when a task earns it. Other providers stay inactive until real customer work needs them.",
  },
  {
    question: "Can Dobly be ambitious and still budget-aware?",
    answer:
      "Yes. The product can feel like a full operating floor while usage is capped by plan. Heavy voice, SMS, WhatsApp, and AI usage moves into clear overages instead of being hidden inside fake unlimited plans.",
  },
  {
    question: "Do I need a card for Free Desk?",
    answer:
      "No. Free Desk is for exploring Homebase, memory, approvals, and the first worker without expensive live voice included.",
  },
  {
    question: "What happens if I hit my usage limit?",
    answer:
      "Dobly first switches nonessential work to affordable routes. It pauses costly activity at your hard limit and offers one activity-budget top-up instead of interrupting every coworker run.",
  },
];

type BusinessStage = "testing" | "starting" | "running" | "scaling";

const stageConfig: Record<
  BusinessStage,
  {
    label: string;
    title: string;
    description: string;
    recommendedPlan: DoblyPlanId;
  }
> = {
  testing: {
    label: "Testing",
    title: "I want to try Dobly first",
    description: "Explore the Homebase, business memory, work types, approvals, and a first department without paid commitment.",
    recommendedPlan: "free",
  },
  starting: {
    label: "Starting",
    title: "I need Dobly to start handling real work",
    description: "Launch the first departments with voice, SMS, chat, content, docs, and light operating workflows.",
    recommendedPlan: "starter",
  },
  running: {
    label: "Running",
    title: "I want a real business operating floor",
    description: "Use core departments, cross-media outputs, approvals, memory, and Boardroom Lite from one operating floor.",
    recommendedPlan: "operator",
  },
  scaling: {
    label: "Scaling",
    title: "I run a team, multiple workflows, or multiple Homebases",
    description: "Increase departments, seats, Homebases, outputs, approvals, reports, and strategy support.",
    recommendedPlan: "command",
  },
};

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [stage, setStage] = useState<BusinessStage>("running");
  const [banner, setBanner] = useState<string>("");
  const activeStage = stageConfig[stage];

  async function handleSelect(planId: DoblyPlanId) {
    if (planId === "free") {
      window.location.href = "/auth/signup?plan=free";
      return;
    }

    setLoadingPlan(planId);
    setBanner("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = `/auth/signup?plan=${planId}&next=${encodeURIComponent("/dashboard/billing")}`;
        return;
      }
      if (!response.ok || !data.url) {
        throw new Error(data?.error ?? "Dobly could not start checkout right now.");
      }
      window.location.href = data.url;
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Dobly could not start checkout right now.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="app-shell min-h-screen pb-20 pt-28">
      <CinematicBackdrop intensity="strong" className="fixed inset-0 -z-10" />
      <div className="ambient-mesh" />
      <div className="container-main relative">
        <Link href="/dashboard" className="btn-ghost mb-8 inline-flex">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <section className="clay-panel noise overflow-hidden px-6 py-10 sm:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="badge-green mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              Kenya-first pricing for a business operating system
            </div>
            <h1 className="font-display text-5xl font-extrabold tracking-tight text-text sm:text-6xl">
              Not a tiny MVP. A full operating floor with budget discipline.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-text-muted">
              Dobly combines departments, work types, research, voice, chat, automations, memory, approvals, and executive visibility. Checkout is Paystack-first, so M-PESA and international cards sit on one Kenya-ready launch path.
            </p>
          </div>
        </section>

        <section className="mt-8 card">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Which stage are you in?</div>
              <h2 className="mt-2 font-display text-2xl font-semibold text-text">{activeStage.title}</h2>
              <p className="mt-3 text-sm leading-7 text-text-muted">{activeStage.description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              {(Object.entries(stageConfig) as Array<[BusinessStage, (typeof stageConfig)[BusinessStage]]>).map(([key, value]) => {
                const active = stage === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStage(key)}
                    className={`interactive-ring rounded-[1.2rem] border px-4 py-4 text-left transition-all ${
                      active
                        ? "border-accent/45 bg-accent/10 shadow-[0_0_24px_rgba(79,70,229,0.12)]"
                        : "border-border bg-[rgba(19,18,40,0.76)] hover:border-accent/25"
                    }`}
                  >
                    <div className={`font-display text-base font-semibold ${active ? "text-text" : "text-text-muted"}`}>
                      {value.label}
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.18em] text-text-dim">
                      {DOBLY_PLANS.find((plan) => plan.id === value.recommendedPlan)?.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {banner ? (
          <section className="mt-6 rounded-[1.2rem] border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {banner}
          </section>
        ) : null}

        <section className="mt-8 grid gap-5 xl:grid-cols-4">
          {DOBLY_PLANS.map((plan) => {
            const isLoading = loadingPlan === plan.id;
            const isRecommended = plan.id === activeStage.recommendedPlan || plan.highlighted;

            return (
              <div
                key={plan.id}
                className={`premium-tile flex flex-col ${
                  isRecommended ? "border-accent/45 shadow-[0_26px_80px_rgba(79,70,229,0.18)] xl:-translate-y-2" : ""
                }`}
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-text">{plan.name}</h2>
                    <p className="mt-2 text-sm text-text-muted">{plan.tagline}</p>
                  </div>
                  {isRecommended ? <span className="badge-green">Recommended</span> : null}
                </div>

                <div className="mb-5">
                  {plan.monthlyPriceUsd === 0 ? (
                    <div className="font-display text-4xl font-bold text-text">Free</div>
                  ) : (
                    <div className="font-display text-4xl font-bold text-text">
                      KSh {plan.monthlyPriceKes.toLocaleString()}
                      <span className="ml-1 text-base font-medium text-text-muted">/mo</span>
                    </div>
                  )}
                  {plan.monthlyPriceUsd > 0 ? (
                    <div className="mt-1 text-xs text-text-dim">
                      KSh {plan.annualMonthlyPriceKes.toLocaleString()}/mo billed annually · M-Pesa and local checkout available
                    </div>
                  ) : null}
                </div>

                <div className="mb-5 rounded-[1rem] border border-border bg-surface px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-text-dim">Usage included</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-muted">
                    <span>{plan.entitlements.departments} departments</span>
                    <span>{plan.entitlements.workers} workers</span>
                    <span>{plan.entitlements.voiceMinutes} voice min</span>
                    <span>{plan.entitlements.smsMessages} SMS</span>
                    <span>{plan.entitlements.chatbotConversations} chats</span>
                    <span>{plan.entitlements.aiActions} AI actions</span>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  {plan.included.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 rounded-[1rem] bg-surface px-3 py-3">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                      <span className="text-sm leading-6 text-text-muted">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[1rem] border border-border bg-[rgba(255,255,255,0.025)] px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-text-dim">Overages</div>
                  <div className="mt-2 space-y-1">
                    {plan.overages.map((overage) => (
                      <div key={overage.label} className="flex justify-between gap-3 text-xs text-text-muted">
                        <span>{overage.label}</span>
                        <span>{overage.price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelect(plan.id)}
                  disabled={loadingPlan !== null}
                  className={`mt-6 ${isRecommended ? "btn-primary" : "btn-secondary"} justify-center`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Redirecting
                    </>
                  ) : plan.id === "free" ? (
                    "Start free"
                  ) : (
                    `Choose ${plan.name}`
                  )}
                </button>
              </div>
            );
          })}
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          {faqs.map((faq) => (
            <details key={faq.question} className="card group cursor-pointer">
              <summary className="list-none font-display text-lg font-semibold text-text">{faq.question}</summary>
              <p className="mt-3 text-sm leading-7 text-text-muted">{faq.answer}</p>
            </details>
          ))}
        </section>
      </div>
    </div>
  );
}
