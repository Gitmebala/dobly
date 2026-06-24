"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Check from "lucide-react/dist/esm/icons/check.js";
import Copy from "lucide-react/dist/esm/icons/copy.js";

interface DeploymentForm {
  channels: Array<"voice" | "whatsapp" | "sms" | "web" | "api">;
  voiceChannelConfig?: {
    numberStrategy: "dobly_managed" | "bring_your_own";
    provider: "kenya_local" | "africas_talking" | "twilio" | "vonage" | "bandwidth";
    phoneNumber?: string;
    phoneNumberSid?: string;
    assignedLabel?: string;
    inboundWebhookPath?: string;
    statusWebhookPath?: string;
    callRecordingEnabled?: boolean;
    transcriptionEnabled?: boolean;
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
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

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
        ? current.channels.filter((currentChannel) => currentChannel !== channel)
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
          agentConfig: {
            deployment: form,
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

  const inboundWebhookUrl = useMemo(() => {
    const path = form.voiceChannelConfig?.inboundWebhookPath;
    return path && origin ? `${origin}${path}` : "";
  }, [form.voiceChannelConfig?.inboundWebhookPath, origin]);

  const statusWebhookUrl = useMemo(() => {
    const path = form.voiceChannelConfig?.statusWebhookPath;
    return path && origin ? `${origin}${path}` : "";
  }, [form.voiceChannelConfig?.statusWebhookPath, origin]);

  if (loading) {
    return <div className="py-8 text-center text-text-muted">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text">Deployment</h2>
        <p className="mt-2 text-text-muted">
          Decide where this desk lives, how calls reach it, and whether Dobly manages the number
          or plugs into one you already own.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="mb-3 font-semibold text-text">Channels</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {(
              [
                { id: "voice", label: "Voice", desc: "Inbound or outbound calls" },
                { id: "whatsapp", label: "WhatsApp", desc: "WhatsApp Business handoff" },
                { id: "sms", label: "SMS", desc: "Text follow-up and reminders" },
                { id: "web", label: "Web", desc: "Embedded chat or intake widget" },
                { id: "api", label: "API", desc: "Custom integrations and events" },
              ] as const
            ).map((channel) => (
              <button
                key={channel.id}
                onClick={() => toggleChannel(channel.id)}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${
                  form.channels.includes(channel.id)
                    ? "border-accent bg-accent/10"
                    : "border-border bg-[rgba(255,255,255,0.02)] hover:border-accent/50"
                }`}
              >
                <div className="font-medium text-text">{channel.label}</div>
                <div className="mt-1 text-xs text-text-muted">{channel.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {form.channels.includes("voice") && (
          <div className="rounded-2xl border border-border p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-lg text-text">Voice Deployment</h3>
              <p className="mt-1 text-sm text-text-muted">
                Set how the phone layer works. You can manage the number later, or bring
                your own provider number now.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-3 block text-sm font-medium text-text">
                  Number Strategy
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        voiceChannelConfig: {
                          ...current.voiceChannelConfig,
                          provider: current.voiceChannelConfig?.provider || "kenya_local",
                          numberStrategy: "dobly_managed",
                        },
                      }))
                    }
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      form.voiceChannelConfig?.numberStrategy === "dobly_managed"
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <div className="font-medium text-text">Dobly-managed number</div>
                    <div className="mt-1 text-xs text-text-muted">
                      Best for faster setup. Dobly provisions and keeps the routing ready.
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        voiceChannelConfig: {
                          ...current.voiceChannelConfig,
                          provider: current.voiceChannelConfig?.provider || "kenya_local",
                          numberStrategy: "bring_your_own",
                        },
                      }))
                    }
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      form.voiceChannelConfig?.numberStrategy === "bring_your_own"
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <div className="font-medium text-text">Bring your own number</div>
                    <div className="mt-1 text-xs text-text-muted">
                      Use your existing telephony setup and point it at Dobly’s voice webhooks.
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-text">Provider</label>
                  <select
                    value={form.voiceChannelConfig?.provider || "kenya_local"}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        voiceChannelConfig: {
                          ...current.voiceChannelConfig,
                          numberStrategy:
                            current.voiceChannelConfig?.numberStrategy || "dobly_managed",
                          provider: e.target.value as "kenya_local" | "africas_talking" | "twilio" | "vonage" | "bandwidth",
                        },
                      }))
                    }
                    className="input mt-2"
                  >
                    <option value="kenya_local">Kenya local SMS/voice</option>
                    <option value="africas_talking">Africa's Talking</option>
                    <option value="twilio">Twilio international fallback</option>
                    <option value="vonage">Vonage</option>
                    <option value="bandwidth">Bandwidth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text">Public Number</label>
                  <input
                    type="tel"
                    value={form.voiceChannelConfig?.phoneNumber || ""}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        voiceChannelConfig: {
                          ...current.voiceChannelConfig,
                          numberStrategy:
                            current.voiceChannelConfig?.numberStrategy || "dobly_managed",
                          provider: current.voiceChannelConfig?.provider || "kenya_local",
                          phoneNumber: e.target.value,
                        },
                      }))
                    }
                    placeholder="+1 555 123 4567"
                    className="input mt-2"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.voiceChannelConfig?.callRecordingEnabled ?? true}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        voiceChannelConfig: {
                          ...current.voiceChannelConfig,
                          numberStrategy:
                            current.voiceChannelConfig?.numberStrategy || "dobly_managed",
                          provider: current.voiceChannelConfig?.provider || "kenya_local",
                          callRecordingEnabled: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-text">Enable call recording</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.voiceChannelConfig?.transcriptionEnabled ?? true}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        voiceChannelConfig: {
                          ...current.voiceChannelConfig,
                          numberStrategy:
                            current.voiceChannelConfig?.numberStrategy || "dobly_managed",
                          provider: current.voiceChannelConfig?.provider || "kenya_local",
                          transcriptionEnabled: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-text">Enable transcription</span>
                </label>
              </div>

              <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.02)] p-4">
                <div className="mb-3 text-sm font-medium text-text">Voice Webhooks</div>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-[0.2em] text-text-muted">
                      Inbound call URL
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={inboundWebhookUrl}
                        className="input pr-10 font-mono text-xs"
                      />
                      {inboundWebhookUrl ? (
                        <button
                          onClick={() => copyToClipboard(inboundWebhookUrl, "voice-inbound")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                        >
                          {copied === "voice-inbound" ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs uppercase tracking-[0.2em] text-text-muted">
                      Call status / gather URL
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={statusWebhookUrl}
                        className="input pr-10 font-mono text-xs"
                      />
                      {statusWebhookUrl ? (
                        <button
                          onClick={() => copyToClipboard(statusWebhookUrl, "voice-status")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                        >
                          {copied === "voice-status" ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {form.channels.includes("api") && (
          <div className="rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-lg text-text">API Access</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text">Webhook Secret</label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.apiConfig?.webhookSecret || ""}
                    readOnly
                    className="input mt-2 pr-10 font-mono text-xs"
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
              </div>

              <div>
                <label className="block text-sm font-medium text-text">Rate Limit (req/min)</label>
                <input
                  type="number"
                  value={form.apiConfig?.rateLimit || 60}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      apiConfig: {
                        webhookSecret: current.apiConfig?.webhookSecret || "",
                        rateLimit: parseInt(e.target.value, 10),
                      },
                    }))
                  }
                  className="input mt-2"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 border-t border-border pt-6">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Deployment"}
        </button>
        <button className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
