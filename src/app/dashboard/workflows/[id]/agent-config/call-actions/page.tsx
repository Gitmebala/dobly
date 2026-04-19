"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

interface CallActionsForm {
  beforeCall: {
    fetchContext: string;
    announceCallerName: boolean;
    playHoldingMessage: boolean;
  };
  duringCall: {
    allowTransfers: boolean;
    transferPhoneNumber: string;
    pauseForConfirmation: string[];
  };
  afterCall: {
    recordTranscript: boolean;
    sendEmail: string[];
    webhookUrl: string;
    scheduleFollowup: boolean;
    followupDelayMinutes: number;
  };
}

export default function CallActionsPage() {
  const params = useParams();
  const workflowId = String(params?.id ?? "");
  const [form, setForm] = useState<CallActionsForm>({
    beforeCall: {
      fetchContext: "",
      announceCallerName: false,
      playHoldingMessage: false,
    },
    duringCall: {
      allowTransfers: false,
      transferPhoneNumber: "",
      pauseForConfirmation: [],
    },
    afterCall: {
      recordTranscript: true,
      sendEmail: [],
      webhookUrl: "",
      scheduleFollowup: false,
      followupDelayMinutes: 24,
    },
  });
  const [newEmail, setNewEmail] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(`/api/workflows/${workflowId}/agent-config`);
        if (response.ok) {
          const { agentConfig } = await response.json();
          if (agentConfig?.callActions) {
            setForm(agentConfig.callActions);
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

  function updateField<T extends keyof CallActionsForm>(key: T, value: CallActionsForm[T]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addEmail() {
    if (newEmail.includes("@")) {
      setForm((current) => ({
        ...current,
        afterCall: {
          ...current.afterCall,
          sendEmail: [...current.afterCall.sendEmail, newEmail],
        },
      }));
      setNewEmail("");
    }
  }

  function removeEmail(email: string) {
    setForm((current) => ({
      ...current,
      afterCall: {
        ...current.afterCall,
        sendEmail: current.afterCall.sendEmail.filter((e) => e !== email),
      },
    }));
  }

  function addPrompt() {
    if (newPrompt.trim()) {
      setForm((current) => ({
        ...current,
        duringCall: {
          ...current.duringCall,
          pauseForConfirmation: [...current.duringCall.pauseForConfirmation, newPrompt.trim()],
        },
      }));
      setNewPrompt("");
    }
  }

  function removePrompt(prompt: string) {
    setForm((current) => ({
      ...current,
      duringCall: {
        ...current.duringCall,
        pauseForConfirmation: current.duringCall.pauseForConfirmation.filter(
          (p) => p !== prompt
        ),
      },
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
                  callActions: form,
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
        <h2 className="font-display text-2xl font-semibold text-text">Call Actions</h2>
        <p className="mt-2 text-text-muted">Configure actions before, during, and after calls</p>
      </div>

      <div className="space-y-6">
        {/* BEFORE CALL */}
        <div className="rounded-lg border border-border p-6">
          <h3 className="font-semibold text-lg text-text mb-4">Before Call</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text">Fetch Context API</label>
              <input
                type="url"
                value={form.beforeCall.fetchContext}
                onChange={(e) =>
                  updateField("beforeCall", {
                    ...form.beforeCall,
                    fetchContext: e.target.value,
                  })
                }
                placeholder="https://your-api.com/caller-context"
                className="input mt-2"
              />
              <p className="mt-1 text-xs text-text-muted">
                Optional webhook URL to fetch caller information
              </p>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.beforeCall.announceCallerName}
                onChange={(e) =>
                  updateField("beforeCall", {
                    ...form.beforeCall,
                    announceCallerName: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <span className="text-sm text-text">Announce caller name when available</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.beforeCall.playHoldingMessage}
                onChange={(e) =>
                  updateField("beforeCall", {
                    ...form.beforeCall,
                    playHoldingMessage: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <span className="text-sm text-text">Play holding message while routing</span>
            </label>
          </div>
        </div>

        {/* DURING CALL */}
        <div className="rounded-lg border border-border p-6">
          <h3 className="font-semibold text-lg text-text mb-4">During Call</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.duringCall.allowTransfers}
                onChange={(e) =>
                  updateField("duringCall", {
                    ...form.duringCall,
                    allowTransfers: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <span className="text-sm text-text">Allow call transfers</span>
            </label>

            {form.duringCall.allowTransfers && (
              <div>
                <label className="block text-sm font-medium text-text">Transfer Phone Number</label>
                <input
                  type="tel"
                  value={form.duringCall.transferPhoneNumber}
                  onChange={(e) =>
                    updateField("duringCall", {
                      ...form.duringCall,
                      transferPhoneNumber: e.target.value,
                    })
                  }
                  placeholder="+1 (555) 123-4567"
                  className="input mt-2"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Pause-for-Confirmation Prompts
              </label>
              <div className="space-y-2">
                {form.duringCall.pauseForConfirmation.map((prompt) => (
                  <div
                    key={prompt}
                    className="flex items-center gap-2 rounded-lg border border-border bg-[rgba(255,255,255,0.02)] p-3"
                  >
                    <div className="flex-1 text-sm text-text">{prompt}</div>
                    <button
                      onClick={() => removePrompt(prompt)}
                      className="text-text-muted hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPrompt();
                    }
                  }}
                  placeholder='E.g., "Shall I proceed with this?"'
                  className="input flex-1"
                />
                <button onClick={addPrompt} className="btn-secondary">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-xs text-text-muted">
                Prompts where the agent should wait for caller confirmation
              </p>
            </div>
          </div>
        </div>

        {/* AFTER CALL */}
        <div className="rounded-lg border border-border p-6">
          <h3 className="font-semibold text-lg text-text mb-4">After Call</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.afterCall.recordTranscript}
                onChange={(e) =>
                  updateField("afterCall", {
                    ...form.afterCall,
                    recordTranscript: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <span className="text-sm text-text">Record and transcribe call</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Send Email To</label>
              <div className="space-y-2">
                {form.afterCall.sendEmail.map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-2 rounded-lg border border-border bg-[rgba(255,255,255,0.02)] p-3"
                  >
                    <div className="flex-1 text-sm text-text">{email}</div>
                    <button
                      onClick={() => removeEmail(email)}
                      className="text-text-muted hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEmail();
                    }
                  }}
                  type="email"
                  placeholder="recipient@example.com"
                  className="input flex-1"
                />
                <button onClick={addEmail} className="btn-secondary">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text">Webhook URL for Data</label>
              <input
                type="url"
                value={form.afterCall.webhookUrl}
                onChange={(e) =>
                  updateField("afterCall", {
                    ...form.afterCall,
                    webhookUrl: e.target.value,
                  })
                }
                placeholder="https://your-api.com/call-completed"
                className="input mt-2"
              />
              <p className="mt-1 text-xs text-text-muted">
                POST call data and transcripts to this URL
              </p>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.afterCall.scheduleFollowup}
                onChange={(e) =>
                  updateField("afterCall", {
                    ...form.afterCall,
                    scheduleFollowup: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <span className="text-sm text-text">Schedule follow-up</span>
            </label>

            {form.afterCall.scheduleFollowup && (
              <div>
                <label className="block text-sm font-medium text-text">Follow-up Delay (hours)</label>
                <input
                  type="number"
                  value={form.afterCall.followupDelayMinutes}
                  onChange={(e) =>
                    updateField("afterCall", {
                      ...form.afterCall,
                      followupDelayMinutes: parseInt(e.target.value),
                    })
                  }
                  className="input mt-2"
                />
              </div>
            )}
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
