"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

interface PromptsForm {
  systemPrompt: string;
  conversationTone: "professional" | "friendly" | "empathetic" | "formal";
  behaviorRules: string[];
  maxResponseLength: number;
  knowledgeBase: string;
}

const TONE_OPTIONS = [
  { value: "professional", label: "Professional", description: "Formal and business-like" },
  { value: "friendly", label: "Friendly", description: "Warm and approachable" },
  { value: "empathetic", label: "Empathetic", description: "Understanding and compassionate" },
  { value: "formal", label: "Formal", description: "Strict and protocol-driven" },
];

const PROMPT_TEMPLATES = {
  receptionist:
    "You are a friendly and professional receptionist for [Company]. Your role is to greet callers warmly, gather their information, understand their needs, and route them to the appropriate department or person. Be helpful and efficient.",
  support:
    "You are a knowledgeable support agent for [Company]. Your role is to help customers troubleshoot issues, answer common questions, and escalate complex problems to specialists. Be patient, clear, and solution-focused.",
  sales:
    "You are a sales representative for [Company]. Your role is to qualify leads, understand customer needs, present relevant solutions, and schedule follow-up meetings. Be persuasive but respect customer boundaries.",
  hr: "You are an HR assistant for [Company]. Your role is to answer employee questions about policies, benefits, time off, and onboarding. Be professional, accurate, and supportive.",
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

  // Load current config
  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(`/api/workflows/${workflowId}/agent-config`);
        if (response.ok) {
          const { agentConfig } = await response.json();
          if (agentConfig) {
            setForm({
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
    if (newRule.trim()) {
      setForm((current) => ({
        ...current,
        behaviorRules: [...current.behaviorRules, newRule.trim()],
      }));
      setNewRule("");
    }
  }

  function removeRule(index: number) {
    setForm((current) => ({
      ...current,
      behaviorRules: current.behaviorRules.filter((_, i) => i !== index),
    }));
  }

  function applyTemplate(template: string) {
    setForm((current) => ({
      ...current,
      systemPrompt: template,
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/agent-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: {
            definition: {
              operator: {
                agentConfig: form,
              },
            },
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
    return <div className="text-center py-8 text-text-muted">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text">Prompts & Behavior</h2>
        <p className="mt-2 text-text-muted">
          Configure how your agent thinks, speaks, and behaves during conversations
        </p>
      </div>

      <div className="space-y-6">
        {/* System Prompt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-text">System Prompt</label>
            <div className="flex gap-2">
              <button
                onClick={() => applyTemplate(PROMPT_TEMPLATES.receptionist)}
                className="text-xs text-accent hover:text-accent/80"
              >
                Receptionist
              </button>
              <button
                onClick={() => applyTemplate(PROMPT_TEMPLATES.support)}
                className="text-xs text-accent hover:text-accent/80"
              >
                Support
              </button>
              <button
                onClick={() => applyTemplate(PROMPT_TEMPLATES.sales)}
                className="text-xs text-accent hover:text-accent/80"
              >
                Sales
              </button>
              <button
                onClick={() => applyTemplate(PROMPT_TEMPLATES.hr)}
                className="text-xs text-accent hover:text-accent/80"
              >
                HR
              </button>
            </div>
          </div>
          <textarea
            value={form.systemPrompt}
            onChange={(e) => updateField("systemPrompt", e.target.value)}
            placeholder="You are a helpful customer service agent..."
            className="input min-h-[160px] font-mono text-sm"
          />
          <p className="mt-2 text-xs text-text-muted">
            This prompt defines the agent's personality, role, and constraints.
          </p>
        </div>

        {/* Conversation Tone */}
        <div>
          <label className="block text-sm font-medium text-text mb-3">Conversation Tone</label>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {TONE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updateField("conversationTone", option.value as any)}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  form.conversationTone === option.value
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <div className="font-medium text-sm text-text">{option.label}</div>
                <div className="mt-1 text-xs text-text-muted">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Response Length */}
        <div>
          <label className="block text-sm font-medium text-text">Max Response Length</label>
          <input
            type="number"
            value={form.maxResponseLength}
            onChange={(e) => updateField("maxResponseLength", parseInt(e.target.value))}
            className="input mt-2"
          />
          <p className="mt-1 text-xs text-text-muted">Maximum characters per response</p>
        </div>

        {/* Behavior Rules */}
        <div>
          <label className="block text-sm font-medium text-text mb-3">Behavior Rules</label>
          <div className="space-y-2">
            {form.behaviorRules.map((rule, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border border-border bg-[rgba(255,255,255,0.02)] p-3"
              >
                <div className="flex-1">
                  <p className="text-sm text-text">{rule}</p>
                </div>
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
              placeholder="E.g., Always confirm details before proceeding..."
              className="input flex-1"
            />
            <button onClick={addRule} className="btn-secondary">
              <Plus className="h-4 w-4" />
              Add Rule
            </button>
          </div>
          <p className="mt-2 text-xs text-text-muted">Add specific behaviors or constraints</p>
        </div>

        {/* Knowledge Base */}
        <div>
          <label className="block text-sm font-medium text-text">Knowledge Base Context</label>
          <textarea
            value={form.knowledgeBase}
            onChange={(e) => updateField("knowledgeBase", e.target.value)}
            placeholder="Paste relevant company information, FAQs, or documentation..."
            className="input mt-2 min-h-[120px] font-mono text-sm"
          />
          <p className="mt-2 text-xs text-text-muted">
            Provide reference material the agent can use
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 border-t border-border pt-6">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
