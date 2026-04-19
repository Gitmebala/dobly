"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BrandLogo, { SignalMark } from "@/components/BrandLogo";
import HorizontalStory from "@/components/marketing/HorizontalStory";
import ParticleField from "@/components/marketing/ParticleField";
import { BRAND } from "@/lib/brand";

gsap.registerPlugin(ScrollTrigger);

const featureCards = [
  {
    title: "Plain English in",
    body: "Describe the outcome in one sentence. Dobly starts from intent instead of asking you to think like an integrator.",
    label: "Operator-first",
    icon: "cursor",
  },
  {
    title: "Connect once",
    body: "Dobly tells you which tools are missing, and only asks for the business accounts the workflow actually needs.",
    label: "No setup burden",
    icon: "nodes",
  },
  {
    title: "Runs forever",
    body: "The runtime wakes, executes, retries, logs, and keeps the system alive quietly in the background.",
    label: "Deterministic runtime",
    icon: "signal",
  },
  {
    title: "Trust built in",
    body: "Failures are explained in human language, with clear next steps instead of cryptic codes or broken runs left hanging.",
    label: "Honest by default",
    icon: "shield",
  },
  {
    title: "Approvals only when needed",
    body: "Dobly stays out of the way until a human should actually decide something, then it surfaces the choice cleanly.",
    label: "Control without micromanaging",
    icon: "decision",
  },
  {
    title: "Clear cost model",
    body: "Most workflows are cheap deterministic execution. Intelligence is measured separately when Dobly truly has to think mid-run.",
    label: "Fair by design",
    icon: "meter",
  },
] as const;

const personas = [
  {
    title: "Busy individual",
    pain: "Bills, reminders, summaries, and follow-ups live in your head until something slips.",
    outcome: "Dobly keeps your personal admin moving before it becomes mental overhead.",
  },
  {
    title: "Salon owner",
    pain: "Appointments, reminders, and follow-up messages keep eating the hours between clients.",
    outcome: "Dobly confirms bookings, nudges late clients, and keeps the day moving.",
  },
  {
    title: "Store owner",
    pain: "Orders, payment confirmations, inventory updates, and customer messages pile up fast.",
    outcome: "Dobly reacts to payments and orders the moment they happen.",
  },
  {
    title: "Freelancer",
    pain: "Leads, proposals, invoices, onboarding, and reminders turn every week into admin.",
    outcome: "Dobly keeps client operations running while you do the actual work.",
  },
  {
    title: "Small agency",
    pain: "Each client brings the same reporting, notifications, handoffs, and status checks.",
    outcome: "Dobly turns repeatable client ops into systems the team can trust.",
  },
] as const;

const trustFeed = [
  "Weekly planning summary delivered",
  "Order confirmation sent",
  "Invoice reminder triggered",
  "Calendar briefing delivered",
  "Client onboarding email sent",
  "Inventory alert triggered",
  "Follow-up message sent",
] as const;

const pricingCards = [
  {
    name: "Starter",
    price: "KES 999",
    meta: "20 workflows",
    detail: "1,500 executions / month",
    href: "/auth/signup?plan=starter",
    featured: false,
    lines: ["Personal and business automations", "Approval alerts", "Plain-English status updates"],
  },
  {
    name: "Pro",
    price: "$19",
    meta: "100 workflows",
    detail: "8,000 executions / month",
    href: "/auth/signup?plan=pro",
    featured: true,
    lines: ["All integrations", "Webhook support", "Advanced workflow logic"],
  },
  {
    name: "Agency",
    price: "$49",
    meta: "Unlimited workflows",
    detail: "40,000 executions / month",
    href: "/auth/signup?plan=agency",
    featured: false,
    lines: ["Client workspaces", "White-label surface", "Team collaboration"],
  },
] as const;

function FeatureIcon({ type }: { type: (typeof featureCards)[number]["icon"] }) {
  const common = "h-7 w-7 text-[var(--accent)]";

  if (type === "cursor") {
    return (
      <svg viewBox="0 0 28 28" fill="none" className={common} aria-hidden="true">
        <path d="M8 6V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12.5 8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="8" cy="24" r="2" fill="var(--accent-2)" />
      </svg>
    );
  }

  if (type === "nodes") {
    return (
      <svg viewBox="0 0 28 28" fill="none" className={common} aria-hidden="true">
        <rect x="3" y="10" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="17" y="4" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="17" y="16" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M11 14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="21" cy="8" r="2" fill="var(--accent-2)" />
      </svg>
    );
  }

  if (type === "signal") {
    return <SignalMark className={common} />;
  }

  if (type === "shield") {
    return (
      <svg viewBox="0 0 28 28" fill="none" className={common} aria-hidden="true">
        <path d="M14 4L22 7V13.8C22 18.9 18.6 23.5 14 24.8C9.4 23.5 6 18.9 6 13.8V7L14 4Z" stroke="currentColor" strokeWidth="2" />
        <path d="M11 14.5L13.3 16.8L17.8 11.8" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "decision") {
    return (
      <svg viewBox="0 0 28 28" fill="none" className={common} aria-hidden="true">
        <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="20" cy="20" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M10.8 10.8L17.2 17.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="8" r="2.2" fill="var(--accent-2)" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 28 28" fill="none" className={common} aria-hidden="true">
      <path d="M6 20L10.5 15.5L13.5 18.5L22 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 15V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="8" r="2.2" fill="var(--accent-2)" />
    </svg>
  );
}

function FeedWindow({ index }: { index: number }) {
  const windowItems = useMemo(
    () =>
      Array.from({ length: 4 }, (_, offset) => trustFeed[(index + offset) % trustFeed.length] ?? trustFeed[0]),
    [index],
  );

  return (
    <div className="space-y-3">
      {windowItems.map((item, itemIndex) => (
        <div
          key={`${item}-${itemIndex}`}
          className="rounded-[1.2rem] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm text-[var(--text-muted)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-3">
            <span>{item}</span>
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-dim)]">
              {itemIndex === 0 ? "just now" : `${itemIndex + 1}s ago`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePageExperience() {
  const reduceMotion = useReducedMotion();
  const [navSolid, setNavSolid] = useState(false);
  const [feedIndex, setFeedIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroMarkRef = useRef<HTMLDivElement | null>(null);
  const heroHeadlineRef = useRef<HTMLHeadingElement | null>(null);
  const heroSubRef = useRef<HTMLParagraphElement | null>(null);
  const heroCtaRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const personaSectionRef = useRef<HTMLElement | null>(null);
  const personaViewportRef = useRef<HTMLDivElement | null>(null);
  const personaTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFeedIndex((value) => (value + 1) % trustFeed.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
        element.style.opacity = "1";
        element.style.transform = "none";
      });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(navRef.current?.querySelectorAll("[data-nav-item]") ?? [], { opacity: 0, y: 18 }, {
        opacity: 1,
        y: 0,
        duration: 0.72,
        stagger: 0.12,
        ease: "power3.out",
      });

      gsap.fromTo(heroMarkRef.current, { opacity: 0, y: 28, scale: 0.94 }, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.9,
        delay: 0.18,
        ease: "power3.out",
      });

      gsap.fromTo(heroHeadlineRef.current?.querySelectorAll("[data-hero-line]") ?? [], { opacity: 0, y: 42 }, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.12,
        delay: 0.42,
        ease: "power3.out",
      });

      gsap.fromTo(heroSubRef.current, { opacity: 0, y: 20 }, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: 0.86,
        ease: "power3.out",
      });

      gsap.fromTo(heroCtaRef.current?.children ?? [], { opacity: 0, y: 20 }, {
        opacity: 1,
        y: 0,
        duration: 0.72,
        stagger: 0.1,
        delay: 1.04,
        ease: "power3.out",
      });

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.fromTo(element, { opacity: 0, y: 24 }, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 84%",
          },
        });
      });

      if (window.innerWidth >= 1024 && personaSectionRef.current && personaViewportRef.current && personaTrackRef.current) {
        const distance = Math.max(0, personaTrackRef.current.scrollWidth - personaViewportRef.current.clientWidth);

        gsap.to(personaTrackRef.current, {
          x: -distance,
          ease: "none",
          scrollTrigger: {
            trigger: personaSectionRef.current,
            start: "top top",
            end: () => `+=${distance + window.innerHeight * 0.65}`,
            scrub: 1,
            pin: true,
          },
        });
      }
    }, rootRef);

    return () => ctx.revert();
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;

    const buttons = Array.from(document.querySelectorAll<HTMLElement>("[data-ripple]"));
    const cleanups = buttons.map((button) => {
      const handler = (event: Event) => {
        const mouseEvent = event as MouseEvent;
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement("span");

        ripple.style.position = "absolute";
        ripple.style.left = `${mouseEvent.clientX - rect.left}px`;
        ripple.style.top = `${mouseEvent.clientY - rect.top}px`;
        ripple.style.width = "12px";
        ripple.style.height = "12px";
        ripple.style.borderRadius = "999px";
        ripple.style.background = "rgba(79, 70, 229, 0.28)";
        ripple.style.transform = "translate(-50%, -50%) scale(1)";
        ripple.style.opacity = "1";
        ripple.style.pointerEvents = "none";
        ripple.style.transition = "transform 0.4s ease, opacity 0.4s ease";

        button.style.position = "relative";
        button.style.overflow = "hidden";
        button.appendChild(ripple);

        window.requestAnimationFrame(() => {
          ripple.style.transform = "translate(-50%, -50%) scale(14)";
          ripple.style.opacity = "0";
        });

        window.setTimeout(() => ripple.remove(), 420);
      };

      button.addEventListener("click", handler);
      return () => button.removeEventListener("click", handler);
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [reduceMotion]);

  return (
    <div ref={rootRef} className="landing-shell">
      <header
        ref={navRef}
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
          navSolid ? "border-b border-[rgba(255,255,255,0.06)] bg-[rgba(8,8,16,0.72)] backdrop-blur-2xl" : "bg-transparent"
        }`}
      >
        <div className="container-main flex h-20 items-center justify-between">
          <div data-nav-item>
            <BrandLogo markClassName="h-9 w-9" wordmarkClassName="text-[1.15rem]" />
          </div>
          <div data-nav-item>
            <Link href="/auth/signup" className="button-sheen btn-secondary rounded-full px-5 py-2.5 text-sm text-[var(--text)]" data-ripple>
              Get early access
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pt-32 pb-16 text-center">
          <div className="hero-bloom absolute left-1/2 top-[28%] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(196,154,42,0.18)_0%,rgba(196,154,42,0.08)_34%,transparent_70%)] blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_54%)]" />
          <div className="container-main relative z-10 flex flex-col items-center">
            <div ref={heroMarkRef} data-nav-item className="mb-8">
              <SignalMark animated className="h-[200px] w-[200px] text-[var(--accent)]" />
            </div>
            <h1 ref={heroHeadlineRef} className="max-w-[900px] font-display text-[clamp(3.7rem,8.5vw,7.5rem)] font-bold leading-[0.9] tracking-[-0.06em] text-[var(--text)]">
              <span data-hero-line className="block">
                Your business,
              </span>
              <span data-hero-line className="block">
                running<span className="text-[var(--accent-2)]">.</span>
              </span>
            </h1>
            <p ref={heroSubRef} className="mt-7 max-w-[640px] text-[18px] leading-8 text-[var(--text-muted)]">
              Describe what needs doing. Connect your tools. Dobly handles the rest, for work and life.
            </p>
            <div ref={heroCtaRef} className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/auth/signup" className="button-sheen btn-primary rounded-xl px-8 py-3.5 text-base" data-ripple>
                Start for free
              </Link>
              <button
                type="button"
                className="btn-ghost rounded-xl border border-[rgba(255,255,255,0.08)] px-8 py-3.5 text-base text-[var(--text-muted)]"
                onClick={() => document.getElementById("product")?.scrollIntoView({ behavior: "smooth" })}
                data-ripple
              >
                See how it works
              </button>
            </div>
            <div className="mt-16 font-display text-[clamp(3rem,7vw,5.4rem)] font-bold tracking-[-0.06em] text-[var(--text)]">
              {BRAND.slogan}
            </div>
            <div className="mt-2 text-sm italic text-[var(--text-muted)]">{BRAND.complementary}</div>
            <button
              type="button"
              onClick={() => document.getElementById("product")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-16 flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[var(--text-muted)] transition-transform duration-300 hover:translate-y-1"
              aria-label="Scroll to product story"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-[float_2s_ease-in-out_infinite]">
                <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </section>

        <HorizontalStory />

        <section className="page-section" data-reveal>
          <div className="container-main">
              <div className="mb-10 max-w-[760px]">
              <div className="badge-muted mb-4">Feature grid</div>
              <h2 className="font-display text-[clamp(2.1rem,4vw,3.6rem)] font-bold tracking-[-0.05em]">
                Built so repeat work disappears into the background.
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((card) => (
                <article key={card.title} className="card-hover noise min-h-[260px] p-7">
                  <div className="mb-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(196,154,42,0.22)] bg-[rgba(196,154,42,0.1)]">
                    <FeatureIcon type={card.icon} />
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-dim)]">{card.label}</div>
                  <h3 className="mt-3 font-display text-[1.55rem] font-bold tracking-[-0.04em] text-[var(--text)]">
                    {card.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section ref={personaSectionRef} className="relative page-section" data-reveal>
          <div className="container-main">
            <div className="mb-10 max-w-[760px]">
              <div className="badge-muted mb-4">Who it&apos;s for</div>
              <h2 className="font-display text-[clamp(2.1rem,4vw,3.6rem)] font-bold tracking-[-0.05em]">
                Built for people and operators, not system builders.
              </h2>
            </div>
          </div>
          <div ref={personaViewportRef} className="overflow-hidden">
            <div ref={personaTrackRef} className="flex gap-5 px-4 lg:w-max lg:px-[max(2rem,calc((100vw-1220px)/2+1rem))]">
              {personas.map((persona) => (
                <article
                  key={persona.title}
                  className="card-hover noise w-full min-w-0 flex-shrink-0 p-7 md:min-w-[32rem] lg:min-w-[36rem]"
                >
                  <div className="mb-8 flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-[var(--accent-2)] shadow-[0_0_18px_rgba(196,154,42,0.32)]" />
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">Persona</div>
                  </div>
                  <h3 className="font-display text-[2rem] font-bold tracking-[-0.05em] text-[var(--text)]">
                    {persona.title}
                  </h3>
                  <p className="mt-5 text-base leading-8 text-[var(--text-muted)]">{persona.pain}</p>
                  <div className="mt-8 rounded-[1.1rem] border border-[rgba(196,154,42,0.18)] bg-[rgba(196,154,42,0.08)] px-5 py-5">
                    <div className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">Dobly outcome</div>
                    <p className="mt-3 text-base leading-7 text-[var(--text)]">{persona.outcome}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="page-section bg-[rgba(13,12,28,0.75)]" data-reveal>
          <div className="container-main grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="card-hover noise p-7">
              <div className="mb-6 badge-muted">Live automation feed</div>
              <FeedWindow index={feedIndex} />
            </div>
            <div className="card-hover noise p-8">
              <div className="text-[3rem] leading-none text-[var(--accent-2)]">"</div>
              <blockquote className="mt-4 max-w-[24ch] font-display text-[clamp(1.6rem,3vw,2rem)] font-bold leading-[1.2] tracking-[-0.04em] text-[var(--text)]">
                Dobly feels like hiring a reliable operator, except it never forgets and never needs chasing.
              </blockquote>
              <div className="mt-8 text-sm leading-7 text-[var(--text-muted)]">
                Amina K. - Beauty studio owner
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="page-section" data-reveal>
          <div className="container-main">
            <div className="mb-10 max-w-[760px]">
              <div className="badge-muted mb-4">Pricing</div>
              <h2 className="font-display text-[clamp(2.1rem,4vw,3.6rem)] font-bold tracking-[-0.05em]">
                Simple pricing. Fair by design.
              </h2>
              <p className="mt-4 text-base leading-8 text-[var(--text-muted)]">
                Most workflows never need AI mid-run. You pay for what actually happens, not for complexity you were forced to configure.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {pricingCards.map((card) => (
                <article
                  key={card.name}
                  className={`card-hover noise flex min-h-[420px] flex-col justify-between p-7 ${
                    card.featured ? "scale-[1.02] border-[rgba(196,154,42,0.4)] shadow-[0_0_60px_rgba(196,154,42,0.2)]" : ""
                  }`}
                >
                  <div>
                    {card.featured ? (
                      <div className="mb-5 inline-flex rounded-full bg-[rgba(26,107,107,0.14)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
                        Recommended
                      </div>
                    ) : null}
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-dim)]">{card.name}</div>
                    <div className="mt-4 font-display text-[3.2rem] font-bold tracking-[-0.06em] text-[var(--text)]">
                      {card.price}
                      <span className="ml-2 text-sm font-body font-normal text-[var(--text-muted)]">/mo</span>
                    </div>
                    <div className="mt-4 text-sm text-[var(--text)]">{card.meta}</div>
                    <div className="mt-2 text-sm text-[var(--text-muted)]">{card.detail}</div>
                    <ul className="mt-8 space-y-3 text-sm text-[var(--text-muted)]">
                      {card.lines.map((line) => (
                        <li key={line} className="flex items-start gap-3">
                          <span className="mt-1 h-2 w-2 rounded-full bg-[var(--accent-2)]" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    href={card.href}
                    className={`mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                      card.featured
                        ? "button-sheen bg-[var(--accent)] text-white shadow-[0_18px_36px_rgba(26,107,107,0.24)]"
                        : "border border-[rgba(196,154,42,0.24)] bg-transparent text-[var(--text)] hover:bg-[rgba(196,154,42,0.08)]"
                    }`}
                    data-ripple
                  >
                    Start for free
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-28" data-reveal>
          <ParticleField density="compact" brighter className="absolute inset-0 opacity-70" />
          <div className="container-main relative z-10 text-center">
            <div className="mx-auto flex w-fit justify-center">
              <SignalMark animated className="h-36 w-36 text-[var(--accent)]" />
            </div>
            <h2 className="mt-8 font-display text-[clamp(2.4rem,5vw,4.4rem)] font-bold leading-[0.95] tracking-[-0.06em] text-[var(--text)]">
              Your business deserves
              <span className="block font-serif italic text-[var(--text)]">to run without you.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-[580px] text-base leading-8 text-[var(--text-muted)]">
              {BRAND.belief} {BRAND.slogan} {BRAND.complementary}
            </p>
            <div className="mt-10">
              <Link href="/auth/signup" className="button-sheen btn-primary rounded-xl px-8 py-3.5 text-base" data-ripple>
                Start for free
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[rgba(255,255,255,0.06)] py-10">
        <div className="container-main flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <BrandLogo markClassName="h-8 w-8" wordmarkClassName="text-lg" />
          <div className="text-sm text-[var(--text-muted)]">{BRAND.tagline}</div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-dim)]">&copy; 2026 dobly</div>
        </div>
      </footer>
    </div>
  );
}
