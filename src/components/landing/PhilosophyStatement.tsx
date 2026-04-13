"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import GlassCard from "@/components/shared/GlassCard";

gsap.registerPlugin(ScrollTrigger);

const lines = ["The AI designs.", "The runtime operates."];

export default function PhilosophyStatement() {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-philosophy-word]",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.75,
          ease: "power3.out",
          stagger: 0.05,
          scrollTrigger: {
            trigger: root,
            start: "top 70%",
          },
        },
      );

      gsap.fromTo(
        "[data-philosophy-card]",
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.7,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: root,
            start: "top 70%",
          },
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative z-[1] py-40">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(0,255,135,0.03)_0%,transparent_70%)]" />
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        <div className="space-y-3 font-serif text-[40px] italic leading-[1.1] text-white sm:text-[52px] lg:text-[64px]">
          {lines.map((line) => (
            <div key={line}>
              {line.split(" ").map((word) => (
                <span key={word} data-philosophy-word className="mr-[0.28em] inline-block">
                  {word}
                </span>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-10 h-px w-[120px] bg-[rgba(0,255,135,0.3)]" />

        <div className="mt-12 grid w-full gap-6 md:grid-cols-2">
          <GlassCard data-philosophy-card className="card-hover text-left">
            <div className="font-display text-2xl font-semibold text-white">AI Planner</div>
            <p className="mt-4 text-[15px] leading-8 text-[var(--text-secondary)]">
              Interprets intent, designs the workflow, identifies tools, and maps risk before
              anything goes live.
            </p>
          </GlassCard>
          <GlassCard data-philosophy-card className="card-hover text-left">
            <div className="font-display text-2xl font-semibold text-white">Runtime</div>
            <p className="mt-4 text-[15px] leading-8 text-[var(--text-secondary)]">
              Executes deterministically, retries failures, logs everything, manages approvals, and
              stays alive.
            </p>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
