"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react";
import CinematicBackdrop from "@/components/CinematicBackdrop";
import { createClient } from "@/lib/supabase/client";
import { PLANS, type PlanId } from "@/types";

const faqs = [
  {
    question: "Do I need a card to start?",
    answer: "No. The free plan stays card-free, so people can experience the workflow generator before committing.",
  },
  {
    question: "Can I switch plans later?",
    answer: "Yes. Upgrade when you need more workflow generation capacity or more operational headroom.",
  },
  {
    question: "Is billing friendly for East Africa too?",
    answer: "Yes. Dobly is designed to stay practical globally, with regional pricing paths where they make sense.",
  },
  {
    question: "What happens after I generate a workflow?",
    answer: "You can review, edit, and launch it. Dobly keeps the system visible so it remains understandable after it goes live.",
  },
];

type AutomationStage = "exploring" | "building" | "scaling";

const stageConfig: Record<
  AutomationStage,
  {
    label: string;
    title: string;
    description: string;
    recommendedPlan: PlanId;
  }
> = {
  exploring: {
    label: "Exploring",
    title: "Trying automation for the first time",
    description: "You want to feel the product first and learn by seeing one real workflow run.",
    recommendedPlan: "free",
  },
  building: {
    label: "Building",
    title: "You have some automations running",
    description: "You want enough capacity to make Dobly part of your weekly operations.",
    recommendedPlan: "pro",
  },
  scaling: {
    label: "Scaling",
    title: "Automation is central to how you operate",
    description: "You need team-level headroom, client workspaces, and room to expand without friction.",
    recommendedPlan: "agency",
  },
};

const orderedPlans: PlanId[] = ["agency", "pro", "starter", "free"];

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [stage, setStage] = useState<AutomationStage>("building");
  const [banner, setBanner] = useState<string>("");

  const activeStage = stageConfig[stage];
  const plans = orderedPlans
    .map((id) => PLANS.find((plan) => plan.id === id))
    .filter((plan): plan is NonNullable<typeof plan> => Boolean(plan));

  async function handleSelect(planId: PlanId) {
    if (planId === "free") {
      window.location.href = "/auth/signup";
      return;
    }

    setLoadingPlan(planId);
    setBanner("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/auth/signup?plan=${planId}`;
        return;
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const data = await response.json();
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
              Pricing
            </div>
            <h1 className="font-display text-5xl font-extrabold tracking-tight text-text sm:text-6xl">
              A better-feeling system should still be easy to buy.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-text-muted">
              Dobly is priced for people, operators, and modern teams who want automation that stays understandable as it grows.
            </p>
          </div>
        </section>

        <section className="mt-8 card">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Where are you with automation?</div>
              <h2 className="mt-2 font-display text-2xl font-semibold text-text">{activeStage.title}</h2>
              <p className="mt-3 text-sm leading-7 text-text-muted">{activeStage.description}</p>
            </div>

            <div>
              <div className="relative">
                <div className="absolute left-0 right-0 top-5 h-px bg-[rgba(79,70,229,0.14)]" />
                <div className="relative grid gap-3 sm:grid-cols-3">
                  {(Object.entries(stageConfig) as Array<[AutomationStage, (typeof stageConfig)[AutomationStage]]>).map(
                    ([key, value]) => {
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
                          <div className="mb-4 flex items-center gap-3">
                            <span
                              className={`h-3 w-3 rounded-full border ${
                                active ? "border-accent bg-accent shadow-[0_0_14px_rgba(79,70,229,0.28)]" : "border-text-dim bg-[var(--bg)]"
                              }`}
                            />
                            <span className={`font-display text-base font-semibold ${active ? "text-text" : "text-text-muted"}`}>
                              {value.label}
                            </span>
                          </div>
                          <div className="text-xs uppercase tracking-[0.22em] text-text-dim">
                            Recommended: {value.recommendedPlan === "free" ? "Free" : value.recommendedPlan}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {banner ? (
          <section className="mt-6 rounded-[1.2rem] border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {banner}
          </section>
        ) : null}

        <section className="mt-8 grid gap-5 lg:grid-cols-4">
          {plans.map((plan) => {
            const isLoading = loadingPlan === plan.id;
            const isRecommended = plan.id === activeStage.recommendedPlan;

            return (
              <div
                key={plan.id}
                className={`premium-tile flex flex-col ${
                  isRecommended
                    ? "border-accent/45 shadow-[0_26px_80px_rgba(79,70,229,0.18)] lg:-translate-y-2"
                    : ""
                }`}
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-text">{plan.name}</h2>
                    <p className="mt-2 text-sm text-text-muted">
                      {plan.max_workflows === -1
                        ? "Unlimited active workflows"
                        : `${plan.max_workflows} active workflows`}
                    </p>
                  </div>
                  {isRecommended ? (
                    <span className="badge-green">Best for {activeStage.label}</span>
                  ) : plan.badge ? (
                    <span className="badge-green">{plan.badge}</span>
                  ) : null}
                </div>

                <div className="mb-6">
                  {plan.id === "free" ? (
                    <div className="font-display text-4xl font-bold text-text">Free</div>
                  ) : plan.price_kes ? (
                    <div className="font-display text-4xl font-bold text-text">
                      KES {plan.price_kes.toLocaleString()}
                      <span className="ml-1 text-base font-medium text-text-muted">/mo</span>
                    </div>
                  ) : (
                    <div className="font-display text-4xl font-bold text-text">
                      ${plan.price_usd}
                      <span className="ml-1 text-base font-medium text-text-muted">/mo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 rounded-[1rem] bg-surface px-3 py-3">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                      <span className="text-sm leading-6 text-text-muted">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleSelect(plan.id as PlanId)}
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
              <summary className="list-none font-display text-lg font-semibold text-text">
                {faq.question}
              </summary>
              <p className="mt-3 text-sm leading-7 text-text-muted">{faq.answer}</p>
            </details>
          ))}
        </section>
      </div>
    </div>
  );
}
