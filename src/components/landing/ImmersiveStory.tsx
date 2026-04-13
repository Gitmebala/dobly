"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { CalendarClock, CreditCard, FileText, MessagesSquare, ShoppingBag, Users } from "lucide-react";

const sourceTiles = [
  { label: "Payments", icon: CreditCard },
  { label: "Messages", icon: MessagesSquare },
  { label: "Orders", icon: ShoppingBag },
  { label: "Schedules", icon: CalendarClock },
  { label: "Reports", icon: FileText },
  { label: "Team", icon: Users },
];

const destinationTiles = [
  {
    title: "Get paid, then follow up",
    copy: "Dobly thanks the customer, updates your records, and nudges your team instantly.",
  },
  {
    title: "Keep bookings moving",
    copy: "Dobly sends reminders, updates calendars, and makes sure no one misses the next step.",
  },
  {
    title: "Finish the day with clarity",
    copy: "Dobly turns the day’s activity into one clean update you can actually use.",
  },
];

export default function ImmersiveStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const smooth = useSpring(scrollYProgress, { stiffness: 70, damping: 20, mass: 0.3 });
  const stageRotateX = useTransform(smooth, [0, 1], [10, -8]);
  const stageRotateY = useTransform(smooth, [0, 1], [-10, 10]);
  const stageScale = useTransform(smooth, [0, 0.5, 1], [0.94, 1, 1.02]);
  const destinationOpacity = useTransform(smooth, [0.2, 0.55, 0.9], [0.2, 0.8, 1]);

  const topBaseY = [-20, 14, 42, 70, 98, 126];
  const endX = [28, 64, 102, 34, 74, 112];
  const endY = [218, 218, 218, 334, 334, 334];

  return (
    <section id="assembly" ref={ref} className="relative h-[185vh] py-10">
      <div className="sticky top-0 flex h-[88vh] items-center overflow-hidden">
        <div className="container-main">
          <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="max-w-xl">
              <div className="badge-green mb-5">See Dobly assemble the work</div>
              <h2 className="font-display text-4xl font-bold tracking-[-0.05em] text-text sm:text-6xl">
                Your business signals
                <span className="headline-gradient block">flow into ready-to-run automation.</span>
              </h2>
              <p className="mt-5 text-lg leading-8 text-text-muted">
                As you scroll, the inputs from the top move down and become real Dobly workflows.
                That is the feeling the site should deliver: smooth, useful, and alive.
              </p>
            </div>

            <div className="relative hidden h-[34rem] lg:block" style={{ perspective: "1800px" }}>
              <motion.div
                style={{ rotateX: stageRotateX, rotateY: stageRotateY, scale: stageScale }}
                className="absolute inset-0 rounded-[2.25rem] border border-border bg-surface/50 p-5 backdrop-blur-2xl"
              >
                <div className="absolute inset-x-10 top-16 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="absolute left-10 right-10 top-32 h-[1px] bg-gradient-to-r from-white/0 via-white/10 to-white/0" />

                <div className="absolute left-10 top-10 text-xs uppercase tracking-[0.3em] text-text-dim">
                  Incoming signals
                </div>
                <div className="absolute bottom-[9rem] left-10 text-xs uppercase tracking-[0.3em] text-text-dim">
                  Dobly workflows
                </div>

                {sourceTiles.map((tile, index) => {
                  const Icon = tile.icon;
                  const progressStart = 0.04 + index * 0.05;
                  const progressMid = 0.36 + index * 0.03;
                  const progressEnd = 0.8 + index * 0.02;
                  const x = useTransform(smooth, [0, progressMid, progressEnd], [index * 82, endX[index] ?? 0, endX[index] ?? 0]);
                  const y = useTransform(smooth, [0, progressMid, progressEnd], [topBaseY[index] ?? 0, endY[index] ?? 0, endY[index] ?? 0]);
                  const scale = useTransform(smooth, [progressStart, progressMid, progressEnd], [1, 0.94, 0.9]);
                  const opacity = useTransform(smooth, [0, progressMid, progressEnd], [1, 1, 0.82]);

                  return (
                    <motion.div
                      key={tile.label}
                      style={{ x, y, scale, opacity }}
                      className="absolute left-10 top-16 w-[7.4rem] rounded-[1.25rem] border border-border bg-surface px-3 py-3 shadow-[0_16px_40px_rgba(5,7,12,0.18)]"
                    >
                      <div className="mb-3 inline-flex rounded-[0.9rem] bg-accent-dim px-3 py-3 text-accent">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-sm font-semibold text-text">{tile.label}</div>
                    </motion.div>
                  );
                })}

                <motion.div style={{ opacity: destinationOpacity }} className="absolute inset-x-10 bottom-8 grid gap-3">
                  {destinationTiles.map((tile, index) => (
                    <div
                      key={tile.title}
                      className="tile-float"
                      style={{ ["--float-delay" as any]: `${index * 180}ms` }}
                    >
                      <div className="premium-tile min-h-[7.8rem]">
                        <div className="font-display text-xl font-semibold text-text">{tile.title}</div>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">{tile.copy}</p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <motion.div
                            initial={{ width: "0%" }}
                            whileInView={{ width: `${82 - index * 12}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, delay: 0.1 * index }}
                            className="h-full rounded-full bg-gradient-to-r from-accent to-cyan-200"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
