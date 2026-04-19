"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

interface VoiceForm {
  voiceProvider: "google" | "eleven-labs" | "azure" | "aws";
  voiceId: string;
  language: string;
  accent?: string;
  speechRate: number;
  pitch: number;
}

const VOICE_PROVIDERS = [
  {
    id: "google",
    label: "Google Cloud",
    description: "High-quality neural voices",
    voices: [
      { id: "en-US-Neural2-A", label: "Maya (Female, US)" },
      { id: "en-US-Neural2-C", label: "James (Male, US)" },
      { id: "en-US-Neural2-E", label: "Liam (Male, US)" },
    ],
  },
  {
    id: "eleven-labs",
    label: "ElevenLabs",
    description: "Premium AI voices",
    voices: [
      { id: "EXAVITQu4eMbCZ3g24h0", label: "Bella (Female)" },
      { id: "EXAVITQu4eMbCZ3g24h1", label: "Adam (Male)" },
      { id: "EXAVITQu4eMbCZ3g24h2", label: "Rachel (Female)" },
    ],
  },
  {
    id: "azure",
    label: "Azure Speech",
    description: "Microsoft's voice synthesis",
    voices: [
      { id: "en-US-AriaNeural", label: "Aria (Female, US)" },
      { id: "en-US-GuyNeural", label: "Guy (Male, US)" },
      { id: "en-US-JennyNeural", label: "Jenny (Female, US)" },
    ],
  },
  {
    id: "aws",
    label: "Amazon Polly",
    description: "Lifelike synthesized speech",
    voices: [
      { id: "Joanna", label: "Joanna (Female, US)" },
      { id: "Matthew", label: "Matthew (Male, US)" },
      { id: "Emma", label: "Emma (Female, US)" },
    ],
  },
];

const LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "es-MX", label: "Spanish (Mexico)" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "it-IT", label: "Italian" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "ja-JP", label: "Japanese" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
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

  const currentProvider = VOICE_PROVIDERS.find((p) => p.id === form.voiceProvider);
  const currentVoices = currentProvider?.voices || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text">Voice & Audio</h2>
        <p className="mt-2 text-text-muted">
          Select voice provider, language, accent, and speech parameters
        </p>
      </div>

      <div className="space-y-6">
        {/* Voice Provider */}
        <div>
          <label className="block text-sm font-medium text-text mb-3">Voice Provider</label>
          <div className="grid gap-3 md:grid-cols-2">
            {VOICE_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => updateField("voiceProvider", provider.id as any)}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  form.voiceProvider === provider.id
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <div className="font-medium text-text">{provider.label}</div>
                <div className="mt-1 text-xs text-text-muted">{provider.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selection */}
        <div>
          <label className="block text-sm font-medium text-text mb-3">Voice</label>
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
          <p className="mt-2 text-xs text-text-muted">
            Choose which voice variant to use for this agent
          </p>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-text">Language</label>
          <select
            value={form.language}
            onChange={(e) => updateField("language", e.target.value)}
            className="input mt-2"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Speech Rate */}
        <div>
          <label className="block text-sm font-medium text-text">
            Speech Rate: {form.speechRate.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={form.speechRate}
            onChange={(e) => updateField("speechRate", parseFloat(e.target.value))}
            className="w-full mt-2"
          />
          <p className="mt-2 text-xs text-text-muted">
            Slower (0.5x) to faster (2x) speaking pace
          </p>
        </div>

        {/* Pitch */}
        <div>
          <label className="block text-sm font-medium text-text">
            Pitch: {form.pitch > 0 ? "+" : ""}{form.pitch}
          </label>
          <input
            type="range"
            min="-20"
            max="20"
            step="1"
            value={form.pitch}
            onChange={(e) => updateField("pitch", parseInt(e.target.value))}
            className="w-full mt-2"
          />
          <p className="mt-2 text-xs text-text-muted">
            Lower (-20) to higher (+20) pitch in semitones
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
