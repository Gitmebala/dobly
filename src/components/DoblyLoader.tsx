"use client";

import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";

export default function DoblyLoader({
  label = "Warming the runtime",
  fullScreen = true,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  const wrapperClass = fullScreen
    ? "fixed inset-0 z-[95] flex flex-col items-center justify-center gap-6 bg-[var(--bg)]"
    : "flex flex-col items-center justify-center gap-6 py-16";

  return (
    <div className={wrapperClass}>
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{ scale: [0.95, 1.08, 0.95], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(0,223,160,0.22),transparent_70%)]"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute h-20 w-20 rounded-full border border-[rgba(0,223,160,0.16)] border-t-[rgba(0,223,160,0.7)]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "linear" }}
          className="absolute h-14 w-14 rounded-full border border-[rgba(0,223,160,0.08)] border-b-[rgba(0,223,160,0.7)]"
        />
        <BrandLogo showWordmark={false} markClassName="h-10 w-10" />
      </div>

      <div className="text-center">
        <div className="font-display text-xl font-bold tracking-[-0.03em] text-text">Dobly</div>
        <div className="mt-2 text-sm text-text-muted">{label}</div>
      </div>

      <div className="flex items-center gap-2">
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            animate={{ y: [0, -8, 0], opacity: [0.28, 1, 0.28], scale: [0.92, 1.08, 0.92] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: dot * 0.12, ease: "easeInOut" }}
            className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_14px_rgba(0,223,160,0.35)]"
          />
        ))}
      </div>
    </div>
  );
}
