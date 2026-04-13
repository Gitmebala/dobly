"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import GlassCard from "@/components/shared/GlassCard";

gsap.registerPlugin(ScrollTrigger);

const storyTiles = [
  {
    id: "01",
    align: "left",
    eyebrow: "Step 1 - Describe",
    title: "Just say what should happen.",
    body: "No flow diagrams. No trigger menus. No JSON. You write a sentence. Dobly reads the intent.",
    visual: (
      <div className="space-y-3">
        <div className="rounded-[1rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4 font-mono text-sm text-[rgba(255,255,255,0.76)]">
          <span className="text-[var(--accent)]">&gt;</span> When someone books a call...
        </div>
        <div className="h-[120px] rounded-[1rem] border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]" />
      </div>
    ),
  },
  {
    id: "02",
    align: "right",
    eyebrow: "Step 2 - Connect",
    title: "Connect the tools you already have.",
    body: "Dobly tells you exactly which accounts it needs. You click connect. That is the entire setup.",
    visual: (
      <div className="grid gap-3 sm:grid-cols-2">
        {["Google", "Slack", "Shopify", "WhatsApp"].map((item) => (
          <div
            key={item}
            className="rounded-[1rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm text-white"
          >
            <div className="flex items-center justify-between">
              <span>{item}</span>
              <span className="h-2 w-2 rounded-full bg-[var(--green)]" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "03",
    align: "left",
    eyebrow: "Step 3 - Compile",
    title: "The AI builds the workflow.",
    body: "Dobly maps the intent to a deterministic system. Every step, every condition, every retry - handled.",
    visual: (
      <div className="story-spec space-y-3 font-mono text-sm">
        {[
          "trigger: booking.created",
          "step_1: gmail.send_confirmation",
          "step_2: calendar.create_event",
          "step_3: slack.notify_team",
        ].map((line) => (
          <div
            key={line}
            className="rounded-r-xl border-l-2 border-[var(--accent)] bg-[rgba(79,70,229,0.08)] px-4 py-3 text-[rgba(255,255,255,0.78)]"
          >
            {line}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "04",
    align: "right",
    eyebrow: "Step 4 - Live",
    title: "It runs. Forever.",
    body: "The runtime takes over. It wakes up, executes, logs, retries failures, and keeps working even when you are not watching.",
    visual: (
      <div className="rounded-[1rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-6 text-center">
        <div className="font-display text-5xl font-bold text-[var(--green)]">10,284</div>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[rgba(255,255,255,0.35)]">
          live runs
        </div>
        <div className="mt-4 text-sm text-[rgba(255,255,255,0.6)]">0 failures · 47h saved</div>
      </div>
    ),
  },
];

export default function StorySection() {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-story-tile]").forEach((tile) => {
        const direction = tile.dataset.direction === "left" ? -60 : 60;
        gsap.fromTo(
          tile,
          { x: direction, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: tile,
              start: "top 75%",
            },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>(".story-mosaic-tile").forEach((tile) => {
        ScrollTrigger.create({
          trigger: tile,
          start: "top 80%",
          onEnter: () => tile.classList.add("is-visible"),
          onEnterBack: () => tile.classList.add("is-visible"),
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section className="relative z-[1] py-28" ref={rootRef}>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 sm:px-6 lg:px-8">
        {storyTiles.map((tile) => {
          const mosaicClass =
            tile.id === "01"
              ? "story-mosaic-a"
              : tile.id === "02"
                ? "story-mosaic-b"
                : tile.id === "03"
                  ? "story-mosaic-c"
                  : "story-mosaic-d";

          return (
            <div
              key={tile.id}
              data-story-tile
              data-direction={tile.align}
              className={`grid gap-8 lg:grid-cols-2 lg:items-center ${
                tile.align === "right" ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div>
                <div className="font-mono text-[12px] uppercase tracking-[0.22em] text-[var(--accent)]">
                  {tile.eyebrow}
                </div>
                <h2 className="mt-4 font-display text-[40px] font-bold tracking-[-0.04em] text-white">
                  {tile.title}
                </h2>
                <p className="mt-4 max-w-[560px] text-[16px] leading-[1.8] text-[var(--text-secondary)]">
                  {tile.body}
                </p>
              </div>
              <GlassCard className={`story-mosaic-tile ${mosaicClass} p-6`}>{tile.visual}</GlassCard>
            </div>
          );
        })}
      </div>
    </section>
  );
}
