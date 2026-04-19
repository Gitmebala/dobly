"use client";

import { motion } from "framer-motion";
import {
  Zap,
  Plus,
  MoreHorizontal,
  Play,
  Pause,
  Edit2,
  Trash2,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AutomationCard {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "error";
  runs: number;
  successRate: number;
  lastRun: string;
  icon: React.ElementType;
}

const automations: AutomationCard[] = [
  {
    id: "1",
    name: "Daily Report Generator",
    description: "Automatically generates daily reports every morning",
    status: "active",
    runs: 1024,
    successRate: 99.2,
    lastRun: "2 minutes ago",
    icon: TrendingUp
  },
  {
    id: "2",
    name: "Email Cleanup",
    description: "Archives old emails and organizes inbox",
    status: "active",
    runs: 542,
    successRate: 98.8,
    lastRun: "5 minutes ago",
    icon: Zap
  },
  {
    id: "3",
    name: "Slack Notifications",
    description: "Posts daily standup summaries to Slack",
    status: "paused",
    runs: 234,
    successRate: 100,
    lastRun: "1 hour ago",
    icon: Clock
  },
  {
    id: "4",
    name: "Data Sync Pipeline",
    description: "Syncs data between databases every 6 hours",
    status: "active",
    runs: 892,
    successRate: 97.5,
    lastRun: "Just now",
    icon: CheckCircle2
  },
  {
    id: "5",
    name: "Backup Scheduler",
    description: "Daily backup of critical systems",
    status: "active",
    runs: 365,
    successRate: 100,
    lastRun: "4 hours ago",
    icon: AlertCircle
  },
  {
    id: "6",
    name: "Customer Follow-up",
    description: "Sends follow-up emails to inactive customers",
    status: "paused",
    runs: 156,
    successRate: 95.3,
    lastRun: "2 days ago",
    icon: Zap
  },
];

function AutomationCard({ automation, delay }: { automation: AutomationCard; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative p-6 rounded-3xl overflow-hidden",
        "bg-[#0f0f14]/60 backdrop-blur-xl",
        "border border-white/[0.06]",
        "group hover:border-white/[0.12] transition-all duration-500"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.06]">
              <automation.icon className="w-5 h-5 text-white/70" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">{automation.name}</h3>
              <p className="text-sm text-white/50 mt-1">{automation.description}</p>
            </div>
          </div>
          <button className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] transition-colors opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="flex items-center gap-6 mb-4">
          <div>
            <p className="text-xs text-white/50">Total Runs</p>
            <p className="text-2xl font-bold text-white">{automation.runs.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-white/50">Success Rate</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-white">{automation.successRate}%</p>
              <span className="text-emerald-400">↑</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <span className="text-xs text-white/50">Last run: {automation.lastRun}</span>
          <div className="flex items-center gap-2">
            <button className={cn(
              "p-2 rounded-lg transition-colors",
              automation.status === "active"
                ? "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
                : "bg-white/[0.05] text-white/50 hover:bg-white/[0.1]"
            )}>
              {automation.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
              <Edit2 className="w-4 h-4 text-white/50 hover:text-white" />
            </button>
            <button className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
              <Trash2 className="w-4 h-4 text-white/50 hover:text-white" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AutomationsPage() {
  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Automations</h1>
          <p className="text-white/50">Manage and monitor your automated workflows</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "flex items-center gap-2 px-5 py-3 rounded-xl",
            "bg-white text-black font-medium",
            "hover:bg-white/90 transition-colors"
          )}
        >
          <Plus className="w-4 h-4" />
          New Automation
        </motion.button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "p-6 rounded-3xl",
            "bg-[#0f0f14]/60 backdrop-blur-xl",
            "border border-white/[0.06]"
          )}
        >
          <p className="text-sm text-white/50 mb-2">Total Automations</p>
          <h3 className="text-3xl font-bold text-white">23</h3>
          <p className="text-xs text-emerald-400 mt-2">+4 this month</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={cn(
            "p-6 rounded-3xl",
            "bg-[#0f0f14]/60 backdrop-blur-xl",
            "border border-white/[0.06]"
          )}
        >
          <p className="text-sm text-white/50 mb-2">Active</p>
          <h3 className="text-3xl font-bold text-white">18</h3>
          <p className="text-xs text-white/40 mt-2">78% active</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "p-6 rounded-3xl",
            "bg-[#0f0f14]/60 backdrop-blur-xl",
            "border border-white/[0.06]"
          )}
        >
          <p className="text-sm text-white/50 mb-2">Avg Success Rate</p>
          <h3 className="text-3xl font-bold text-white">98.2%</h3>
          <p className="text-xs text-emerald-400 mt-2">↑ 0.5% from last week</p>
        </motion.div>
      </div>

      {/* Automations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {automations.map((automation, idx) => (
          <AutomationCard
            key={automation.id}
            automation={automation}
            delay={0.25 + idx * 0.05}
          />
        ))}
      </div>
    </div>
  );
}
