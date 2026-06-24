"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { AgentDepartment, AgentConfig } from "@/types";

type BasicInfoForm = AgentConfig["profile"];

const DEPARTMENTS: Array<{
  id: AgentDepartment;
  label: string;
  description: string;
}> = [
  {
    id: "front_desk",
    label: "Front Desk",
    description: "Reception, routing, booking, and first-call handling.",
  },
  {
    id: "support_desk",
    label: "Support Desk",
    description: "Issue intake, triage, troubleshooting, and escalation.",
  },
  {
    id: "sales_desk",
    label: "Sales Desk",
    description: "Lead capture, qualification, and booking the next step.",
  },
  {
    id: "finance_desk",
    label: "Finance Desk",
    description: "Invoice, payment, collections, and billing follow-up.",
  },
  {
    id: "custom",
    label: "Custom",
    description: "A custom role when none of the desk presets fit cleanly.",
  },
];

const INDUSTRIES = [
  "Real Estate",
  "Healthcare",
  "E-commerce",
  "Hospitality",
  "Finance",
  "Technology",
  "Education",
  "Legal",
  "Manufacturing",
  "Retail",
  "Other",
];

const EMPTY_FORM: BasicInfoForm = {
  department: "front_desk",
  role: "",
  industry: "",
  businessName: "",
  description: "",
  firstMessage: "",
  successSignal: "",
};

export default function BasicInfoPage() {
  const params = useParams();
  const workflowId = String(params?.id ?? "");
  const [form, setForm] = useState<BasicInfoForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(`/api/workflows/${workflowId}/agent-config`);
        if (response.ok) {
          const { agentConfig } = await response.json();
          if (agentConfig?.profile) {
            setForm(agentConfig.profile);
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

  function updateField<K extends keyof BasicInfoForm>(key: K, value: BasicInfoForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/agent-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentConfig: {
            profile: form,
          },
          resetFromDepartmentPreset: true,
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text">Role Foundation</h2>
        <p className="mt-2 text-text-muted">
          Choose the desk this setup belongs to.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="mb-3 block text-sm font-medium text-text">Desk Type</label>
          <div className="grid gap-3 md:grid-cols-2">
            {DEPARTMENTS.map((department) => (
              <button
                key={department.id}
                onClick={() => updateField("department", department.id)}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${
                  form.department === department.id
                    ? "border-accent bg-accent/10"
                    : "border-border bg-[rgba(255,255,255,0.02)] hover:border-accent/50"
                }`}
              >
                <div className="font-medium text-text">{department.label}</div>
                <div className="mt-1 text-xs text-text-muted">{department.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-text">Role Title</label>
            <input
              value={form.role}
              onChange={(e) => updateField("role", e.target.value)}
              placeholder="Front Desk Coordinator"
              className="input mt-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text">Business Name</label>
            <input
              value={form.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
              placeholder="Dobly Dental"
              className="input mt-2"
            />
            <p className="mt-1 text-xs text-text-muted">
              Used in greetings, confirmations, and routing language.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text">Industry</label>
          <select
            value={form.industry}
            onChange={(e) => updateField("industry", e.target.value)}
            className="input mt-2"
          >
            <option value="">Select an industry...</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text">What this desk owns</label>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Explain the kinds of calls this desk should handle and where it should stop."
            className="input mt-2 min-h-[120px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text">First line on the call</label>
          <textarea
            value={form.firstMessage}
            onChange={(e) => updateField("firstMessage", e.target.value)}
            placeholder="Thanks for calling. How can I help you today?"
            className="input mt-2 min-h-[90px]"
          />
          <p className="mt-1 text-xs text-text-muted">
            This is the first thing callers hear once the line is answered.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text">What success looks like</label>
          <textarea
            value={form.successSignal}
            onChange={(e) => updateField("successSignal", e.target.value)}
            placeholder="The caller is routed correctly, the next step is clear, and the team has context."
            className="input mt-2 min-h-[90px]"
          />
        </div>
      </div>

      <div className="flex gap-3 border-t border-border pt-6">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Foundation"}
        </button>
        <button className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
