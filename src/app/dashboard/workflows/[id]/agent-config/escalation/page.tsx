"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { EscalationTrigger } from "@/types";

interface EscalationForm {
  triggers: EscalationTrigger[];
  handoffMessage: string;
  handoffPhoneNumber: string;
  handoffEmail: string;
  escalationQueue: "round_robin" | "first_available" | "skill_based";
  maxWaitTime: number;
}

export default function EscalationPage() {
  const params = useParams();
  const workflowId = String(params?.id ?? "");
  const [form, setForm] = useState<EscalationForm>({
    triggers: [],
    handoffMessage: "I'm connecting you to a specialist now.",
    handoffPhoneNumber: "",
    handoffEmail: "",
    escalationQueue: "round_robin",
    maxWaitTime: 120,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newTrigger, setNewTrigger] = useState<{
    type: EscalationTrigger["type"];
    value: string;
  }>({
    type: "confidence_below",
    value: "0.6",
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(`/api/workflows/${workflowId}/agent-config`);
        if (response.ok) {
          const { agentConfig } = await response.json();
          if (agentConfig?.escalation) {
            setForm(agentConfig.escalation);
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

  function addTrigger() {
    const trigger: EscalationTrigger = {
      type: newTrigger.type,
    };

    if (newTrigger.type === "confidence_below") {
      trigger.threshold = parseFloat(newTrigger.value);
    } else if (newTrigger.type === "keyword_match") {
      trigger.keywords = newTrigger.value.split(",").map((k) => k.trim());
    } else if (newTrigger.type === "call_duration_exceeded") {
      trigger.seconds = parseInt(newTrigger.value);
    } else if (newTrigger.type === "repeated_misunderstanding") {
      trigger.count = parseInt(newTrigger.value);
    }

    setForm((current) => ({
      ...current,
      triggers: [...current.triggers, trigger],
    }));
  }

  function removeTrigger(index: number) {
    setForm((current) => ({
      ...current,
      triggers: current.triggers.filter((_, i) => i !== index),
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
                agentConfig: {
                  escalation: form,
                },
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
        <h2 className="font-display text-2xl font-semibold text-text">Escalation & Handoff</h2>
        <p className="mt-2 text-text-muted">Define when and how calls escalate to humans</p>
      </div>

      <div className="space-y-6">
        {/* Escalation Triggers */}
        <div>
          <h3 className="font-semibold text-lg text-text mb-3">Escalation Triggers</h3>
          <div className="space-y-2 mb-4">
            {form.triggers.map((trigger, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-border bg-[rgba(255,255,255,0.02)] p-3"
              >
                <div className="text-sm text-text">
                  <span className="font-medium capitalize">{trigger.type.replace(/_/g, " ")}</span>
                  {trigger.threshold && ` - Below ${trigger.threshold * 100}% confidence`}
                  {trigger.keywords && ` - Keywords: ${trigger.keywords.join(", ")}`}
                  {trigger.seconds && ` - ${trigger.seconds}s duration`}
                  {trigger.count && ` - After ${trigger.count} attempts`}
                </div>
                <button
                  onClick={() => removeTrigger(index)}
                  className="text-text-muted hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <select
              value={newTrigger.type}
              onChange={(e) =>
                setNewTrigger((current) => ({
                  ...current,
                  type: e.target.value as EscalationTrigger["type"],
                }))
              }
              className="input"
            >
              <option value="confidence_below">Confidence Below Threshold</option>
              <option value="keyword_match">Keyword Match</option>
              <option value="call_duration_exceeded">Call Duration Exceeded</option>
              <option value="repeated_misunderstanding">Repeated Misunderstanding</option>
            </select>

            {newTrigger.type === "confidence_below" && (
              <div>
                <label className="text-xs text-text-muted">Threshold (0.0 - 1.0)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={newTrigger.value}
                  onChange={(e) => setNewTrigger((current) => ({ ...current, value: e.target.value }))}
                  placeholder="0.6"
                  className="input mt-1"
                />
              </div>
            )}

            {newTrigger.type === "keyword_match" && (
              <div>
                <label className="text-xs text-text-muted">Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={newTrigger.value}
                  onChange={(e) => setNewTrigger((current) => ({ ...current, value: e.target.value }))}
                  placeholder="speak to human, manager, complaint"
                  className="input mt-1"
                />
              </div>
            )}

            {newTrigger.type === "call_duration_exceeded" && (
              <div>
                <label className="text-xs text-text-muted">Seconds</label>
                <input
                  type="number"
                  value={newTrigger.value}
                  onChange={(e) => setNewTrigger((current) => ({ ...current, value: e.target.value }))}
                  placeholder="600"
                  className="input mt-1"
                />
              </div>
            )}

            {newTrigger.type === "repeated_misunderstanding" && (
              <div>
                <label className="text-xs text-text-muted">Number of Attempts</label>
                <input
                  type="number"
                  value={newTrigger.value}
                  onChange={(e) => setNewTrigger((current) => ({ ...current, value: e.target.value }))}
                  placeholder="3"
                  className="input mt-1"
                />
              </div>
            )}

            <button onClick={addTrigger} className="btn-secondary w-full">
              <Plus className="h-4 w-4" />
              Add Trigger
            </button>
          </div>
        </div>

        {/* Handoff Configuration */}
        <div>
          <h3 className="font-semibold text-lg text-text mb-3">Handoff Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text">Handoff Message</label>
              <textarea
                value={form.handoffMessage}
                onChange={(e) =>
                  setForm((current) => ({ ...current, handoffMessage: e.target.value }))
                }
                className="input mt-2 min-h-[80px]"
              />
              <p className="mt-1 text-xs text-text-muted">
                Message to play before transferring to a human
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text">Handoff Phone Number</label>
              <input
                type="tel"
                value={form.handoffPhoneNumber}
                onChange={(e) =>
                  setForm((current) => ({ ...current, handoffPhoneNumber: e.target.value }))
                }
                placeholder="+1 (555) 123-4567"
                className="input mt-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text">Handoff Email</label>
              <input
                type="email"
                value={form.handoffEmail}
                onChange={(e) =>
                  setForm((current) => ({ ...current, handoffEmail: e.target.value }))
                }
                placeholder="support@example.com"
                className="input mt-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text">Queue Strategy</label>
              <select
                value={form.escalationQueue}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    escalationQueue: e.target.value as any,
                  }))
                }
                className="input mt-2"
              >
                <option value="round_robin">Round Robin</option>
                <option value="first_available">First Available</option>
                <option value="skill_based">Skill-Based Routing</option>
              </select>
              <p className="mt-1 text-xs text-text-muted">
                How to route escalated calls to available agents
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text">Max Wait Time (seconds)</label>
              <input
                type="number"
                value={form.maxWaitTime}
                onChange={(e) =>
                  setForm((current) => ({ ...current, maxWaitTime: parseInt(e.target.value) }))
                }
                className="input mt-2"
              />
              <p className="mt-1 text-xs text-text-muted">
                Maximum time to wait in queue before disconnecting
              </p>
            </div>
          </div>
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
