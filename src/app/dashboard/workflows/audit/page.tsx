"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  MoreVertical,
  Download,
  Edit,
  Trash2,
  Plus,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AuditAction = "created" | "modified" | "deleted" | "deployed" | "approved" | "rejected";

interface AuditLog {
  id: string;
  timestamp: string;
  user: {
    name: string;
    avatar: string;
    email: string;
  };
  action: AuditAction;
  resource: {
    type: "workflow" | "schedule" | "template" | "integration";
    name: string;
    id: string;
  };
  details: string;
  changes?: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  ipAddress: string;
  status: "success" | "error";
}

const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: "audit-001",
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    user: { name: "Sarah Johnson", avatar: "SJ", email: "sarah@example.com" },
    action: "deployed",
    resource: { type: "workflow", name: "Daily Email Report", id: "wf-001" },
    details: "Workflow deployed to production",
    ipAddress: "192.168.1.100",
    status: "success",
  },
  {
    id: "audit-002",
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    user: { name: "Mike Chen", avatar: "MC", email: "mike@example.com" },
    action: "modified",
    resource: { type: "workflow", name: "Daily Email Report", id: "wf-001" },
    details: "Updated email template and added error handling",
    changes: [
      { field: "template", oldValue: "Basic", newValue: "Premium" },
      { field: "errorHandling", oldValue: "disabled", newValue: "enabled" },
      { field: "retryAttempts", oldValue: "1", newValue: "3" },
    ],
    ipAddress: "192.168.1.105",
    status: "success",
  },
  {
    id: "audit-003",
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    user: { name: "Alex Rivera", avatar: "AR", email: "alex@example.com" },
    action: "created",
    resource: { type: "workflow", name: "Lead Qualification", id: "wf-002" },
    details: "Created new workflow from template",
    ipAddress: "192.168.1.110",
    status: "success",
  },
  {
    id: "audit-004",
    timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
    user: { name: "Lisa Park", avatar: "LP", email: "lisa@example.com" },
    action: "approved",
    resource: { type: "workflow", name: "Invoice Processing", id: "wf-003" },
    details: "Approved workflow for production deployment",
    ipAddress: "192.168.1.115",
    status: "success",
  },
  {
    id: "audit-005",
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    user: { name: "James Wilson", avatar: "JW", email: "james@example.com" },
    action: "modified",
    resource: { type: "schedule", name: "Weekly Team Sync", id: "sch-002" },
    details: "Changed schedule from daily to weekly",
    changes: [
      { field: "frequency", oldValue: "daily", newValue: "weekly" },
      { field: "daysOfWeek", oldValue: "Mon-Fri", newValue: "Mon, Wed, Fri" },
    ],
    ipAddress: "192.168.1.120",
    status: "success",
  },
  {
    id: "audit-006",
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    user: { name: "Sarah Johnson", avatar: "SJ", email: "sarah@example.com" },
    action: "rejected",
    resource: { type: "workflow", name: "Slack Notifications", id: "wf-004" },
    details: "Rejected workflow due to missing error handling",
    ipAddress: "192.168.1.100",
    status: "error",
  },
  {
    id: "audit-007",
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
    user: { name: "Mike Chen", avatar: "MC", email: "mike@example.com" },
    action: "deleted",
    resource: { type: "template", name: "Old Email Template", id: "tpl-001" },
    details: "Deleted unused template",
    ipAddress: "192.168.1.105",
    status: "success",
  },
  {
    id: "audit-008",
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
    user: { name: "Alex Rivera", avatar: "AR", email: "alex@example.com" },
    action: "created",
    resource: { type: "integration", name: "Salesforce CRM", id: "int-001" },
    details: "Added new Salesforce integration",
    ipAddress: "192.168.1.110",
    status: "success",
  },
];

const actionConfig: Record<AuditAction, { icon: React.ReactNode; color: string; label: string }> = {
  created: { icon: <Plus className="w-4 h-4" />, color: "text-emerald-400", label: "Created" },
  modified: { icon: <Edit className="w-4 h-4" />, color: "text-blue-400", label: "Modified" },
  deleted: { icon: <Trash2 className="w-4 h-4" />, color: "text-red-400", label: "Deleted" },
  deployed: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-400", label: "Deployed" },
  approved: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-400", label: "Approved" },
  rejected: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-orange-400", label: "Rejected" },
};

function AuditLogRow({ log, index }: { log: AuditLog; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const actionCfg = actionConfig[log.action];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
      >
        <div className="flex items-center gap-4">
          {/* Action Icon */}
          <div className={cn("p-2 rounded-lg flex-shrink-0", actionCfg.color)}>
            {actionCfg.icon}
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-white">{log.details}</p>
              {log.status === "error" && (
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-white/50">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {log.user.name}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span>{log.resource.type}: {log.resource.name}</span>
            </div>
          </div>

          {/* Action Label */}
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-medium flex-shrink-0",
            actionCfg.color.includes("red") && "bg-red-500/10",
            actionCfg.color.includes("blue") && "bg-blue-500/10",
            actionCfg.color.includes("emerald") && "bg-emerald-500/10",
            actionCfg.color.includes("green") && "bg-green-500/10",
            actionCfg.color.includes("orange") && "bg-orange-500/10",
          )}>
            {actionCfg.label}
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="ml-12 mt-2 p-4 rounded-lg border border-white/[0.1] bg-white/[0.02] space-y-3">
              {/* User Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/50 mb-1">User Email</p>
                  <p className="text-sm font-mono text-white/80">{log.user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1">IP Address</p>
                  <p className="text-sm font-mono text-white/80">{log.ipAddress}</p>
                </div>
              </div>

              {/* Timestamp */}
              <div>
                <p className="text-xs text-white/50 mb-1">Full Timestamp</p>
                <p className="text-sm text-white/80">{new Date(log.timestamp).toLocaleString()}</p>
              </div>

              {/* Resource Details */}
              <div>
                <p className="text-xs text-white/50 mb-1">Resource</p>
                <p className="text-sm font-mono text-white/80">{log.resource.type}:{log.resource.id}</p>
              </div>

              {/* Changes */}
              {log.changes && log.changes.length > 0 && (
                <div>
                  <p className="text-xs text-white/50 mb-2">Changes</p>
                  <div className="space-y-2">
                    {log.changes.map((change, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-white/[0.03] border border-white/[0.08] text-xs"
                      >
                        <p className="text-white/70 font-medium mb-1">{change.field}</p>
                        <p className="text-red-400/70 line-through text-xs">{change.oldValue}</p>
                        <p className="text-emerald-400/70 text-xs">→ {change.newValue}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("all");

  const filteredLogs = useMemo(() => {
    return MOCK_AUDIT_LOGS.filter((log) => {
      const matchesSearch =
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.resource.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction = actionFilter === "all" || log.action === actionFilter;

      const matchesResource = resourceFilter === "all" || log.resource.type === resourceFilter;

      return matchesSearch && matchesAction && matchesResource;
    });
  }, [searchQuery, actionFilter, resourceFilter]);

  const stats = useMemo(() => {
    return {
      total: MOCK_AUDIT_LOGS.length,
      today: MOCK_AUDIT_LOGS.filter((l) => {
        const now = new Date();
        const logDate = new Date(l.timestamp);
        return logDate.toDateString() === now.toDateString();
      }).length,
      errors: MOCK_AUDIT_LOGS.filter((l) => l.status === "error").length,
    };
  }, []);

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,0.5)] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">Audit Logs</h1>
          <p className="text-white/50">
            Track all changes, deployments, and user activities across your automation platform.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]"
          >
            <p className="text-xs text-white/50 mb-2">Total Events</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]"
          >
            <p className="text-xs text-white/50 mb-2">Today</p>
            <p className="text-3xl font-bold text-white">{stats.today}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]"
          >
            <p className="text-xs text-white/50 mb-2">Errors</p>
            <p className="text-3xl font-bold text-red-400">{stats.errors}</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search by user, resource, or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.05] text-white placeholder-white/40 focus:outline-none focus:border-white/[0.2] transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-2">
              <span className="text-xs text-white/50 mr-2 flex items-center">Actions:</span>
              {(["all", "created", "modified", "deleted", "deployed", "approved"] as const).map((action) => (
                <motion.button
                  key={action}
                  onClick={() => setActionFilter(action)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
                    actionFilter === action
                      ? "bg-violet-600 text-white"
                      : "bg-white/[0.05] text-white/70 hover:text-white hover:bg-white/[0.1]"
                  )}
                >
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex gap-2">
              <span className="text-xs text-white/50 mr-2 flex items-center">Resource:</span>
              {(["all", "workflow", "schedule", "template", "integration"] as const).map((resource) => (
                <motion.button
                  key={resource}
                  onClick={() => setResourceFilter(resource)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
                    resourceFilter === resource
                      ? "bg-blue-600 text-white"
                      : "bg-white/[0.05] text-white/70 hover:text-white hover:bg-white/[0.1]"
                  )}
                >
                  {resource.charAt(0).toUpperCase() + resource.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>

        {/* Logs List */}
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No audit logs found</p>
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <AuditLogRow key={log.id} log={log} index={index} />
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-12 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium mb-1">Complete audit trail</p>
              <p className="text-sm text-white/60">
                Every action is logged with user information, timestamp, resource details, and changes made. Logs are retained for 90 days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
