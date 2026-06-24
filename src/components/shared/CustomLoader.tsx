"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomLoader({ 
  label = "Loading", 
  fullScreen = true 
}: { 
  label?: string; 
  fullScreen?: boolean; 
}) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (!active) return;
      setProgress(100);
      timer = setTimeout(() => setVisible(false), 240);
    };

    const advance = () => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        const delta = Math.max(2, Math.round((100 - prev) * 0.08));
        return Math.min(92, prev + delta);
      });
    };

    const interval = setInterval(advance, 90);

    if (typeof window !== "undefined") {
      if (document.readyState === "complete") {
        finish();
      } else {
        const onReady = () => finish();
        window.addEventListener("load", onReady, { once: true });
        timer = setTimeout(finish, 1800);
        return () => {
          active = false;
          clearInterval(interval);
          if (timer) clearTimeout(timer);
          window.removeEventListener("load", onReady);
        };
      }
    }

    timer = setTimeout(finish, 1400);
    return () => {
      active = false;
      clearInterval(interval);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  const wrapperClass = fullScreen
    ? "fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(20,20,18,0.68)] backdrop-blur-md"
    : "fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(20,20,18,0.42)] backdrop-blur-sm";
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={wrapperClass}
      >
        <div className="rounded-[28px] border border-[rgba(245,237,228,0.1)] bg-[rgba(23,23,21,0.86)] px-8 py-7 shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
          <div className="flex flex-col items-center gap-5">
            <div className="relative h-12 w-12">
              <svg viewBox="0 0 48 48" fill="none" className="h-12 w-12">
                <rect x="4" y="6" width="30" height="10" rx="3" fill="#C4501A" opacity="0.15" />
                <rect x="4" y="6" width={(30 * progress) / 100} height="10" rx="3" fill="#C4501A" opacity="0.95" />
                <rect x="10" y="20" width="30" height="10" rx="3" fill="#C4501A" opacity="0.45" />
                <rect x="16" y="34" width="28" height="8" rx="3" fill="#C4501A" opacity="0.95" />
              </svg>
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(196,80,26,0.22),transparent_64%)]" />
            </div>

            <div className="w-44 overflow-hidden rounded-full bg-[rgba(196,80,26,0.12)]">
              <motion.div
                className="h-2 rounded-full bg-[#C4501A]"
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.18 }}
              />
            </div>

            <div className="text-center">
              <div className="text-sm font-semibold tracking-[0.18em] text-[var(--dobly-text)] uppercase">
                Preparing Dobly
              </div>
              {label ? <p className="mt-2 text-sm text-[var(--dobly-text-secondary)]">{label}</p> : null}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
