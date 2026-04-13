"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Play, Sparkles } from "lucide-react";
import DoblyMascot from "@/components/landing/DoblyMascot";

const proof = [
  "Create automations from one sentence",
  "Edit before launch",
  "Runs with full visibility",
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-32 sm:pt-40">
      <DoblyMascot />

      <div className="container-main relative">
        <div className="max-w-3xl">
          <div className="badge-green mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Dobly builds automations you can actually use
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="font-display text-5xl font-extrabold leading-[0.9] tracking-[-0.06em] text-text sm:text-7xl lg:text-[6.4rem]"
          >
            Tell Dobly what to do.
            <span className="headline-gradient block">Watch it become your workflow.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.08, ease: "easeOut" }}
            className="mt-6 max-w-2xl text-lg leading-8 text-text-muted sm:text-xl"
          >
            From payments and reminders to reports and follow-ups, Dobly turns one plain-English
            request into a live automation system.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.14, ease: "easeOut" }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="/auth/signup" className="btn-primary px-7 py-3.5 text-base">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#assembly" className="btn-secondary px-7 py-3.5 text-base">
              <Play className="h-4 w-4" />
              See it move
            </Link>
          </motion.div>

          <div className="mt-10 flex flex-wrap gap-3">
            {proof.map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.22 + index * 0.08 }}
                className="badge-muted"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                {item}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.26 }}
            className="mt-12 max-w-3xl rounded-[2rem] border border-border bg-surface/60 p-4 backdrop-blur-2xl"
          >
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  title: "Get paid",
                  text: "Trigger a WhatsApp thank-you and update your records the moment payment lands.",
                },
                {
                  title: "Stay on time",
                  text: "Send reminders, team nudges, and follow-ups without chasing them manually.",
                },
                {
                  title: "See everything",
                  text: "Every run stays visible, editable, and easy to trust.",
                },
              ].map((card, index) => (
                <div
                  key={card.title}
                  className="tile-float"
                  style={{ ["--float-delay" as any]: `${index * 180}ms` }}
                >
                  <div className="premium-tile min-h-[170px]">
                    <div className="font-display text-2xl font-semibold text-text">{card.title}</div>
                    <p className="mt-3 text-sm leading-7 text-text-muted">{card.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
