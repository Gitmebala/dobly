"use client";

import { motion } from "framer-motion";

export default function DoblyMascot() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="pointer-events-none absolute right-[-1rem] top-10 hidden h-[26rem] w-[26rem] lg:block"
      aria-hidden="true"
    >
      <motion.div
        animate={{ y: [-8, 8, -8], rotate: [-3, 3, -3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-[14%] rounded-[42%]"
        style={{
          background:
            "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.96), rgba(183,255,235,0.92) 30%, rgba(111,231,197,0.7) 52%, rgba(18,38,49,0.78) 100%)",
          boxShadow:
            "0 0 90px rgba(93,228,186,0.18), inset -18px -18px 34px rgba(0,0,0,0.14), inset 14px 16px 26px rgba(255,255,255,0.24)",
        }}
      >
        <div className="absolute left-[24%] top-[34%] h-10 w-10 rounded-full bg-white/80 shadow-[0_8px_18px_rgba(255,255,255,0.18)]">
          <motion.div
            animate={{ y: [0, 1, 0] }}
            transition={{ duration: 3.2, repeat: Infinity }}
            className="absolute left-[34%] top-[34%] h-3.5 w-3.5 rounded-full bg-slate-800"
          />
        </div>

        <div className="absolute right-[24%] top-[34%] h-10 w-10 rounded-full bg-white/80 shadow-[0_8px_18px_rgba(255,255,255,0.18)]">
          <motion.div
            animate={{ y: [0, 1, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, delay: 0.12 }}
            className="absolute left-[34%] top-[34%] h-3.5 w-3.5 rounded-full bg-slate-800"
          />
        </div>

        <motion.div
          animate={{ width: [56, 64, 56] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[28%] left-1/2 h-3 -translate-x-1/2 rounded-full bg-white/80"
        />

        <div className="absolute left-[50%] top-[-8%] h-10 w-24 -translate-x-1/2 rounded-full bg-white/20 blur-sm" />
      </motion.div>

      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2"
      >
        <div className="absolute inset-0 rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-[-2%] h-16 w-[1px] -translate-x-1/2 bg-gradient-to-b from-white/40 to-transparent" />
        <div className="absolute bottom-[-2%] left-1/2 h-16 w-[1px] -translate-x-1/2 bg-gradient-to-t from-accent/40 to-transparent" />
        <div className="absolute left-[-2%] top-1/2 h-[1px] w-16 -translate-y-1/2 bg-gradient-to-r from-white/20 to-transparent" />
        <div className="absolute right-[-2%] top-1/2 h-[1px] w-16 -translate-y-1/2 bg-gradient-to-l from-accent/30 to-transparent" />
      </motion.div>
    </motion.div>
  );
}
