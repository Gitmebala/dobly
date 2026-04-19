"use client";

import { motion } from "framer-motion";
import {
  Plus,
  MoreHorizontal,
  Mail,
  Copy,
  Trash2,
  Shield,
  UserCheck,
  Clock,
  Settings2,
  Link2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Editor" | "Viewer";
  joinedDate: string;
  avatar: string;
  status: "active" | "pending" | "inactive";
}

const teamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex@example.com",
    role: "Admin",
    joinedDate: "2 months ago",
    avatar: "AJ",
    status: "active"
  },
  {
    id: "2",
    name: "Sarah Chen",
    email: "sarah@example.com",
    role: "Editor",
    joinedDate: "1 month ago",
    avatar: "SC",
    status: "active"
  },
  {
    id: "3",
    name: "Mike Rodriguez",
    email: "mike@example.com",
    role: "Editor",
    joinedDate: "3 weeks ago",
    avatar: "MR",
    status: "active"
  },
  {
    id: "4",
    name: "Emma Wilson",
    email: "emma@example.com",
    role: "Viewer",
    joinedDate: "1 week ago",
    avatar: "EW",
    status: "pending"
  },
  {
    id: "5",
    name: "James Brown",
    email: "james@example.com",
    role: "Viewer",
    joinedDate: "2 days ago",
    avatar: "JB",
    status: "inactive"
  },
  {
    id: "6",
    name: "Lisa Anderson",
    email: "lisa@example.com",
    role: "Editor",
    joinedDate: "15 days ago",
    avatar: "LA",
    status: "active"
  },
];

function TeamMemberCard({ member, delay }: { member: TeamMember; delay: number }) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-violet-500/20 text-violet-300";
      case "Editor":
        return "bg-cyan-500/20 text-cyan-300";
      default:
        return "bg-white/[0.05] text-white/60";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500";
      case "pending":
        return "bg-amber-500";
      default:
        return "bg-slate-500";
    }
  };

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
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
              {member.avatar}
            </div>
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0f]",
              getStatusColor(member.status)
            )} />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{member.name}</h3>
              {member.status === "active" && (
                <UserCheck className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <p className="text-sm text-white/50 mt-1">{member.email}</p>
          </div>
        </div>

        <button className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] transition-colors opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
        <div className="flex flex-col gap-2">
          <span className={cn(
            "text-xs font-medium px-3 py-1.5 rounded-lg w-fit",
            getRoleColor(member.role)
          )}>
            {member.role}
          </span>
          <p className="text-xs text-white/40">Joined {member.joinedDate}</p>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
            <Copy className="w-4 h-4 text-white/50 hover:text-white" />
          </button>
          <button className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
            <Trash2 className="w-4 h-4 text-white/50 hover:text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function TeamPage() {
  return (
    <div className="space-y-6 pt-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Team</h1>
          <p className="text-white/50">Manage team members and permissions</p>
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
          Invite Member
        </motion.button>
      </motion.div>

      {/* Team Stats */}
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
          <p className="text-sm text-white/50 mb-2">Total Members</p>
          <h3 className="text-3xl font-bold text-white">6</h3>
          <p className="text-xs text-white/40 mt-2">Including you</p>
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
          <h3 className="text-3xl font-bold text-white">4</h3>
          <p className="text-xs text-emerald-400 mt-2">All active today</p>
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
          <p className="text-sm text-white/50 mb-2">Pending Invites</p>
          <h3 className="text-3xl font-bold text-white">2</h3>
          <p className="text-xs text-white/40 mt-2">Awaiting response</p>
        </motion.div>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {teamMembers.map((member, idx) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            delay={0.25 + idx * 0.05}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className={cn(
            "p-6 rounded-3xl",
            "bg-[#0f0f14]/60 backdrop-blur-xl",
            "border border-white/[0.06]",
            "hover:border-white/[0.12] transition-all duration-500",
            "flex items-center gap-4 group cursor-pointer"
          )}
        >
          <div className="p-3 rounded-2xl bg-white/[0.05] group-hover:bg-white/[0.1] transition-colors">
            <Link2 className="w-6 h-6 text-white/70" />
          </div>
          <div className="text-left">
            <p className="text-sm text-white/50">Invite Link</p>
            <p className="text-lg font-semibold text-white">Copy invite URL</p>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={cn(
            "p-6 rounded-3xl",
            "bg-[#0f0f14]/60 backdrop-blur-xl",
            "border border-white/[0.06]",
            "hover:border-white/[0.12] transition-all duration-500",
            "flex items-center gap-4 group cursor-pointer"
          )}
        >
          <div className="p-3 rounded-2xl bg-white/[0.05] group-hover:bg-white/[0.1] transition-colors">
            <Shield className="w-6 h-6 text-white/70" />
          </div>
          <div className="text-left">
            <p className="text-sm text-white/50">Permissions</p>
            <p className="text-lg font-semibold text-white">Manage roles</p>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className={cn(
            "p-6 rounded-3xl",
            "bg-[#0f0f14]/60 backdrop-blur-xl",
            "border border-white/[0.06]",
            "hover:border-white/[0.12] transition-all duration-500",
            "flex items-center gap-4 group cursor-pointer"
          )}
        >
          <div className="p-3 rounded-2xl bg-white/[0.05] group-hover:bg-white/[0.1] transition-colors">
            <Settings2 className="w-6 h-6 text-white/70" />
          </div>
          <div className="text-left">
            <p className="text-sm text-white/50">Settings</p>
            <p className="text-lg font-semibold text-white">Team settings</p>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
