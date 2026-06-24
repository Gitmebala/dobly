"use client";

import { motion } from "framer-motion";
import { SignalMark } from "@/components/BrandLogo";

export default function DoblyLoader({
  label = "Preparing the workspace",
  fullScreen = true,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  const wrapperClass = fullScreen
    ? "fixed inset-0 z-[95] flex flex-col items-center justify-center gap-6 bg-[linear-gradient(180deg,#f8f2ea_0%,#f1e5d6_100%)]"
    : "flex flex-col items-center justify-center gap-6 py-16";

  return (
    <div className={wrapperClass}>
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{ scale: [0.95, 1.08, 0.95], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(196,80,26,0.28),transparent_70%)]"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute h-20 w-20 rounded-full border border-[rgba(196,80,26,0.16)] border-t-[rgba(196,80,26,0.72)]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "linear" }}
          className="absolute h-14 w-14 rounded-full border border-[rgba(26,15,8,0.08)] border-b-[rgba(245,237,228,0.92)]"
        />
        <SignalMark className="h-10 w-10" animated />
      </div>

      <div className="text-center">
        <div className="text-xl font-semibold tracking-[-0.04em] text-[#1A0F08]">Dobly</div>
        <div className="mt-2 text-sm text-[rgba(26,15,8,0.62)]">{label}</div>
      </div>

      <div className="flex items-center gap-2">
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            animate={{ y: [0, -8, 0], opacity: [0.28, 1, 0.28], scale: [0.92, 1.08, 0.92] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: dot * 0.12, ease: "easeInOut" }}
            className="h-2.5 w-2.5 rounded-full bg-[#C4501A] shadow-[0_0_14px_rgba(196,80,26,0.35)]"
          />
        ))}
      </div>
    </div>
  );
}
