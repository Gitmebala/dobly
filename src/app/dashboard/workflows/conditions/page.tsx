"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ZapOff,
  GitBranch,
  Code2,
  Check,
  AlertCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Operator = "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
type LogicalOperator = "AND" | "OR";
type DataType = "text" | "number" | "date" | "boolean" | "array" | "object";

interface Condition {
  id: string;
  field: string;
  operator: Operator;
  value: string;
  dataType: DataType;
}

interface ConditionGroup {
  id: string;
  operator: LogicalOperator;
  conditions: (Condition | ConditionGroup)[];
}

const OPERATORS: Record<DataType, { value: Operator; label: string }[]> = {
  text: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does not contain" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  number: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "greater_than", label: "Greater than" },
    { value: "less_than", label: "Less than" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  date: [
    { value: "equals", label: "Is" },
    { value: "greater_than", label: "Is after" },
    { value: "less_than", label: "Is before" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  boolean: [
    { value: "equals", label: "Is true" },
    { value: "not_equals", label: "Is false" },
  ],
  array: [
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does not contain" },
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
  object: [
    { value: "is_empty", label: "Is empty" },
    { value: "is_not_empty", label: "Is not empty" },
  ],
};

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function ConditionBlock({
  condition,
  onUpdate,
  onDelete,
  index,
}: {
  condition: Condition;
  onUpdate: (updated: Condition) => void;
  onDelete: () => void;
  index: number;
}) {
  const dataTypes: DataType[] = ["text", "number", "date", "boolean", "array", "object"];
  const operators = OPERATORS[condition.dataType] || OPERATORS.text;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-end gap-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] group"
    >
      <div className="flex-1 grid grid-cols-5 gap-2">
        {/* Field Selector */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">Field</label>
          <input
            type="text"
            placeholder="email, amount, date..."
            value={condition.field}
            onChange={(e) => onUpdate({ ...condition, field: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
          />
        </div>

        {/* Data Type */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">Type</label>
          <select
            value={condition.dataType}
            onChange={(e) => onUpdate({ ...condition, dataType: e.target.value as DataType })}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
          >
            {dataTypes.map((type) => (
              <option key={type} value={type} className="bg-slate-900">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Operator */}
        <div>
          <label className="text-xs text-white/50 mb-1 block">Operator</label>
          <select
            value={condition.operator}
            onChange={(e) => onUpdate({ ...condition, operator: e.target.value as Operator })}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
          >
            {operators.map((op) => (
              <option key={op.value} value={op.value} className="bg-slate-900">
                {op.label}
              </option>
            ))}
          </select>
        </div>

        {/* Value */}
        {!["is_empty", "is_not_empty"].includes(condition.operator) && (
          <div>
            <label className="text-xs text-white/50 mb-1 block">Value</label>
            <input
              type={condition.dataType === "number" ? "number" : condition.dataType === "date" ? "date" : "text"}
              placeholder="Enter value..."
              value={condition.value}
              onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/[0.2] transition-colors"
            />
          </div>
        )}
      </div>

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
        title="Delete condition"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function LogicalOperatorToggle({
  operator,
  onChange,
}: {
  operator: LogicalOperator;
  onChange: (op: LogicalOperator) => void;
}) {
  return (
    <div className="flex items-center gap-2 my-3 px-4">
      <div className="flex-1 h-px bg-white/[0.1]" />
      <div className="flex gap-2">
        {(["AND", "OR"] as const).map((op) => (
          <button
            key={op}
            onClick={() => onChange(op)}
            className={cn(
              "px-4 py-1 rounded-full text-sm font-medium transition-all duration-200",
              operator === op
                ? "bg-violet-600 text-white"
                : "bg-white/[0.05] text-white/70 hover:text-white hover:bg-white/[0.1]"
            )}
          >
            {op}
          </button>
        ))}
      </div>
      <div className="flex-1 h-px bg-white/[0.1]" />
    </div>
  );
}

export default function ConditionalLogicBuilder() {
  const [conditions, setConditions] = useState<Condition[]>([
    {
      id: generateId(),
      field: "amount",
      operator: "greater_than",
      value: "1000",
      dataType: "number",
    },
  ]);
  const [logicalOperator, setLogicalOperator] = useState<LogicalOperator>("AND");
  const [previewCode, setPreviewCode] = useState(false);

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: generateId(),
        field: "",
        operator: "equals",
        value: "",
        dataType: "text",
      },
    ]);
  };

  const updateCondition = (id: string, updated: Condition) => {
    setConditions(conditions.map((c) => (c.id === id ? updated : c)));
  };

  const deleteCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const duplicateCondition = (id: string) => {
    const condition = conditions.find((c) => c.id === id);
    if (condition) {
      setConditions([
        ...conditions,
        {
          ...condition,
          id: generateId(),
        },
      ]);
    }
  };

  // Generate preview code
  const generateCode = () => {
    const conditionStrings = conditions.map((c) => {
      const operator = {
        equals: "===",
        not_equals: "!==",
        contains: ".includes",
        not_contains: "!.includes",
        greater_than: ">",
        less_than: "<",
        is_empty: "=== null || === ''",
        is_not_empty: "!== null && !== ''",
      }[c.operator];

      return `data.${c.field} ${operator} ${c.value}`;
    });

    return conditionStrings.join(` ${logicalOperator} `);
  };

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,0.5)] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">Conditional Logic Builder</h1>
          <p className="text-white/50">
            Create if/then logic for your workflows without writing code. Branch execution paths based on data conditions.
          </p>
        </div>

        {/* Main Builder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Builder Section */}
          <div className="lg:col-span-2">
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              {/* Conditions */}
              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Conditions</h3>

                <AnimatePresence mode="wait">
                  {conditions.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-8"
                    >
                      <ZapOff className="w-8 h-8 text-white/20 mx-auto mb-3" />
                      <p className="text-white/50 text-sm">No conditions yet</p>
                    </motion.div>
                  ) : (
                    <>
                      {conditions.map((condition, index) => (
                        <div key={condition.id}>
                          {index > 0 && (
                            <LogicalOperatorToggle
                              operator={logicalOperator}
                              onChange={setLogicalOperator}
                            />
                          )}

                          <div className="flex gap-2">
                            <div className="flex-1">
                              <ConditionBlock
                                condition={condition}
                                onUpdate={(updated) => updateCondition(condition.id, updated)}
                                onDelete={() => deleteCondition(condition.id)}
                                index={index}
                              />
                            </div>

                            <button
                              onClick={() => duplicateCondition(condition.id)}
                              className="mt-6 p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all"
                              title="Duplicate condition"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Add Condition Button */}
              <button
                onClick={addCondition}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/[0.2] hover:border-white/[0.3] text-white/70 hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Condition
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-4">
            {/* Visual Flow */}
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Flow Preview
              </h3>

              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <p className="text-xs text-cyan-300 font-medium mb-1">IF</p>
                  <p className="text-sm text-white">
                    {conditions.length === 0 ? "No conditions" : `${conditions.length} condition${conditions.length !== 1 ? "s" : ""}`}
                  </p>
                </div>

                <div className="flex justify-center">
                  <ChevronDown className="w-4 h-4 text-white/30" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <p className="text-xs text-emerald-300 font-medium">TRUE</p>
                    <p className="text-xs text-white/70 mt-1">Execute then branch</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                    <p className="text-xs text-red-300 font-medium">FALSE</p>
                    <p className="text-xs text-white/70 mt-1">Execute else branch</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Code Preview */}
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              <button
                onClick={() => setPreviewCode(!previewCode)}
                className="flex items-center gap-2 text-sm font-semibold text-white mb-3 hover:text-white/80 transition-colors w-full"
              >
                <Code2 className="w-4 h-4" />
                Code Preview
              </button>

              <AnimatePresence>
                {previewCode && (
                  <motion.pre
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.1] text-white/70 text-xs overflow-x-auto"
                  >
                    {generateCode()}
                  </motion.pre>
                )}
              </AnimatePresence>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
              <p className="text-xs text-white/50 mb-2">Summary</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Conditions:</span>
                  <span className="text-white font-medium">{conditions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Logic:</span>
                  <span className="text-white font-medium">{logicalOperator}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Common Patterns</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] text-left transition-colors group">
              <h4 className="font-semibold text-white mb-2">Amount Threshold</h4>
              <p className="text-xs text-white/60 mb-3">Route high-value transactions for approval</p>
              <span className="text-xs px-2 py-1 rounded bg-white/[0.05] text-white/70">amount &gt; 1000</span>
            </button>

            <button className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] text-left transition-colors group">
              <h4 className="font-semibold text-white mb-2">Status Check</h4>
              <p className="text-xs text-white/60 mb-3">Continue workflow if status is active</p>
              <span className="text-xs px-2 py-1 rounded bg-white/[0.05] text-white/70">status == "active"</span>
            </button>

            <button className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] text-left transition-colors group">
              <h4 className="font-semibold text-white mb-2">Date Range</h4>
              <p className="text-xs text-white/60 mb-3">Only run during business hours</p>
              <span className="text-xs px-2 py-1 rounded bg-white/[0.05] text-white/70">hour &gt;= 9 AND hour &lt;= 17</span>
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-start gap-4">
            <Check className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Ready to use this logic?</h3>
              <p className="text-sm text-white/60">
                Copy this condition logic into your workflow builder to create smart branching paths for your automations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
