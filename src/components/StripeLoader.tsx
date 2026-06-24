"use client";

import { motion } from "framer-motion";

export default function StripeLoader({
  label = "Preparing your workspace",
  fullScreen = true,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  // Single rectangle loader - appears at top of page
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-[#C4501A] z-[99] origin-left"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "left" }}
    />
  );
}
