"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

interface BasicInfoForm {
  role: string;
  industry: string;
  description: string;
}

const ROLES = [
  "Sales Representative",
  "Support Agent",
  "Receptionist",
  "HR Assistant",
  "Lead Qualifier",
  "Customer Service",
  "Appointment Scheduler",
  "Billing Agent",
  "Compliance Officer",
  "Other",
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

export default function BasicInfoPage() {
  const params = useParams();
  const workflowId = String(params?.id ?? "");
  const [form, setForm] = useState<BasicInfoForm>({
    role: "",
    industry: "",
    description: "",
  });
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
              role: agentConfig.role || "",
              industry: agentConfig.industry || "",
              description: agentConfig.description || "",
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
        <h2 className="font-display text-2xl font-semibold text-text">Basic Information</h2>
        <p className="mt-2 text-text-muted">
          Define the role and industry for your agent to set expectations and defaults
        </p>
      </div>

      <div className="space-y-6">
        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-text">Agent Role</label>
          <select
            value={form.role}
            onChange={(e) => updateField("role", e.target.value)}
            className="input mt-2"
          >
            <option value="">Select a role...</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-text-muted">What will this agent do?</p>
        </div>

        {/* Industry */}
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
          <p className="mt-1 text-xs text-text-muted">What industry are you in?</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Describe what this agent should do..."
            className="input mt-2 min-h-[120px]"
          />
          <p className="mt-1 text-xs text-text-muted">
            Add context about this agent's specific responsibilities
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
