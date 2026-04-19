"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Zap,
  BarChart3,
  Users,
  Settings,
  Bell,
  LogOut,
  ChevronRight,
  Sparkles,
  Command,
  Layers,
  Rocket,
  Shield,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard/creative", gradient: "from-violet-500 to-purple-600" },
  { icon: Zap, label: "Automations", href: "/dashboard/creative/automations", gradient: "from-cyan-500 to-blue-600" },
  { icon: Layers, label: "Workspaces", href: "/dashboard/creative/workspaces", gradient: "from-fuchsia-500 to-pink-600" },
  { icon: BarChart3, label: "Analytics", href: "/dashboard/creative/analytics", gradient: "from-emerald-500 to-teal-600" },
  { icon: Users, label: "Team", href: "/dashboard/creative/team", gradient: "from-amber-500 to-orange-600" },
  { icon: Shield, label: "Security", href: "/dashboard/creative/security", gradient: "from-rose-500 to-red-600" },
];

const bottomItems = [
  { icon: Settings, label: "Settings", href: "/dashboard/creative/settings" },
  { icon: LogOut, label: "Logout", href: "/logout" },
];

export function CreativeSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeGlow, setActiveGlow] = useState<number | null>(null);

  return (
    <>
      {/* Floating Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
          "fixed left-4 top-1/2 -translate-y-1/2 z-50 h-[85vh] rounded-3xl",
          "bg-[#0f0f14]/80 backdrop-blur-2xl border border-white/[0.08]",
          "shadow-2xl shadow-black/50",
          "transition-all duration-500 ease-out",
          isExpanded ? "w-64" : "w-16"
        )}
      >
        {/* Glass Effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center justify-center h-20 border-b border-white/[0.06]">
          <motion.div
            animate={{ rotate: isExpanded ? 360 : 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 blur-xl opacity-50" />
          </motion.div>

          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="absolute left-16 text-lg font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent"
              >
                Nexus
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 flex flex-col gap-2 p-3">
          {navItems.map((item, index) => (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={cn(
                  "relative flex items-center gap-4 px-3 py-3 rounded-xl cursor-pointer",
                  "transition-all duration-300 group"
                )}
                onMouseEnter={() => setActiveGlow(index)}
                onMouseLeave={() => setActiveGlow(null)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Hover Glow */}
                <AnimatePresence>
                  {activeGlow === index && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "absolute inset-0 rounded-xl bg-gradient-to-r opacity-20",
                        item.gradient
                      )}
                    />
                  )}
                </AnimatePresence>

                {/* Icon Container */}
                <div className={cn(
                  "relative flex items-center justify-center w-10 h-10 rounded-lg",
                  "bg-white/[0.05] group-hover:bg-white/[0.1] transition-colors"
                )}>
                  <item.icon className={cn(
                    "w-5 h-5 transition-colors duration-300",
                    activeGlow === index ? "text-white" : "text-white/60 group-hover:text-white"
                  )} />
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-sm font-medium text-white/70 group-hover:text-white transition-colors whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isExpanded && activeGlow === index && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="absolute right-3"
                    >
                      <ChevronRight className="w-4 h-4 text-white/40" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="relative p-3 border-t border-white/[0.06] space-y-2">
          {bottomItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <motion.div
                className="flex items-center gap-4 px-3 py-3 rounded-xl cursor-pointer group hover:bg-white/[0.05] transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/[0.03]">
                  <item.icon className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-sm font-medium text-white/70 group-hover:text-white whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Status Indicator */}
        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a0f]"
          >
            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
}
