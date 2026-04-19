"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";

interface DeploymentForm {
  channels: Array<"voice" | "whatsapp" | "sms" | "web" | "api">;
  voiceChannelConfig?: {
    phoneNumber: string;
    provider: "twilio" | "vonage" | "bandwidth";
  };
  webChannelConfig?: {
    embedUrl: string;
    widgetTheme: "light" | "dark";
  };
  apiConfig?: {
    webhookSecret: string;
    rateLimit: number;
  };
}

export default function DeploymentPage() {
  const params = useParams();
  const workflowId = String(params?.id ?? "");
  const [form, setForm] = useState<DeploymentForm>({
    channels: [],
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(`/api/workflows/${workflowId}/agent-config`);
        if (response.ok) {
          const { agentConfig } = await response.json();
          if (agentConfig?.deployment) {
            setForm(agentConfig.deployment);
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

  function toggleChannel(channel: "voice" | "whatsapp" | "sms" | "web" | "api") {
    setForm((current) => ({
      ...current,
      channels: current.channels.includes(channel)
        ? current.channels.filter((c) => c !== channel)
        : [...current.channels, channel],
    }));
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
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
                  deployment: form,
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
        <h2 className="font-display text-2xl font-semibold text-text">Deployment</h2>
        <p className="mt-2 text-text-muted">
          Select channels and configure deployment settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Channel Selection */}
        <div>
          <h3 className="font-semibold text-text mb-3">Deployment Channels</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {(
              [
                { id: "voice", label: "Voice (Phone)", desc: "Inbound/outbound calls" },
                { id: "whatsapp", label: "WhatsApp", desc: "WhatsApp Business" },
                { id: "sms", label: "SMS", desc: "Text messaging" },
                { id: "web", label: "Web", desc: "Embedded widget" },
                { id: "api", label: "API", desc: "Custom integrations" },
              ] as const
            ).map((channel) => (
              <button
                key={channel.id}
                onClick={() => toggleChannel(channel.id)}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  form.channels.includes(channel.id)
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.channels.includes(channel.id)}
                  onChange={() => {}}
                  className="w-4 h-4"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="mt-2 font-medium text-text">{channel.label}</div>
                <div className="text-xs text-text-muted">{channel.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Channel */}
        {form.channels.includes("voice") && (
          <div className="rounded-lg border border-border p-6">
            <h3 className="font-semibold text-lg text-text mb-4">Voice Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text">Phone Number</label>
                <input
                  type="tel"
                  value={form.voiceChannelConfig?.phoneNumber || ""}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      voiceChannelConfig: {
                        ...current.voiceChannelConfig,
                        phoneNumber: e.target.value,
                        provider: current.voiceChannelConfig?.provider || "twilio",
                      },
                    }))
                  }
                  placeholder="+1 (555) 123-4567"
                  className="input mt-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text">Provider</label>
                <select
                  value={form.voiceChannelConfig?.provider || "twilio"}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      voiceChannelConfig: {
                        ...current.voiceChannelConfig,
                        phoneNumber: current.voiceChannelConfig?.phoneNumber || "",
                        provider: e.target.value as any,
                      },
                    }))
                  }
                  className="input mt-2"
                >
                  <option value="twilio">Twilio</option>
                  <option value="vonage">Vonage</option>
                  <option value="bandwidth">Bandwidth</option>
                </select>
              </div>

              <div className="rounded-lg bg-[rgba(0,232,122,0.08)] border border-[rgba(0,232,122,0.16)] p-3">
                <p className="text-xs text-green-400">
                  ✓ Voice channel is configured and ready for deployment
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Web Channel */}
        {form.channels.includes("web") && (
          <div className="rounded-lg border border-border p-6">
            <h3 className="font-semibold text-lg text-text mb-4">Web Widget</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text">Embed URL</label>
                <div className="relative">
                  <input
                    type="url"
                    value={form.webChannelConfig?.embedUrl || ""}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        webChannelConfig: {
                          ...current.webChannelConfig,
                          embedUrl: e.target.value,
                          widgetTheme: current.webChannelConfig?.widgetTheme || "light",
                        },
                      }))
                    }
                    placeholder="https://your-domain.com/chat"
                    className="input mt-2 pr-10"
                  />
                  {form.webChannelConfig?.embedUrl && (
                    <button
                      onClick={() => copyToClipboard(form.webChannelConfig!.embedUrl, "embed-url")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                    >
                      {copied === "embed-url" ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text">Widget Theme</label>
                <select
                  value={form.webChannelConfig?.widgetTheme || "light"}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      webChannelConfig: {
                        ...current.webChannelConfig,
                        embedUrl: current.webChannelConfig?.embedUrl || "",
                        widgetTheme: e.target.value as any,
                      },
                    }))
                  }
                  className="input mt-2"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* API Channel */}
        {form.channels.includes("api") && (
          <div className="rounded-lg border border-border p-6">
            <h3 className="font-semibold text-lg text-text mb-4">API Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text">Webhook Secret</label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.apiConfig?.webhookSecret || ""}
                    readOnly
                    className="input mt-2 pr-10 bg-[rgba(255,255,255,0.02)]"
                  />
                  <button
                    onClick={() =>
                      copyToClipboard(form.apiConfig?.webhookSecret || "", "webhook-secret")
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                  >
                    {copied === "webhook-secret" ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-text-muted">Use this to verify webhook requests</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text">Rate Limit (calls/min)</label>
                <input
                  type="number"
                  value={form.apiConfig?.rateLimit || 10}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      apiConfig: {
                        ...current.apiConfig,
                        webhookSecret: current.apiConfig?.webhookSecret || "",
                        rateLimit: parseInt(e.target.value),
                      },
                    }))
                  }
                  className="input mt-2"
                />
              </div>

              <div className="rounded-lg bg-[rgba(77,122,255,0.08)] border border-[rgba(77,122,255,0.16)] p-3">
                <p className="text-xs text-text-muted">
                  API Endpoint:{" "}
                  <code className="text-accent font-mono">
                    /api/agents/{workflowId}/call
                  </code>
                </p>
              </div>
            </div>
          </div>
        )}
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
