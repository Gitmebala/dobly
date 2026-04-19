"use client";

import { motion } from "framer-motion";
import {
  Plus,
  MoreHorizontal,
  Users,
  Zap,
  CheckCircle2,
  Edit2,
  Trash2,
  Archive,
  Share2,
  Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Workspace {
  id: string;
  name: string;
  description: string;
  members: number;
  automations: number;
  status: "active" | "archived";
  owner: string;
  createdDate: string;
  icon: React.ElementType;
}

const workspaces: Workspace[] = [
  {
    id: "1",
    name: "Marketing Automation",
    description: "All marketing campaigns and email workflows",
    members: 4,
    automations: 12,
    status: "active",
    owner: "Sarah Chen",
    createdDate: "2 months ago",
    icon: Zap
  },
  {
    id: "2",
    name: "Financial Ops",
    description: "Invoice processing and payment workflows",
    members: 3,
    automations: 8,
    status: "active",
    owner: "Mike Rodriguez",
    createdDate: "1 month ago",
    icon: CheckCircle2
  },
  {
    id: "3",
    name: "HR & Onboarding",
    description: "Employee onboarding and payroll automations",
    members: 5,
    automations: 15,
    status: "active",
    owner: "Alex Johnson",
    createdDate: "3 weeks ago",
    icon: Users
  },
  {
    id: "4",
    name: "Customer Support",
    description: "Ticket routing and response automations",
    members: 2,
    automations: 6,
    status: "active",
    owner: "Lisa Anderson",
    createdDate: "2 weeks ago",
    icon: Zap
  },
  {
    id: "5",
    name: "Legacy System",
    description: "Old automation flows (archived)",
    members: 1,
    automations: 3,
    status: "archived",
    owner: "James Brown",
    createdDate: "4 months ago",
    icon: Archive
  },
];

function WorkspaceCard({ workspace, delay }: { workspace: Workspace; delay: number }) {
  const Icon = workspace.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "p-6 rounded-3xl overflow-hidden",
        "bg-[#0f0f14]/60 backdrop-blur-xl",
        "border border-white/[0.06]",
        "group hover:border-white/[0.12] transition-all duration-500",
        workspace.status === "archived" && "opacity-60"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.06]">
              <Icon className="w-5 h-5 text-white/70" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">{workspace.name}</h3>
                {workspace.status === "archived" && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-white/[0.05] text-white/50">Archived</span>
                )}
              </div>
              <p className="text-sm text-white/50 mt-1">{workspace.description}</p>
            </div>
          </div>
          <button className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] transition-colors opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
            <p className="text-xs text-white/50">Members</p>
            <p className="text-2xl font-bold text-white mt-1">{workspace.members}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
            <p className="text-xs text-white/50">Automations</p>
            <p className="text-2xl font-bold text-white mt-1">{workspace.automations}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <div className="text-sm">
            <p className="text-white/50">Owned by <span className="text-white font-medium">{workspace.owner}</span></p>
            <p className="text-xs text-white/40 mt-1">Created {workspace.createdDate}</p>
          </div>

          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
              <Share2 className="w-4 h-4 text-white/50 hover:text-white" />
            </button>
            <button className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
              <Edit2 className="w-4 h-4 text-white/50 hover:text-white" />
            </button>
            {workspace.status !== "archived" && (
              <button className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
                <Trash2 className="w-4 h-4 text-white/50 hover:text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function WorkspacesPage() {
  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Workspaces</h1>
          <p className="text-white/50">Organize automations and manage team collaboration</p>
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
          New Workspace
        </motion.button>
      </motion.div>

      {/* Workspace Stats */}
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
          <p className="text-sm text-white/50 mb-2">Total Workspaces</p>
          <h3 className="text-3xl font-bold text-white">5</h3>
          <p className="text-xs text-white/40 mt-2">4 active, 1 archived</p>
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
          <p className="text-sm text-white/50 mb-2">Total Members</p>
          <h3 className="text-3xl font-bold text-white">15</h3>
          <p className="text-xs text-white/40 mt-2">Across all workspaces</p>
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
          <p className="text-sm text-white/50 mb-2">Total Automations</p>
          <h3 className="text-3xl font-bold text-white">44</h3>
          <p className="text-xs text-emerald-400 mt-2">+8 this month</p>
        </motion.div>
      </div>

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {workspaces.map((workspace, idx) => (
          <WorkspaceCard
            key={workspace.id}
            workspace={workspace}
            delay={0.25 + idx * 0.05}
          />
        ))}
      </div>

      {/* Quick Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={cn(
          "p-6 rounded-3xl",
          "bg-[#0f0f14]/60 backdrop-blur-xl",
          "border border-white/[0.06]"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white/[0.05]">
            <Settings2 className="w-6 h-6 text-white/70" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Workspace Settings</h3>
            <p className="text-sm text-white/50 mt-1">Configure workspace defaults, billing, and integrations</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 rounded-lg bg-white/[0.1] hover:bg-white/[0.15] transition-colors text-white text-sm font-medium"
          >
            Configure
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
