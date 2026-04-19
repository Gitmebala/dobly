"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  ChevronRight,
  ZapOff,
  TrendingUp,
  Calendar,
  Zap,
  Code2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ExecutionStatus = "success" | "failed" | "running" | "pending";

interface ExecutionStep {
  id: string;
  name: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  output?: any;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  totalDuration?: number;
  totalCost?: number;
  steps: ExecutionStep[];
  trigger: string;
  error?: string;
}

// Mock execution data
const MOCK_EXECUTIONS: WorkflowExecution[] = [
  {
    id: "exec-001",
    workflowId: "wf-001",
    workflowName: "Daily Email Report",
    status: "success",
    startedAt: new Date(Date.now() - 2 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 1 * 60000).toISOString(),
    totalDuration: 45000,
    totalCost: 0.002,
    trigger: "Schedule: Daily at 9:00 AM",
    steps: [
      {
        id: "step-1",
        name: "Fetch Google Analytics",
        status: "success",
        startedAt: new Date(Date.now() - 45000).toISOString(),
        completedAt: new Date(Date.now() - 40000).toISOString(),
        duration: 5000,
      },
      {
        id: "step-2",
        name: "Process Data",
        status: "success",
        startedAt: new Date(Date.now() - 40000).toISOString(),
        completedAt: new Date(Date.now() - 35000).toISOString(),
        duration: 5000,
      },
      {
        id: "step-3",
        name: "Generate Report",
        status: "success",
        startedAt: new Date(Date.now() - 35000).toISOString(),
        completedAt: new Date(Date.now() - 10000).toISOString(),
        duration: 25000,
      },
      {
        id: "step-4",
        name: "Send Email",
        status: "success",
        startedAt: new Date(Date.now() - 10000).toISOString(),
        completedAt: new Date(Date.now() - 1000).toISOString(),
        duration: 9000,
      },
    ],
  },
  {
    id: "exec-002",
    workflowId: "wf-002",
    workflowName: "New Lead to CRM",
    status: "running",
    startedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    trigger: "Webhook: Form submission",
    steps: [
      {
        id: "step-1",
        name: "Validate Email",
        status: "success",
        startedAt: new Date(Date.now() - 5 * 60000).toISOString(),
        completedAt: new Date(Date.now() - 4 * 60000).toISOString(),
        duration: 2000,
      },
      {
        id: "step-2",
        name: "Check Duplicate",
        status: "success",
        startedAt: new Date(Date.now() - 4 * 60000).toISOString(),
        completedAt: new Date(Date.now() - 3 * 60000).toISOString(),
        duration: 3000,
      },
      {
        id: "step-3",
        name: "Add to Salesforce",
        status: "running",
        startedAt: new Date(Date.now() - 3 * 60000).toISOString(),
      },
    ],
  },
  {
    id: "exec-003",
    workflowId: "wf-003",
    workflowName: "Invoice Processing",
    status: "failed",
    startedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 8 * 60000).toISOString(),
    totalDuration: 120000,
    totalCost: 0.005,
    error: "Failed to connect to accounting API",
    trigger: "Email: Invoice received",
    steps: [
      {
        id: "step-1",
        name: "Extract Invoice Data",
        status: "success",
        startedAt: new Date(Date.now() - 120000).toISOString(),
        completedAt: new Date(Date.now() - 115000).toISOString(),
        duration: 5000,
      },
      {
        id: "step-2",
        name: "Validate Amount",
        status: "success",
        startedAt: new Date(Date.now() - 115000).toISOString(),
        completedAt: new Date(Date.now() - 110000).toISOString(),
        duration: 5000,
      },
      {
        id: "step-3",
        name: "Post to Accounting",
        status: "failed",
        startedAt: new Date(Date.now() - 110000).toISOString(),
        completedAt: new Date(Date.now() - 120000).toISOString(),
        duration: 120000,
        error: "Connection timeout - API unavailable",
      },
    ],
  },
  {
    id: "exec-004",
    workflowId: "wf-004",
    workflowName: "Slack Notifications",
    status: "success",
    startedAt: new Date(Date.now() - 25 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 24 * 60000).toISOString(),
    totalDuration: 1500,
    totalCost: 0.0001,
    trigger: "Webhook: Error alert",
    steps: [
      {
        id: "step-1",
        name: "Format Message",
        status: "success",
        startedAt: new Date(Date.now() - 1500).toISOString(),
        completedAt: new Date(Date.now() - 1200).toISOString(),
        duration: 300,
      },
      {
        id: "step-2",
        name: "Send to Slack",
        status: "success",
        startedAt: new Date(Date.now() - 1200).toISOString(),
        completedAt: new Date(Date.now() - 600).toISOString(),
        duration: 600,
      },
      {
        id: "step-3",
        name: "Log Event",
        status: "success",
        startedAt: new Date(Date.now() - 600).toISOString(),
        completedAt: new Date(Date.now()).toISOString(),
        duration: 600,
      },
    ],
  },
  {
    id: "exec-005",
    workflowId: "wf-001",
    workflowName: "Daily Email Report",
    status: "success",
    startedAt: new Date(Date.now() - 1440 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 1439 * 60000).toISOString(),
    totalDuration: 50000,
    totalCost: 0.002,
    trigger: "Schedule: Daily at 9:00 AM",
    steps: [
      {
        id: "step-1",
        name: "Fetch Google Analytics",
        status: "success",
        startedAt: new Date(Date.now() - 50000).toISOString(),
        completedAt: new Date(Date.now() - 45000).toISOString(),
        duration: 5000,
      },
      {
        id: "step-2",
        name: "Process Data",
        status: "success",
        startedAt: new Date(Date.now() - 45000).toISOString(),
        completedAt: new Date(Date.now() - 40000).toISOString(),
        duration: 5000,
      },
      {
        id: "step-3",
        name: "Generate Report",
        status: "success",
        startedAt: new Date(Date.now() - 40000).toISOString(),
        completedAt: new Date(Date.now() - 15000).toISOString(),
        duration: 25000,
      },
      {
        id: "step-4",
        name: "Send Email",
        status: "success",
        startedAt: new Date(Date.now() - 15000).toISOString(),
        completedAt: new Date(Date.now() - 6000).toISOString(),
        duration: 9000,
      },
    ],
  },
];

const statusConfig: Record<ExecutionStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  success: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
  failed: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    icon: <AlertCircle className="w-5 h-5" />,
  },
  running: {
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    icon: <Zap className="w-5 h-5 animate-pulse" />,
  },
  pending: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    icon: <Clock className="w-5 h-5" />,
  },
};

function ActionCell({ execution }: { execution: WorkflowExecution }) {
  const totalSteps = execution.steps.length;
  const successSteps = execution.steps.filter((s) => s.status === "success").length;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm">
        <span className="font-medium text-white">{successSteps}</span>
        <span className="text-white/50">/{totalSteps}</span>
      </div>
      <Link
        href={`/dashboard/workflows/executions/${execution.id}`}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
      >
        View logs
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function ExecutionRow({ execution }: { execution: WorkflowExecution }) {
  const config = statusConfig[execution.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={cn("p-2 rounded-lg", config.bg)}>{config.icon}</div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white">{execution.workflowName}</h4>
          <p className="text-sm text-white/50 mt-1">{execution.trigger}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-xs text-white/50 mb-1">Duration</p>
          <p className="text-sm font-medium text-white">
            {execution.totalDuration ? `${(execution.totalDuration / 1000).toFixed(1)}s` : "—"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-white/50 mb-1">Cost</p>
          <p className="text-sm font-medium text-white">
            {execution.totalCost ? `$${execution.totalCost.toFixed(4)}` : "—"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-white/50 mb-1">Started</p>
          <p className="text-sm font-medium text-white">
            {new Date(execution.startedAt).toLocaleTimeString()}
          </p>
        </div>

        <ActionCell execution={execution} />
      </div>
    </motion.div>
  );
}

export default function ExecutionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | "all">("all");
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);

  const filteredExecutions = useMemo(() => {
    return MOCK_EXECUTIONS.filter((execution) => {
      const matchesSearch =
        execution.workflowName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        execution.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || execution.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = MOCK_EXECUTIONS.length;
    const successful = MOCK_EXECUTIONS.filter((e) => e.status === "success").length;
    const failed = MOCK_EXECUTIONS.filter((e) => e.status === "failed").length;
    const running = MOCK_EXECUTIONS.filter((e) => e.status === "running").length;

    return { total, successful, failed, running };
  }, []);

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,0.5)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Execution Logs</h1>
          <p className="text-white/50">Real-time monitoring of all workflow executions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50 mb-2">Total Executions</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <Zap className="w-8 h-8 text-cyan-400 opacity-20" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50 mb-2">Successful</p>
                <p className="text-3xl font-bold text-emerald-400">{stats.successful}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-20" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50 mb-2">Failed</p>
                <p className="text-3xl font-bold text-red-400">{stats.failed}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400 opacity-20" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50 mb-2">Running</p>
                <p className="text-3xl font-bold text-cyan-400">{stats.running}</p>
              </div>
              <Zap className="w-8 h-8 text-cyan-400 opacity-20 animate-spin" />
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search by workflow name or execution ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.05] text-white placeholder-white/40 focus:outline-none focus:border-white/[0.2] transition-colors"
            />
          </div>

          <div className="flex gap-2">
            {(["all", "success", "failed", "running"] as const).map((status) => (
              <motion.button
                key={status}
                onClick={() => setStatusFilter(status)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200",
                  statusFilter === status
                    ? "bg-violet-600 text-white"
                    : "bg-white/[0.05] text-white/70 hover:text-white hover:bg-white/[0.1]"
                )}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Executions List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredExecutions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <ZapOff className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/50">No executions found</p>
              </motion.div>
            ) : (
              filteredExecutions.map((execution) => (
                <div key={execution.id}>
                  <ExecutionRow execution={execution} />

                  {/* Expandable Details */}
                  <AnimatePresence>
                    {expandedExecution === execution.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 mt-2 p-4 rounded-lg border-l-2 border-white/[0.1] space-y-2">
                          <h5 className="font-semibold text-white mb-3">Execution Steps</h5>
                          {execution.steps.map((step, idx) => {
                            const stepConfig = statusConfig[step.status];
                            return (
                              <div
                                key={step.id}
                                className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]"
                              >
                                <div className={cn("p-1.5 rounded", stepConfig.bg)}>
                                  {stepConfig.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-white">{step.name}</p>
                                    {step.duration && (
                                      <span className="text-xs text-white/50">
                                        ({(step.duration / 1000).toFixed(2)}s)
                                      </span>
                                    )}
                                  </div>
                                  {step.error && (
                                    <p className="text-xs text-red-400/80">{step.error}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() =>
                      setExpandedExecution(expandedExecution === execution.id ? null : execution.id)
                    }
                    className="mt-2 text-sm text-white/50 hover:text-white transition-colors"
                  >
                    {expandedExecution === execution.id ? "Hide details" : "Show details"}
                  </button>
                </div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <div className="mt-12 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-start gap-3">
            <Code2 className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium mb-1">Real-time monitoring enabled</p>
              <p className="text-sm text-white/60">
                Executions are logged in real-time. Use filters to search by status, workflow, or time
                period. Click on any execution to see detailed step-by-step logs and debug information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
