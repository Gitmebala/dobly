"use client";

import { motion } from "framer-motion";
import {
  Zap,
  TrendingUp,
  Users,
  Activity,
  ArrowUpRight,
  MoreHorizontal,
  Sparkles,
  Clock,
  Globe,
  Shield,
  Bot,
  Workflow,
  Globe2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Stats Card Component
function StatCard({ title, value, change, trend, icon: Icon, delay }: {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: React.ElementType;
  delay: number;
}) {
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
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.06]">
            <Icon className="w-5 h-5 text-white/70" />
          </div>
          <motion.div
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
              trend === "up" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            )}
          >
            <TrendingUp className={cn("w-3 h-3", trend === "down" && "rotate-180")} />
            <span>{change}</span>
          </motion.div>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-white/50">{title}</p>
          <h3 className="text-3xl font-bold text-white">{value}</h3>
        </div>
      </div>
    </motion.div>
  );
}

// Activity Chart Component
function ActivityChart() {
  const bars = [
    { height: 40, day: "M" },
    { height: 65, day: "T" },
    { height: 45, day: "W" },
    { height: 85, day: "T" },
    { height: 55, day: "F" },
    { height: 70, day: "S" },
    { height: 90, day: "S", active: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className={cn(
        "col-span-2 p-6 rounded-3xl",
        "bg-[#0f0f14]/60 backdrop-blur-xl",
        "border border-white/[0.06]",
        "group hover:border-white/[0.12] transition-all duration-500"
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Activity Overview</h3>
          <p className="text-sm text-white/50">Weekly performance metrics</p>
        </div>
        <button className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
          <MoreHorizontal className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <div className="flex items-end justify-between gap-3 h-40">
        {bars.map((bar, i) => (
          <motion.div
            key={bar.day}
            initial={{ height: 0 }}
            animate={{ height: `${bar.height}%` }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative flex-1 rounded-full cursor-pointer group/bar",
              bar.active
                ? "bg-gradient-to-t from-violet-600 to-cyan-500"
                : "bg-white/[0.08] hover:bg-white/[0.12]"
            )}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-white/20 to-transparent opacity-0 group-hover/bar:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </div>

      <div className="flex justify-between mt-4 px-2">
        {bars.map((bar) => (
          <span key={bar.day} className={cn(
            "text-xs font-medium",
            bar.active ? "text-white" : "text-white/40"
          )}>
            {bar.day}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// AI Assistant Card
function AIAssistantCard() {
  const suggestions = [
    "Analyze yesterday's data",
    "Create weekly report",
    "Optimize automations"
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className={cn(
        "relative p-6 rounded-3xl overflow-hidden",
        "bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-cyan-600/20",
        "border border-violet-500/20",
        "group cursor-pointer"
      )}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl animate-pulse delay-500" />
      </div>

      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
            <Bot className="w-5 h-5 text-violet-300" />
          </div>
          <span className="text-sm font-medium text-violet-200">AI Assistant</span>
        </div>

        <h3 className="text-xl font-semibold text-white mb-2">Good evening, Alex</h3>
        <p className="text-sm text-white/60 mb-6">Ready to help you analyze your data and optimize workflows.</p>

        <div className="space-y-2">
          {suggestions.map((suggestion, i) => (
            <motion.button
              key={suggestion}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl",
                "bg-white/[0.05] border border-white/[0.06]",
                "hover:bg-white/[0.1] hover:border-white/[0.12]",
                "transition-all duration-200"
              )}
            >
              <span className="text-sm text-white/80">{suggestion}</span>
              <ArrowUpRight className="w-4 h-4 text-white/40" />
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Recent Activity Card
function RecentActivityCard() {
  const activities = [
    { icon: Zap, color: "text-cyan-400", bg: "bg-cyan-500/10", title: "Automation completed", time: "2m ago" },
    { icon: Users, color: "text-violet-400", bg: "bg-violet-500/10", title: "New team member", time: "15m ago" },
    { icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10", title: "Security scan passed", time: "1h ago" },
    { icon: Workflow, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", title: "Workflow updated", time: "3h ago" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className={cn(
        "p-6 rounded-3xl",
        "bg-[#0f0f14]/60 backdrop-blur-xl",
        "border border-white/[0.06]",
        "group hover:border-white/[0.12] transition-all duration-500"
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        <button className="text-sm text-white/50 hover:text-white transition-colors">View all</button>
      </div>

      <div className="space-y-3">
        {activities.map((activity, i) => (
          <motion.div
            key={activity.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <div className={cn("p-2.5 rounded-xl", activity.bg)}>
              <activity.icon className={cn("w-4 h-4", activity.color)} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{activity.title}</p>
            </div>
            <span className="text-xs text-white/40">{activity.time}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Status Card
function StatusCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className={cn(
        "p-6 rounded-3xl",
        "bg-[#0f0f14]/60 backdrop-blur-xl",
        "border border-white/[0.06]",
        "group hover:border-white/[0.12] transition-all duration-500"
      )}
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0f0f14]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">All Systems Operational</h3>
          <p className="text-sm text-white/50">Last updated: 2 minutes ago</p>
        </div>
      </div>

      <div className="space-y-4">
        {[
          { name: "API Status", status: "Operational", color: "bg-emerald-500" },
          { name: "WebSocket", status: "Operational", color: "bg-emerald-500" },
          { name: "Database", status: "Operational", color: "bg-emerald-500" },
          { name: "Storage", status: "Maintenance", color: "bg-amber-500" },
        ].map((service, i) => (
          <div key={service.name} className="flex items-center justify-between">
            <span className="text-sm text-white/70">{service.name}</span>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", service.color)} />
              <span className="text-sm text-white/50">{service.status}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Globe/Map Visualization
function GlobeCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className={cn(
        "col-span-2 p-6 rounded-3xl relative overflow-hidden",
        "bg-[#0f0f14]/60 backdrop-blur-xl",
        "border border-white/[0.06]",
        "group hover:border-white/[0.12] transition-all duration-500"
      )}
    >
      {/* Abstract Globe Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
        <div className="w-64 h-64 rounded-full border border-white/10 relative">
          <div className="absolute inset-4 rounded-full border border-white/5" />
          <div className="absolute inset-8 rounded-full border border-white/5" />
          <div className="absolute inset-12 rounded-full border border-cyan-500/20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-500/50 rounded-full blur-sm" />
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Global Activity</h3>
            <p className="text-sm text-white/50">Real-time data from 24 regions</p>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.05]">
            <Globe2 className="w-5 h-5 text-white/60" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { region: "North America", users: "12.4K", latency: "24ms" },
            { region: "Europe", users: "8.7K", latency: "18ms" },
            { region: "Asia Pacific", users: "15.2K", latency: "32ms" },
          ].map((region, i) => (
            <div key={region.region} className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              <p className="text-xs text-white/50 mb-1">{region.region}</p>
              <p className="text-xl font-bold text-white">{region.users}</p>
              <p className="text-xs text-emerald-400">{region.latency}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Time Card
function TimeCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.5 }}
      className={cn(
        "p-6 rounded-3xl",
        "bg-[#0f0f14]/60 backdrop-blur-xl",
        "border border-white/[0.06]",
        "flex flex-col justify-center"
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <Clock className="w-5 h-5 text-white/50" />
        <span className="text-sm text-white/50">Local Time</span>
      </div>
      <div className="text-4xl font-bold text-white mb-1">09:42</div>
      <div className="text-sm text-white/50">Thursday, January 16</div>
    </motion.div>
  );
}

// Main Dashboard
export default function CreativeDashboardPage() {
  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-white/50">Welcome back! Here's what's happening today.</p>
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
          <Sparkles className="w-4 h-4" />
          New Project
        </motion.button>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value="$48,294"
          change="+12.5%"
          trend="up"
          icon={TrendingUp}
          delay={0.1}
        />
        <StatCard
          title="Active Users"
          value="2,847"
          change="+8.2%"
          trend="up"
          icon={Users}
          delay={0.15}
        />
        <StatCard
          title="Automations"
          value="142"
          change="+24"
          trend="up"
          icon={Zap}
          delay={0.2}
        />
        <StatCard
          title="Avg. Latency"
          value="24ms"
          change="-2ms"
          trend="up"
          icon={Activity}
          delay={0.25}
        />
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActivityChart />
        <AIAssistantCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RecentActivityCard />
        <StatusCard />
        <GlobeCard />
        <TimeCard />
      </div>
    </div>
  );
}
