"use client";

import { motion } from "framer-motion";
import {
  Lock,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Trash2,
  Plus,
  Eye,
  LogOut,
  Key,
  Smartphone,
  Clock,
  Download,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SecuritySession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

const sessions: SecuritySession[] = [
  {
    id: "1",
    device: "MacBook Pro",
    browser: "Chrome",
    location: "San Francisco, CA",
    ipAddress: "192.168.1.100",
    lastActive: "Just now",
    isCurrent: true
  },
  {
    id: "2",
    device: "iPhone 14",
    browser: "Safari",
    location: "San Francisco, CA",
    ipAddress: "192.168.1.101",
    lastActive: "2 hours ago",
    isCurrent: false
  },
  {
    id: "3",
    device: "Windows PC",
    browser: "Firefox",
    location: "Oakland, CA",
    ipAddress: "192.168.1.102",
    lastActive: "1 day ago",
    isCurrent: false
  },
];

function SettingCard({ icon: Icon, title, description, action, actionLabel, delay }: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
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
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.06]">
            <Icon className="w-5 h-5 text-white/70" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-white/50 mt-1">{description}</p>
          </div>
        </div>

        {action && (
          <motion.button
            onClick={action}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="ml-4 px-4 py-2 rounded-lg bg-white/[0.1] hover:bg-white/[0.15] transition-colors text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100"
          >
            {actionLabel}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function SessionCard({ session, delay }: { session: SecuritySession; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "p-6 rounded-3xl",
        "bg-[#0f0f14]/60 backdrop-blur-xl",
        "border",
        session.isCurrent ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/[0.06]",
        "group hover:border-white/[0.12] transition-all duration-500"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.06]">
            <Smartphone className="w-5 h-5 text-white/70" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{session.device}</h3>
              {session.isCurrent && (
                <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300">Current</span>
              )}
            </div>
            <p className="text-sm text-white/50 mt-1">{session.browser} • {session.location}</p>
          </div>
        </div>

        {!session.isCurrent && (
          <button className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] transition-colors opacity-0 group-hover:opacity-100">
            <LogOut className="w-5 h-5 text-white/60" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-white/50">IP Address</p>
          <p className="text-sm font-mono text-white mt-1">{session.ipAddress}</p>
        </div>
        <div>
          <p className="text-xs text-white/50">Last Active</p>
          <p className="text-sm text-white mt-1">{session.lastActive}</p>
        </div>
      </div>

      <div className="pt-4 border-t border-white/[0.06]">
        <button className="w-full text-center text-xs text-white/50 hover:text-white transition-colors py-2">
          View details
        </button>
      </div>
    </motion.div>
  );
}

export default function SecurityPage() {
  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Security</h1>
          <p className="text-white/50">Manage security settings and active sessions</p>
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
          <RefreshCw className="w-4 h-4" />
          Refresh
        </motion.button>
      </motion.div>

      {/* Security Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          "p-6 rounded-3xl",
          "bg-gradient-to-br from-emerald-600/20 via-teal-600/10 to-cyan-600/20",
          "border border-emerald-500/20",
          "group"
        )}
      >
        <div className="relative">
          <div className="absolute inset-0 opacity-50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/30 rounded-full blur-3xl animate-pulse" />
          </div>

          <div className="relative flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm">
                <CheckCircle2 className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Account is secure</h3>
                <p className="text-sm text-white/70 mt-1">All security checks passed. Your account is well protected.</p>
              </div>
            </div>
            <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-white text-sm font-medium ml-4 whitespace-nowrap">
              View Report
            </button>
          </div>
        </div>
      </motion.div>

      {/* Security Settings */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Security Settings</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SettingCard
            icon={Lock}
            title="Password"
            description="Change your password regularly to keep your account secure"
            actionLabel="Change"
            delay={0.15}
          />
          <SettingCard
            icon={Smartphone}
            title="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
            actionLabel="Enable"
            delay={0.2}
          />
          <SettingCard
            icon={Key}
            title="API Keys"
            description="Manage API keys for integrations and automations"
            actionLabel="Manage"
            delay={0.25}
          />
          <SettingCard
            icon={Shield}
            title="Backup Codes"
            description="Save backup codes for account recovery"
            actionLabel="Download"
            delay={0.3}
          />
        </div>
      </div>

      {/* Active Sessions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Active Sessions</h2>
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((session, idx) => (
            <SessionCard
              key={session.id}
              session={session}
              delay={0.35 + idx * 0.05}
            />
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className={cn(
          "p-6 rounded-3xl",
          "bg-[#0f0f14]/60 backdrop-blur-xl",
          "border border-rose-500/20"
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-rose-500/10">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Danger Zone</h3>
              <p className="text-sm text-white/50 mt-1">Irreversible and destructive actions</p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl",
            "bg-white/[0.05] border border-white/[0.06]",
            "hover:bg-white/[0.08] hover:border-white/[0.08]",
            "transition-all duration-200"
          )}>
            <span className="text-sm text-white">Logout all other sessions</span>
            <LogOut className="w-4 h-4 text-white/50" />
          </button>

          <button className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl",
            "bg-rose-500/10 border border-rose-500/20",
            "hover:bg-rose-500/15 hover:border-rose-500/30",
            "transition-all duration-200"
          )}>
            <span className="text-sm text-rose-300">Delete Account</span>
            <Trash2 className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
