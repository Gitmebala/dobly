"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Zap,
  Clock,
  AlertCircle,
  Download,
  Filter,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowCost {
  id: string;
  name: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalCost: number;
  averageCostPerExecution: number;
  timeSaved: number; // in hours
  estimatedCost: number; // cost if done manually
}

interface CostTrend {
  date: string;
  cost: number;
  executions: number;
}

const MOCK_WORKFLOW_COSTS: WorkflowCost[] = [
  {
    id: "wf-001",
    name: "Daily Email Report",
    totalExecutions: 365,
    successfulExecutions: 362,
    failedExecutions: 3,
    totalCost: 18.50,
    averageCostPerExecution: 0.051,
    timeSaved: 120,
    estimatedCost: 1200,
  },
  {
    id: "wf-002",
    name: "Lead Qualification",
    totalExecutions: 1230,
    successfulExecutions: 1198,
    failedExecutions: 32,
    totalCost: 245.60,
    averageCostPerExecution: 0.199,
    timeSaved: 205,
    estimatedCost: 4100,
  },
  {
    id: "wf-003",
    name: "Invoice Processing",
    totalExecutions: 450,
    successfulExecutions: 445,
    failedExecutions: 5,
    totalCost: 112.50,
    averageCostPerExecution: 0.25,
    timeSaved: 90,
    estimatedCost: 1800,
  },
  {
    id: "wf-004",
    name: "Slack Notifications",
    totalExecutions: 2145,
    successfulExecutions: 2140,
    failedExecutions: 5,
    totalCost: 32.18,
    averageCostPerExecution: 0.015,
    timeSaved: 35,
    estimatedCost: 700,
  },
  {
    id: "wf-005",
    name: "Follow-up Sequence",
    totalExecutions: 890,
    successfulExecutions: 856,
    failedExecutions: 34,
    totalCost: 267.99,
    averageCostPerExecution: 0.301,
    timeSaved: 150,
    estimatedCost: 3000,
  },
];

const MOCK_COST_TRENDS: CostTrend[] = [
  { date: "Jan 1", cost: 45.67, executions: 234 },
  { date: "Jan 8", cost: 52.34, executions: 289 },
  { date: "Jan 15", cost: 48.90, executions: 267 },
  { date: "Jan 22", cost: 61.45, executions: 334 },
  { date: "Jan 29", cost: 58.23, executions: 312 },
  { date: "Feb 5", cost: 72.18, executions: 389 },
  { date: "Feb 12", cost: 68.90, executions: 367 },
];

function WorkflowCostCard({ workflow, index }: { workflow: WorkflowCost; index: number }) {
  const successRate = ((workflow.successfulExecutions / workflow.totalExecutions) * 100).toFixed(1);
  const roi = ((workflow.estimatedCost - workflow.totalCost) / workflow.estimatedCost * 100).toFixed(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-white">{workflow.name}</h4>
          <p className="text-sm text-white/50 mt-1">{workflow.totalExecutions.toLocaleString()} total executions</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-emerald-400">${workflow.totalCost.toFixed(2)}</p>
          <p className="text-xs text-white/50 mt-1">Total cost</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <p className="text-xs text-white/50 mb-1">Success Rate</p>
          <p className="text-lg font-bold text-white">{successRate}%</p>
        </div>
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <p className="text-xs text-white/50 mb-1">Avg Cost/Run</p>
          <p className="text-lg font-bold text-white">${workflow.averageCostPerExecution.toFixed(3)}</p>
        </div>
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <p className="text-xs text-white/50 mb-1">Time Saved</p>
          <p className="text-lg font-bold text-white">{workflow.timeSaved}h</p>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
        <div>
          <p className="text-xs text-emerald-300 font-medium mb-1">Estimated ROI</p>
          <p className="text-sm text-emerald-400 font-bold">
            You save ${(workflow.estimatedCost - workflow.totalCost).toFixed(2)} ({roi}%)
          </p>
        </div>
        <TrendingUp className="w-5 h-5 text-emerald-400" />
      </div>
    </motion.div>
  );
}

export default function CostDashboardPage() {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  const stats = useMemo(() => {
    const totalCost = MOCK_WORKFLOW_COSTS.reduce((sum, w) => sum + w.totalCost, 0);
    const totalExecutions = MOCK_WORKFLOW_COSTS.reduce((sum, w) => sum + w.totalExecutions, 0);
    const successfulExecutions = MOCK_WORKFLOW_COSTS.reduce((sum, w) => sum + w.successfulExecutions, 0);
    const totalTimeSaved = MOCK_WORKFLOW_COSTS.reduce((sum, w) => sum + w.timeSaved, 0);
    const totalEstimatedCost = MOCK_WORKFLOW_COSTS.reduce((sum, w) => sum + w.estimatedCost, 0);
    const totalROI = ((totalEstimatedCost - totalCost) / totalEstimatedCost * 100).toFixed(0);

    const successRate = ((successfulExecutions / totalExecutions) * 100).toFixed(1);

    return {
      totalCost,
      totalExecutions,
      timeSaved: totalTimeSaved,
      roi: totalROI,
      successRate,
      savings: totalEstimatedCost - totalCost,
    };
  }, []);

  const costByWorkflow = useMemo(() => {
    return MOCK_WORKFLOW_COSTS.sort((a, b) => b.totalCost - a.totalCost).slice(0, 5);
  }, []);

  const topROI = useMemo(() => {
    return MOCK_WORKFLOW_COSTS.sort((a, b) => {
      const roiA = (b.estimatedCost - b.totalCost) / b.estimatedCost;
      const roiB = (a.estimatedCost - a.totalCost) / a.estimatedCost;
      return roiB - roiA;
    }).slice(0, 3);
  }, []);

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,0.5)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-3">Cost & ROI Dashboard</h1>
            <p className="text-white/50">
              Track automation costs, executions, and return on investment across all workflows.
            </p>
          </div>

          <div className="flex gap-2">
            {(["month", "quarter", "year"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200",
                  period === p
                    ? "bg-violet-600 text-white"
                    : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"
                )}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/50">Total Cost</p>
              <Zap className="w-5 h-5 text-cyan-400 opacity-40" />
            </div>
            <p className="text-3xl font-bold text-white mb-2">${stats.totalCost.toFixed(2)}</p>
            <p className="text-xs text-cyan-400">This month</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/50">Total Executions</p>
              <BarChart3 className="w-5 h-5 text-blue-400 opacity-40" />
            </div>
            <p className="text-3xl font-bold text-white mb-2">{stats.totalExecutions.toLocaleString()}</p>
            <p className="text-xs text-blue-400">Success rate: {stats.successRate}%</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/50">Time Saved</p>
              <Clock className="w-5 h-5 text-orange-400 opacity-40" />
            </div>
            <p className="text-3xl font-bold text-white mb-2">{stats.timeSaved}h</p>
            <p className="text-xs text-orange-400">Equivalent to {(stats.timeSaved / 40).toFixed(1)} work weeks</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-emerald-300">ROI & Savings</p>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-emerald-400 mb-2">{stats.roi}% ROI</p>
            <p className="text-xs text-emerald-300">${stats.savings.toFixed(2)} savings</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Cost Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
          >
            <h3 className="text-lg font-semibold text-white mb-6">Cost Trend</h3>

            {/* Simple Bar Chart */}
            <div className="space-y-4">
              {MOCK_COST_TRENDS.map((trend, idx) => {
                const maxCost = Math.max(...MOCK_COST_TRENDS.map((t) => t.cost));
                const percentage = (trend.cost / maxCost) * 100;

                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="text-white/70 font-medium">{trend.date}</span>
                      <span className="text-white">
                        ${trend.cost.toFixed(2)} • {trend.executions} executions
                      </span>
                    </div>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: idx * 0.05, duration: 0.8 }}
                      className="h-2 rounded-full bg-gradient-to-r from-violet-600 to-blue-600"
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Top ROI Workflows */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Top ROI</h3>

            <div className="space-y-3">
              {topROI.map((workflow, idx) => {
                const roi = ((workflow.estimatedCost - workflow.totalCost) / workflow.estimatedCost * 100).toFixed(0);
                return (
                  <motion.div
                    key={workflow.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]"
                  >
                    <p className="text-xs font-medium text-white mb-1 truncate">{workflow.name}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white/60">
                        Save ${(workflow.estimatedCost - workflow.totalCost).toFixed(0)}
                      </p>
                      <p className="text-sm font-bold text-emerald-400">{roi}%</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Workflows Cost Breakdown */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Workflow Cost Breakdown</h2>
          <div className="grid grid-cols-1 gap-4">
            {MOCK_WORKFLOW_COSTS.map((workflow, index) => (
              <WorkflowCostCard key={workflow.id} workflow={workflow} index={index} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-medium mb-1">Cost calculation details</p>
              <p className="text-sm text-white/60">
                Costs are calculated based on execution counts, API calls, and integration usage. Time savings are estimated based on average manual task duration. ROI compares total automation costs to estimated cost of manual execution.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
