"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Copy,
  Download,
  RotateCcw,
  MessageCircle,
  Code2,
  TrendingUp,
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
  input?: any;
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
  successCount: number;
  totalSteps: number;
}

// Mock execution detail data
const MOCK_EXECUTION: WorkflowExecution = {
  id: "exec-001",
  workflowId: "wf-001",
  workflowName: "Daily Email Report",
  status: "success",
  startedAt: new Date(Date.now() - 2 * 60000).toISOString(),
  completedAt: new Date(Date.now() - 1 * 60000).toISOString(),
  totalDuration: 45000,
  totalCost: 0.002,
  trigger: "Schedule: Daily at 9:00 AM",
  successCount: 4,
  totalSteps: 4,
  steps: [
    {
      id: "step-1",
      name: "Fetch Google Analytics",
      status: "success",
      startedAt: new Date(Date.now() - 45000).toISOString(),
      completedAt: new Date(Date.now() - 40000).toISOString(),
      duration: 5000,
      input: {
        propertyId: "UA-123456",
        dateRange: "today",
      },
      output: {
        pageviews: 1234,
        sessions: 856,
        users: 432,
      },
    },
    {
      id: "step-2",
      name: "Process Data",
      status: "success",
      startedAt: new Date(Date.now() - 40000).toISOString(),
      completedAt: new Date(Date.now() - 35000).toISOString(),
      duration: 5000,
      input: {
        data: "Analytics metrics",
      },
      output: {
        metrics: "processed",
        trends: "calculated",
      },
    },
    {
      id: "step-3",
      name: "Generate Report",
      status: "success",
      startedAt: new Date(Date.now() - 35000).toISOString(),
      completedAt: new Date(Date.now() - 10000).toISOString(),
      duration: 25000,
      input: {
        template: "daily-summary",
      },
      output: {
        reportId: "rpt-782910",
        pages: 3,
        format: "pdf",
      },
    },
    {
      id: "step-4",
      name: "Send Email",
      status: "success",
      startedAt: new Date(Date.now() - 10000).toISOString(),
      completedAt: new Date(Date.now() - 1000).toISOString(),
      duration: 9000,
      input: {
        to: "team@example.com",
        subject: "Daily Report",
      },
      output: {
        messageId: "mid-123456",
        sent: true,
      },
    },
  ],
};

const statusConfig: Record<ExecutionStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  success: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    icon: <CheckCircle2 className="w-6 h-6" />,
    label: "Succeeded",
  },
  failed: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    icon: <AlertCircle className="w-6 h-6" />,
    label: "Failed",
  },
  running: {
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    icon: <Zap className="w-6 h-6 animate-pulse" />,
    label: "Running",
  },
  pending: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    icon: <Clock className="w-6 h-6" />,
    label: "Pending",
  },
};

function JsonViewer({ data }: { data: any }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <pre className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.1] text-white/80 text-xs overflow-x-auto max-h-[300px] overflow-y-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded-lg bg-white/[0.1] hover:bg-white/[0.15] transition-colors"
        title="Copy to clipboard"
      >
        <Copy className={cn("w-4 h-4 transition-colors", copied ? "text-emerald-400" : "text-white/60")} />
      </button>
    </div>
  );
}

function StepDetail({ step, index }: { step: ExecutionStep; index: number }) {
  const config = statusConfig[step.status];
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
    >
      {/* Step Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4 flex-1">
          <div className={cn("p-3 rounded-xl", config.bg)}>{config.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-lg font-semibold text-white">{step.name}</h4>
              <span className={cn("text-sm font-medium", config.color)}>{config.label}</span>
            </div>
            <p className="text-sm text-white/50">Step {index + 1} of 4</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-white/50 mb-1">Duration</p>
          <p className="text-sm font-medium text-white">
            {step.duration ? `${(step.duration / 1000).toFixed(2)}s` : "—"}
          </p>
        </div>
      </div>

      {/* Timing */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
        <div>
          <p className="text-xs text-white/50 mb-1">Started</p>
          <p className="text-sm font-medium text-white">
            {new Date(step.startedAt).toLocaleTimeString()}
          </p>
        </div>
        {step.completedAt && (
          <div>
            <p className="text-xs text-white/50 mb-1">Completed</p>
            <p className="text-sm font-medium text-white">
              {new Date(step.completedAt).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      {/* Input/Output */}
      {(step.input || step.output) && (
        <div className="space-y-4">
          {step.input && (
            <div>
              <button
                onClick={() => setShowInput(!showInput)}
                className="flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors mb-2"
              >
                <Code2 className="w-4 h-4" />
                Input
              </button>
              {showInput && <JsonViewer data={step.input} />}
            </div>
          )}

          {step.output && (
            <div>
              <button
                onClick={() => setShowOutput(!showOutput)}
                className="flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors mb-2"
              >
                <Code2 className="w-4 h-4" />
                Output
              </button>
              {showOutput && <JsonViewer data={step.output} />}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {step.error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300 mb-1">Error</p>
              <p className="text-sm text-red-200/80">{step.error}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function ExecutionDetailPage({ params }: { params: { id: string } }) {
  const execution = MOCK_EXECUTION;
  const config = statusConfig[execution.status];

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,0.5)] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/workflows/executions"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to executions
          </Link>

          <div className="flex items-start justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{execution.workflowName}</h1>
              <p className="text-white/50">{execution.trigger}</p>
            </div>

            <div className={cn("p-4 rounded-2xl", config.bg)}>
              {config.icon}
            </div>
          </div>

          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]"
            >
              <p className="text-xs text-white/50 mb-2">Status</p>
              <p className={cn("text-lg font-bold", config.color)}>{config.label}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]"
            >
              <p className="text-xs text-white/50 mb-2">Total Duration</p>
              <p className="text-lg font-bold text-white">
                {execution.totalDuration ? `${(execution.totalDuration / 1000).toFixed(2)}s` : "—"}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]"
            >
              <p className="text-xs text-white/50 mb-2">Steps Completed</p>
              <p className="text-lg font-bold text-white">
                {execution.successCount}/{execution.totalSteps}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]"
            >
              <p className="text-xs text-white/50 mb-2">Cost</p>
              <p className="text-lg font-bold text-white">
                ${execution.totalCost?.toFixed(4) || "0.0000"}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Step Timeline */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Execution Steps</h2>
          <div className="space-y-4">
            {execution.steps.map((step, index) => (
              <StepDetail key={step.id} step={step} index={index} />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          <button className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-medium transition-colors">
            <Download className="w-4 h-4" />
            Export Logs
          </button>
          <button className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-medium transition-colors">
            <MessageCircle className="w-4 h-4" />
            Add Comment
          </button>
          <button className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-medium transition-colors">
            <RotateCcw className="w-4 h-4" />
            Retry Execution
          </button>
        </div>

        {/* Execution Info */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-white/50 mb-2">Execution ID</p>
              <p className="font-mono text-sm text-white">{execution.id}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-2">Started At</p>
              <p className="text-sm text-white">{new Date(execution.startedAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-2">Workflow ID</p>
              <p className="font-mono text-sm text-white">{execution.workflowId}</p>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium mb-1">Detailed execution logs available</p>
              <p className="text-sm text-white/60">
                Each step shows input, output, and timing information. Use these logs to debug issues and
                understand workflow performance. Export logs for analysis or archival.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
