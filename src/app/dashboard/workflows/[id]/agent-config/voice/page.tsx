"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { AgentVoiceProvider } from "@/types";

interface VoiceForm {
  voiceProvider: AgentVoiceProvider;
  voiceId: string;
  language: string;
  accent?: string;
  speechRate: number;
  pitch: number;
  callForwardingEnabled: boolean;
  forwardToNumber?: string;
  forwardAfterRings?: number;
}

const VOICE_PROVIDERS: Array<{
  id: AgentVoiceProvider;
  label: string;
  description: string;
  pricingHint: string;
  voices: Array<{ id: string; label: string }>;
}> = [
  {
    id: "google",
    label: "Google Cloud",
    description: "High-quality neural voices for premium call handling.",
    pricingHint: "Paid API",
    voices: [
      { id: "en-US-Neural2-A", label: "Maya (Female, US)" },
      { id: "en-US-Neural2-C", label: "James (Male, US)" },
      { id: "en-US-Neural2-E", label: "Liam (Male, US)" },
    ],
  },
  {
    id: "eleven-labs",
    label: "ElevenLabs",
    description: "Premium expressive voices for high-touch front desks.",
    pricingHint: "Paid API",
    voices: [
      { id: "EXAVITQu4eMbCZ3g24h0", label: "Bella (Female)" },
      { id: "EXAVITQu4eMbCZ3g24h1", label: "Adam (Male)" },
      { id: "EXAVITQu4eMbCZ3g24h2", label: "Rachel (Female)" },
    ],
  },
  {
    id: "azure",
    label: "Azure Speech",
    description: "Microsoft neural voices with broad language support.",
    pricingHint: "Paid API",
    voices: [
      { id: "en-US-AriaNeural", label: "Aria (Female, US)" },
      { id: "en-US-GuyNeural", label: "Guy (Male, US)" },
      { id: "en-US-JennyNeural", label: "Jenny (Female, US)" },
    ],
  },
  {
    id: "aws",
    label: "Amazon Polly",
    description: "Stable voice synthesis with broad cloud availability.",
    pricingHint: "Paid API",
    voices: [
      { id: "Joanna", label: "Joanna (Female, US)" },
      { id: "Matthew", label: "Matthew (Male, US)" },
      { id: "Emma", label: "Emma (Female, US)" },
    ],
  },
  {
    id: "piper",
    label: "Piper",
    description: "Open-source local voice option for lower recurring cost.",
    pricingHint: "Open-source / self-hosted",
    voices: [
      { id: "en_US-amy-medium", label: "Amy (US English)" },
      { id: "en_US-joe-medium", label: "Joe (US English)" },
      { id: "en_GB-alan-medium", label: "Alan (UK English)" },
    ],
  },
];

const LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "sw-KE", label: "Swahili (Kenya)" },
  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "es-MX", label: "Spanish (Mexico)" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
];

export default function VoicePage() {
  const params = useParams();
  const workflowId = String(params?.id ?? "");
  const [form, setForm] = useState<VoiceForm>({
    voiceProvider: "google",
    voiceId: "en-US-Neural2-A",
    language: "en-US",
    accent: "standard",
    speechRate: 1.0,
    pitch: 0,
    callForwardingEnabled: false,
    forwardToNumber: "",
    forwardAfterRings: 3,
  });
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
              voiceProvider: agentConfig.voiceProvider || "google",
              voiceId: agentConfig.voiceId || "en-US-Neural2-A",
              language: agentConfig.language || "en-US",
              accent: agentConfig.accent || "standard",
              speechRate: agentConfig.speechRate || 1.0,
              pitch: agentConfig.pitch || 0,
              callForwardingEnabled: agentConfig.callForwardingEnabled || false,
              forwardToNumber: agentConfig.forwardToNumber || "",
              forwardAfterRings: agentConfig.forwardAfterRings || 3,
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

  function updateField<K extends keyof VoiceForm>(key: K, value: VoiceForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/agent-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentConfig: form,
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

  const currentProvider = VOICE_PROVIDERS.find((provider) => provider.id === form.voiceProvider);
  const currentVoices = currentProvider?.voices || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text">Voice & Audio</h2>
        <p className="mt-2 text-text-muted">
          Choose how this desk sounds on the line. Dobly supports premium hosted voices and a
          lower-cost open-source lane when you want more control.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="mb-3 block text-sm font-medium text-text">Voice Provider</label>
          <div className="grid gap-3 md:grid-cols-2">
            {VOICE_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    voiceProvider: provider.id,
                    voiceId: provider.voices[0]?.id || current.voiceId,
                  }))
                }
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  form.voiceProvider === provider.id
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-text">{provider.label}</div>
                  <span className="rounded-full border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-text-muted">
                    {provider.pricingHint}
                  </span>
                </div>
                <div className="mt-1 text-xs text-text-muted">{provider.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-text">Voice Variant</label>
          <select
            value={form.voiceId}
            onChange={(e) => updateField("voiceId", e.target.value)}
            className="input"
          >
            {currentVoices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text">Language</label>
          <select
            value={form.language}
            onChange={(e) => updateField("language", e.target.value)}
            className="input mt-2"
          >
            {LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text">
            Speech Rate: {form.speechRate.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.6"
            max="1.6"
            step="0.1"
            value={form.speechRate}
            onChange={(e) => updateField("speechRate", parseFloat(e.target.value))}
            className="mt-2 w-full"
          />
          <p className="mt-2 text-xs text-text-muted">
            Use a calmer pace for support and finance. Use a slightly faster pace for front desk
            or sales if you want a brisker line.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text">
            Pitch: {form.pitch > 0 ? "+" : ""}{form.pitch}
          </label>
          <input
            type="range"
            min="-12"
            max="12"
            step="1"
            value={form.pitch}
            onChange={(e) => updateField("pitch", parseInt(e.target.value, 10))}
            className="mt-2 w-full"
          />
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="mb-4 text-lg font-medium text-text">Call Forwarding</h3>
          <p className="mb-4 text-sm text-text-muted">
            Forward calls to a human agent when the AI cannot handle the request or after a certain number of rings.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="callForwardingEnabled"
                checked={form.callForwardingEnabled}
                onChange={(e) => updateField("callForwardingEnabled", e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="callForwardingEnabled" className="text-sm font-medium text-text">
                Enable call forwarding
              </label>
            </div>

            {form.callForwardingEnabled && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-text">
                    Forward to number
                  </label>
                  <input
                    type="tel"
                    value={form.forwardToNumber}
                    onChange={(e) => updateField("forwardToNumber", e.target.value)}
                    placeholder="+254700000000"
                    className="input"
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Enter the phone number to forward calls to (include country code)
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-text">
                    Forward after rings: {form.forwardAfterRings}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={form.forwardAfterRings}
                    onChange={(e) => updateField("forwardAfterRings", parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Number of rings before forwarding to human agent
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 border-t border-border pt-6">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Voice Setup"}
        </button>
        <button className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
