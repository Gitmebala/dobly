"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { Check, MoveRight } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";

const trustSignals = ["No credit card", "Connects in 60s", "Runs forever"];

const statuses = [
  ["1", "New booking received", "triggered"],
  ["2", "Confirmation email sent", "completed"],
  ["3", "Calendar updated", "queued"],
] as const;

export default function HeroSection() {
  const router = useRouter();
  const [prompt, setPrompt] = useState(
    "When someone books a call, send a confirmation and add it to my calendar.",
  );

  const sectionRef = useRef<HTMLElement | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const bodyRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const tileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const tile = tileRef.current;
    if (!section || !tile || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        section,
        { opacity: 0, scale: 1.08 },
        { opacity: 1, scale: 1, duration: 1.4, ease: "power2.out" },
      );

      gsap.fromTo(
        "[data-hero-intro]",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.15,
          delay: 0.3,
        },
      );

      gsap.fromTo(
        tile,
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.9, ease: "power3.out", delay: 1.1 },
      );
    }, section);

    const handleMove = (event: MouseEvent) => {
      const rect = tile.getBoundingClientRect();
      const tiltX = ((event.clientX - rect.left) / rect.width - 0.5) * 12;
      const tiltY = ((event.clientY - rect.top) / rect.height - 0.5) * 12;

      gsap.to(tile, {
        rotateX: -tiltY,
        rotateY: tiltX,
        duration: 0.35,
        ease: "power2.out",
      });

      const cx = event.clientX / window.innerWidth - 0.5;
      const cy = event.clientY / window.innerHeight - 0.5;

      if (badgeRef.current) {
        gsap.to(badgeRef.current, { x: cx * -18, y: cy * -18, duration: 1.2, ease: "power2.out" });
      }
      if (titleRef.current) {
        gsap.to(titleRef.current, { x: cx * -28, y: cy * -28, duration: 1.2, ease: "power2.out" });
      }
      if (bodyRef.current) {
        gsap.to(bodyRef.current, { x: cx * -14, y: cy * -14, duration: 1.4, ease: "power2.out" });
      }
      if (ctaRef.current) {
        gsap.to(ctaRef.current, { x: cx * -8, y: cy * -8, duration: 1.6, ease: "power2.out" });
      }
    };

    const handleLeave = () => {
      gsap.to(tile, {
        rotateX: 4,
        rotateY: -8,
        duration: 0.6,
        ease: "power2.out",
      });

      [badgeRef.current, titleRef.current, bodyRef.current, ctaRef.current].forEach((element) => {
        if (element) {
          gsap.to(element, { x: 0, y: 0, duration: 0.8, ease: "power2.out" });
        }
      });
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
      ctx.revert();
    };
  }, []);

  const handleSubmit = () => {
    router.push(`/auth/signup?prompt=${encodeURIComponent(prompt.trim())}`);
  };

  return (
    <section
      ref={sectionRef}
      id="product"
      className="relative z-[1] flex min-h-screen items-center px-4 pb-20 pt-40 sm:px-6 lg:px-8"
    >
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 lg:grid-cols-[0.55fr_0.45fr]">
        <div className="flex flex-col justify-center">
          <div
            ref={badgeRef}
            data-hero-intro
            className="inline-flex w-fit items-center gap-3 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]"
          >
            <span className="pulse">+</span>
            AI Automation Operator
          </div>

          <h1
            ref={titleRef}
            data-hero-intro
            className="mt-5 font-display text-[48px] font-extrabold leading-[1.05] tracking-[-0.05em] text-white sm:text-[58px] lg:text-[72px]"
          >
            Describe the work.
            <span className="mt-2 block text-[rgba(255,255,255,0.72)]">We run it forever.</span>
          </h1>

          <p
            ref={bodyRef}
            data-hero-intro
            className="mt-6 max-w-[480px] text-[16px] leading-[1.7] text-[var(--text-secondary)]"
          >
            Dobly turns plain-English requests into automations that run quietly in the
            background. No triggers. No nodes. No setup burden. Just outcomes.
          </p>

          <div ref={ctaRef} data-hero-intro className="mt-8 max-w-[620px]">
            <div className="glass flex flex-col gap-3 rounded-[1rem] border border-white/10 p-3 sm:flex-row sm:items-center">
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[14px] text-white outline-none placeholder:text-[rgba(255,255,255,0.35)]"
                placeholder="When someone books a call, send a confirmation and add it to my calendar."
              />
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold text-[#08080e]"
              >
                Try it <MoveRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              {trustSignals.map((item) => (
                <div key={item} className="flex items-center gap-2 text-[12px] text-[rgba(255,255,255,0.35)]">
                  <Check className="h-3.5 w-3.5 text-[var(--green)]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden items-center justify-end md:flex">
          <GlassCard
            ref={tileRef}
            className="landing-float w-full max-w-[460px] p-6 shadow-[0_0_60px_rgba(79,70,229,0.08)]"
            style={{ transform: "perspective(1000px) rotateX(4deg) rotateY(-8deg)" }}
            data-tilt
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--green)] pulse" />
                <div className="text-sm text-white">Workflow Running</div>
              </div>
              <div className="rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-1 text-[12px] text-[var(--text-secondary)]">
                2 active
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {statuses.map(([id, label, state]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 rounded-[1rem] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] text-[12px] text-white">
                      {id}
                    </div>
                    <div className="text-sm text-[rgba(255,255,255,0.82)]">{label}</div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.08em] ${
                      state === "completed"
                        ? "bg-[var(--green-dim)] text-[var(--green)]"
                        : state === "triggered"
                          ? "bg-[rgba(255,255,255,0.08)] text-white"
                          : "bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {state}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 text-[12px] text-[rgba(255,255,255,0.4)]">
              Last run: 2 minutes ago · 847 runs total · 0 failures
            </div>
            <div className="mt-5 h-[2px] overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
              <div className="hero-tile-progress h-full w-1/2 rounded-full bg-[var(--accent)]" />
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
