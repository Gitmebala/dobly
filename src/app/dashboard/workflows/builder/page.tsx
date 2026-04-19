"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Play,
  Save,
  ArrowRight,
  Zap,
  CheckCircle2,
  Clock,
  Filter,
  AlertCircle,
  ChevronDown,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStep {
  id: string;
  type: "trigger" | "action" | "condition";
  name: string;
  description: string;
  config: Record<string, any>;
}

interface WorkflowData {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  isActive: boolean;
}

const TRIGGERS = [
  { id: "webhook", name: "Webhook", icon: "🔗", description: "When a URL is called" },
  { id: "schedule", name: "Schedule", icon: "⏰", description: "On a schedule (daily, weekly, etc)" },
  { id: "email", name: "Email Received", icon: "📧", description: "When an email arrives" },
  { id: "form", name: "Form Submission", icon: "📝", description: "When a form is submitted" },
];

const ACTIONS = [
  { id: "send-email", name: "Send Email", icon: "📧", description: "Send an email to someone" },
  { id: "slack", name: "Send to Slack", icon: "💬", description: "Post a message to Slack" },
  { id: "create-task", name: "Create Task", icon: "✓", description: "Create a new task" },
  { id: "update-database", name: "Update Database", icon: "💾", description: "Save or update data" },
  { id: "api-call", name: "Call API", icon: "🔌", description: "Make an API request" },
  { id: "delay", name: "Delay", icon: "⏳", description: "Wait before next step" },
];

const CONDITIONS = [
  { id: "if-then", name: "If/Then", icon: "🔄", description: "Branch based on condition" },
  { id: "filter", name: "Filter", icon: "🔍", description: "Only continue if criteria met" },
];

function StepCard({ step, onDelete }: { step: WorkflowStep; onDelete: () => void }) {
  const icons: Record<string, string> = {
    webhook: "🔗",
    schedule: "⏰",
    email: "📧",
    form: "📝",
    "send-email": "📧",
    slack: "💬",
    "create-task": "✓",
    "update-database": "💾",
    "api-call": "🔌",
    delay: "⏳",
    "if-then": "🔄",
    filter: "🔍",
  };

  const colors: Record<string, string> = {
    trigger: "border-cyan-500/30 bg-cyan-500/5",
    action: "border-violet-500/30 bg-violet-500/5",
    condition: "border-amber-500/30 bg-amber-500/5",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative group p-4 rounded-2xl border transition-all duration-300",
        colors[step.type],
        "hover:shadow-lg hover:border-opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="text-2xl mt-1">{icons[step.id] || "⚙️"}</div>
          <div className="flex-1">
            <h4 className="font-semibold text-white">{step.name}</h4>
            <p className="text-sm text-white/60 mt-1">{step.description}</p>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </motion.div>
  );
}

function StepSelector({
  category,
  items,
  onSelect,
  onClose,
}: {
  category: string;
  items: typeof TRIGGERS;
  onSelect: (item: any) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <motion.div className="relative bg-[#0f0f14] border border-white/[0.1] rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white capitalize">Choose {category}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/[0.1] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => {
                onSelect(item);
                onClose();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="text-left p-4 rounded-2xl border border-white/[0.1] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.05] transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{item.icon}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white group-hover:text-white transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-sm text-white/50 mt-1">{item.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function WorkflowBuilder() {
  const [workflow, setWorkflow] = useState<WorkflowData>({
    id: "new-workflow",
    name: "Untitled Workflow",
    description: "",
    steps: [],
    isActive: false,
  });

  const [selectorOpen, setSelectorOpen] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);

  const addStep = (item: any, category: string) => {
    const newStep: WorkflowStep = {
      id: item.id,
      type: category as any,
      name: item.name,
      description: item.description,
      config: {},
    };
    setWorkflow({
      ...workflow,
      steps: [...workflow.steps, newStep],
    });
  };

  const deleteStep = (index: number) => {
    setWorkflow({
      ...workflow,
      steps: workflow.steps.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,0.5)] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setShowNameModal(true)}
              className="group text-left hover:opacity-70 transition-opacity"
            >
              <h1 className="text-4xl font-bold text-white group-hover:text-violet-400 transition-colors">
                {workflow.name}
              </h1>
              <p className="text-white/50 mt-2">{workflow.description || "No description"}</p>
            </button>

            <div className="flex items-center gap-3">
              <button className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors font-medium">
                Test
              </button>
              <button className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-colors font-medium flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save
              </button>
              <button className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors font-medium flex items-center gap-2">
                <Play className="w-4 h-4" />
                Deploy
              </button>
            </div>
          </div>
        </div>

        {/* Workflow Builder Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar with step types */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
                  Triggers
                </h3>
                <button
                  onClick={() => setSelectorOpen("trigger")}
                  className="w-full p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-cyan-400" />
                    <span className="font-medium text-white group-hover:text-cyan-300">Add Trigger</span>
                  </div>
                  <p className="text-xs text-white/50 mt-2">How this workflow starts</p>
                </button>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
                  Actions
                </h3>
                <button
                  onClick={() => setSelectorOpen("action")}
                  className="w-full p-4 rounded-2xl border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-violet-400" />
                    <span className="font-medium text-white group-hover:text-violet-300">Add Action</span>
                  </div>
                  <p className="text-xs text-white/50 mt-2">What should happen</p>
                </button>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
                  Logic
                </h3>
                <button
                  onClick={() => setSelectorOpen("condition")}
                  className="w-full p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-amber-400" />
                    <span className="font-medium text-white group-hover:text-amber-300">Add Condition</span>
                  </div>
                  <p className="text-xs text-white/50 mt-2">Branch or filter</p>
                </button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-2">
            {workflow.steps.length === 0 ? (
              <div className="border-2 border-dashed border-white/[0.1] rounded-3xl p-12 text-center">
                <Zap className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white/70 mb-2">No steps yet</h3>
                <p className="text-white/50 mb-6">Start by adding a trigger to begin your workflow</p>
                <button
                  onClick={() => setSelectorOpen("trigger")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add First Step
                </button>
              </div>
            ) : (
              <motion.div className="space-y-4">
                <AnimatePresence>
                  {workflow.steps.map((step, index) => (
                    <motion.div key={step.id + index} initial={{ opacity: 0 }} exit={{ opacity: 0 }}>
                      <StepCard
                        step={step}
                        onDelete={() => deleteStep(index)}
                      />
                      {index < workflow.steps.length - 1 && (
                        <div className="flex justify-center py-2">
                          <ArrowRight className="w-5 h-5 text-white/30 rotate-90" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="grid grid-cols-3 gap-2 pt-4">
                  <button
                    onClick={() => setSelectorOpen("trigger")}
                    className="p-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 font-medium text-sm transition-colors"
                  >
                    + Trigger
                  </button>
                  <button
                    onClick={() => setSelectorOpen("action")}
                    className="p-3 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-300 font-medium text-sm transition-colors"
                  >
                    + Action
                  </button>
                  <button
                    onClick={() => setSelectorOpen("condition")}
                    className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 font-medium text-sm transition-colors"
                  >
                    + Condition
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Step Selector Modal */}
      <AnimatePresence>
        {selectorOpen === "trigger" && (
          <StepSelector
            category="trigger"
            items={TRIGGERS}
            onSelect={(item) => addStep(item, "trigger")}
            onClose={() => setSelectorOpen(null)}
          />
        )}
        {selectorOpen === "action" && (
          <StepSelector
            category="action"
            items={ACTIONS}
            onSelect={(item) => addStep(item, "action")}
            onClose={() => setSelectorOpen(null)}
          />
        )}
        {selectorOpen === "condition" && (
          <StepSelector
            category="condition"
            items={CONDITIONS}
            onSelect={(item) => addStep(item, "condition")}
            onClose={() => setSelectorOpen(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
