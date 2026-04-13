"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function HorizontalStory() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const actOneRef = useRef<HTMLDivElement | null>(null);
  const actTwoRef = useRef<HTMLDivElement | null>(null);
  const actThreeRef = useRef<HTMLDivElement | null>(null);
  const sceneOneRef = useRef<HTMLDivElement | null>(null);
  const sceneTwoRef = useRef<HTMLDivElement | null>(null);
  const sceneThreeRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const connectorRefs = useRef<Array<HTMLDivElement | null>>([]);
  const logRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      const connectors = connectorRefs.current.filter((value): value is HTMLDivElement => Boolean(value));
      const logs = logRefs.current.filter((value): value is HTMLDivElement => Boolean(value));

      gsap.set([actTwoRef.current, actThreeRef.current, sceneTwoRef.current, sceneThreeRef.current], {
        opacity: 0,
        y: 24,
        pointerEvents: "none",
      });
      gsap.set(lineRef.current, { scaleX: 0, transformOrigin: "left center" });
      gsap.set(connectors, { opacity: 0, x: -24 });
      gsap.set(logs, { opacity: 0, y: 16 });

      const timeline = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      });

      timeline
        .to(actOneRef.current, { opacity: 0.28, y: -18, duration: 1.1 }, 0.18)
        .to(sceneOneRef.current, { opacity: 0.08, y: -20, duration: 1.1 }, 0.2)
        .to(actTwoRef.current, { opacity: 1, y: 0, pointerEvents: "auto", duration: 1 }, 0.42)
        .to(sceneTwoRef.current, { opacity: 1, y: 0, pointerEvents: "auto", duration: 1 }, 0.46)
        .to(lineRef.current, { scaleX: 1, duration: 0.7 }, 0.62)
        .to(connectors, { opacity: 1, x: 0, stagger: 0.08, duration: 0.5 }, 0.6)
        .to(actTwoRef.current, { opacity: 0.22, y: -18, duration: 0.9 }, 1.5)
        .to(sceneTwoRef.current, { opacity: 0.08, y: -20, duration: 0.9 }, 1.54)
        .to(actThreeRef.current, { opacity: 1, y: 0, pointerEvents: "auto", duration: 0.9 }, 1.8)
        .to(sceneThreeRef.current, { opacity: 1, y: 0, pointerEvents: "auto", duration: 0.9 }, 1.84)
        .to(logs, { opacity: 1, y: 0, stagger: 0.12, duration: 0.45 }, 2);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="product" className="relative min-h-[260vh]">
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden py-24">
        <div className="container-main grid gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div className="max-w-[520px]">
            <div className="badge-muted mb-4">How it works</div>
            <h2 className="font-display text-[clamp(34px,5vw,58px)] font-bold leading-[0.94] tracking-[-0.05em]">
              Quiet systems start with one plain-English sentence.
            </h2>
            <p className="mt-5 text-base leading-8 text-[var(--text-muted)]">
              You don&apos;t build the flow by hand. You pull the system into place by scrolling through how Dobly interprets, understands, and starts running the work.
            </p>

            <div className="mt-10 space-y-4">
              <div ref={actOneRef} className="story-stage-card rounded-[1.4rem] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-5 backdrop-blur-2xl">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">Act 1</div>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">You describe it.</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                  A normal sentence. Human words. No builder. No flowchart. No setup burden.
                </p>
              </div>
              <div ref={actTwoRef} className="story-stage-card rounded-[1.4rem] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-5 backdrop-blur-2xl">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">Act 2</div>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">Dobly understands it.</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                  The planner resolves the tools, draws the logic path, and turns intent into a working shape.
                </p>
              </div>
              <div ref={actThreeRef} className="story-stage-card rounded-[1.4rem] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-5 backdrop-blur-2xl">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">Act 3</div>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">Then it runs.</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                  The runtime wakes on events, logs each step, and keeps the work moving even when nobody is looking.
                </p>
              </div>
            </div>
          </div>

          <div className="relative min-h-[520px]">
            <div ref={sceneOneRef} className="absolute inset-0 rounded-[2rem] border border-[var(--border)] bg-[rgba(19,18,40,0.72)] p-6 backdrop-blur-3xl noise-indigo">
              <div className="mb-4 text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">Describe</div>
              <div className="rounded-[1.4rem] border border-[rgba(79,70,229,0.18)] bg-[rgba(255,255,255,0.03)] px-5 py-5 shadow-[0_0_0_1px_rgba(79,70,229,0.08)]">
                <div className="mb-3 flex items-center gap-2 text-xs text-[var(--text-dim)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  Plain-English request
                </div>
                <p className="font-mono text-[15px] leading-8 text-[var(--text)]">
                  Every Sunday at 7pm, send me next week&apos;s calendar, unpaid bills, and top priorities
                  <span className="ml-1 inline-block h-5 w-[10px] animate-pulse bg-[var(--accent)] align-middle" />
                </p>
              </div>
            </div>

            <div ref={sceneTwoRef} className="absolute inset-0 rounded-[2rem] border border-[var(--border)] bg-[rgba(19,18,40,0.72)] p-6 backdrop-blur-3xl noise-indigo">
              <div className="mb-4 text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">Understand</div>
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
                {["Calendar", "Email", "Tasks"].map((connector, index) => (
                  <div key={connector} className="contents">
                    <div
                      ref={(node) => {
                        connectorRefs.current[index] = node;
                      }}
                      className="rounded-[1.2rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-6 text-center"
                    >
                      <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[var(--text-dim)]">Connector</div>
                      <div className="font-display text-xl font-bold tracking-[-0.03em] text-[var(--text)]">{connector}</div>
                    </div>
                    {index < 2 ? (
                      <div className="hidden px-2 md:block">
                        <div ref={index === 0 ? lineRef : undefined} className="h-px w-14 bg-[var(--accent)]" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div ref={sceneThreeRef} className="absolute inset-0 rounded-[2rem] border border-[var(--border)] bg-[rgba(19,18,40,0.72)] p-6 backdrop-blur-3xl noise-indigo">
              <div className="mb-5 flex items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(20,168,151,0.22)] bg-[rgba(20,168,151,0.14)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--green)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--green)]" />
                  Active
                </span>
              </div>
              <div className="space-y-3">
                {[
                  "Calendar summary prepared - 2s ago",
                  "Priority list delivered - 1s ago",
                  "Next week briefing sent - just now",
                ].map((line, index) => (
                  <div
                    key={line}
                    ref={(node) => {
                      logRefs.current[index] = node;
                    }}
                    className="rounded-[1rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm text-[var(--text-muted)]"
                  >
                    {line}
                  </div>
                ))}
              </div>
              <div className="mt-6 text-xs uppercase tracking-[0.22em] text-[var(--text-dim)]">Live run history</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
