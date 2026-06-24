"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import type { AgentDepartment } from "@/types";

interface PromptsForm {
  profile?: {
    department?: AgentDepartment;
  };
  systemPrompt: string;
  conversationTone: "professional" | "friendly" | "empathetic" | "formal";
  behaviorRules: string[];
  maxResponseLength: number;
  knowledgeBase: string;
}

const TONE_OPTIONS = [
  { value: "professional", label: "Professional", description: "Clear, steady, business-safe" },
  { value: "friendly", label: "Friendly", description: "Warm, welcoming, and easy to talk to" },
  { value: "empathetic", label: "Empathetic", description: "Calm, understanding, and reassuring" },
  { value: "formal", label: "Formal", description: "Strict, careful, and policy-led" },
] as const;

const PROMPT_TEMPLATES: Record<
  AgentDepartment,
  {
    label: string;
    prompt: string;
    rules: string[];
  }
> = {
  front_desk: {
    label: "Front Desk",
    prompt:
      "You are the front desk. Welcome callers warmly, understand why they are calling, capture any missing details, and either route, book, or escalate the next step cleanly. Never guess policies or availability.",
    rules: [
      "Keep the caller oriented and tell them what is happening next.",
      "Confirm names, times, and contact details before routing or booking.",
      "Escalate urgent, legal, or clearly risky situations immediately.",
    ],
  },
  support_desk: {
    label: "Support Desk",
    prompt:
      "You are the support desk. Clarify the issue, gather the facts, solve what is known and approved, and escalate technical or risky cases with a strong summary.",
    rules: [
      "Start by understanding the issue before offering a fix.",
      "Never invent policy exceptions or refunds.",
      "End with a clear recap of the next step.",
    ],
  },
  sales_desk: {
    label: "Sales Desk",
    prompt:
      "You are the sales desk. Qualify new inquiries, understand urgency and fit, and guide strong opportunities toward the next step without sounding pushy.",
    rules: [
      "Qualify before pitching.",
      "Capture timing, goals, and seriousness where possible.",
      "Never promise unapproved pricing, availability, or outcomes.",
    ],
  },
  finance_desk: {
    label: "Finance Desk",
    prompt:
      "You are the finance desk. Help callers with invoice, billing, and payment questions clearly and calmly while keeping the record accurate and escalating disputes fast.",
    rules: [
      "Confirm account or invoice details before discussing balances.",
      "State payment facts clearly without sounding aggressive.",
      "Escalate disputes, fraud, and policy exceptions immediately.",
    ],
  },
  custom: {
    label: "Custom",
    prompt:
      "Stay within the approved role, collect enough context to move the work forward, and escalate instead of guessing.",
    rules: [
      "Be clear about what you can and cannot do.",
      "Collect the next best detail before acting.",
      "Escalate when the request is risky, unclear, or out of scope.",
    ],
  },
};

export default function PromptsPage() {
  const params = useParams();
  const workflowId = String(params?.id ?? "");
  const [form, setForm] = useState<PromptsForm>({
    systemPrompt: "",
    conversationTone: "professional",
    behaviorRules: [],
    maxResponseLength: 500,
    knowledgeBase: "",
  });
  const [newRule, setNewRule] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(`/api/workflows/${workflowId}/agent-config`);
        if (response.ok) {
          const { agentConfig } = await response.json();
          if (agentConfig) {
            setForm({
              profile: agentConfig.profile,
              systemPrompt: agentConfig.systemPrompt || "",
              conversationTone: agentConfig.conversationTone || "professional",
              behaviorRules: agentConfig.behaviorRules || [],
              maxResponseLength: agentConfig.maxResponseLength || 500,
              knowledgeBase: agentConfig.knowledgeBase || "",
            });
          }
        }
      } catch (error) {
        console.error("Failed to load config:", error);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [workflowId]);

  function updateField<K extends keyof PromptsForm>(key: K, value: PromptsForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addRule() {
    if (!newRule.trim()) return;
    setForm((current) => ({
      ...current,
      behaviorRules: [...current.behaviorRules, newRule.trim()],
    }));
    setNewRule("");
  }

  function removeRule(index: number) {
    setForm((current) => ({
      ...current,
      behaviorRules: current.behaviorRules.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function applyTemplate(department: AgentDepartment) {
    const template = PROMPT_TEMPLATES[department];
    setForm((current) => ({
      ...current,
      systemPrompt: template.prompt,
      behaviorRules: template.rules,
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/agent-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentConfig: {
            systemPrompt: form.systemPrompt,
            conversationTone: form.conversationTone,
            behaviorRules: form.behaviorRules,
            maxResponseLength: form.maxResponseLength,
            knowledgeBase: form.knowledgeBase,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to save");
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-text-muted">Loading configuration...</div>;
  }

  const department = form.profile?.department || "custom";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text">Prompts & Handling Rules</h2>
        <p className="mt-2 text-text-muted">
          This is where the desk becomes sharp. Shape how Dobly speaks, what it avoids, and how
          it handles this role under pressure.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="block text-sm font-medium text-text">Desk Template</label>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-text-muted">
              Current: {PROMPT_TEMPLATES[department].label}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PROMPT_TEMPLATES) as AgentDepartment[]).map((key) => (
              <button
                key={key}
                onClick={() => applyTemplate(key)}
                className="rounded-full border border-border px-3 py-2 text-xs text-text-muted transition hover:border-accent/50 hover:text-text"
              >
                Use {PROMPT_TEMPLATES[key].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-text">System Prompt</label>
          <textarea
            value={form.systemPrompt}
            onChange={(e) => updateField("systemPrompt", e.target.value)}
            placeholder="Define the desk role, what it should optimize for, and where it should stop."
            className="input min-h-[180px] font-mono text-sm"
          />
          <p className="mt-2 text-xs text-text-muted">
            Keep this focused on the job, the boundaries, and the kind of next steps it should
            prefer.
          </p>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-text">Conversation Tone</label>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {TONE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updateField("conversationTone", option.value)}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  form.conversationTone === option.value
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <div className="text-sm font-medium text-text">{option.label}</div>
                <div className="mt-1 text-xs text-text-muted">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text">
            Max Response Length: {form.maxResponseLength} chars
          </label>
          <input
            type="range"
            min="180"
            max="1200"
            step="20"
            value={form.maxResponseLength}
            onChange={(e) => updateField("maxResponseLength", parseInt(e.target.value, 10))}
            className="mt-2 w-full"
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-text">Behavior Rules</label>
          <div className="space-y-2">
            {form.behaviorRules.map((rule, index) => (
              <div
                key={`${rule}-${index}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-[rgba(255,255,255,0.02)] p-3"
              >
                <div className="flex-1 text-sm text-text">{rule}</div>
                <button
                  onClick={() => removeRule(index)}
                  className="text-text-muted hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRule();
                }
              }}
              placeholder="Always confirm names and contact details before routing."
              className="input flex-1"
            />
            <button onClick={addRule} className="btn-secondary">
              <Plus className="h-4 w-4" />
              Add Rule
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text">Knowledge Base Context</label>
          <textarea
            value={form.knowledgeBase}
            onChange={(e) => updateField("knowledgeBase", e.target.value)}
            placeholder="Paste FAQs, service rules, office hours, product notes, or escalation guidance."
            className="input mt-2 min-h-[140px] font-mono text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3 border-t border-border pt-6">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Handling Rules"}
        </button>
        <button className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
