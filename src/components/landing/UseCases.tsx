"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  HeartHandshake,
  Hotel,
  Store,
} from "lucide-react";

const sectors = [
  {
    icon: Store,
    title: "Retail",
    summary: "Message customers, update stock, and alert the team after every sale.",
    inputs: ["Orders", "Payments", "Stock"],
    outputs: ["Thank-you message", "Inventory update", "Team alert"],
    quote: "It feels like I hired help.",
  },
  {
    icon: HeartHandshake,
    title: "Services",
    summary: "Take a lead from inquiry to booking to reminder automatically.",
    inputs: ["Leads", "Calendar", "Client details"],
    outputs: ["Auto reply", "Booking flow", "Reminder"],
    quote: "Clients feel taken care of.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Agencies",
    summary: "Keep onboarding, approvals, and delivery moving.",
    inputs: ["Requests", "Files", "Approvals"],
    outputs: ["Slack update", "Task created", "Delivery note"],
    quote: "Our handoffs stopped feeling messy.",
  },
  {
    icon: Building2,
    title: "Ops teams",
    summary: "Keep recurring work moving across sales, support, projects, and operations all day.",
    inputs: ["CRM events", "Support", "Reports"],
    outputs: ["Daily summary", "Escalation", "Team view"],
    quote: "Now we can see what is happening.",
  },
  {
    icon: Hotel,
    title: "Hospitality",
    summary: "Keep guest communication and team prompts on time.",
    inputs: ["Reservations", "Arrival time", "Guest notes"],
    outputs: ["Welcome message", "Staff prompt", "Follow-up"],
    quote: "Guests feel the difference.",
  },
  {
    icon: BookOpenText,
    title: "Founders",
    summary: "Let Dobly handle the repeat work so you can stay focused.",
    inputs: ["Forms", "Payments", "Content"],
    outputs: ["Auto tasks", "Follow-ups", "Summary"],
    quote: "I stop thinking about the boring stuff.",
  },
];

export default function UseCases() {
  const [active, setActive] = useState(0);
  const current = sectors[active] ?? sectors[0]!;
  const CurrentIcon = current.icon;

  return (
    <section id="motion-map" className="py-20">
      <div className="container-main">
        <div className="mb-14 max-w-3xl">
          <div className="badge-muted mb-4">Who Dobly helps</div>
          <h2 className="font-display text-4xl font-bold tracking-tight text-text sm:text-5xl">
            Built for real businesses.
          </h2>
          <p className="mt-5 text-lg leading-8 text-text-muted">
            Pick a business type and see what Dobly can take off your plate.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {sectors.map((sector, index) => {
              const Icon = sector.icon;
              const isActive = index === active;

              return (
                <div
                  key={sector.title}
                  className="tile-float"
                  style={{ ["--float-delay" as any]: `${index * 180}ms` }}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    className={`premium-tile text-left ${isActive ? "border-accent/40 shadow-[0_24px_64px_rgba(5,7,12,0.16)]" : ""}`}
                  >
                    <div className="mb-4 inline-flex rounded-2xl bg-surface px-3 py-3 text-accent">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="font-display text-lg font-semibold text-text">{sector.title}</div>
                    <p className="mt-2 text-sm leading-6 text-text-muted">{sector.summary}</p>
                  </button>
                </div>
              );
            })}
          </div>

          <motion.div
            key={current.title}
            initial={{ opacity: 0.55, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            className="clay-panel noise overflow-hidden p-6 sm:p-8"
          >
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="inline-flex rounded-[1.5rem] bg-accent px-4 py-4 text-surface">
                  <CurrentIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-text-dim">Featured use case</div>
                  <div className="mt-2 font-display text-2xl font-semibold text-text">{current.title}</div>
                </div>
              </div>
              <div className="badge-green">Dobly in action</div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="tile-float" style={{ ["--float-delay" as any]: "0ms" }}>
                <div className="premium-tile">
                  <div className="text-xs uppercase tracking-[0.25em] text-text-dim">What comes in</div>
                  <div className="mt-4 space-y-3">
                    {current.inputs.map((item) => (
                      <div key={item} className="rounded-[1rem] bg-surface px-4 py-3 text-sm text-text">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="tile-float" style={{ ["--float-delay" as any]: "180ms" }}>
                <div className="premium-tile">
                  <div className="text-xs uppercase tracking-[0.25em] text-text-dim">What Dobly does</div>
                  <div className="mt-4 rounded-[1.25rem] border border-border bg-surface px-4 py-5">
                    <div className="mb-3 font-display text-xl font-semibold text-text">The workflow</div>
                    <p className="text-sm leading-6 text-text-muted">{current.summary}</p>
                  </div>
                  <div className="mt-4 rounded-[1.25rem] border border-dashed border-accent/30 bg-accent-dim px-4 py-4 text-sm text-text">
                    Built to keep moving while the owner is offline.
                  </div>
                </div>
              </div>

              <div className="tile-float" style={{ ["--float-delay" as any]: "360ms" }}>
                <div className="premium-tile">
                  <div className="text-xs uppercase tracking-[0.25em] text-text-dim">What goes out</div>
                  <div className="mt-4 space-y-3">
                    {current.outputs.map((item) => (
                      <div key={item} className="rounded-[1rem] bg-surface px-4 py-3 text-sm text-text">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-border bg-surface/50 px-5 py-5">
              <div className="text-xs uppercase tracking-[0.25em] text-text-dim">Customer feeling</div>
              <p className="mt-3 max-w-2xl text-lg leading-8 text-text">"{current.quote}"</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
