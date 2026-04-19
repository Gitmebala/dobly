"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  BarChart3,
  TrendingUp,
  Calendar,
  MoreHorizontal,
  Download,
  Target,
  Zap,
  Users,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

function MetricCard({ title, value, change, trend, delay }: {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "p-6 rounded-3xl",
        "bg-[#0f0f14]/60 backdrop-blur-xl",
        "border border-white/[0.06]",
        "group hover:border-white/[0.12] transition-all duration-500"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/50">{title}</p>
        <div className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
          trend === "up" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
        )}>
          <TrendingUp className={cn("w-3 h-3", trend === "down" && "rotate-180")} />
          <span>{change}</span>
        </div>
      </div>
      <h3 className="text-3xl font-bold text-white">{value}</h3>
    </motion.div>
  );
}

function ChartCard({ title, description, delay, icon: Icon }: {
  title: string;
  description: string;
  delay: number;
  icon: React.ElementType;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "p-6 rounded-3xl relative overflow-hidden",
        "bg-[#0f0f14]/60 backdrop-blur-xl",
        "border border-white/[0.06]",
        "group hover:border-white/[0.12] transition-all duration-500"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-white/50 mt-1">{description}</p>
          </div>
          <button className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
            <MoreHorizontal className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Simple Bar Chart */}
        <div className="flex items-end justify-between gap-2 h-40 mb-4">
          {[35, 65, 42, 78, 55, 88, 62, 90].map((height, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ delay: delay + 0.2 + i * 0.05, duration: 0.6 }}
              className="flex-1 rounded-t-lg bg-gradient-to-t from-violet-600 to-cyan-500 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Calendar className="w-4 h-4" />
            <span>Last 30 days</span>
          </div>
          <button className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
            <Download className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function TopPerformersCard() {
  const performers = [
    { name: "Email Automation", value: "2,847", trend: "up", change: "+12.5%" },
    { name: "Data Pipeline", value: "1,923", trend: "up", change: "+8.3%" },
    { name: "Report Generation", value: "1,456", trend: "down", change: "-3.2%" },
    { name: "Slack Scheduler", value: "892", trend: "up", change: "+5.1%" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.5 }}
      className={cn(
        "p-6 rounded-3xl",
        "bg-[#0f0f14]/60 backdrop-blur-xl",
        "border border-white/[0.06]",
        "group hover:border-white/[0.12] transition-all duration-500"
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Top Performers</h3>
          <p className="text-sm text-white/50 mt-1">Most executed automations</p>
        </div>
        <button className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
          <MoreHorizontal className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <div className="space-y-4">
        {performers.map((performer, i) => (
          <motion.div
            key={performer.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.75 + i * 0.1 }}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{performer.name}</p>
              <div className="w-32 h-2 rounded-full bg-white/[0.1] mt-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(i + 1) * 20}%` }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-violet-600 to-cyan-500"
                />
              </div>
            </div>
            <div className="text-right ml-4">
              <p className="text-sm font-semibold text-white">{performer.value}</p>
              <p className={cn(
                "text-xs font-medium",
                performer.trend === "up" ? "text-emerald-400" : "text-rose-400"
              )}>
                {performer.change}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Analytics</h1>
          <p className="text-white/50">Track performance and insights across all automations</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "flex items-center gap-2 px-5 py-3 rounded-xl",
            "bg-white/[0.08] border border-white/[0.1]",
            "text-white font-medium",
            "hover:bg-white/[0.12] transition-colors"
          )}
        >
          <Download className="w-4 h-4" />
          Export Report
        </motion.button>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Executions"
          value="48,294"
          change="+12.5%"
          trend="up"
          delay={0.1}
        />
        <MetricCard
          title="Success Rate"
          value="98.2%"
          change="+0.3%"
          trend="up"
          delay={0.15}
        />
        <MetricCard
          title="Avg Response Time"
          value="245ms"
          change="-15ms"
          trend="up"
          delay={0.2}
        />
        <MetricCard
          title="Cost Saved"
          value="$12,847"
          change="+$2,340"
          trend="up"
          delay={0.25}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Execution Timeline"
          description="Daily execution counts over time"
          delay={0.3}
          icon={LineChart}
        />
        <ChartCard
          title="Success vs Errors"
          description="Breakdown of successes and failures"
          delay={0.35}
          icon={BarChart3}
        />
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopPerformersCard />

        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className={cn(
            "p-6 rounded-3xl",
            "bg-[#0f0f14]/60 backdrop-blur-xl",
            "border border-white/[0.06]",
            "group hover:border-white/[0.12] transition-all duration-500"
          )}
        >
          <h3 className="text-lg font-semibold text-white mb-6">System Health</h3>
          <div className="space-y-4">
            {[
              { name: "API Uptime", value: "99.98%", icon: Target },
              { name: "Avg Latency", value: "24ms", icon: Clock },
              { name: "Error Rate", value: "0.02%", icon: Zap },
            ].map((metric, i) => (
              <motion.div
                key={metric.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="p-2.5 rounded-lg bg-white/[0.05]">
                  <metric.icon className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/70">{metric.name}</p>
                  <p className="text-lg font-semibold text-white">{metric.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
