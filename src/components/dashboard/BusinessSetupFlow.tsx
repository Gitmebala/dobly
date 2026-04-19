"use client";

import { motion } from "framer-motion";
import { Globe, Edit3, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function BusinessSetupFlow({
  onChoice,
  initialProfile,
}: {
  onChoice: (choice: "website" | "manual") => void;
  initialProfile: any;
}) {
  // If profile already exists, skip the choice screen
  if (initialProfile?.business_name) {
    onChoice("manual");
    return null;
  }

  return (
    <div className="space-y-8 pt-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-white mb-3">Set up your business context</h1>
        <p className="text-white/50 max-w-2xl mx-auto">
          Dobly works best when it understands your business. You can either share your website for instant analysis, or manually add your details.
        </p>
      </motion.div>

      {/* Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Website Analysis Option */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => onChoice("website")}
          className={cn(
            "relative group p-8 rounded-3xl overflow-hidden",
            "bg-[#0f0f14]/60 backdrop-blur-xl",
            "border border-white/[0.06]",
            "hover:border-cyan-500/30 transition-all duration-500",
            "text-left"
          )}
        >
          {/* Glow background */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-cyan-500/20 group-hover:bg-cyan-500/30 transition-colors">
                <Globe className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">I have a website</h3>
            </div>

            <p className="text-white/60 text-sm mb-6">
              Share your website URL and Dobly will analyze it to automatically populate your business details in seconds.
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40 font-medium">RECOMMENDED</span>
              <ArrowRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </motion.button>

        {/* Manual Entry Option */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => onChoice("manual")}
          className={cn(
            "relative group p-8 rounded-3xl overflow-hidden",
            "bg-[#0f0f14]/60 backdrop-blur-xl",
            "border border-white/[0.06]",
            "hover:border-violet-500/30 transition-all duration-500",
            "text-left"
          )}
        >
          {/* Glow background */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-violet-500/20 group-hover:bg-violet-500/30 transition-colors">
                <Edit3 className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">I'll enter it manually</h3>
            </div>

            <p className="text-white/60 text-sm mb-6">
              Fill in your business details yourself. You can add everything from your business type to FAQs and policies.
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40 font-medium">FLEXIBLE</span>
              <ArrowRight className="w-5 h-5 text-violet-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </motion.button>
      </div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="max-w-3xl mx-auto"
      >
        <div className={cn(
          "p-6 rounded-3xl",
          "bg-white/[0.03] border border-white/[0.06]"
        )}>
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium mb-1">Why this matters</p>
              <p className="text-sm text-white/60">
                Dobly uses your business context to generate smarter automations, write better copy, and understand your workflows. The more accurate this is, the better your automations will be.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
